export type DomainErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'CONFIGURATION';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: DomainErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export const unauthorized = (message = 'Sign in is required.') =>
  new DomainError('UNAUTHORIZED', message);
export const forbidden = (message = 'This project action is not allowed.') =>
  new DomainError('FORBIDDEN', message);
export const notFound = (message = 'The requested project item was not found.') =>
  new DomainError('NOT_FOUND', message);
export const conflict = (message: string, details?: Record<string, unknown>) =>
  new DomainError('CONFLICT', message, details);
export const invalid = (message: string, details?: Record<string, unknown>) =>
  new DomainError('VALIDATION', message, details);
export const configurationError = (message: string) =>
  new DomainError('CONFIGURATION', message);
