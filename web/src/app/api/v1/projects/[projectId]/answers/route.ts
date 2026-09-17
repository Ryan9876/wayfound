import { NextResponse } from 'next/server';
import { requireActor } from '@/server/auth/actor';
import { acceptInterviewAnswer } from '@/server/persistence/store';
import { commandErrorResponse, requestIdFrom } from '@/server/http/response';
import { invalid } from '@/server/domain/errors';
import { logCommandEvent } from '@/server/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }): Promise<NextResponse> {
  const requestId = requestIdFrom(request) ?? crypto.randomUUID();
  const { projectId } = await context.params;
  try {
    if (!request.headers.get('Idempotency-Key')) throw invalid('Idempotency-Key header is required.');
    const actor = await requireActor();
    const body = await request.json();
    logCommandEvent({ requestId, operation: 'accept-interview-answer', result: 'started', actorId: actor.actorId, projectId });
    const result = await acceptInterviewAnswer({
      actorId: actor.actorId,
      projectId,
      expectedVersion: body.expectedVersion,
      questionKey: body.questionKey,
      optionKey: body.optionKey,
      recordTitle: body.recordTitle,
      recordStatement: body.recordStatement,
      requestId,
    });
    logCommandEvent({ requestId, operation: 'accept-interview-answer', result: 'succeeded', actorId: actor.actorId, projectId });
    return NextResponse.json(result);
  } catch (error) {
    return commandErrorResponse(error, { requestId, operation: 'accept-interview-answer', projectId });
  }
}
