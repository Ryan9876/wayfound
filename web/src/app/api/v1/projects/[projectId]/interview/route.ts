import { NextResponse } from 'next/server';
import { requireActor } from '@/server/auth/actor';
import { commandErrorResponse, requestIdFrom } from '@/server/http/response';
import { invalid } from '@/server/domain/errors';
import { logCommandEvent } from '@/server/observability';
import { getDurableInterview, saveDurableInterviewAnswer } from '@/server/interview/durable-interview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }): Promise<NextResponse> {
  const { projectId } = await context.params;
  try {
    const actor = await requireActor();
    const interview = await getDurableInterview(actor.actorId, projectId);
    return NextResponse.json({ interview });
  } catch (error) {
    return commandErrorResponse(error, { operation: 'get-durable-interview', projectId });
  }
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }): Promise<NextResponse> {
  const requestId = requestIdFrom(request) ?? crypto.randomUUID();
  const { projectId } = await context.params;
  try {
    if (!request.headers.get('Idempotency-Key')) throw invalid('Idempotency-Key header is required.');
    const actor = await requireActor();
    const body = await request.json();
    logCommandEvent({ requestId, operation: 'save-durable-interview-answer', result: 'started', actorId: actor.actorId, projectId });
    const result = await saveDurableInterviewAnswer({
      actorId: actor.actorId,
      projectId,
      expectedVersion: body.expectedVersion,
      questionKey: body.questionKey,
      optionKey: body.optionKey,
      requestId,
    });
    logCommandEvent({ requestId, operation: 'save-durable-interview-answer', result: 'succeeded', actorId: actor.actorId, projectId });
    return NextResponse.json(result);
  } catch (error) {
    return commandErrorResponse(error, { requestId, operation: 'save-durable-interview-answer', projectId });
  }
}
