import { configurationError } from '../domain/errors';
import * as local from './local-project-store';
import * as postgres from './project-store';

export type PersistenceMode = 'local' | 'postgres';

export function persistenceMode(): PersistenceMode {
  const configured = process.env.WAYFOUND_PERSISTENCE_MODE?.trim().toLowerCase();
  if (!configured || configured === 'local') return 'local';
  if (configured === 'postgres') return 'postgres';
  throw configurationError(`Unsupported WAYFOUND_PERSISTENCE_MODE: ${configured}`);
}

function selectedStore() {
  return persistenceMode() === 'local' ? local : postgres;
}

export const createProject: typeof local.createProject = (input) => selectedStore().createProject(input);
export const listProjects: typeof local.listProjects = (actorId) => selectedStore().listProjects(actorId);
export const getProject: typeof local.getProject = (actorId, projectId) => selectedStore().getProject(actorId, projectId);
export const acceptInterviewAnswer: typeof local.acceptInterviewAnswer = (input) => selectedStore().acceptInterviewAnswer(input);
export const proposeArtifact: typeof local.proposeArtifact = (input) => selectedStore().proposeArtifact(input);
