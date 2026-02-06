import type { MoneyCents, RolloverRule } from '../../types/domain';
import { asMoney, zeroMoney } from './money';

export const computeCarryoverFromRemaining = (
  rule: RolloverRule,
  remainingPeriodCents: MoneyCents,
): MoneyCents => {
  if (rule === 'reset') {
    return zeroMoney();
  }

  if (rule === 'pos') {
    return asMoney(Math.max(0, remainingPeriodCents));
  }

  return remainingPeriodCents;
};
