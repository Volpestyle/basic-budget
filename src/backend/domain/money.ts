import type { MoneyCents } from '../../types/domain';

export const asMoney = (value: number): MoneyCents => Math.round(value) as MoneyCents;

export const zeroMoney = (): MoneyCents => 0 as MoneyCents;

export const absMoney = (value: MoneyCents): MoneyCents => asMoney(Math.abs(value));

export const addMoney = (...values: MoneyCents[]): MoneyCents =>
  asMoney(values.reduce((sum, value) => sum + value, 0));

export const subMoney = (a: MoneyCents, b: MoneyCents): MoneyCents => asMoney(a - b);

export const mulMoney = (a: MoneyCents, factor: number): MoneyCents => asMoney(a * factor);

export const divMoney = (a: MoneyCents, divisor: number): MoneyCents => {
  if (divisor === 0) {
    return zeroMoney();
  }
  return asMoney(a / divisor);
};

export const maxMoney = (a: MoneyCents, b: MoneyCents): MoneyCents => asMoney(Math.max(a, b));

export const minMoney = (a: MoneyCents, b: MoneyCents): MoneyCents => asMoney(Math.min(a, b));

export const clampMoney = (value: MoneyCents, min: MoneyCents, max: MoneyCents): MoneyCents =>
  asMoney(Math.min(max, Math.max(min, value)));
