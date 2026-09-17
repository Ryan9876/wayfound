import { NextResponse } from 'next/server';
import { DomainError } from '../domain/errors';
import { logCommandEvent } from '../observability';

const STATUS_BY_CODE: Record<DomainError['code'], number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 400,
  CONFIGURATION: 500,
};

export function requestIdFrom(request: Request): string | null {
  const value = request.headers.get('Idempotency-Key')?.trim();
  return value || null;
}

export function commandErrorResponse(error: unknown, context: { requestId: string; operation: string; projectId?: string; actorId?: string }): NextResponse {
  if (error instanceof DomainError) {
    logCommandEvent({ ...context, result: error.code === 'CONFLICT' ? 'conflict' : error.code === 'FORBIDDEN' ? 'forbidden' : 'failed', errorCode: error.code });
    return NextResponse.json({ error: { code: error.code, message: error.message, details: error.details } }, { status: STATUS_BY_CODE[error.code] });
  }
  logCommandEvent({ ...context, result: 'failed', errorCode: 'INTERNAL' });
  return NextResponse.json({ error: { code: 'INTERNAL', message: 'Wayfound could not complete this command.' } }, { status: 500 });
}
