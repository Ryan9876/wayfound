export const QUESTION_BANK = [
  {
    id: 'outcome',
    stage: 'Find the goal',
    prompt: 'What matters most if this idea works well?',
    help: 'Pick the result you would most want to protect when choices get tricky.',
    why: 'This gives Wayfound a compass. Later choices can be checked against what you said matters most.',
    options: [
      {
        id: 'good-answer-faster',
        label: 'Help people reach a good answer faster',
        detail: 'Useful when the idea helps people decide, solve, choose, or figure something out.',
        recommended: true,
        reason: 'This is a strong default when the main job is helping someone think, choose, or solve something without wandering into the weeds.',
        tradeoff: 'Fast is good. Fast and wrong is less exciting.'
      },
      {
        id: 'remove-repeat-work',
        label: 'Save people from boring repeat work',
        detail: 'Good for chores, setup, sorting, copying, and other things nobody dreams about doing twice.'
      },
      {
        id: 'consistent-experience',
        label: 'Make the experience consistent',
        detail: 'Useful when different people should get a similar result without needing secret knowledge.'
      },
      {
        id: 'clear-progress',
        label: 'Make progress easier to understand',
        detail: 'Useful when people need to know what is happening, what is done, and what still needs attention.'
      }
    ]
  },
  {
    id: 'control',
    stage: 'Set the control level',
    prompt: 'How much should the thing you are building do on its own?',
    help: 'This sets the line between “help me,” “do it for me,” and “please do not press that button without asking.”',
    why: 'This changes how much control the system gets, when it should ask first, and what needs a safety net.',
    options: [
      {
        id: 'risk-based',
        label: 'Let it act when the risk is low',
        detail: 'Small, reversible actions can happen automatically. Bigger or harder-to-undo actions ask first.',
        recommended: true,
        reason: 'This avoids asking permission for every tiny thing while keeping people in charge of the important stuff.',
        tradeoff: 'Wayfound has to be good at knowing the difference between “harmless” and “uh-oh.”'
      },
      {
        id: 'ask-important',
        label: 'Ask before doing anything important',
        detail: 'The system can suggest, but a person gives the final go-ahead.'
      },
      {
        id: 'guidance-only',
        label: 'Give advice, but do not take action',
        detail: 'The system explains what to do, and the person does it.'
      },
      {
        id: 'mostly-autonomous',
        label: 'Mostly run on its own',
        detail: 'The system handles most actions and asks for help when something unusual happens.'
      }
    ]
  },
  {
    id: 'dependencies',
    stage: 'Spot the outside pieces',
    prompt: 'Does your idea depend on anything outside itself?',
    help: 'This could be another app, a website, a device, a file, a game service, a school account, an API, or something else.',
    why: 'Outside dependencies can disappear, change, break, or need permission. Wayfound tracks that before it becomes a surprise.',
    options: [
      {
        id: 'record-and-check',
        label: 'Write down what is known and check the rest later',
        detail: 'Use what you know now. Turn unknown access, limits, or compatibility into things to check.',
        recommended: true,
        reason: 'Guesses are useful, but they should wear name tags.',
        tradeoff: 'Some parts may have to wait until a key unknown is answered.'
      },
      {
        id: 'assume-normal',
        label: 'Assume the connection will work normally',
        detail: 'Move ahead using the most likely setup, then confirm it later.'
      },
      {
        id: 'core-first',
        label: 'Build the core idea first',
        detail: 'Keep the first version independent and connect other things later.'
      },
      {
        id: 'manual-first',
        label: 'Use a simple manual handoff first',
        detail: 'Start with files, copy/paste, or another simple bridge before automating it.'
      }
    ]
  },
  {
    id: 'failure',
    stage: 'Plan for the weird day',
    prompt: 'What should happen when something your idea depends on stops working?',
    help: 'Pick the default. Specific parts can use a different rule later.',
    why: 'Things fail. Deciding what “safe failure” looks like now is much nicer than inventing it during a crisis.',
    options: [
      {
        id: 'safe-degrade',
        label: 'Keep going safely and explain what is missing',
        detail: 'Keep the parts that still work available and clearly show what is unavailable.',
        recommended: true,
        reason: 'One broken piece does not need to ruin the entire experience.',
        tradeoff: 'You have to design what “partly working” looks like.'
      },
      {
        id: 'stop',
        label: 'Stop until it is fixed',
        detail: 'Do not continue when the missing piece could make the result unsafe or misleading.'
      },
      {
        id: 'retry',
        label: 'Try again automatically',
        detail: 'Give it a few sensible retries before asking a person for help.'
      },
      {
        id: 'user-choice',
        label: 'Let the person decide what to do next',
        detail: 'Offer the safe choices that still make sense.'
      }
    ]
  },
  {
    id: 'unknowns',
    stage: 'Handle the unknowns',
    prompt: 'What should Wayfound do when nobody knows the answer yet?',
    help: 'Not knowing is allowed. The important part is knowing what you do not know.',
    why: 'Wayfound keeps facts, guesses, decisions, and real blockers separate so uncertainty does not quietly turn into “truth.”',
    options: [
      {
        id: 'record-and-proceed',
        label: 'Write it down and keep moving if it is not blocking anything',
        detail: 'Unknowns stay visible. Only the ones that truly prevent safe progress stop the work.',
        recommended: true,
        reason: 'This avoids two bad habits: guessing silently and thinking forever.',
        tradeoff: 'Wayfound needs a clear test for what actually blocks progress.'
      },
      {
        id: 'resolve-first',
        label: 'Figure out every important unknown first',
        detail: 'Pause planning until the important missing pieces are answered.'
      },
      {
        id: 'temporary-assumption',
        label: 'Make a temporary guess and verify it later',
        detail: 'Keep moving, but mark the guess so it has to be checked later.'
      },
      {
        id: 'owner-decides',
        label: 'Ask the project owner to decide',
        detail: 'A person decides whether each unknown is accepted, deferred, or blocking.'
      }
    ]
  },
  {
    id: 'validation',
    stage: 'Decide what “done” means',
    prompt: 'How should Wayfound decide that something is actually done?',
    help: 'Choose the normal rule. Important work can require stronger proof.',
    why: '“I made it” is not always the same as “it works.” Wayfound keeps those states separate.',
    options: [
      {
        id: 'criteria-tests-review',
        label: 'Check the expected result, run useful tests, and review important work',
        detail: 'Confirm the thing behaves as expected, test what makes sense, and review important changes.',
        recommended: true,
        reason: 'Different projects need different kinds of proof, but “looks fine to me” should not be the whole strategy.',
        tradeoff: 'This takes a little longer than letting the builder grade its own homework.'
      },
      {
        id: 'tests-only',
        label: 'Use automated tests',
        detail: 'The work is done when the relevant automated checks pass.'
      },
      {
        id: 'human-review',
        label: 'Use human review',
        detail: 'A person reviews the result against what was expected.'
      },
      {
        id: 'self-check',
        label: 'Let the builder check its own work',
        detail: 'The same person or agent that built it decides whether it is complete.'
      }
    ]
  }
];

export function createInitialState() {
  return {
    idea: '',
    step: -1,
    answers: {},
    assumptions: [],
    blockers: [],
    openQuestions: []
  };
}

export function selectAnswer(state, questionId, optionId) {
  return {
    ...state,
    answers: {
      ...state.answers,
      [questionId]: optionId
    }
  };
}

export function getQuestion(questionId) {
  return QUESTION_BANK.find((question) => question.id === questionId) ?? null;
}

export function getSelectedOption(state, questionId) {
  const question = getQuestion(questionId);
  const optionId = state.answers[questionId];
  return question?.options.find((option) => option.id === optionId) ?? null;
}

export function deriveProjectState(state) {
  const assumptions = [];
  const blockers = [];
  const openQuestions = [];

  if (state.answers.dependencies === 'assume-normal') {
    assumptions.push('External connection behavior is assumed and still needs verification.');
    blockers.push('Verify the external connection before work that depends on it is treated as ready.');
  }

  if (state.answers.dependencies === 'core-first') {
    openQuestions.push('Which outside connections will be needed after the core idea is proven?');
  }

  if (state.answers.dependencies === 'manual-first') {
    openQuestions.push('When should the manual handoff be replaced with an automated connection?');
  }

  if (state.answers.unknowns === 'temporary-assumption') {
    assumptions.push('Unresolved information may be used temporarily but must be marked for later verification.');
  }

  return { assumptions, blockers, openQuestions };
}

export function getCoveragePercent(state) {
  if (!state.idea.trim()) return 0;
  const answered = Object.keys(state.answers).length;
  return Math.min(100, Math.round(12 + (answered / QUESTION_BANK.length) * 88));
}

export function isInterviewComplete(state) {
  return Boolean(state.idea.trim()) && QUESTION_BANK.every((question) => Boolean(state.answers[question.id]));
}

export function getSummary(state) {
  return {
    idea: state.idea,
    outcome: getSelectedOption(state, 'outcome')?.label ?? 'Not decided',
    control: getSelectedOption(state, 'control')?.label ?? 'Not decided',
    unknowns: getSelectedOption(state, 'unknowns')?.label ?? 'Not decided',
    validation: getSelectedOption(state, 'validation')?.label ?? 'Not decided'
  };
}
