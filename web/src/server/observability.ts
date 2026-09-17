type CommandLog = {
  requestId: string;
  operation: string;
  result: 'started' | 'succeeded' | 'failed' | 'conflict' | 'forbidden';
  projectId?: string;
  actorId?: string;
  errorCode?: string;
};

export function logCommandEvent(event: CommandLog): void {
  // Do not add project titles, starting ideas, answers, artifact text, or unrestricted user content here.
  console.info(JSON.stringify({ event: 'wayfound.command', ...event }));
}
