import { randomUUID } from 'node:crypto';
import {
  createInitialState,
  getApplicableQuestions,
  getProgress,
  getQuestion,
  getResolvedQuestion,
  isInterviewComplete,
  type InterviewState,
} from '@/shared/interview-model.js';
import { invalid, notFound } from '@/server/domain/errors';
import { normalizeSemanticKey, requireCapability, requireExpectedVersion } from '@/server/domain/project-rules';
import { getLocalDatabase } from '@/server/persistence/local-db';

export type DurableInterviewAnswer = {
  questionKey: string;
  optionKey: string;
  revisionId: string;
  revisionNumber: number;
};

export type DurableInterviewSnapshot = {
  projectId: string;
  title: string;
  startingIdea: string;
  version: number;
  answers: DurableInterviewAnswer[];
  complete: boolean;
  progress: { answered: number; total: number; percent: number };
};

type ProjectAuthority = {
  title: string;
  startingIdea: string;
  version: number;
  role: 'owner';
};

function requireProject(projectId: string, actorId: string): ProjectAuthority {
  const row = getLocalDatabase().prepare(
    `SELECT p.title, p.starting_idea, p.version, m.role
       FROM projects p
       JOIN project_memberships m ON m.project_id = p.id
      WHERE p.id = ? AND m.actor_id = ?`,
  ).get(projectId, actorId) as {
    title: string;
    starting_idea: string;
    version: number;
    role: 'owner';
  } | undefined;
  if (!row) throw notFound('Project was not found or is not available to this actor.');
  return {
    title: row.title,
    startingIdea: row.starting_idea,
    version: Number(row.version),
    role: row.role,
  };
}

function readCurrentAnswers(projectId: string): DurableInterviewAnswer[] {
  const rows = getLocalDatabase().prepare(
    `SELECT a.question_key, ar.option_key, ar.id AS revision_id, ar.revision_number
       FROM answers a
       JOIN answer_revisions ar ON ar.id = a.current_revision_id
      WHERE a.project_id = ?
      ORDER BY a.created_at, a.question_key`,
  ).all(projectId) as Array<{
    question_key: string;
    option_key: string;
    revision_id: string;
    revision_number: number;
  }>;
  return rows.map((row) => ({
    questionKey: row.question_key,
    optionKey: row.option_key,
    revisionId: row.revision_id,
    revisionNumber: Number(row.revision_number),
  }));
}

function modelState(startingIdea: string, answers: DurableInterviewAnswer[]): InterviewState {
  const state = createInitialState();
  return {
    ...state,
    idea: startingIdea,
    started: true,
    answers: Object.fromEntries(answers.map((answer) => [answer.questionKey, answer.optionKey])),
  };
}

export async function getDurableInterview(actorId: string, projectId: string): Promise<DurableInterviewSnapshot> {
  const project = requireProject(projectId, actorId);
  requireCapability(project.role, 'project.read');
  const answers = readCurrentAnswers(projectId);
  const state = modelState(project.startingIdea, answers);
  return {
    projectId,
    title: project.title,
    startingIdea: project.startingIdea,
    version: project.version,
    answers,
    complete: isInterviewComplete(state),
    progress: getProgress(state),
  };
}

function readReceipt<T>(actorId: string, operation: string, requestId: string): T | null {
  const row = getLocalDatabase().prepare(
    `SELECT result_json FROM command_receipts WHERE actor_id = ? AND operation = ? AND request_id = ?`,
  ).get(actorId, operation, requestId) as { result_json: string } | undefined;
  return row ? JSON.parse(row.result_json) as T : null;
}

function writeReceipt(input: { actorId: string; projectId: string; operation: string; requestId: string; result: unknown }): void {
  getLocalDatabase().prepare(
    `INSERT INTO command_receipts (id, actor_id, project_id, operation, request_id, result_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), input.actorId, input.projectId, input.operation, input.requestId, JSON.stringify(input.result));
}

export async function saveDurableInterviewAnswer(input: {
  actorId: string;
  projectId: string;
  expectedVersion: number;
  questionKey: unknown;
  optionKey: unknown;
  requestId: string;
}): Promise<{
  projectVersion: number;
  answerRevisionId: string;
  recordRevisionId: string;
  recordType: 'decision' | 'open-question';
  complete: boolean;
}> {
  if (typeof input.questionKey !== 'string' || !input.questionKey.trim()) throw invalid('questionKey is required.');
  if (typeof input.optionKey !== 'string' || !input.optionKey.trim()) throw invalid('optionKey is required.');
  const questionKey = input.questionKey.trim();
  const optionKey = input.optionKey.trim();
  const db = getLocalDatabase();

  const transaction = db.transaction(() => {
    const prior = readReceipt<{
      projectVersion: number;
      answerRevisionId: string;
      recordRevisionId: string;
      recordType: 'decision' | 'open-question';
      complete: boolean;
    }>(input.actorId, 'save-durable-interview-answer', input.requestId);
    if (prior) return prior;

    const project = requireProject(input.projectId, input.actorId);
    requireCapability(project.role, 'project.write');
    requireExpectedVersion(project.version, input.expectedVersion);

    const currentAnswers = readCurrentAnswers(input.projectId);
    const state = modelState(project.startingIdea, currentAnswers);
    const applicable = new Set(getApplicableQuestions(state).map((question) => question.id));
    if (!applicable.has(questionKey)) throw invalid('That Interview question is not currently applicable.');

    const question = getQuestion(questionKey);
    const resolved = getResolvedQuestion(state, questionKey);
    const option = resolved?.options.find((candidate) => candidate.id === optionKey);
    if (!question || !option) throw invalid('That option does not belong to the current Interview question.');

    const run = db.prepare(
      `SELECT id FROM interview_runs WHERE project_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
    ).get(input.projectId) as { id: string } | undefined;
    if (!run) throw notFound('No active Interview run exists for this project.');

    let answer = db.prepare(
      `SELECT id, current_revision_id FROM answers WHERE interview_run_id = ? AND question_key = ?`,
    ).get(run.id, questionKey) as { id: string; current_revision_id: string | null } | undefined;
    if (!answer) {
      const id = randomUUID();
      db.prepare(`INSERT INTO answers (id, project_id, interview_run_id, question_key) VALUES (?, ?, ?, ?)`).run(
        id,
        input.projectId,
        run.id,
        questionKey,
      );
      answer = { id, current_revision_id: null };
    }

    let answerRevisionNumber = 1;
    if (answer.current_revision_id) {
      const priorRevision = db.prepare(`SELECT revision_number FROM answer_revisions WHERE id = ?`).get(answer.current_revision_id) as { revision_number: number };
      answerRevisionNumber = Number(priorRevision.revision_number) + 1;
    }
    const answerRevisionId = randomUUID();
    db.prepare(
      `INSERT INTO answer_revisions (id, answer_id, revision_number, option_key, actor_id, predecessor_revision_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(answerRevisionId, answer.id, answerRevisionNumber, optionKey, input.actorId, answer.current_revision_id);
    db.prepare(`UPDATE answers SET current_revision_id = ? WHERE id = ?`).run(answerRevisionId, answer.id);

    const recordKey = normalizeSemanticKey(questionKey, 'INT');
    const recordType: 'decision' | 'open-question' = optionKey === 'not-sure' ? 'open-question' : 'decision';
    const recordTitle = question.stateLabel ?? question.stage;
    const recordStatement = recordType === 'open-question' ? question.prompt : option.label;

    let record = db.prepare(
      `SELECT id, current_revision_id FROM records WHERE project_id = ? AND record_key = ?`,
    ).get(input.projectId, recordKey) as { id: string; current_revision_id: string | null } | undefined;
    if (!record) {
      const id = randomUUID();
      db.prepare(`INSERT INTO records (id, project_id, record_key, record_type) VALUES (?, ?, ?, ?)`).run(
        id,
        input.projectId,
        recordKey,
        recordType,
      );
      record = { id, current_revision_id: null };
    } else {
      db.prepare(`UPDATE records SET record_type = ? WHERE id = ?`).run(recordType, record.id);
    }

    let recordRevisionNumber = 1;
    if (record.current_revision_id) {
      const priorRecord = db.prepare(`SELECT revision_number FROM record_revisions WHERE id = ?`).get(record.current_revision_id) as { revision_number: number };
      recordRevisionNumber = Number(priorRecord.revision_number) + 1;
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
    db.prepare(`UPDATE projects SET version = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`).run(
      projectVersion,
      input.projectId,
    );

    const nextState = modelState(project.startingIdea, [
      ...currentAnswers.filter((answerItem) => answerItem.questionKey !== questionKey),
      { questionKey, optionKey, revisionId: answerRevisionId, revisionNumber: answerRevisionNumber },
    ]);
    const complete = isInterviewComplete(nextState);
    db.prepare(
      `INSERT INTO state_transitions (id, project_id, object_type, object_id, revision_id, prior_state, resulting_state, actor_id, operation, request_id)
       VALUES (?, ?, 'answer', ?, ?, ?, ?, ?, 'save-durable-interview-answer', ?)`,
    ).run(
      randomUUID(),
      input.projectId,
      answer.id,
      answerRevisionId,
      answer.current_revision_id ? 'accepted' : null,
      recordType === 'open-question' ? 'unresolved' : 'accepted',
      input.actorId,
      input.requestId,
    );

    const result = { projectVersion, answerRevisionId, recordRevisionId, recordType, complete };
    writeReceipt({ actorId: input.actorId, projectId: input.projectId, operation: 'save-durable-interview-answer', requestId: input.requestId, result });
    return result;
  });

  return transaction();
}
