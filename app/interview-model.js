const IDEA_TAG_RULES = [
  { tag: 'game', pattern: /\b(game|gaming|player|level|quest|puzzle|play|multiplayer|character|boss)\b/i },
  { tag: 'learning', pattern: /\b(study|school|class|learn|learning|homework|quiz|teacher|student|flashcard|practice)\b/i },
  { tag: 'automation', pattern: /\b(ai|agent|assistant|automate|automation|autonomous|bot|copilot|remediation)\b/i },
  { tag: 'integration', pattern: /\b(apis?|integration|connect|sync|import|export|database|service|website|web site|nnmi|thousandeyes|jira|sensor)\b/i },
  { tag: 'physical', pattern: /\b(hardware|sensor|motor|pump|thermostat|arduino|raspberry pi|device controller|robotics)\b/i },
  { tag: 'collaboration', pattern: /\b(team|family|friends|classmates|community|shared|share|collaborate|collaboration|multiplayer)\b/i },
  { tag: 'private-data', pattern: /\b(account|login|profile|personal|student|family|email|message|private|password|location)\b/i },
  { tag: 'technical', pattern: /\b(network|server|infrastructure|incident|developer|code|coding|apis?|database|cloud|router|switch)\b/i }
];

const hasTag = (state, tag) => classifyIdea(state.idea).includes(tag);
const answerIs = (state, questionId, optionIds) => {
  const values = Array.isArray(optionIds) ? optionIds : [optionIds];
  return values.includes(state.answers[questionId]);
};
const always = () => true;

export const QUESTION_BANK = [
  {
    id: 'outcome',
    priority: 100,
    required: true,
    stateLabel: 'What success looks like',
    summaryLabel: 'What matters most',
    stage: 'Find the goal',
    prompt: 'If this works really well, what would make you happiest about it?',
    help: 'Pick the result you would most want to protect when choices get tricky.',
    why: 'This gives Wayfound a compass. Later choices can be checked against what you said matters most.',
    applies: always,
    recommend: (state) => {
      if (hasTag(state, 'game')) return { optionId: 'enjoy', reason: 'Your idea sounds like something people will play, so enjoyment is a useful first compass.' };
      if (hasTag(state, 'learning')) return { optionId: 'learn', reason: 'Your idea sounds learning-focused, so the clearest first win is helping someone understand or practice something.' };
      if (hasTag(state, 'automation')) return { optionId: 'save-effort', reason: 'Automation earns its keep by removing effort people should not have to repeat.' };
      return { optionId: 'easier', reason: 'Making an important thing easier is a broad, testable starting point when the idea is still taking shape.' };
    },
    options: [
      { id: 'enjoy', label: 'People enjoy using it', detail: 'Good for games, creative ideas, experiences, or anything where delight is part of the point.', tradeoff: 'Fun is real, but you will need a concrete way to notice whether people are actually enjoying it.' },
      { id: 'learn', label: 'It helps someone learn or understand', detail: 'Good for study tools, explanations, practice, or teaching.', tradeoff: 'A nice-looking answer is not enough; the person should understand more afterward.' },
      { id: 'save-effort', label: 'It saves time or repeat work', detail: 'Good when people are doing the same annoying thing again and again.', tradeoff: 'Automation can save time and also automate mistakes impressively fast.' },
      { id: 'easier', label: 'It makes something easier to do or manage', detail: 'Good for tools, trackers, organizers, and practical helpers.', tradeoff: '“Easier” needs a specific task behind it or it turns into fog.' },
      { id: 'better-decision', label: 'It helps someone make a better decision', detail: 'Good for research, troubleshooting, comparisons, and guided choices.', tradeoff: 'The system needs trustworthy evidence, not just confident-sounding answers.' },
      { id: 'not-sure', label: 'I am not sure yet', detail: 'That is allowed. Wayfound will keep it visible instead of making up an answer.', tradeoff: 'Some later choices may stay fuzzy until the main outcome is clearer.' }
    ]
  },
  {
    id: 'audience',
    priority: 95,
    required: true,
    stateLabel: 'Who it is for',
    summaryLabel: 'Who it is for first',
    stage: 'Pick the first people',
    prompt: 'Who is this for first?',
    help: 'You can grow the audience later. For now, pick the smallest real group you want to make happy.',
    why: 'A clear first audience makes features, language, difficulty, and testing much easier to decide.',
    applies: always,
    recommend: () => ({ optionId: 'small-group', reason: 'A small real audience is usually easier to learn from than “everyone on Earth, ideally by Tuesday.”' }),
    options: [
      { id: 'just-me', label: 'Mostly me', detail: 'You are the first real user.', tradeoff: 'You know what you mean, which can hide confusing parts that other people would notice.' },
      { id: 'small-group', label: 'A small group of people', detail: 'Friends, family, classmates, coworkers, or a few testers.', tradeoff: 'Feedback will be useful but may not represent a much larger audience.' },
      { id: 'specific-kind', label: 'A specific kind of person', detail: 'For example: puzzle fans, sixth graders, network engineers, gardeners, or guitar beginners.', tradeoff: 'A sharper audience usually means saying no to some other use cases for now.' },
      { id: 'anyone', label: 'Anyone who wants to use it', detail: 'A broad public audience from the start.', tradeoff: 'Designing for everyone can quietly become designing for nobody in particular.' },
      { id: 'not-sure', label: 'I am not sure yet', detail: 'Keep the audience open for now.', tradeoff: 'Some design choices will stay harder until you know who you are optimizing for.' }
    ]
  },
  {
    id: 'game-loop',
    priority: 90,
    required: true,
    stateLabel: 'Main play activity',
    summaryLabel: 'Main play activity',
    stage: 'Find the fun part',
    prompt: 'What will someone spend most of their time doing in the game?',
    help: 'Pick the thing that should still be fun even if the fancy extras vanish for a while.',
    why: 'The main play activity controls what the first playable version actually needs.',
    applies: (state) => hasTag(state, 'game'),
    recommend: (state) => {
      if (/\bpuzzle|solve|clue\b/i.test(state.idea)) return { optionId: 'solve', reason: 'Your idea mentions puzzles or clues, so solving challenges looks like the strongest core loop.' };
      if (/\bexplore|planet|world|discover\b/i.test(state.idea)) return { optionId: 'explore', reason: 'Your idea emphasizes a place or discovery, so exploration looks like the strongest starting loop.' };
      return { optionId: 'experience', reason: 'When the core loop is not obvious yet, start by defining the experience you want the player to remember.' };
    },
    options: [
      { id: 'explore', label: 'Explore and discover things', detail: 'Move through places, uncover secrets, or find new things.', tradeoff: 'Exploration needs enough meaningful discovery that walking around does not become the whole game.' },
      { id: 'solve', label: 'Solve puzzles or overcome challenges', detail: 'Think, experiment, combine clues, or master a mechanic.', tradeoff: 'Difficulty has to feel fair enough that “challenging” does not become “where did my afternoon go?”' },
      { id: 'build', label: 'Build, create, or customize', detail: 'Make things and express ideas through the game.', tradeoff: 'Creation systems can grow huge quickly; the first toolset needs a firm boundary.' },
      { id: 'compete', label: 'Compete or cooperate with other people', detail: 'Play with or against other players.', tradeoff: 'Multiplayer adds people-shaped complexity: identity, fairness, connection problems, and moderation.' },
      { id: 'experience', label: 'Experience a story, mood, or world', detail: 'The feeling and journey matter more than a single mechanic.', tradeoff: 'You still need enough interaction that the player is doing more than politely watching.' },
      { id: 'not-sure', label: 'I am not sure yet', detail: 'Keep the core loop open and treat it as a discovery item.', tradeoff: 'A playable prototype should answer this before the project gets very large.' }
    ]
  },
  {
    id: 'learning-mode',
    priority: 90,
    required: true,
    stateLabel: 'Learning job',
    summaryLabel: 'Learning job',
    stage: 'Choose the learning job',
    prompt: 'What kind of help should it give someone who is learning?',
    help: 'Choose the main job first. A future version can do more than one.',
    why: 'Explaining, practicing, organizing, and creating are different learning experiences and need different designs.',
    applies: (state) => hasTag(state, 'learning'),
    recommend: (state) => {
      if (/\bquiz|flashcard|practice|test\b/i.test(state.idea)) return { optionId: 'practice', reason: 'Your idea sounds practice-oriented, so active recall is the clearest first job.' };
      if (/\bhomework|organize|planner|assignment\b/i.test(state.idea)) return { optionId: 'organize', reason: 'Your idea sounds organization-focused, so helping someone see and manage the work is the clearest first job.' };
      return { optionId: 'explain', reason: 'When the learning job is still broad, helping someone understand one thing well is a useful starting point.' };
    },
    options: [
      { id: 'explain', label: 'Explain something clearly', detail: 'Help someone understand a topic, idea, or confusing step.', tradeoff: 'An explanation can sound clear without proving the learner actually understood it.' },
      { id: 'practice', label: 'Help someone practice', detail: 'Questions, drills, flashcards, examples, or feedback.', tradeoff: 'Practice needs the right difficulty and feedback or it can teach the wrong thing repeatedly.' },
      { id: 'organize', label: 'Help someone organize the work', detail: 'Track assignments, notes, goals, or study plans.', tradeoff: 'Organization tools can become another thing to organize if they ask for too much upkeep.' },
      { id: 'create', label: 'Help someone make something', detail: 'Reports, projects, presentations, experiments, or creative work.', tradeoff: 'The tool should support learning, not quietly do all of the learning for the person.' },
      { id: 'not-sure', label: 'I am not sure yet', detail: 'Keep the learning job open for now.', tradeoff: 'The first prototype will need one main learning job before it can be meaningfully tested.' }
    ]
  },
  {
    id: 'collaboration',
    priority: 85,
    required: true,
    stateLabel: 'Sharing and editing',
    summaryLabel: 'Sharing and editing',
    stage: 'Decide who shares what',
    prompt: 'Will more than one person share or change things?',
    help: 'This is about the first version, not every future possibility.',
    why: 'Multiple people can change ownership, permissions, conflicts, privacy, and what “saved” means.',
    applies: (state) => hasTag(state, 'collaboration'),
    recommend: () => ({ optionId: 'small-shared', reason: 'A small known group is the simplest way to learn whether sharing is actually useful before adding public-community complexity.' }),
    options: [
      { id: 'one-person', label: 'No, one person uses their own stuff', detail: 'No shared editing in the first version.', tradeoff: 'Simple now, but future collaboration may require a different data model.' },
      { id: 'view-only', label: 'Other people can view it', detail: 'One person owns it; others can look.', tradeoff: 'You still need to decide what is safe to share and how access is granted.' },
      { id: 'small-shared', label: 'A small group can work together', detail: 'Known people can add or change shared things.', tradeoff: 'Shared editing needs ownership and conflict rules even when everyone is nice.' },
      { id: 'public', label: 'It is public or community-based', detail: 'Many people can participate or publish.', tradeoff: 'Public systems add moderation, abuse, identity, privacy, and scale concerns very quickly.' },
      { id: 'not-sure', label: 'I am not sure yet', detail: 'Keep collaboration open as a decision.', tradeoff: 'Do not commit to a shared data model until this is clearer.' }
    ]
  },
  {
    id: 'control',
    priority: 80,
    required: true,
    stateLabel: 'What it can do',
    summaryLabel: 'How much it can do itself',
    stage: 'Set the control level',
    prompt: 'How much should it do on its own?',
    help: 'This sets the line between “help me,” “do it for me,” and “please do not press that button without asking.”',
    why: 'Automation changes permissions, review, failure behavior, and what needs a safety net.',
    applies: (state) => hasTag(state, 'automation'),
    recommend: () => ({ optionId: 'risk-based', reason: 'Letting low-risk, reversible actions proceed while asking before consequential actions is a strong default for automation.' }),
    options: [
      { id: 'guidance-only', label: 'Give advice, but do not take action', detail: 'It explains what to do and a person does it.', tradeoff: 'Safest, but it leaves more work with the person.' },
      { id: 'ask-important', label: 'Ask before doing anything important', detail: 'Routine assistance is fine; important actions need a person.', tradeoff: 'The system needs a clear definition of “important.”' },
      { id: 'risk-based', label: 'Let it act when the risk is low', detail: 'Small, reversible actions can happen automatically. Bigger actions ask first.', tradeoff: 'Wayfound has to know the difference between “harmless” and “uh-oh.”' },
      { id: 'mostly-autonomous', label: 'Mostly run on its own', detail: 'It handles most actions and asks for help when something unusual happens.', tradeoff: 'More autonomy means stronger guardrails, evidence, recovery, and monitoring.' },
      { id: 'not-sure', label: 'I am not sure yet', detail: 'Keep the autonomy boundary open.', tradeoff: 'Do not grant broad permissions until this is settled.' }
    ]
  },
  {
    id: 'dependencies',
    priority: 75,
    required: true,
    stateLabel: 'Outside pieces',
    summaryLabel: 'Outside pieces',
    stage: 'Spot the outside pieces',
    prompt: 'How should the first version handle the things it depends on?',
    help: 'This could be another app, a website, a device, a file, a service, or an API.',
    why: 'Outside pieces can disappear, change, break, or need permission. Wayfound tracks that before it becomes a surprise.',
    applies: (state) => hasTag(state, 'integration') || hasTag(state, 'physical'),
    recommend: () => ({ optionId: 'record-and-check', reason: 'Using confirmed facts and explicitly checking the rest avoids silently building architecture on guesses.' }),
    options: [
      { id: 'record-and-check', label: 'Write down what is known and check the rest', detail: 'Use confirmed facts now. Turn unknown access, limits, or compatibility into things to check.', tradeoff: 'Some dependent work may have to wait for an answer.' },
      { id: 'assume-normal', label: 'Assume the connection will work normally', detail: 'Move ahead using the most likely setup, then confirm it later.', tradeoff: 'Fast now, but a wrong assumption can invalidate later work.' },
      { id: 'core-first', label: 'Build the core idea first', detail: 'Keep the first version independent and connect outside pieces later.', tradeoff: 'A later integration may force changes if the first version ignored important constraints.' },
      { id: 'manual-first', label: 'Use a simple manual handoff first', detail: 'Start with files, copy/paste, or another simple bridge before automating it.', tradeoff: 'Manual steps are slower and need a clear point where automation becomes worthwhile.' },
      { id: 'not-sure', label: 'I am not sure yet', detail: 'Keep the dependency approach open.', tradeoff: 'Work that depends on the unknown connection should stay visibly tentative.' }
    ]
  },
  {
    id: 'privacy',
    priority: 70,
    required: true,
    stateLabel: 'Private information',
    summaryLabel: 'Private information',
    stage: 'Protect people’s stuff',
    prompt: 'Will it handle anything people would reasonably expect to stay private?',
    help: 'Think about accounts, messages, school information, location, personal details, or shared family data.',
    why: 'Privacy changes what should be collected, stored, shared, logged, and sent to outside services.',
    applies: (state) => hasTag(state, 'private-data') || answerIs(state, 'collaboration', ['view-only', 'small-shared', 'public']),
    recommend: () => ({ optionId: 'minimize', reason: 'When privacy might matter, the safest useful starting point is to collect the least information the idea actually needs.' }),
    options: [
      { id: 'none', label: 'No private information is needed', detail: 'The first version can work without personal or sensitive data.', tradeoff: 'Good. Keep it that way unless a real requirement changes it.' },
      { id: 'minimize', label: 'Maybe, so collect as little as possible', detail: 'Use only the information required for the first useful version.', tradeoff: 'Some convenience features may need to wait until privacy rules are clearer.' },
      { id: 'yes', label: 'Yes, private information is part of the idea', detail: 'Privacy and access rules need to be designed deliberately.', tradeoff: 'This adds real responsibility: storage, access, deletion, consent, and possibly age-related controls.' },
      { id: 'not-sure', label: 'I am not sure yet', detail: 'Treat privacy as an open decision.', tradeoff: 'Do not store or send potentially private information until this is resolved.' }
    ]
  },
  {
    id: 'failure',
    priority: 65,
    required: true,
    stateLabel: 'When things go wrong',
    summaryLabel: 'When something fails',
    stage: 'Plan for the weird day',
    prompt: 'What should happen when an important part stops working?',
    help: 'Pick the default. Specific parts can use a different rule later.',
    why: 'Things fail. Deciding what “safe failure” looks like now is much nicer than inventing it during a crisis.',
    applies: (state) => hasTag(state, 'integration') || hasTag(state, 'physical') || answerIs(state, 'control', ['ask-important', 'risk-based', 'mostly-autonomous']),
    recommend: () => ({ optionId: 'safe-degrade', reason: 'Keeping unaffected parts available while clearly showing what is missing is a strong default for most recoverable failures.' }),
    options: [
      { id: 'safe-degrade', label: 'Keep going safely and explain what is missing', detail: 'Keep the parts that still work available and clearly show what is unavailable.', tradeoff: 'You have to design what “partly working” looks like.' },
      { id: 'stop', label: 'Stop until it is fixed', detail: 'Do not continue when the missing piece could make the result unsafe or misleading.', tradeoff: 'Safer for high-consequence work, but one failure can stop everything.' },
      { id: 'retry', label: 'Try again automatically', detail: 'Give it a few sensible retries before asking a person for help.', tradeoff: 'Retries need limits or “try again” can become a surprisingly committed lifestyle.' },
      { id: 'user-choice', label: 'Let the person decide what to do next', detail: 'Offer the safe choices that still make sense.', tradeoff: 'The person needs enough context to make a good choice under failure.' },
      { id: 'not-sure', label: 'I am not sure yet', detail: 'Keep failure behavior open.', tradeoff: 'Do not treat the feature as production-ready until important failure behavior is defined.' }
    ]
  },
  {
    id: 'unknowns',
    priority: 40,
    required: true,
    stateLabel: 'Unknowns',
    summaryLabel: 'How to handle unknowns',
    stage: 'Handle the unknowns',
    prompt: 'What should Wayfound do when nobody knows an answer yet?',
    help: 'Not knowing is allowed. The important part is knowing what you do not know.',
    why: 'Wayfound keeps facts, guesses, decisions, and real blockers separate so uncertainty does not quietly turn into “truth.”',
    applies: always,
    recommend: () => ({ optionId: 'record-and-proceed', reason: 'Writing the unknown down and moving forward when it is non-blocking avoids both silent guessing and endless analysis.' }),
    options: [
      { id: 'record-and-proceed', label: 'Write it down and keep moving if it is not blocking anything', detail: 'Unknowns stay visible. Only the ones that truly prevent safe progress stop the work.', tradeoff: 'Wayfound needs a clear test for what actually blocks progress.' },
      { id: 'resolve-first', label: 'Figure out every important unknown first', detail: 'Pause planning until the important missing pieces are answered.', tradeoff: 'Safer for consequential unknowns, but expensive when the unanswered detail would not change the next step.' },
      { id: 'temporary-assumption', label: 'Make a temporary guess and verify it later', detail: 'Keep moving, but mark the guess so it has to be checked later.', tradeoff: 'Temporary guesses have a habit of becoming permanent if nobody owns the follow-up.' },
      { id: 'owner-decides', label: 'Ask the project owner to decide', detail: 'A person decides whether each unknown is accepted, deferred, or blocking.', tradeoff: 'Useful for consequential choices, but not every small unknown deserves a meeting.' }
    ]
  },
  {
    id: 'validation',
    priority: 30,
    required: true,
    stateLabel: 'What counts as done',
    summaryLabel: 'What counts as done',
    stage: 'Decide what “done” means',
    prompt: 'How should Wayfound decide that something is actually done?',
    help: 'Choose the normal rule. Important work can require stronger proof.',
    why: '“I made it” is not always the same as “it works.” Wayfound keeps those states separate.',
    applies: always,
    recommend: () => ({ optionId: 'criteria-tests-review', reason: 'Different ideas need different proof, so combine a clear expected result with the checks that actually fit the work.' }),
    options: [
      { id: 'criteria-tests-review', label: 'Check the expected result, run useful tests, and review important work', detail: 'Confirm the thing behaves as expected, test what makes sense, and review important changes.', tradeoff: 'This takes a little longer than letting the builder grade its own homework.' },
      { id: 'tests-only', label: 'Use automated tests', detail: 'The work is done when the relevant automated checks pass.', tradeoff: 'Tests only prove what they actually test.' },
      { id: 'human-review', label: 'Use human review', detail: 'A person reviews the result against what was expected.', tradeoff: 'Humans notice context well and also occasionally miss things before lunch.' },
      { id: 'self-check', label: 'Let the builder check its own work', detail: 'The same person or agent that built it decides whether it is complete.', tradeoff: 'Fast, but independent checking catches a different class of mistakes.' }
    ]
  }
];

export function classifyIdea(idea = '') {
  const tags = IDEA_TAG_RULES.filter((rule) => rule.pattern.test(idea)).map((rule) => rule.tag);
  return tags.length ? tags : ['general'];
}

export function createInitialState() {
  return {
    idea: '',
    started: false,
    currentQuestionId: null,
    history: [],
    complete: false,
    answers: {}
  };
}

export function getQuestion(questionId) {
  return QUESTION_BANK.find((question) => question.id === questionId) ?? null;
}

export function getResolvedQuestion(state, questionId) {
  const question = getQuestion(questionId);
  if (!question) return null;
  const recommendation = question.recommend?.(state) ?? null;
  return {
    ...question,
    recommendation,
    options: question.options.map((option) => ({
      ...option,
      recommended: recommendation?.optionId === option.id
    }))
  };
}

export function getSelectedOption(state, questionId) {
  const question = getQuestion(questionId);
  const optionId = state.answers[questionId];
  return question?.options.find((option) => option.id === optionId) ?? null;
}

export function getApplicableQuestions(state) {
  return QUESTION_BANK
    .filter((question) => question.applies(state))
    .sort((a, b) => b.priority - a.priority);
}

export function getNextQuestion(state) {
  return getApplicableQuestions(state).find((question) => !state.answers[question.id]) ?? null;
}

export function selectAnswer(state, questionId, optionId) {
  const question = getQuestion(questionId);
  if (!question?.options.some((option) => option.id === optionId)) return state;
  return {
    ...state,
    answers: {
      ...state.answers,
      [questionId]: optionId
    }
  };
}

export function startInterview(state) {
  if (!state.idea.trim()) return state;
  const started = { ...state, started: true, complete: false, history: [], currentQuestionId: null };
  const next = getNextQuestion(started);
  return { ...started, currentQuestionId: next?.id ?? null, complete: !next };
}

export function advanceInterview(state) {
  if (!state.currentQuestionId || !state.answers[state.currentQuestionId]) return state;
  const history = [...state.history, state.currentQuestionId];
  const staged = { ...state, history, currentQuestionId: null };
  const next = getNextQuestion(staged);
  return next
    ? { ...staged, currentQuestionId: next.id, complete: false }
    : { ...staged, currentQuestionId: null, complete: true };
}

export function goBackInterview(state) {
  if (!state.started) return state;
  const history = [...state.history];
  if (state.complete) {
    const previous = history.pop() ?? null;
    return { ...state, complete: false, currentQuestionId: previous, history };
  }
  const previous = history.pop() ?? null;
  if (!previous) {
    return { ...state, started: false, currentQuestionId: null, history: [], complete: false };
  }
  return { ...state, currentQuestionId: previous, history, complete: false };
}

export function reviewInterview(state) {
  const first = getApplicableQuestions(state)[0] ?? null;
  return { ...state, started: true, complete: false, currentQuestionId: first?.id ?? null, history: [] };
}

export function deriveProjectState(state) {
  const assumptions = [];
  const blockers = [];
  const openQuestions = [];
  const applicableIds = new Set(getApplicableQuestions(state).map((question) => question.id));

  if (applicableIds.has('dependencies') && state.answers.dependencies === 'assume-normal') {
    assumptions.push('Outside connection behavior is assumed and still needs verification.');
    blockers.push('Verify the outside connection before dependent work is treated as ready.');
  }
  if (applicableIds.has('dependencies') && state.answers.dependencies === 'core-first') {
    openQuestions.push('Which outside connections will be needed after the core idea is proven?');
  }
  if (applicableIds.has('dependencies') && state.answers.dependencies === 'manual-first') {
    openQuestions.push('When should the manual handoff be replaced with an automated connection?');
  }
  if (state.answers.unknowns === 'temporary-assumption') {
    assumptions.push('Unresolved information may be used temporarily but must be marked for later verification.');
  }
  if (applicableIds.has('control') && state.answers.control === 'mostly-autonomous' && hasTag(state, 'physical')) {
    blockers.push('Define safety boundaries before autonomous actions can affect real-world devices.');
  }

  getApplicableQuestions(state).forEach((question) => {
    if (state.answers[question.id] === 'not-sure') {
      openQuestions.push(`Decide later: ${question.prompt}`);
    }
  });

  return {
    assumptions: [...new Set(assumptions)],
    blockers: [...new Set(blockers)],
    openQuestions: [...new Set(openQuestions)]
  };
}

export function getProgress(state) {
  if (!state.idea.trim()) return { answered: 0, total: 0, percent: 0 };
  const applicable = getApplicableQuestions(state).filter((question) => question.required);
  const answered = applicable.filter((question) => Boolean(state.answers[question.id])).length;
  const percent = Math.min(100, Math.round(12 + (answered / Math.max(applicable.length, 1)) * 88));
  return { answered, total: applicable.length, percent };
}

export function getCoveragePercent(state) {
  return getProgress(state).percent;
}

export function isInterviewComplete(state) {
  if (!state.idea.trim()) return false;
  return getApplicableQuestions(state)
    .filter((question) => question.required)
    .every((question) => Boolean(state.answers[question.id]));
}

export function getSummary(state) {
  const decisions = getApplicableQuestions(state)
    .filter((question) => state.answers[question.id])
    .map((question) => ({
      id: question.id,
      label: question.summaryLabel ?? question.stateLabel ?? question.stage,
      value: getSelectedOption(state, question.id)?.label ?? 'Not decided'
    }));

  return {
    idea: state.idea,
    tags: classifyIdea(state.idea),
    decisions
  };
}
