import { configurationError } from '../domain/errors';
import { getOrCreateLocalActor } from '../persistence/local-actor-store';
import { requireActor as requireClerkActor } from './clerk-actor';

export type ActorContext = {
  actorId: string;
  externalSubject: string;
  actorType: 'human';
};

export type IdentityMode = 'local' | 'clerk';

export function identityMode(): IdentityMode {
  const configured = process.env.WAYFOUND_IDENTITY_MODE?.trim().toLowerCase();
  if (!configured || configured === 'local') return 'local';
  if (configured === 'clerk') return 'clerk';
  throw configurationError(`Unsupported WAYFOUND_IDENTITY_MODE: ${configured}`);
}

export async function requireActor(): Promise<ActorContext> {
  if (identityMode() === 'local') return getOrCreateLocalActor();
  return requireClerkActor();
}
