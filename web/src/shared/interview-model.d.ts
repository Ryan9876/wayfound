export type InterviewOption = {
  id: string;
  label: string;
  detail: string;
  tradeoff: string;
  recommended?: boolean;
};

export type InterviewRecommendation = {
  optionId: string;
  reason: string;
};

export type InterviewQuestion = {
  id: string;
  priority: number;
  required: boolean;
  stateLabel: string;
  summaryLabel: string;
  stage: string;
  prompt: string;
  help: string;
  why: string;
  options: InterviewOption[];
  recommendation?: InterviewRecommendation | null;
};

export type InterviewState = {
  idea: string;
  started: boolean;
  currentQuestionId: string | null;
  history: string[];
  complete: boolean;
  answers: Record<string, string>;
};

export type InterviewRecord = {
  id: string;
  type: 'decision' | 'assumption' | 'blocker' | 'open-question';
  status: 'accepted' | 'open';
  title: string;
  statement: string;
  detail: string;
  source: string;
  recommended?: boolean;
  questionId?: string;
};

export const QUESTION_BANK: InterviewQuestion[];
export function classifyIdea(idea?: string): string[];
export function createInitialState(): InterviewState;
export function getQuestion(questionId: string): InterviewQuestion | null;
export function getResolvedQuestion(state: InterviewState, questionId: string): InterviewQuestion | null;
export function getSelectedOption(state: InterviewState, questionId: string): InterviewOption | null;
export function getApplicableQuestions(state: InterviewState): InterviewQuestion[];
export function getNextQuestion(state: InterviewState): InterviewQuestion | null;
export function selectAnswer(state: InterviewState, questionId: string, optionId: string): InterviewState;
export function startInterview(state: InterviewState): InterviewState;
export function advanceInterview(state: InterviewState): InterviewState;
export function goBackInterview(state: InterviewState): InterviewState;
export function reviewInterview(state: InterviewState): InterviewState;
export function deriveProjectState(state: InterviewState): {
  assumptions: string[];
  blockers: string[];
  openQuestions: string[];
};
export function getProgress(state: InterviewState): { answered: number; total: number; percent: number };
export function isInterviewComplete(state: InterviewState): boolean;
export function getInterviewRecords(state: InterviewState): InterviewRecord[];
export function getSummary(state: InterviewState): {
  idea: string;
  tags: string[];
  decisions: Array<{ id: string; label: string; value: string }>;
};
