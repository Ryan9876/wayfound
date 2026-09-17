import { randomUUID } from 'node:crypto';
import { artifactContentHash, normalizeSemanticKey, requireCapability, requireCurrentSourceRevisions, requireExpectedVersion, validateProjectText } from '../domain/project-rules';
import { invalid, notFound } from '../domain/errors';
import { getLocalDatabase } from './local-db';

export type ProjectSummary = {
  id: string;
  title: string;
  startingIdea: string;
  lifecycleState: string;
  version: number;
  createdAt: string;
};

export type ProjectDetail = ProjectSummary & {
  records: Array<{ id: string; key: string; type: string; revisionId: string; title: string; statement: string }>;
  artifacts: Array<{ id: string; key: string; kind: string; state: string; revisionId: string; title: string; statement: string }>;
};

function readReceipt<T>(actorId: string, operation: string, requestId: string): T | null {
  const row = getLocalDatabase().prepare(
    `SELECT result_json FROM command_receipts WHERE actor_id = ? AND operation = ? AND request_id = ?`,
  ).get(actorId, operation, requestId) as { result_json: string } | undefined;
  return row ? JSON.parse(row.result_json) as T : null;
}

function writeReceipt(input: { actorId: string; projectId?: string; operation: string; requestId: string; result: unknown }): void {
  getLocalDatabase().prepare(
    `INSERT INTO command_receipts (id, actor_id, project_id, operation, request_id, result_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), input.actorId, input.projectId ?? null, input.operation, input.requestId, JSON.stringify(input.result));
}

function requireLocalProject(projectId: string, actorId: string): { version: number; role: 'owner' } {
  const row = getLocalDatabase().prepare(
    `SELECT p.version, m.role
       FROM projects p
       JOIN project_memberships m ON m.project_id = p.id
      WHERE p.id = ? AND m.actor_id = ?`,
  ).get(projectId, actorId) as { version: number; role: 'owner' } | undefined;
  if (!row) throw notFound('Project was not found or is not available to this actor.');
  return { version: Number(row.version), role: row.role };
}

export async function createProject(input: {
  actorId: string;
  title: unknown;
  startingIdea: unknown;
  requestId: string;
}): Promise<{ projectId: string; interviewRunId: string; version: number }> {
  const title = validateProjectText(input.title, 'title', 120);
  const startingIdea = validateProjectText(input.startingIdea, 'startingIdea', 8_000);
  const db = getLocalDatabase();

  const transaction = db.transaction(() => {
    const prior = readReceipt<{ projectId: string; interviewRunId: string; version: number }>(input.actorId, 'create-project', input.requestId);
    if (prior) return prior;

    const projectId = randomUUID();
    const interviewRunId = randomUUID();
    db.prepare(
      `INSERT INTO projects (id, title, starting_idea, lifecycle_state, version, created_by_actor_id)
       VALUES (?, ?, ?, 'active', 1, ?)`,
    ).run(projectId, title, startingIdea, input.actorId);
    db.prepare(`INSERT INTO project_memberships (project_id, actor_id, role) VALUES (?, ?, 'owner')`).run(projectId, input.actorId);
    db.prepare(
      `INSERT INTO interview_runs (id, project_id, routing_version, status) VALUES (?, ?, 'm2-local-v1', 'active')`,
    ).run(interviewRunId, projectId);
    db.prepare(
      `INSERT INTO state_transitions (id, project_id, object_type, object_id, prior_state, resulting_state, actor_id, operation, request_id)
       VALUES (?, ?, 'project', ?, NULL, 'active', ?, 'create-project', ?)`,
    ).run(randomUUID(), projectId, projectId, input.actorId, input.requestId);
    const result = { projectId, interviewRunId, version: 1 };
    writeReceipt({ actorId: input.actorId, projectId, operation: 'create-project', requestId: input.requestId, result });
    return result;
  });

  return transaction();
}

export async function listProjects(actorId: string): Promise<ProjectSummary[]> {
  const rows = getLocalDatabase().prepare(
    `SELECT p.id, p.title, p.starting_idea, p.lifecycle_state, p.version, p.created_at
       FROM projects p
       JOIN project_memberships m ON m.project_id = p.id
      WHERE m.actor_id = ?
      ORDER BY p.created_at DESC`,
  ).all(actorId) as Array<{
    id: string; title: string; starting_idea: string; lifecycle_state: string; version: number; created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    startingIdea: row.starting_idea,
    lifecycleState: row.lifecycle_state,
    version: Number(row.version),
    createdAt: row.created_at,
  }));
}

export async function getProject(actorId: string, projectId: string): Promise<ProjectDetail> {
  const db = getLocalDatabase();
  const project = db.prepare(
    `SELECT p.id, p.title, p.starting_idea, p.lifecycle_state, p.version, p.created_at
       FROM projects p
       JOIN project_memberships m ON m.project_id = p.id
      WHERE p.id = ? AND m.actor_id = ?`,
  ).get(projectId, actorId) as {
    id: string; title: string; starting_idea: string; lifecycle_state: string; version: number; created_at: string;
  } | undefined;
  if (!project) throw notFound('Project was not found or is not available to this actor.');

  const records = db.prepare(
    `SELECT r.id, r.record_key, r.record_type, rr.id AS revision_id, rr.title, rr.statement
       FROM records r JOIN record_revisions rr ON rr.id = r.current_revision_id
      WHERE r.project_id = ? ORDER BY r.record_key`,
  ).all(projectId) as Array<{ id: string; record_key: string; record_type: string; revision_id: string; title: string; statement: string }>;
  const artifacts = db.prepare(
    `SELECT a.id, a.artifact_key, a.kind, a.lifecycle_state, ar.id AS revision_id, ar.title, ar.statement
       FROM artifacts a JOIN artifact_revisions ar ON ar.id = a.current_revision_id
      WHERE a.project_id = ? ORDER BY a.artifact_key`,
  ).all(projectId) as Array<{ id: string; artifact_key: string; kind: string; lifecycle_state: string; revision_id: string; title: string; statement: string }>;

  return {
    id: project.id,
    title: project.title,
    startingIdea: project.starting_idea,
    lifecycleState: project.lifecycle_state,
    version: Number(project.version),
    createdAt: project.created_at,
    records: records.map((row) => ({ id: row.id, key: row.record_key, type: row.record_type, revisionId: row.revision_id, title: row.title, statement: row.statement })),
    artifacts: artifacts.map((row) => ({ id: row.id, key: row.artifact_key, kind: row.kind, state: row.lifecycle_state, revisionId: row.revision_id, title: row.title, statement: row.statement })),
  };
}

export async function acceptInterviewAnswer(input: {
  actorId: string;
  projectId: string;
  expectedVersion: number;
  questionKey: unknown;
  optionKey: unknown;
  recordTitle: unknown;
  recordStatement: unknown;
  requestId: string;
}): Promise<{ projectVersion: number; answerRevisionId: string; recordRevisionId: string; recordKey: string }> {
  const questionKey = validateProjectText(input.questionKey, 'questionKey', 80);
  const optionKey = validateProjectText(input.optionKey, 'optionKey', 120);
  const recordTitle = validateProjectText(input.recordTitle, 'recordTitle', 180);
  const recordStatement = validateProjectText(input.recordStatement, 'recordStatement', 4_000);
  const recordKey = normalizeSemanticKey(questionKey, 'DEC');
  const db = getLocalDatabase();

  const transaction = db.transaction(() => {
    const prior = readReceipt<{ projectVersion: number; answerRevisionId: string; recordRevisionId: string; recordKey: string }>(input.actorId, 'accept-interview-answer', input.requestId);
    if (prior) return prior;

    const project = requireLocalProject(input.projectId, input.actorId);
    requireCapability(project.role, 'project.write');
    requireExpectedVersion(project.version, input.expectedVersion);

    const run = db.prepare(
      `SELECT id FROM interview_runs WHERE project_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
    ).get(input.projectId) as { id: string } | undefined;
    if (!run) throw notFound('No active Interview run exists for this project.');

    let answer = db.prepare(
      `SELECT id, current_revision_id FROM answers WHERE interview_run_id = ? AND question_key = ?`,
    ).get(run.id, questionKey) as { id: string; current_revision_id: string | null } | undefined;
    if (!answer) {
      const id = randomUUID();
      db.prepare(`INSERT INTO answers (id, project_id, interview_run_id, question_key) VALUES (?, ?, ?, ?)`).run(id, input.projectId, run.id, questionKey);
      answer = { id, current_revision_id: null };
    }

    let answerRevisionNumber = 1;
    if (answer.current_revision_id) {
      const row = db.prepare(`SELECT revision_number FROM answer_revisions WHERE id = ?`).get(answer.current_revision_id) as { revision_number: number };
      answerRevisionNumber = Number(row.revision_number) + 1;
    }
    const answerRevisionId = randomUUID();
    db.prepare(
      `INSERT INTO answer_revisions (id, answer_id, revision_number, option_key, actor_id, predecessor_revision_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(answerRevisionId, answer.id, answerRevisionNumber, optionKey, input.actorId, answer.current_revision_id);
    db.prepare(`UPDATE answers SET current_revision_id = ? WHERE id = ?`).run(answerRevisionId, answer.id);

    let record = db.prepare(
      `SELECT id, current_revision_id FROM records WHERE project_id = ? AND record_key = ?`,
    ).get(input.projectId, recordKey) as { id: string; current_revision_id: string | null } | undefined;
    if (!record) {
      const id = randomUUID();
      db.prepare(`INSERT INTO records (id, project_id, record_key, record_type) VALUES (?, ?, ?, 'decision')`).run(id, input.projectId, recordKey);
      record = { id, current_revision_id: null };
    }

    let recordRevisionNumber = 1;
    if (record.current_revision_id) {
      const row = db.prepare(`SELECT revision_number FROM record_revisions WHERE id = ?`).get(record.current_revision_id) as { revision_number: number };
      recordRevisionNumber = Number(row.revision_number) + 1;
    }
    const recordRevisionId = randomUUID();
    db.prepare(
      `INSERT INTO record_revisions (id, record_id, revision_number, title, statement, source_answer_revision_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(recordRevisionId, record.id, recordRevisionNumber, recordTitle, recordStatement, answerRevisionId);
    db.prepare(`UPDATE records SET current_revision_id = ? WHERE id = ?`).run(recordRevisionId, record.id);
    db.prepare(
      `INSERT INTO trace_links (id, project_id, from_revision_type, from_revision_id, to_revision_type, to_revision_id, relation)
       VALUES (?, ?, 'answer', ?, 'record', ?, 'produced')`,
    ).run(randomUUID(), input.projectId, answerRevisionId, recordRevisionId);

    const projectVersion = project.version + 1;
    db.prepare(`UPDATE projects SET version = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`).run(projectVersion, input.projectId);
    db.prepare(
      `INSERT INTO state_transitions (id, project_id, object_type, object_id, revision_id, prior_state, resulting_state, actor_id, operation, request_id)
       VALUES (?, ?, 'answer', ?, ?, 'accepted', 'accepted', ?, 'accept-interview-answer', ?)`,
    ).run(randomUUID(), input.projectId, answer.id, answerRevisionId, input.actorId, input.requestId);
    const result = { projectVersion, answerRevisionId, recordRevisionId, recordKey };
    writeReceipt({ actorId: input.actorId, projectId: input.projectId, operation: 'accept-interview-answer', requestId: input.requestId, result });
    return result;
  });

  return transaction();
}

export async function proposeArtifact(input: {
  actorId: string;
  projectId: string;
  expectedVersion: number;
  artifactKey: unknown;
  kind: 'requirement' | 'work-item';
  title: unknown;
  statement: unknown;
  sourceRecordRevisionIds: unknown;
  requestId: string;
}): Promise<{ projectVersion: number; artifactId: string; artifactRevisionId: string; status: 'proposed' }> {
  const artifactKey = normalizeSemanticKey(validateProjectText(input.artifactKey, 'artifactKey', 80), input.kind === 'requirement' ? 'REQ' : 'WORK');
  const title = validateProjectText(input.title, 'title', 180);
  const statement = validateProjectText(input.statement, 'statement', 8_000);
  if (!Array.isArray(input.sourceRecordRevisionIds) || input.sourceRecordRevisionIds.some((id) => typeof id !== 'string')) {
    throw invalid('sourceRecordRevisionIds must be an array of revision identifiers.');
  }
  const sourceRecordRevisionIds = input.sourceRecordRevisionIds as string[];
  const db = getLocalDatabase();

  const transaction = db.transaction(() => {
    const prior = readReceipt<{ projectVersion: number; artifactId: string; artifactRevisionId: string; status: 'proposed' }>(input.actorId, 'propose-artifact', input.requestId);
    if (prior) return prior;

    const project = requireLocalProject(input.projectId, input.actorId);
    requireCapability(project.role, 'artifact.propose');
    requireExpectedVersion(project.version, input.expectedVersion);

    const currentRows = db.prepare(
      `SELECT rr.id FROM record_revisions rr JOIN records r ON r.id = rr.record_id
        WHERE r.project_id = ? AND r.current_revision_id = rr.id`,
    ).all(input.projectId) as Array<{ id: string }>;
    const requested = new Set(sourceRecordRevisionIds);
    const currentRequested = currentRows.map((row) => row.id).filter((id) => requested.has(id));
    requireCurrentSourceRevisions(sourceRecordRevisionIds, currentRequested);

    let artifact = db.prepare(
      `SELECT id, current_revision_id, lifecycle_state FROM artifacts WHERE project_id = ? AND artifact_key = ?`,
    ).get(input.projectId, artifactKey) as { id: string; current_revision_id: string | null; lifecycle_state: 'draft' | 'proposed' | 'set-aside' } | undefined;
    if (!artifact) {
      const id = randomUUID();
      db.prepare(`INSERT INTO artifacts (id, project_id, artifact_key, kind, lifecycle_state) VALUES (?, ?, ?, ?, 'draft')`).run(id, input.projectId, artifactKey, input.kind);
      artifact = { id, current_revision_id: null, lifecycle_state: 'draft' };
    }

    let revisionNumber = 1;
    if (artifact.current_revision_id) {
      const row = db.prepare(`SELECT revision_number FROM artifact_revisions WHERE id = ?`).get(artifact.current_revision_id) as { revision_number: number };
      revisionNumber = Number(row.revision_number) + 1;
    }
    const artifactRevisionId = randomUUID();
    const contentHash = artifactContentHash({ title, statement, sourceRecordRevisionIds });
    db.prepare(
      `INSERT INTO artifact_revisions (id, artifact_id, revision_number, title, statement, content_hash, created_by_actor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(artifactRevisionId, artifact.id, revisionNumber, title, statement, contentHash, input.actorId);

    for (const sourceRevisionId of [...new Set(sourceRecordRevisionIds)]) {
      db.prepare(
        `INSERT INTO trace_links (id, project_id, from_revision_type, from_revision_id, to_revision_type, to_revision_id, relation)
         VALUES (?, ?, 'record', ?, 'artifact', ?, 'supports')`,
      ).run(randomUUID(), input.projectId, sourceRevisionId, artifactRevisionId);
    }

    db.prepare(
      `UPDATE artifacts SET current_revision_id = ?, lifecycle_state = 'proposed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
    ).run(artifactRevisionId, artifact.id);
    const projectVersion = project.version + 1;
    db.prepare(`UPDATE projects SET version = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`).run(projectVersion, input.projectId);
    db.prepare(
      `INSERT INTO state_transitions (id, project_id, object_type, object_id, revision_id, prior_state, resulting_state, actor_id, operation, request_id)
       VALUES (?, ?, 'artifact', ?, ?, ?, 'proposed', ?, 'propose-artifact', ?)`,
    ).run(randomUUID(), input.projectId, artifact.id, artifactRevisionId, artifact.lifecycle_state, input.actorId, input.requestId);
    const result = { projectVersion, artifactId: artifact.id, artifactRevisionId, status: 'proposed' as const };
    writeReceipt({ actorId: input.actorId, projectId: input.projectId, operation: 'propose-artifact', requestId: input.requestId, result });
    return result;
  });

  return transaction();
}
