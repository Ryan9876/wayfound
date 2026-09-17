import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { artifactContentHash, normalizeSemanticKey, requireCapability, requireCurrentSourceRevisions, requireExpectedVersion, validateProjectText } from '../domain/project-rules';
import { invalid, notFound } from '../domain/errors';
import { getPool, withTransaction } from './db';

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

async function readReceipt<T>(client: PoolClient, actorId: string, operation: string, requestId: string): Promise<T | null> {
  const result = await client.query<{ result_json: T }>(
    `SELECT result_json FROM command_receipts WHERE actor_id = $1 AND operation = $2 AND request_id = $3`,
    [actorId, operation, requestId],
  );
  return result.rows[0]?.result_json ?? null;
}

async function writeReceipt(client: PoolClient, input: { actorId: string; projectId?: string; operation: string; requestId: string; result: unknown }): Promise<void> {
  await client.query(
    `INSERT INTO command_receipts (id, actor_id, project_id, operation, request_id, result_json)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [randomUUID(), input.actorId, input.projectId ?? null, input.operation, input.requestId, JSON.stringify(input.result)],
  );
}

async function lockProject(client: PoolClient, projectId: string, actorId: string): Promise<{ version: number; role: 'owner' }> {
  const result = await client.query<{ version: string | number; role: 'owner' }>(
    `SELECT p.version, m.role
       FROM projects p
       JOIN project_memberships m ON m.project_id = p.id
      WHERE p.id = $1 AND m.actor_id = $2
      FOR UPDATE OF p`,
    [projectId, actorId],
  );
  const row = result.rows[0];
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

  return withTransaction(async (client) => {
    const prior = await readReceipt<{ projectId: string; interviewRunId: string; version: number }>(client, input.actorId, 'create-project', input.requestId);
    if (prior) return prior;

    const projectId = randomUUID();
    const interviewRunId = randomUUID();
    await client.query(
      `INSERT INTO projects (id, title, starting_idea, lifecycle_state, version, created_by_actor_id)
       VALUES ($1, $2, $3, 'active', 1, $4)`,
      [projectId, title, startingIdea, input.actorId],
    );
    await client.query(
      `INSERT INTO project_memberships (project_id, actor_id, role) VALUES ($1, $2, 'owner')`,
      [projectId, input.actorId],
    );
    await client.query(
      `INSERT INTO interview_runs (id, project_id, routing_version, status) VALUES ($1, $2, 'm2-v1', 'active')`,
      [interviewRunId, projectId],
    );
    await client.query(
      `INSERT INTO state_transitions (id, project_id, object_type, object_id, prior_state, resulting_state, actor_id, operation, request_id)
       VALUES ($1, $2, 'project', $2, NULL, 'active', $3, 'create-project', $4)`,
      [randomUUID(), projectId, input.actorId, input.requestId],
    );
    const result = { projectId, interviewRunId, version: 1 };
    await writeReceipt(client, { actorId: input.actorId, projectId, operation: 'create-project', requestId: input.requestId, result });
    return result;
  });
}

export async function listProjects(actorId: string): Promise<ProjectSummary[]> {
  const result = await getPool().query<{
    id: string; title: string; starting_idea: string; lifecycle_state: string; version: string | number; created_at: Date;
  }>(
    `SELECT p.id, p.title, p.starting_idea, p.lifecycle_state, p.version, p.created_at
       FROM projects p
       JOIN project_memberships m ON m.project_id = p.id
      WHERE m.actor_id = $1
      ORDER BY p.created_at DESC`,
    [actorId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    startingIdea: row.starting_idea,
    lifecycleState: row.lifecycle_state,
    version: Number(row.version),
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getProject(actorId: string, projectId: string): Promise<ProjectDetail> {
  const projectResult = await getPool().query<{
    id: string; title: string; starting_idea: string; lifecycle_state: string; version: string | number; created_at: Date;
  }>(
    `SELECT p.id, p.title, p.starting_idea, p.lifecycle_state, p.version, p.created_at
       FROM projects p
       JOIN project_memberships m ON m.project_id = p.id
      WHERE p.id = $1 AND m.actor_id = $2`,
    [projectId, actorId],
  );
  const project = projectResult.rows[0];
  if (!project) throw notFound('Project was not found or is not available to this actor.');

  const [recordResult, artifactResult] = await Promise.all([
    getPool().query<{ id: string; record_key: string; record_type: string; revision_id: string; title: string; statement: string }>(
      `SELECT r.id, r.record_key, r.record_type, rr.id AS revision_id, rr.title, rr.statement
         FROM records r JOIN record_revisions rr ON rr.id = r.current_revision_id
        WHERE r.project_id = $1 ORDER BY r.record_key`, [projectId]),
    getPool().query<{ id: string; artifact_key: string; kind: string; lifecycle_state: string; revision_id: string; title: string; statement: string }>(
      `SELECT a.id, a.artifact_key, a.kind, a.lifecycle_state, ar.id AS revision_id, ar.title, ar.statement
         FROM artifacts a JOIN artifact_revisions ar ON ar.id = a.current_revision_id
        WHERE a.project_id = $1 ORDER BY a.artifact_key`, [projectId]),
  ]);

  return {
    id: project.id,
    title: project.title,
    startingIdea: project.starting_idea,
    lifecycleState: project.lifecycle_state,
    version: Number(project.version),
    createdAt: project.created_at.toISOString(),
    records: recordResult.rows.map((row) => ({ id: row.id, key: row.record_key, type: row.record_type, revisionId: row.revision_id, title: row.title, statement: row.statement })),
    artifacts: artifactResult.rows.map((row) => ({ id: row.id, key: row.artifact_key, kind: row.kind, state: row.lifecycle_state, revisionId: row.revision_id, title: row.title, statement: row.statement })),
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

  return withTransaction(async (client) => {
    const prior = await readReceipt<{ projectVersion: number; answerRevisionId: string; recordRevisionId: string; recordKey: string }>(client, input.actorId, 'accept-interview-answer', input.requestId);
    if (prior) return prior;

    const project = await lockProject(client, input.projectId, input.actorId);
    requireCapability(project.role, 'project.write');
    requireExpectedVersion(project.version, input.expectedVersion);

    const runResult = await client.query<{ id: string }>(
      `SELECT id FROM interview_runs WHERE project_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
      [input.projectId],
    );
    const interviewRunId = runResult.rows[0]?.id;
    if (!interviewRunId) throw notFound('No active Interview run exists for this project.');

    const answerResult = await client.query<{ id: string; current_revision_id: string | null }>(
      `SELECT id, current_revision_id FROM answers WHERE interview_run_id = $1 AND question_key = $2 FOR UPDATE`,
      [interviewRunId, questionKey],
    );
    let answerId = answerResult.rows[0]?.id;
    let priorAnswerRevisionId = answerResult.rows[0]?.current_revision_id ?? null;
    if (!answerId) {
      answerId = randomUUID();
      await client.query(
        `INSERT INTO answers (id, project_id, interview_run_id, question_key) VALUES ($1, $2, $3, $4)`,
        [answerId, input.projectId, interviewRunId, questionKey],
      );
    }
    let answerRevisionNumber = 1;
    if (priorAnswerRevisionId) {
      const rev = await client.query<{ revision_number: number }>(`SELECT revision_number FROM answer_revisions WHERE id = $1`, [priorAnswerRevisionId]);
      answerRevisionNumber = Number(rev.rows[0].revision_number) + 1;
    }
    const answerRevisionId = randomUUID();
    await client.query(
      `INSERT INTO answer_revisions (id, answer_id, revision_number, option_key, actor_id, predecessor_revision_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [answerRevisionId, answerId, answerRevisionNumber, optionKey, input.actorId, priorAnswerRevisionId],
    );
    await client.query(`UPDATE answers SET current_revision_id = $1 WHERE id = $2`, [answerRevisionId, answerId]);

    const recordResult = await client.query<{ id: string; current_revision_id: string | null }>(
      `SELECT id, current_revision_id FROM records WHERE project_id = $1 AND record_key = $2 FOR UPDATE`,
      [input.projectId, recordKey],
    );
    let recordId = recordResult.rows[0]?.id;
    const priorRecordRevisionId = recordResult.rows[0]?.current_revision_id ?? null;
    if (!recordId) {
      recordId = randomUUID();
      await client.query(
        `INSERT INTO records (id, project_id, record_key, record_type) VALUES ($1, $2, $3, 'decision')`,
        [recordId, input.projectId, recordKey],
      );
    }
    let recordRevisionNumber = 1;
    if (priorRecordRevisionId) {
      const rev = await client.query<{ revision_number: number }>(`SELECT revision_number FROM record_revisions WHERE id = $1`, [priorRecordRevisionId]);
      recordRevisionNumber = Number(rev.rows[0].revision_number) + 1;
    }
    const recordRevisionId = randomUUID();
    await client.query(
      `INSERT INTO record_revisions (id, record_id, revision_number, title, statement, source_answer_revision_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [recordRevisionId, recordId, recordRevisionNumber, recordTitle, recordStatement, answerRevisionId],
    );
    await client.query(`UPDATE records SET current_revision_id = $1 WHERE id = $2`, [recordRevisionId, recordId]);
    await client.query(
      `INSERT INTO trace_links (id, project_id, from_revision_type, from_revision_id, to_revision_type, to_revision_id, relation)
       VALUES ($1, $2, 'answer', $3, 'record', $4, 'produced')`,
      [randomUUID(), input.projectId, answerRevisionId, recordRevisionId],
    );

    const projectVersion = project.version + 1;
    await client.query(`UPDATE projects SET version = $1, updated_at = now() WHERE id = $2`, [projectVersion, input.projectId]);
    await client.query(
      `INSERT INTO state_transitions (id, project_id, object_type, object_id, revision_id, prior_state, resulting_state, actor_id, operation, request_id)
       VALUES ($1, $2, 'answer', $3, $4, 'accepted', 'accepted', $5, 'accept-interview-answer', $6)`,
      [randomUUID(), input.projectId, answerId, answerRevisionId, input.actorId, input.requestId],
    );
    const result = { projectVersion, answerRevisionId, recordRevisionId, recordKey };
    await writeReceipt(client, { actorId: input.actorId, projectId: input.projectId, operation: 'accept-interview-answer', requestId: input.requestId, result });
    return result;
  });
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

  return withTransaction(async (client) => {
    const prior = await readReceipt<{ projectVersion: number; artifactId: string; artifactRevisionId: string; status: 'proposed' }>(client, input.actorId, 'propose-artifact', input.requestId);
    if (prior) return prior;

    const project = await lockProject(client, input.projectId, input.actorId);
    requireCapability(project.role, 'artifact.propose');
    requireExpectedVersion(project.version, input.expectedVersion);

    const currentSourceResult = await client.query<{ id: string }>(
      `SELECT rr.id
         FROM record_revisions rr
         JOIN records r ON r.id = rr.record_id
        WHERE r.project_id = $1
          AND rr.id = ANY($2::uuid[])
          AND r.current_revision_id = rr.id`,
      [input.projectId, sourceRecordRevisionIds],
    );
    requireCurrentSourceRevisions(sourceRecordRevisionIds, currentSourceResult.rows.map((row) => row.id));

    const artifactResult = await client.query<{ id: string; current_revision_id: string | null; lifecycle_state: 'draft' | 'proposed' | 'set-aside' }>(
      `SELECT id, current_revision_id, lifecycle_state FROM artifacts WHERE project_id = $1 AND artifact_key = $2 FOR UPDATE`,
      [input.projectId, artifactKey],
    );
    let artifactId = artifactResult.rows[0]?.id;
    const priorRevisionId = artifactResult.rows[0]?.current_revision_id ?? null;
    const priorState = artifactResult.rows[0]?.lifecycle_state ?? 'draft';
    if (!artifactId) {
      artifactId = randomUUID();
      await client.query(
        `INSERT INTO artifacts (id, project_id, artifact_key, kind, lifecycle_state) VALUES ($1, $2, $3, $4, 'draft')`,
        [artifactId, input.projectId, artifactKey, input.kind],
      );
    }
    let revisionNumber = 1;
    if (priorRevisionId) {
      const rev = await client.query<{ revision_number: number }>(`SELECT revision_number FROM artifact_revisions WHERE id = $1`, [priorRevisionId]);
      revisionNumber = Number(rev.rows[0].revision_number) + 1;
    }
    const artifactRevisionId = randomUUID();
    const contentHash = artifactContentHash({ title, statement, sourceRecordRevisionIds });
    await client.query(
      `INSERT INTO artifact_revisions (id, artifact_id, revision_number, title, statement, content_hash, created_by_actor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [artifactRevisionId, artifactId, revisionNumber, title, statement, contentHash, input.actorId],
    );
    for (const sourceRevisionId of [...new Set(sourceRecordRevisionIds)]) {
      await client.query(
        `INSERT INTO trace_links (id, project_id, from_revision_type, from_revision_id, to_revision_type, to_revision_id, relation)
         VALUES ($1, $2, 'record', $3, 'artifact', $4, 'supports')`,
        [randomUUID(), input.projectId, sourceRevisionId, artifactRevisionId],
      );
    }
    await client.query(
      `UPDATE artifacts SET current_revision_id = $1, lifecycle_state = 'proposed', updated_at = now() WHERE id = $2`,
      [artifactRevisionId, artifactId],
    );
    const projectVersion = project.version + 1;
    await client.query(`UPDATE projects SET version = $1, updated_at = now() WHERE id = $2`, [projectVersion, input.projectId]);
    await client.query(
      `INSERT INTO state_transitions (id, project_id, object_type, object_id, revision_id, prior_state, resulting_state, actor_id, operation, request_id)
       VALUES ($1, $2, 'artifact', $3, $4, $5, 'proposed', $6, 'propose-artifact', $7)`,
      [randomUUID(), input.projectId, artifactId, artifactRevisionId, priorState, input.actorId, input.requestId],
    );
    const result = { projectVersion, artifactId, artifactRevisionId, status: 'proposed' as const };
    await writeReceipt(client, { actorId: input.actorId, projectId: input.projectId, operation: 'propose-artifact', requestId: input.requestId, result });
    return result;
  });
}
