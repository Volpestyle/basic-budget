import type { CycleType, DateString } from '../../types/domain';
import {
  addDays,
  getBiweeklyRangeForDate,
  getMonthRange,
  getNextPeriodRange,
  isDateWithinRange,
  type DateRange,
} from './dates';

export const resolveCurrentPeriodRange = (
  cycleType: CycleType,
  date: DateString,
  biweeklyAnchorDate: DateString | null,
): DateRange => {
  if (cycleType === 'monthly') {
    return getMonthRange(date);
  }

  const anchor = biweeklyAnchorDate ?? date;
  return getBiweeklyRangeForDate(anchor, date);
};

export const createNextPeriodRange = (
  cycleType: CycleType,
  currentRange: DateRange,
  biweeklyAnchorDate: DateString | null,
): DateRange => getNextPeriodRange(cycleType, currentRange, biweeklyAnchorDate);

export const isDateInPeriod = (date: DateString, period: DateRange): boolean => isDateWithinRange(date, period);

export const getDayAfterPeriod = (period: DateRange): DateString => addDays(period.endDate, 1);
