// ============================================================
// domain.ts — Shared domain types for basic-budget
// This is the contract between frontend and backend agents.
// Changes here must be coordinated.
// ============================================================

// --- Branded primitives ---------------------------------------------------

/** Money stored as integer cents. $12.34 → 1234 */
export type MoneyCents = number & { readonly __brand: 'MoneyCents' };

/** ISO date string YYYY-MM-DD (local user timezone) */
export type DateString = string & { readonly __brand: 'DateString' };

/** ISO 8601 timestamp with timezone offset */
export type TimestampString = string & { readonly __brand: 'TimestampString' };

// Constructors
export const cents = (n: number): MoneyCents => Math.round(n) as MoneyCents;
export const dateStr = (s: string): DateString => s as DateString;
export const timestamp = (s: string): TimestampString => s as TimestampString;
export const dollarsFromCents = (c: MoneyCents): number => c / 100;
export const centsFromDollars = (d: number): MoneyCents => cents(Math.round(d * 100));

// --- Enums / unions -------------------------------------------------------

export type CycleType = 'monthly' | 'biweekly';

export type Cadence = 'monthly' | 'weekly';

export type RolloverRule = 'reset' | 'pos' | 'pos_neg';

export type CategoryKind = 'need' | 'want';

export type TransactionSource = 'manual' | 'import';

export type TransactionStatus = 'posted' | 'pending';

export type PaceStatus = 'on_track' | 'warning' | 'overspent';

/** 0 = Sunday, 1 = Monday, ... 6 = Saturday */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AlertType = 'approaching_limit' | 'overspent';

// --- Core entities --------------------------------------------------------

export interface Period {
  id: string;
  cycleType: CycleType;
  startDate: DateString;
  endDate: DateString;
  incomeCents: MoneyCents;
  createdAt: TimestampString;
  closedAt: TimestampString | null;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string; // hex, e.g. "#FF4757"
  archivedAt: TimestampString | null;
}

export interface Budget {
  id: string;
  periodId: string;
  categoryId: string;
  cadence: Cadence;
  amountCents: MoneyCents;
  rolloverRule: RolloverRule;
  carryoverCents: MoneyCents;
  createdAt: TimestampString;
}

export interface Transaction {
  id: string;
  date: DateString;
  amountCents: MoneyCents; // negative = spending, positive = income
  categoryId: string;
  periodId: string;
  merchant: string | null;
  note: string | null;
  source: TransactionSource;
  externalId: string | null;
  status: TransactionStatus;
  createdAt: TimestampString;
  updatedAt: TimestampString;
  deletedAt: TimestampString | null;
}

export interface Settings {
  cycleType: CycleType;
  weekStart: WeekDay;
  currency: string; // ISO 4217, e.g. "USD"
  locale: string; // e.g. "en-US"
  biweeklyAnchorDate: DateString | null; // only when cycleType = 'biweekly'
  appLockEnabled: boolean;
}

export interface AlertRule {
  categoryId: string;
  approachingLimitPercent: number; // e.g. 80
  enabled: boolean;
}

export interface Alert {
  id: string;
  categoryId: string;
  periodId: string;
  type: AlertType;
  thresholdPercent: number;
  triggeredAt: TimestampString;
  dismissedAt: TimestampString | null;
}
