import { DurableInterview } from './durable-interview';

export function ProjectCheckpoint({ projectId }: { projectId: string }): React.ReactNode {
  return <DurableInterview projectId={projectId} />;
}
