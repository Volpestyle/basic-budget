import type { Cadence, MoneyCents, WeekDay } from '../../types/domain';
import { listWeekRangesOverlappingPeriod, type DateRange } from './dates';
import { addMoney, asMoney, subMoney } from './money';

export const calculateBudgetedPeriodCents = (
  cadence: Cadence,
  amountCents: MoneyCents,
  periodRange: DateRange,
  weekStart: WeekDay,
): MoneyCents => {
  if (cadence === 'monthly') {
    return amountCents;
  }

  const weeks = listWeekRangesOverlappingPeriod(periodRange, weekStart);
  return asMoney(amountCents * weeks.length);
};

export const calculateRemainingPeriodCents = (
  carryoverCents: MoneyCents,
  budgetedPeriodCents: MoneyCents,
  spentPeriodCents: MoneyCents,
): MoneyCents => subMoney(addMoney(carryoverCents, budgetedPeriodCents), spentPeriodCents);
