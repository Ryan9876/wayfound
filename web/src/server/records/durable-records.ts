import {
  createInitialState,
  getInterviewRecords,
  type InterviewRecord,
  type InterviewState,
} from '@/shared/interview-model.js';
import { getDurableInterview } from '@/server/interview/durable-interview';
import { getLocalDatabase } from '@/server/persistence/local-db';

export type DurableRecordEvidence =
  | {
      kind: 'saved';
      answerRevisionId: string;
      recordRevisionId: string;
    }
  | {
      kind: 'derived';
    };

export type DurableProjectedRecord = InterviewRecord & {
  evidence: DurableRecordEvidence;
};

export type DurableRecordsSnapshot = {
  projectId: string;
  title: string;
  startingIdea: string;
  version: number;
  counts: {
    decisions: number;
    assumptions: number;
    blockers: number;
    openQuestions: number;
  };
  records: DurableProjectedRecord[];
};

type EvidenceRow = {
  question_key: string;
  answer_revision_id: string;
  record_revision_id: string;
};

function projectState(startingIdea: string, answers: Array<{ questionKey: string; optionKey: string }>): InterviewState {
  return {
    ...createInitialState(),
    idea: startingIdea,
    started: true,
    answers: Object.fromEntries(answers.map((answer) => [answer.questionKey, answer.optionKey])),
  };
}

function readAnswerBackedEvidence(projectId: string): Map<string, { answerRevisionId: string; recordRevisionId: string }> {
  const rows = getLocalDatabase().prepare(
    `SELECT a.question_key,
            ar.id AS answer_revision_id,
            rr.id AS record_revision_id
       FROM answers a
       JOIN answer_revisions ar ON ar.id = a.current_revision_id
       JOIN record_revisions rr ON rr.source_answer_revision_id = ar.id
       JOIN records r ON r.id = rr.record_id AND r.current_revision_id = rr.id
      WHERE a.project_id = ?
      ORDER BY a.question_key`,
  ).all(projectId) as EvidenceRow[];

  return new Map(rows.map((row) => [
    row.question_key,
    {
      answerRevisionId: row.answer_revision_id,
      recordRevisionId: row.record_revision_id,
    },
  ]));
}

export async function getDurableRecords(actorId: string, projectId: string): Promise<DurableRecordsSnapshot> {
  const interview = await getDurableInterview(actorId, projectId);
  const state = projectState(interview.startingIdea, interview.answers);
  const projected = getInterviewRecords(state);
  const evidence = readAnswerBackedEvidence(projectId);

  const records: DurableProjectedRecord[] = projected.map((record) => {
    const saved = record.questionId ? evidence.get(record.questionId) : undefined;
    return {
      ...record,
      evidence: saved
        ? {
            kind: 'saved' as const,
            answerRevisionId: saved.answerRevisionId,
            recordRevisionId: saved.recordRevisionId,
          }
        : { kind: 'derived' as const },
    };
  });

  return {
    projectId,
    title: interview.title,
    startingIdea: interview.startingIdea,
    version: interview.version,
    counts: {
      decisions: records.filter((record) => record.type === 'decision').length,
      assumptions: records.filter((record) => record.type === 'assumption').length,
      blockers: records.filter((record) => record.type === 'blocker').length,
      openQuestions: records.filter((record) => record.type === 'open-question').length,
    },
    records,
  };
}
