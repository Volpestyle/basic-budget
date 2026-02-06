import type { Period } from '../../types/domain';
import type { CreatePeriodInput, PeriodService } from '../../types/services';
import { createNextPeriodRange, resolveCurrentPeriodRange } from '../domain/periods';
import type { BackendContext } from './context';
import { requireValue } from './internal';

const buildPeriod = (id: string, now: string, input: CreatePeriodInput): Period => ({
  id,
  cycleType: input.cycleType,
  startDate: input.startDate,
  endDate: input.endDate,
  incomeCents: input.incomeCents,
  createdAt: now as Period['createdAt'],
  closedAt: null,
});

export class PeriodServiceImpl implements PeriodService {
  constructor(private readonly ctx: BackendContext) {}

  async getCurrentPeriod(): Promise<Period | null> {
    const settings = await this.ctx.repos.settings.get();
    const today = this.ctx.clock.todayLocal();
    return this.ctx.repos.periods.getCurrentByDate(today, settings.cycleType);
  }

  async getPeriod(id: string): Promise<Period | null> {
    return this.ctx.repos.periods.getById(id);
  }

  async createPeriod(input: CreatePeriodInput): Promise<Period> {
    const period = buildPeriod(this.ctx.uuid.next(), this.ctx.clock.now(), input);
    await this.ctx.repos.periods.insert(period);
    return period;
  }

  async createNextPeriod(): Promise<Period> {
    const settings = await this.ctx.repos.settings.get();
    const periods = await this.ctx.repos.periods.list();

    if (periods.length === 0) {
      const today = this.ctx.clock.todayLocal();
      const range = resolveCurrentPeriodRange(settings.cycleType, today, settings.biweeklyAnchorDate);
      return this.createPeriod({
        cycleType: settings.cycleType,
        startDate: range.startDate,
        endDate: range.endDate,
        incomeCents: 0 as Period['incomeCents'],
      });
    }

    const latest = requireValue(periods[0], 'Expected at least one period');
    const nextRange = createNextPeriodRange(
      latest.cycleType,
      {
        startDate: latest.startDate,
        endDate: latest.endDate,
      },
      settings.biweeklyAnchorDate,
    );

    return this.createPeriod({
      cycleType: latest.cycleType,
      startDate: nextRange.startDate,
      endDate: nextRange.endDate,
      incomeCents: latest.incomeCents,
    });
  }

  async closePeriod(periodId: string): Promise<void> {
    requireValue(await this.ctx.repos.periods.getById(periodId), `Period not found: ${periodId}`);
    await this.ctx.repos.periods.close(periodId, this.ctx.clock.now());
  }

  async listPeriods(): Promise<Period[]> {
    return this.ctx.repos.periods.list();
  }
}
