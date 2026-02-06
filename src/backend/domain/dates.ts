import type { DateString, WeekDay } from '../../types/domain';

const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRange = {
  startDate: DateString;
  endDate: DateString;
};

const toParts = (date: DateString): [number, number, number] => {
  const rawParts = String(date).split('-');
  const year = Number(rawParts[0] ?? NaN);
  const month = Number(rawParts[1] ?? NaN);
  const day = Number(rawParts[2] ?? NaN);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error(`Invalid date string: ${date}`);
  }

  return [year, month, day];
};

export const parseDate = (date: DateString): Date => {
  const [year, month, day] = toParts(date);
  return new Date(Date.UTC(year, month - 1, day));
};

export const formatDate = (date: Date): DateString => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as DateString;
};

export const compareDateStrings = (a: DateString, b: DateString): number => {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
};

export const addDays = (date: DateString, days: number): DateString => {
  const parsed = parseDate(date);
  const next = new Date(parsed.getTime() + days * DAY_MS);
  return formatDate(next);
};

export const countDaysInclusive = (startDate: DateString, endDate: DateString): number => {
  const start = parseDate(startDate).getTime();
  const end = parseDate(endDate).getTime();
  if (end < start) {
    return 0;
  }
  return Math.floor((end - start) / DAY_MS) + 1;
};

export const isDateWithinRange = (date: DateString, range: DateRange): boolean =>
  compareDateStrings(date, range.startDate) >= 0 && compareDateStrings(date, range.endDate) <= 0;

export const intersectRanges = (a: DateRange, b: DateRange): DateRange | null => {
  const startDate = compareDateStrings(a.startDate, b.startDate) >= 0 ? a.startDate : b.startDate;
  const endDate = compareDateStrings(a.endDate, b.endDate) <= 0 ? a.endDate : b.endDate;

  if (compareDateStrings(startDate, endDate) > 0) {
    return null;
  }

  return { startDate, endDate };
};

export const getWeekRange = (date: DateString, weekStart: WeekDay): DateRange => {
  const parsed = parseDate(date);
  const weekday = parsed.getUTCDay() as WeekDay;
  const deltaToStart = (weekday - weekStart + 7) % 7;
  const startDate = addDays(date, -deltaToStart);
  const endDate = addDays(startDate, 6);
  return { startDate, endDate };
};

export const getMonthRange = (date: DateString): DateRange => {
  const parsed = parseDate(date);
  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
};

export const getBiweeklyRangeForDate = (anchorDate: DateString, date: DateString): DateRange => {
  const anchor = parseDate(anchorDate).getTime();
  const target = parseDate(date).getTime();
  const deltaDays = Math.floor((target - anchor) / DAY_MS);
  const windowIndex = Math.floor(deltaDays / 14);
  const start = new Date(anchor + windowIndex * 14 * DAY_MS);
  const end = new Date(start.getTime() + 13 * DAY_MS);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
};

export const listWeekRangesOverlappingPeriod = (
  period: DateRange,
  weekStart: WeekDay,
): DateRange[] => {
  const firstWeek = getWeekRange(period.startDate, weekStart);
  const ranges: DateRange[] = [];

  let cursorStart = firstWeek.startDate;
  while (compareDateStrings(cursorStart, period.endDate) <= 0) {
    const weekRange: DateRange = {
      startDate: cursorStart,
      endDate: addDays(cursorStart, 6),
    };

    if (intersectRanges(weekRange, period)) {
      ranges.push(weekRange);
    }

    cursorStart = addDays(cursorStart, 7);
  }

  return ranges;
};

export const getNextPeriodRange = (
  cycleType: 'monthly' | 'biweekly',
  currentPeriod: DateRange,
  biweeklyAnchorDate: DateString | null,
): DateRange => {
  if (cycleType === 'monthly') {
    const nextStart = addDays(currentPeriod.endDate, 1);
    return getMonthRange(nextStart);
  }

  const anchor = biweeklyAnchorDate ?? currentPeriod.startDate;
  const nextStart = addDays(currentPeriod.endDate, 1);
  return getBiweeklyRangeForDate(anchor, nextStart);
};
