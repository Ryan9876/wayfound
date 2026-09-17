import { SignInButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { ProjectWorkspace } from './project-workspace';
import { identityMode, requireActor } from '@/server/auth/actor';
import { listProjects } from '@/server/persistence/store';
import { isClerkConfigured } from '@/server/config';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage(): Promise<React.ReactNode> {
  if (identityMode() === 'clerk') {
    if (!isClerkConfigured()) {
      return <main className="shell"><section className="card"><h1>Hosted identity needs setup.</h1><p>Local Wayfound does not require Clerk. Configure Clerk only when you intentionally enable hosted identity.</p></section></main>;
    }
    const { userId } = await auth();
    if (!userId) {
      return <main className="shell"><section className="card"><h1>Sign in to open hosted projects.</h1><SignInButton mode="modal"><button className="button primary">Sign in</button></SignInButton></section></main>;
    }
  }

  const actor = await requireActor();
  const projects = await listProjects(actor.actorId);
  return <ProjectWorkspace initialProjects={projects} />;
}
