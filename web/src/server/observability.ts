type CommandLog = {
  requestId: string;
  operation: string;
  result: 'started' | 'succeeded' | 'failed' | 'conflict' | 'forbidden';
  projectId?: string;
  actorId?: string;
  errorCode?: string;
};

export function logCommandEvent(event: CommandLog): void {
  const { requestId, operation, result, projectId, actorId, errorCode } = event;
  // Only approved metadata fields are emitted. Do not add project titles, starting ideas,
  // answers, artifact text, or unrestricted user content here.
  console.info(JSON.stringify({
    event: 'wayfound.command',
    requestId,
    operation,
    result,
    ...(projectId ? { projectId } : {}),
    ...(actorId ? { actorId } : {}),
    ...(errorCode ? { errorCode } : {}),
  }));
}
