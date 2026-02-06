import type { DateString, MoneyCents, PaceStatus } from '../../types/domain';
import { countDaysInclusive } from './dates';
import { asMoney } from './money';

export interface PaceStatusInput {
  budgetedPeriodCents: MoneyCents;
  remainingPeriodCents: MoneyCents;
  periodStartDate: DateString;
  periodEndDate: DateString;
  date: DateString;
}

export const computePaceStatus = (input: PaceStatusInput): PaceStatus => {
  if (input.remainingPeriodCents < 0) {
    return 'overspent';
  }

  if (input.budgetedPeriodCents <= 0) {
    return 'on_track';
  }

  const totalDays = countDaysInclusive(input.periodStartDate, input.periodEndDate);
  const elapsedDays = countDaysInclusive(input.periodStartDate, input.date);
  if (totalDays <= 0 || elapsedDays <= 0) {
    return 'on_track';
  }

  const progress = Math.min(1, elapsedDays / totalDays);
  const spent = asMoney(input.budgetedPeriodCents - input.remainingPeriodCents);
  const expectedSpent = input.budgetedPeriodCents * progress;
  const spentRatio = spent / input.budgetedPeriodCents;

  if (spentRatio >= 0.8 || spent > expectedSpent * 1.1) {
    return 'warning';
  }

  return 'on_track';
};
