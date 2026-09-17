import { ProjectCheckpoint } from './project-checkpoint';

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }): Promise<React.ReactNode> {
  const { projectId } = await params;
  return <ProjectCheckpoint projectId={projectId} />;
}
