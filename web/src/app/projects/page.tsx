import { SignInButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { ProjectWorkspace } from './project-workspace';
import { ensureActorAndList } from './queries';
import { isClerkConfigured } from '@/server/config';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage(): Promise<React.ReactNode> {
  if (!isClerkConfigured()) {
    return <main className="shell"><section className="card"><h1>Projects are almost ready.</h1><p>Configure Clerk and a non-production development database first.</p></section></main>;
  }
  const { userId } = await auth();
  if (!userId) {
    return <main className="shell"><section className="card"><h1>Sign in to open your projects.</h1><SignInButton mode="modal"><button className="button primary">Sign in</button></SignInButton></section></main>;
  }
  const projects = await ensureActorAndList(userId);
  return <ProjectWorkspace initialProjects={projects} />;
}
