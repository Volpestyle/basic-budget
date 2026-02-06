import type { Cadence, DateString, MoneyCents, WeekDay } from '../../types/domain';
import type { LeftToSpend } from '../../types/services';
import {
  addDays,
  countDaysInclusive,
  getWeekRange,
  intersectRanges,
  type DateRange,
} from './dates';
import { calculateRemainingPeriodCents } from './budgets';
import { absMoney, asMoney, divMoney, maxMoney, zeroMoney } from './money';

export interface LeftToSpendInput {
  cadence: Cadence;
  amountCents: MoneyCents;
  carryoverCents: MoneyCents;
  spentPeriodCents: MoneyCents;
  spentWeekCents: MoneyCents;
  budgetedPeriodCents: MoneyCents;
  periodStartDate: DateString;
  periodEndDate: DateString;
  date: DateString;
  weekStart: WeekDay;
}

const floorPositive = (value: number): MoneyCents => asMoney(Math.max(0, Math.floor(value)));

const remainingDaysInWeekWithinPeriod = (
  date: DateString,
  periodRange: DateRange,
  weekStart: WeekDay,
): number => {
  const weekRange = getWeekRange(date, weekStart);
  const fromTodayToWeekEnd: DateRange = {
    startDate: date,
    endDate: weekRange.endDate,
  };
  const overlap = intersectRanges(fromTodayToWeekEnd, periodRange);
  if (!overlap) {
    return 0;
  }
  return countDaysInclusive(overlap.startDate, overlap.endDate);
};

const weeklyLeftToSpend = (input: LeftToSpendInput): LeftToSpend => {
  const remainingPeriodCents = calculateRemainingPeriodCents(
    input.carryoverCents,
    input.budgetedPeriodCents,
    input.spentPeriodCents,
  );

  if (remainingPeriodCents < 0) {
    return {
      remainingPeriodCents,
      leftTodayCents: zeroMoney(),
      leftThisWeekCents: zeroMoney(),
      isOverspent: true,
      overspentCents: absMoney(remainingPeriodCents),
    };
  }

  const remainingWeek = asMoney(input.amountCents - input.spentWeekCents);
  const clampedWeek = maxMoney(remainingWeek, zeroMoney());
  const daysRemaining = remainingDaysInWeekWithinPeriod(
    input.date,
    {
      startDate: input.periodStartDate,
      endDate: input.periodEndDate,
    },
    input.weekStart,
  );

  return {
    remainingPeriodCents,
    leftTodayCents: daysRemaining <= 0 ? zeroMoney() : maxMoney(divMoney(clampedWeek, daysRemaining), zeroMoney()),
    leftThisWeekCents: clampedWeek,
    isOverspent: false,
    overspentCents: zeroMoney(),
  };
};

const monthlyLeftToSpend = (input: LeftToSpendInput): LeftToSpend => {
  const periodRange: DateRange = {
    startDate: input.periodStartDate,
    endDate: input.periodEndDate,
  };

  const remainingPeriodCents = calculateRemainingPeriodCents(
    input.carryoverCents,
    input.budgetedPeriodCents,
    input.spentPeriodCents,
  );

  if (remainingPeriodCents < 0) {
    return {
      remainingPeriodCents,
      leftTodayCents: zeroMoney(),
      leftThisWeekCents: zeroMoney(),
      isOverspent: true,
      overspentCents: absMoney(remainingPeriodCents),
    };
  }

  const daysRemainingInPeriod = countDaysInclusive(input.date, input.periodEndDate);
  if (daysRemainingInPeriod <= 0) {
    return {
      remainingPeriodCents,
      leftTodayCents: zeroMoney(),
      leftThisWeekCents: zeroMoney(),
      isOverspent: false,
      overspentCents: zeroMoney(),
    };
  }

  const weekRange = getWeekRange(input.date, input.weekStart);
  const fromTodayToPeriodEnd: DateRange = { startDate: input.date, endDate: input.periodEndDate };
  const fromTodayToWeekEnd: DateRange = { startDate: input.date, endDate: weekRange.endDate };

  const weekIntersection = intersectRanges(fromTodayToWeekEnd, periodRange);
  const periodIntersection = intersectRanges(fromTodayToPeriodEnd, periodRange);

  const daysLeftInPeriodThisWeek = weekIntersection
    ? countDaysInclusive(weekIntersection.startDate, weekIntersection.endDate)
    : 0;
  const daysLeftInWeek = weekIntersection ? countDaysInclusive(weekIntersection.startDate, weekIntersection.endDate) : 0;
  const daysLeftInPeriod = periodIntersection
    ? countDaysInclusive(periodIntersection.startDate, periodIntersection.endDate)
    : 0;

  if (daysLeftInPeriod <= 0 || daysLeftInWeek <= 0 || daysLeftInPeriodThisWeek <= 0) {
    return {
      remainingPeriodCents,
      leftTodayCents: zeroMoney(),
      leftThisWeekCents: zeroMoney(),
      isOverspent: false,
      overspentCents: zeroMoney(),
    };
  }

  const leftThisWeekRaw = remainingPeriodCents * (daysLeftInPeriodThisWeek / daysLeftInPeriod);
  const leftTodayRaw = leftThisWeekRaw / daysLeftInWeek;

  return {
    remainingPeriodCents,
    leftTodayCents: floorPositive(leftTodayRaw),
    leftThisWeekCents: floorPositive(leftThisWeekRaw),
    isOverspent: false,
    overspentCents: zeroMoney(),
  };
};

export const computeLeftToSpend = (input: LeftToSpendInput): LeftToSpend => {
  if (input.cadence === 'weekly') {
    return weeklyLeftToSpend(input);
  }
  return monthlyLeftToSpend(input);
};

export const sumLeftTodayFromCategories = (values: LeftToSpend[]): MoneyCents => {
  return asMoney(values.reduce((sum, item) => sum + item.leftTodayCents, 0));
};

export const getWeekDateRangeForTransactionScope = (
  date: DateString,
  weekStart: WeekDay,
  periodStartDate: DateString,
  periodEndDate: DateString,
): DateRange | null => {
  const weekRange = getWeekRange(date, weekStart);
  return intersectRanges(
    {
      startDate: addDays(weekRange.startDate, 0),
      endDate: weekRange.endDate,
    },
    {
      startDate: periodStartDate,
      endDate: periodEndDate,
    },
  );
};
