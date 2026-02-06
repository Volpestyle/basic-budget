import type {
  DateString,
  MoneyCents,
  TimestampString,
  WeekDay,
} from '../../types/domain';

export const asDateString = (value: string): DateString => value as DateString;
export const asTimestamp = (value: string): TimestampString => value as TimestampString;
export const asMoney = (value: number): MoneyCents => Math.round(value) as MoneyCents;
export const asWeekDay = (value: number): WeekDay => value as WeekDay;

export const boolToSqliteInt = (value: boolean): 0 | 1 => (value ? 1 : 0);
export const sqliteIntToBool = (value: number): boolean => value === 1;
