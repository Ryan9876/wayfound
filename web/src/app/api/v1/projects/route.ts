import { NextResponse } from 'next/server';
import { requireActor } from '@/server/auth/actor';
import { createProject, listProjects } from '@/server/persistence/store';
import { commandErrorResponse, requestIdFrom } from '@/server/http/response';
import { invalid } from '@/server/domain/errors';
import { logCommandEvent } from '@/server/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireActor();
    return NextResponse.json({ projects: await listProjects(actor.actorId) });
  } catch (error) {
    return commandErrorResponse(error, { requestId: crypto.randomUUID(), operation: 'list-projects' });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = requestIdFrom(request) ?? crypto.randomUUID();
  try {
    if (!request.headers.get('Idempotency-Key')) throw invalid('Idempotency-Key header is required.');
    const actor = await requireActor();
    const body = await request.json();
    logCommandEvent({ requestId, operation: 'create-project', result: 'started', actorId: actor.actorId });
    const result = await createProject({ actorId: actor.actorId, title: body.title, startingIdea: body.startingIdea, requestId });
    logCommandEvent({ requestId, operation: 'create-project', result: 'succeeded', actorId: actor.actorId, projectId: result.projectId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return commandErrorResponse(error, { requestId, operation: 'create-project' });
  }
}
