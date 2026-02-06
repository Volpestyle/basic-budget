export type BackendErrorCode =
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'persistence'
  | 'import';

export class BackendError extends Error {
  public readonly code: BackendErrorCode;
  public readonly originalCause?: unknown;

  constructor(code: BackendErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
    this.originalCause = cause;
  }
}

export class NotFoundError extends BackendError {
  constructor(message: string, cause?: unknown) {
    super('not_found', message, cause);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends BackendError {
  constructor(message: string, cause?: unknown) {
    super('validation', message, cause);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends BackendError {
  constructor(message: string, cause?: unknown) {
    super('conflict', message, cause);
    this.name = 'ConflictError';
  }
}

export class PersistenceError extends BackendError {
  constructor(message: string, cause?: unknown) {
    super('persistence', message, cause);
    this.name = 'PersistenceError';
  }
}

export class ImportError extends BackendError {
  constructor(message: string, cause?: unknown) {
    super('import', message, cause);
    this.name = 'ImportError';
  }
}
