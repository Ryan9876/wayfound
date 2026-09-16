import { stageCatalog, type JourneyStage } from "./domain/journey";
export type { JourneyStage, StageState } from "./domain/journey";
export const stages: JourneyStage[] = stageCatalog.map(stage => ({ ...stage, state: stage.number === 1 ? "complete" : stage.number === 2 ? "active" : "upcoming" }));

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
