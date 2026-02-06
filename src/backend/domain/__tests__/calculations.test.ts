/// <reference types="jest" />

import { cents, dateStr } from '../../../types/domain';
import { calculateBudgetedPeriodCents } from '../budgets';
import {
  countDaysInclusive,
  getBiweeklyRangeForDate,
  getMonthRange,
  listWeekRangesOverlappingPeriod,
} from '../dates';
import { computeLeftToSpend } from '../leftToSpend';
import { computeCarryoverFromRemaining } from '../rollover';

describe('budget calculations edge cases', () => {
  it('handles month lengths across 28/29/30/31 days', () => {
    const feb2026 = getMonthRange(dateStr('2026-02-10'));
    const feb2024 = getMonthRange(dateStr('2024-02-10'));
    const apr2026 = getMonthRange(dateStr('2026-04-10'));
    const jan2026 = getMonthRange(dateStr('2026-01-10'));

    expect(countDaysInclusive(feb2026.startDate, feb2026.endDate)).toBe(28);
    expect(countDaysInclusive(feb2024.startDate, feb2024.endDate)).toBe(29);
    expect(countDaysInclusive(apr2026.startDate, apr2026.endDate)).toBe(30);
    expect(countDaysInclusive(jan2026.startDate, jan2026.endDate)).toBe(31);
  });

  it('generates biweekly windows from an anchor date', () => {
    const anchor = dateStr('2026-01-02');

    expect(getBiweeklyRangeForDate(anchor, dateStr('2026-01-02'))).toEqual({
      startDate: dateStr('2026-01-02'),
      endDate: dateStr('2026-01-15'),
    });

    expect(getBiweeklyRangeForDate(anchor, dateStr('2026-01-16'))).toEqual({
      startDate: dateStr('2026-01-16'),
      endDate: dateStr('2026-01-29'),
    });

    expect(getBiweeklyRangeForDate(anchor, dateStr('2025-12-31'))).toEqual({
      startDate: dateStr('2025-12-19'),
      endDate: dateStr('2026-01-01'),
    });
  });

  it('uses overlapping weeks for weekly cadence budgets', () => {
    const weeks = listWeekRangesOverlappingPeriod(
      { startDate: dateStr('2026-02-01'), endDate: dateStr('2026-02-28') },
      1,
    );

    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual({ startDate: dateStr('2026-01-26'), endDate: dateStr('2026-02-01') });
    expect(weeks[4]).toEqual({ startDate: dateStr('2026-02-23'), endDate: dateStr('2026-03-01') });

    const budgeted = calculateBudgetedPeriodCents(
      'weekly',
      cents(12000),
      { startDate: dateStr('2026-02-01'), endDate: dateStr('2026-02-28') },
      1,
    );

    expect(budgeted).toBe(cents(60000));
  });

  it('computes monthly left-to-spend with prorated week/day values', () => {
    const result = computeLeftToSpend({
      cadence: 'monthly',
      amountCents: cents(30000),
      carryoverCents: cents(0),
      spentPeriodCents: cents(12000),
      spentWeekCents: cents(0),
      budgetedPeriodCents: cents(30000),
      periodStartDate: dateStr('2026-04-01'),
      periodEndDate: dateStr('2026-04-30'),
      date: dateStr('2026-04-16'),
      weekStart: 1,
    });

    expect(result.remainingPeriodCents).toBe(cents(18000));
    expect(result.leftThisWeekCents).toBe(cents(4800));
    expect(result.leftTodayCents).toBe(cents(1200));
    expect(result.isOverspent).toBe(false);
  });

  it('computes weekly cadence left-to-spend and clamps overspend', () => {
    const weekly = computeLeftToSpend({
      cadence: 'weekly',
      amountCents: cents(12000),
      carryoverCents: cents(0),
      spentPeriodCents: cents(22000),
      spentWeekCents: cents(7000),
      budgetedPeriodCents: cents(60000),
      periodStartDate: dateStr('2026-02-01'),
      periodEndDate: dateStr('2026-02-28'),
      date: dateStr('2026-02-10'),
      weekStart: 1,
    });

    expect(weekly.leftThisWeekCents).toBe(cents(5000));
    expect(weekly.leftTodayCents).toBe(cents(833));
    expect(weekly.isOverspent).toBe(false);

    const overspent = computeLeftToSpend({
      cadence: 'monthly',
      amountCents: cents(10000),
      carryoverCents: cents(0),
      spentPeriodCents: cents(11000),
      spentWeekCents: cents(11000),
      budgetedPeriodCents: cents(10000),
      periodStartDate: dateStr('2026-02-01'),
      periodEndDate: dateStr('2026-02-28'),
      date: dateStr('2026-02-15'),
      weekStart: 1,
    });

    expect(overspent.isOverspent).toBe(true);
    expect(overspent.leftTodayCents).toBe(cents(0));
    expect(overspent.leftThisWeekCents).toBe(cents(0));
    expect(overspent.overspentCents).toBe(cents(1000));
  });

  it('applies rollover rules correctly', () => {
    expect(computeCarryoverFromRemaining('reset', cents(2500))).toBe(cents(0));
    expect(computeCarryoverFromRemaining('pos', cents(2500))).toBe(cents(2500));
    expect(computeCarryoverFromRemaining('pos', cents(-2500))).toBe(cents(0));
    expect(computeCarryoverFromRemaining('pos_neg', cents(-2500))).toBe(cents(-2500));
  });
});
