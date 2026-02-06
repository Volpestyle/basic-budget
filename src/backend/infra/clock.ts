import type { DateString, TimestampString } from '../../types/domain';

export interface Clock {
  now(): TimestampString;
  todayLocal(): DateString;
}

const pad2 = (v: number): string => String(v).padStart(2, '0');

export const toLocalDateString = (d: Date): DateString => {
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${year}-${month}-${day}` as DateString;
};

export const systemClock: Clock = {
  now: () => new Date().toISOString() as TimestampString,
  todayLocal: () => toLocalDateString(new Date()),
};
