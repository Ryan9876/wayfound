// Presentation guidance only. This never changes a saved stage or record status.
export const workspaceViews = [
  "overview",
  "journey",
  "work",
  "records",
  "release-care",
  "more",
] as const;
export type WorkspaceView = (typeof workspaceViews)[number];
export function workspaceView(
  value: string | string[] | undefined,
): WorkspaceView {
  return workspaceViews.includes(value as WorkspaceView)
    ? (value as WorkspaceView)
    : "overview";
}
export const stageGuidance = [
  {
    state: "You’re clarifying the problem.",
    next: "Describe one real situation",
    why: "Name who experiences the problem, what happens, and what would make it better.",
    question: "Who needs a better outcome, and what would change for them?",
  },
  {
    state: "You’re validating the problem.",
    next: "Watch the process happen once",
    why: "See how the process actually works. Note what slows people down or causes confusion.",
    question:
      "Would an existing tool solve the problem, or is something new needed?",
  },
  {
    state: "You’re checking what’s feasible.",
    next: "Check the hardest constraint",
    why: "Test the limit most likely to change your plan before committing more effort.",
    question: "What could make this approach impractical?",
  },
  {
    state: "You’re learning how people work.",
    next: "Walk through the main task",
    why: "Follow the task from start to finish so the product fits how people use it.",
    question: "Where do people need clearer guidance?",
  },
  {
    state: "You’re shaping the look and feel.",
    next: "Choose a visual direction",
    why: "Use one clear direction to keep the interface consistent and readable.",
    question: "What should the product feel like to its users?",
  },
  {
    state: "You’re testing a prototype.",
    next: "Try the main task with a user",
    why: "Find confusing steps while they are still easy to change.",
    question: "Can someone finish the task without help?",
  },
  {
    state: "You’re defining what the product must do.",
    next: "Describe one required behavior",
    why: "Pair the behavior with a check so you can tell whether it works.",
    question: "What must work for the first version to be useful?",
  },
  {
    state: "You’re choosing how to build.",
    next: "Compare the practical approaches",
    why: "Consider maintenance, constraints, and risk as well as the initial build.",
    question: "Which technical choices need outside review?",
  },
  {
    state: "You’re planning the work.",
    next: "Define the next small piece of work",
    why: "A clear result and a way to check it make progress easier to judge.",
    question: "What must happen before this work can start?",
  },
  {
    state: "You’re building the product.",
    next: "Work on one reviewable change",
    why: "Small changes are easier to check and correct.",
    question: "What will show that this change works?",
  },
  {
    state: "You’re checking that it works.",
    next: "Check one required behavior",
    why: "Record what happened and where the result came from. Confidence alone is not evidence.",
    question: "Which checks still lack a clear result?",
  },
  {
    state: "You’re improving the quality.",
    next: "Fix the most disruptive rough edge",
    why: "Start with the issue that makes the main task hardest to finish.",
    question: "What still gets in the user’s way?",
  },
  {
    state: "You’re preparing for release.",
    next: "Review what would be released",
    why: "Check the version, destination, known issues, and recovery plan before deciding.",
    question: "What evidence or recovery steps are still missing?",
  },
  {
    state: "You’re preparing to put the product into use.",
    next: "Confirm the plan for launch and support",
    why: "Make sure you know how to support users and recover if something goes wrong.",
    question: "Who will handle problems after launch?",
  },
  {
    state: "You’re monitoring and improving.",
    next: "Review the latest operating results",
    why: "Use observed problems and user feedback to choose the next improvement.",
    question: "What needs attention to keep the product useful?",
  },
];
