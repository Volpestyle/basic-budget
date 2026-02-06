import { NotFoundError, ValidationError } from '../infra/errors';

export const requireValue = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new NotFoundError(message);
  }
  return value;
};

export const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new ValidationError(message);
  }
};
