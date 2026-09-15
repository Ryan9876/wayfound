export type StageState = "complete" | "active" | "upcoming" | "reopened" | "blocked";

export type JourneyStage = {
  number: number;
  name: string;
  group: "Discovery & experience" | "Definition & delivery" | "Release & operation";
  purpose: string;
  state: StageState;
};

export const stageCatalog: Omit<JourneyStage, "state">[] = [
  { number: 1, name: "Clarify", group: "Discovery & experience", purpose: "Identify the user, problem, and desired outcome." },
  { number: 2, name: "Validate and compare", group: "Discovery & experience", purpose: "Determine whether to buy, configure, build, or stop." },
  { number: 3, name: "Establish feasibility", group: "Discovery & experience", purpose: "Bound a deliverable project and its constraints." },
  { number: 4, name: "Research workflows and UX", group: "Discovery & experience", purpose: "Make important tasks understandable and workable." },
  { number: 5, name: "Develop brand and visual direction", group: "Discovery & experience", purpose: "Establish a coherent identity and interface foundation." },
  { number: 6, name: "Prototype and test", group: "Discovery & experience", purpose: "Test assumptions before full implementation." },
  { number: 7, name: "Define requirements", group: "Definition & delivery", purpose: "Make expected behavior and completion conditions precise." },
  { number: 8, name: "Choose implementation approach", group: "Definition & delivery", purpose: "Select a maintainable way to deliver." },
  { number: 9, name: "Plan delivery", group: "Definition & delivery", purpose: "Make responsibility and dependencies explicit." },
  { number: 10, name: "Build", group: "Definition & delivery", purpose: "Implement controlled, reviewable increments." },
  { number: 11, name: "Verify", group: "Definition & delivery", purpose: "Determine whether behavior and safeguards work." },
  { number: 12, name: "Refine quality", group: "Release & operation", purpose: "Resolve visual and interaction defects." },
  { number: 13, name: "Prepare pilot and release", group: "Release & operation", purpose: "Make deployment and reversal controlled." },
  { number: 14, name: "Launch and establish ownership", group: "Release & operation", purpose: "Put the product into supported use." },
  { number: 15, name: "Monitor and improve", group: "Release & operation", purpose: "Sustain usefulness, reliability, and safety." },
];

