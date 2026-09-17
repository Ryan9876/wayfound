import { createHash } from 'node:crypto';
import { conflict, forbidden, invalid } from './errors.ts';

export type ProjectRole = 'owner';
export type ProjectCapability = 'project.read' | 'project.write' | 'artifact.propose';
export type M2ArtifactState = 'draft' | 'proposed' | 'set-aside';

const ROLE_CAPABILITIES: Record<ProjectRole, ReadonlySet<ProjectCapability>> = {
  owner: new Set<ProjectCapability>(['project.read', 'project.write', 'artifact.propose']),
};

export function requireCapability(role: ProjectRole | null, capability: ProjectCapability): void {
  if (!role || !ROLE_CAPABILITIES[role].has(capability)) {
    throw forbidden(`Missing project capability: ${capability}`);
  }
}

export function requireExpectedVersion(actualVersion: number, expectedVersion: number): void {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw invalid('expectedVersion must be a positive integer.');
  }
  if (actualVersion !== expectedVersion) {
    throw conflict('Project state changed. Reload before trying again.', {
      expectedVersion,
      actualVersion,
    });
  }
}

export function normalizeSemanticKey(value: string, prefix: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  if (!normalized) throw invalid('A semantic key is required.');
  return `${prefix}-${normalized}`;
}

export function requireCurrentSourceRevisions(
  requestedRevisionIds: readonly string[],
  currentRevisionIds: readonly string[],
): void {
  const requested = [...new Set(requestedRevisionIds)].sort();
  const current = [...new Set(currentRevisionIds)].sort();
  if (requested.length === 0) throw invalid('At least one source record revision is required.');
  if (requested.length !== current.length || requested.some((id, index) => id !== current[index])) {
    throw conflict('One or more source records changed. Rebuild the draft before proposing it.');
  }
}

export function artifactContentHash(input: {
  title: string;
  statement: string;
  sourceRecordRevisionIds: readonly string[];
}): string {
  const payload = JSON.stringify({
    title: input.title.trim(),
    statement: input.statement.trim(),
    sourceRecordRevisionIds: [...new Set(input.sourceRecordRevisionIds)].sort(),
  });
  return createHash('sha256').update(payload).digest('hex');
}

export function requireM2ArtifactTransition(from: M2ArtifactState, to: M2ArtifactState): void {
  const allowed =
    (from === 'draft' && (to === 'proposed' || to === 'set-aside')) ||
    ((from === 'proposed' || from === 'set-aside') && to === 'draft');
  if (!allowed) {
    throw invalid(`M2 does not allow artifact transition ${from} -> ${to}.`);
  }
}

export function validateProjectText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw invalid(`${field} must be text.`);
  const trimmed = value.trim();
  if (!trimmed) throw invalid(`${field} is required.`);
  if (trimmed.length > maxLength) throw invalid(`${field} is too long.`);
  return trimmed;
}
