import { NextResponse } from 'next/server';
import { requireActor } from '@/server/auth/actor';
import { getProject } from '@/server/persistence/store';
import { commandErrorResponse } from '@/server/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const { projectId } = await context.params;
  try {
    const actor = await requireActor();
    return NextResponse.json({ project: await getProject(actor.actorId, projectId) });
  } catch (error) {
    return commandErrorResponse(error, { requestId, operation: 'get-project', projectId });
  }
}
