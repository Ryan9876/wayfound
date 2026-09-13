export type StageState = "complete" | "active" | "upcoming" | "blocked";

export type JourneyStage = {
  number: number;
  name: string;
  group: "Discovery & experience" | "Definition & delivery" | "Release & operation";
  purpose: string;
  state: StageState;
};

export const stages: JourneyStage[] = [
  { number: 1, name: "Clarify", group: "Discovery & experience", purpose: "Identify the user, problem, and desired outcome.", state: "complete" },
  { number: 2, name: "Validate and compare", group: "Discovery & experience", purpose: "Determine whether to buy, configure, build, or stop.", state: "active" },
  { number: 3, name: "Establish feasibility", group: "Discovery & experience", purpose: "Bound a deliverable project and its constraints.", state: "upcoming" },
  { number: 4, name: "Research workflows and UX", group: "Discovery & experience", purpose: "Make important tasks understandable and workable.", state: "upcoming" },
  { number: 5, name: "Develop brand and visual direction", group: "Discovery & experience", purpose: "Establish a coherent identity and interface foundation.", state: "upcoming" },
  { number: 6, name: "Prototype and test", group: "Discovery & experience", purpose: "Test assumptions before full implementation.", state: "upcoming" },
  { number: 7, name: "Define requirements", group: "Definition & delivery", purpose: "Make expected behavior and completion conditions precise.", state: "upcoming" },
  { number: 8, name: "Choose implementation approach", group: "Definition & delivery", purpose: "Select a maintainable way to deliver.", state: "upcoming" },
  { number: 9, name: "Plan delivery", group: "Definition & delivery", purpose: "Make responsibility and dependencies explicit.", state: "upcoming" },
  { number: 10, name: "Build", group: "Definition & delivery", purpose: "Implement controlled, reviewable increments.", state: "upcoming" },
  { number: 11, name: "Verify", group: "Definition & delivery", purpose: "Determine whether behavior and safeguards work.", state: "upcoming" },
  { number: 12, name: "Refine quality", group: "Release & operation", purpose: "Resolve visual and interaction defects.", state: "upcoming" },
  { number: 13, name: "Prepare pilot and release", group: "Release & operation", purpose: "Make deployment and reversal controlled.", state: "upcoming" },
  { number: 14, name: "Launch and establish ownership", group: "Release & operation", purpose: "Put the product into supported use.", state: "upcoming" },
  { number: 15, name: "Monitor and improve", group: "Release & operation", purpose: "Sustain usefulness, reliability, and safety.", state: "upcoming" },
];

export const demoRelease = {
  project: "Borrow Desk",
  release: "Release 1.0",
  version: "v1.0-alpha",
  stage: 2,
  stageName: "Validate & Compare",
  subtitle: "A simpler, safer way to get equipment into people’s hands.",
  nextAction: {
    title: "Observe one equipment checkout next",
    description: "Watch a real checkout to see how the process works in practice, what confuses people, and where it slows down.",
    soWhat: "It helps us design a faster, clearer, more reliable checkout experience.",
    because: "Real-world behavior often reveals gaps that are not visible in plans.",
    and: "These insights will directly inform our requirements and priorities for Release 1.0.",
  },
};
