import { NextResponse } from 'next/server';
import { requireActor } from '@/server/auth/clerk-actor';
import { proposeArtifact } from '@/server/persistence/project-store';
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
    logCommandEvent({ requestId, operation: 'propose-artifact', result: 'started', actorId: actor.actorId, projectId });
    const result = await proposeArtifact({
      actorId: actor.actorId,
      projectId,
      expectedVersion: body.expectedVersion,
      artifactKey: body.artifactKey,
      kind: body.kind,
      title: body.title,
      statement: body.statement,
      sourceRecordRevisionIds: body.sourceRecordRevisionIds,
      requestId,
    });
    logCommandEvent({ requestId, operation: 'propose-artifact', result: 'succeeded', actorId: actor.actorId, projectId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return commandErrorResponse(error, { requestId, operation: 'propose-artifact', projectId });
  }
}
