export const interviewQuestionIds = [
  "change",
  "beneficiary",
  "job",
  "friction",
  "outcome",
  "scope",
  "form",
  "constraints",
  "evidence",
  "authority",
] as const;

export type InterviewQuestionId = (typeof interviewQuestionIds)[number];
export type InterviewAnswers = Partial<Record<InterviewQuestionId, string>>;

export type InterviewChoice = {
  id: string;
  title: string;
  explanation: string;
  benefit: string;
  tradeoff?: string;
  brief: string;
};

export type InterviewQuestion = {
  id: InterviewQuestionId;
  eyebrow: string;
  prompt: string;
  context: string;
  choices: InterviewChoice[];
};

export type InterviewRecommendation = {
  choiceId: string;
  rationale: string;
};

export type InterviewContext = {
  idea: string;
  answers: InterviewAnswers;
};

export type ProductBrief = {
  narrative: string;
  fields: { label: string; value: string }[];
  complete: boolean;
};

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: "change",
    eyebrow: "Direction",
    prompt: "What are you mainly trying to change?",
    context: "Choose the closest description. This sets the frame for the rest of the interview.",
    choices: [
      { id: "improve-workflow", title: "Improve an existing workflow", explanation: "Make a process that already exists clearer, faster, or more reliable.", benefit: "Starts from real behavior and known pain.", tradeoff: "Existing assumptions can remain hidden unless they are challenged deliberately.", brief: "improve an existing workflow" },
      { id: "new-capability", title: "Create a new capability", explanation: "Enable people to do something they cannot do today.", benefit: "Creates room for a focused new outcome.", tradeoff: "The need and adoption path may require more evidence because there is no established workflow.", brief: "create a new capability" },
      { id: "replace-system", title: "Replace an existing tool or system", explanation: "Move an established job away from a tool that no longer fits.", benefit: "Provides a clear comparison point and migration target.", tradeoff: "Replacement work can inherit integrations, data, and migration obligations.", brief: "replace an existing tool or system" },
      { id: "understand-first", title: "Understand the problem before choosing a solution", explanation: "The opportunity is real, but the right intervention is not clear yet.", benefit: "Protects against committing to a solution too early.", brief: "understand the problem before committing to a solution" },
    ],
  },
  {
    id: "beneficiary",
    eyebrow: "Primary user",
    prompt: "Who should benefit first?",
    context: "Pick the group whose outcome should guide the first useful version.",
    choices: [
      { id: "internal-team", title: "An internal team", explanation: "Employees or colleagues doing operational work inside the organization.", benefit: "Keeps the first version close to a reachable user group and observable workflow.", tradeoff: "Internal convenience can become the focus unless the business outcome stays visible.", brief: "an internal team" },
      { id: "operators", title: "Front-line operators", explanation: "People carrying out the work directly, often under time or process pressure.", benefit: "Optimizes for the people experiencing the workflow in practice.", brief: "front-line operators" },
      { id: "managers", title: "Managers or decision makers", explanation: "People who need visibility, coordination, or a better basis for decisions.", benefit: "Can improve prioritization, accountability, and shared understanding.", tradeoff: "A management view can miss friction experienced by the people doing the work.", brief: "managers or decision makers" },
      { id: "customers", title: "Customers or external users", explanation: "People outside the organization who receive or use the service.", benefit: "Connects the first version directly to an external user outcome.", tradeoff: "Research, support, privacy, and reliability expectations may be broader.", brief: "customers or external users" },
      { id: "beneficiary-unclear", title: "I am not sure yet", explanation: "Several groups are affected and the first beneficiary still needs to be clarified.", benefit: "Keeps an important uncertainty explicit instead of guessing.", brief: "a primary user group that still needs to be clarified" },
    ],
  },
  {
    id: "job",
    eyebrow: "User job",
    prompt: "What job must the product help that person perform?",
    context: "Focus on what the person is trying to accomplish, not a feature name.",
    choices: [
      { id: "coordinate-work", title: "Coordinate work across people or steps", explanation: "Keep requests, status, ownership, and handoffs understandable as work moves.", benefit: "Reduces fragmentation and missing context.", tradeoff: "Coordination tools can become overhead if they require too much maintenance.", brief: "coordinate work across people or steps" },
      { id: "complete-task", title: "Complete a recurring task", explanation: "Help someone carry out a defined task from start to finish.", benefit: "Creates a concrete task flow that can be observed and tested.", brief: "complete a recurring task" },
      { id: "find-information", title: "Find and understand information", explanation: "Bring the right information together so a person can act without hunting across sources.", benefit: "Targets time lost to search and fragmented context.", tradeoff: "Information quality still depends on the underlying sources.", brief: "find and understand the information needed to act" },
      { id: "make-decision", title: "Make a better decision", explanation: "Organize evidence, choices, and consequences so a person can decide with clearer context.", benefit: "Makes reasoning and accountability visible.", tradeoff: "The product must distinguish guidance from decision authority.", brief: "make a better-informed decision" },
      { id: "automate-repetition", title: "Reduce repetitive manual work", explanation: "Remove repeated copying, checking, or routine movement of information.", benefit: "Can return time and reduce avoidable handling errors.", tradeoff: "Automating a poorly understood process can make its problems harder to see.", brief: "reduce repetitive manual work" },
    ],
  },
  {
    id: "friction",
    eyebrow: "Current state",
    prompt: "What is most wrong with the current approach?",
    context: "Choose the friction that most directly explains why change is worth considering.",
    choices: [
      { id: "fragmented", title: "Information is fragmented", explanation: "People depend on email, spreadsheets, messages, or separate systems to reconstruct the full picture.", benefit: "Points toward shared context and continuity as the first problem to solve.", tradeoff: "Centralizing information does not automatically improve the underlying process.", brief: "information is fragmented across the current process" },
      { id: "slow-manual", title: "The process is slow and manual", explanation: "Too much time is spent repeating steps, copying information, or waiting for routine work.", benefit: "Creates a measurable opportunity to reduce effort or elapsed time.", tradeoff: "Speed improvements must not remove checks that protect quality or safety.", brief: "the current process is slow and manual" },
      { id: "unclear-ownership", title: "Status or ownership is unclear", explanation: "People cannot easily tell what is happening, who owns the next step, or what is blocked.", benefit: "Makes visibility and accountability a concrete design target.", brief: "status and ownership are difficult to understand" },
      { id: "errors", title: "Errors or rework happen too often", explanation: "The current approach allows omissions, inconsistent handling, or repeated correction.", benefit: "Creates a clear reliability outcome to test.", tradeoff: "Preventing every possible error can make the first version too broad.", brief: "errors and rework occur too often" },
      { id: "friction-unknown", title: "The friction is not clear enough yet", explanation: "There is dissatisfaction, but the actual cause still needs observation or evidence.", benefit: "Keeps discovery ahead of solution design.", brief: "the main source of friction still needs to be observed" },
    ],
  },
  {
    id: "outcome",
    eyebrow: "Outcome",
    prompt: "What outcome matters most for the first version?",
    context: "Pick the improvement that would make the first release meaningfully useful.",
    choices: [
      { id: "visibility", title: "Clearer shared visibility", explanation: "People can understand current status, context, and ownership without reconstructing it manually.", benefit: "Directly reduces coordination ambiguity.", brief: "create clearer shared visibility" },
      { id: "speed", title: "Less time and manual effort", explanation: "The same useful outcome takes fewer steps, less waiting, or less repetitive handling.", benefit: "Supports measurable efficiency improvement.", tradeoff: "Efficiency should not be represented as success if quality gets worse.", brief: "reduce time and manual effort" },
      { id: "consistency", title: "More consistent execution", explanation: "Important steps and information are handled in a repeatable way.", benefit: "Can reduce avoidable variation and rework.", tradeoff: "Too much rigidity can make legitimate exceptions harder to handle.", brief: "make execution more consistent" },
      { id: "confidence", title: "Better decisions and confidence", explanation: "People can act with clearer evidence, context, and consequences.", benefit: "Improves the quality and explainability of consequential decisions.", tradeoff: "Guidance must not be confused with verification or authority.", brief: "support better-informed decisions" },
      { id: "learning", title: "Learn what is actually needed", explanation: "Use a small first version to resolve uncertainty before committing to a larger solution.", benefit: "Reduces the cost of being wrong early.", brief: "learn what users actually need before expanding scope" },
    ],
  },
  {
    id: "scope",
    eyebrow: "First scope",
    prompt: "What is the smallest useful first scope?",
    context: "Choose a boundary that can produce a useful outcome without trying to solve the whole domain.",
    choices: [
      { id: "one-workflow", title: "One complete workflow", explanation: "Cover one real process from its starting point to a useful end state.", benefit: "Provides an end-to-end outcome that can be observed and tested.", tradeoff: "Adjacent workflows remain outside the first release.", brief: "one complete workflow" },
      { id: "one-user-job", title: "One high-value user job", explanation: "Support the most important task for the primary user and leave secondary work for later.", benefit: "Keeps the first release tightly focused on user value.", brief: "one high-value user job" },
      { id: "thin-slice", title: "A thin end-to-end slice", explanation: "Include only the minimum pieces across the system needed to prove the direction.", benefit: "Tests the whole path while limiting depth and polish.", tradeoff: "Some parts may remain intentionally basic in the first version.", brief: "a thin end-to-end slice" },
      { id: "broad-foundation", title: "A broader foundation first", explanation: "Build shared capabilities before completing a user-visible workflow.", benefit: "Can help when several near-term workflows truly depend on the same foundation.", tradeoff: "Value is harder to observe early and scope can expand quickly.", brief: "a broader shared foundation" },
    ],
  },
  {
    id: "form",
    eyebrow: "Solution form",
    prompt: "What form should the first solution take?",
    context: "Choose the form that best fits the job and scope. This is direction, not a final technical architecture decision.",
    choices: [
      { id: "guided-workspace", title: "A shared guided workspace", explanation: "Bring status, context, decisions, and next actions into one understandable place.", benefit: "Fits work that depends on continuity and coordination.", tradeoff: "It must stay focused or it can become a generic dashboard.", brief: "a shared guided workspace" },
      { id: "focused-tool", title: "A focused task tool", explanation: "Provide a small interface optimized for one recurring job.", benefit: "Can be easier to learn and validate than a broad platform.", tradeoff: "Adjacent needs may still require existing tools.", brief: "a focused task tool" },
      { id: "automation", title: "An automation behind the current workflow", explanation: "Keep the familiar user surface while automating repetitive work in the background.", benefit: "Can reduce effort without requiring a large behavior change.", tradeoff: "Hidden automation needs clear failure handling and observability.", brief: "automation behind the current workflow" },
      { id: "service-process", title: "A service or process change first", explanation: "Improve roles, instructions, or operating practice before adding software.", benefit: "Avoids building software when the main problem is procedural.", brief: "a service or process change before new software" },
      { id: "form-unknown", title: "Keep the form open for now", explanation: "The desired outcome is clearer than the solution shape.", benefit: "Preserves flexibility while evidence is still weak.", brief: "a solution form that remains open pending more evidence" },
    ],
  },
  {
    id: "constraints",
    eyebrow: "Constraints",
    prompt: "Which constraint most materially affects the solution?",
    context: "Name the constraint that should shape decisions now. Do not manufacture one if none is known.",
    choices: [
      { id: "existing-systems", title: "Existing systems or integrations", explanation: "The solution must fit established tools, data, interfaces, or operating dependencies.", benefit: "Keeps feasibility connected to the real environment.", tradeoff: "Existing boundaries can limit otherwise simpler designs.", brief: "fit existing systems and integration boundaries" },
      { id: "security-access", title: "Security, privacy, or access", explanation: "Identity, sensitive information, authorization, or trust boundaries materially shape the solution.", benefit: "Brings consequential trust constraints forward instead of treating them as polish.", tradeoff: "The design may require stronger controls and more validation work.", brief: "respect material security, privacy, or access constraints" },
      { id: "low-ops", title: "Low operating burden", explanation: "The owner needs a solution that is straightforward to run and maintain after launch.", benefit: "Keeps ongoing ownership and maintenance cost visible.", tradeoff: "Some capabilities may be deferred to preserve simplicity.", brief: "keep operating and maintenance burden low" },
      { id: "time-budget", title: "Time or budget", explanation: "The first version must fit a meaningful delivery or spending limit.", benefit: "Forces explicit prioritization around the smallest useful outcome.", tradeoff: "Some desirable quality or breadth may need to wait, but required safety and evidence cannot be skipped.", brief: "fit a meaningful time or budget constraint" },
      { id: "none-known", title: "No material constraint is known yet", explanation: "No current constraint is strong enough to shape the direction beyond normal good practice.", benefit: "Avoids inventing false restrictions.", brief: "proceed without a material constraint currently established" },
    ],
  },
  {
    id: "evidence",
    eyebrow: "Success evidence",
    prompt: "What evidence would best demonstrate that the first version is useful?",
    context: "Choose evidence that can show an observed result. AI commentary or owner confidence alone is not verification evidence.",
    choices: [
      { id: "observed-task", title: "Observe the user complete the task", explanation: "Watch the primary user perform the target job with the first version and record what happened.", benefit: "Shows whether the workflow works in real use and where people still struggle.", brief: "observed completion of the target user task" },
      { id: "measured-improvement", title: "Measure time or effort improvement", explanation: "Compare a concrete before/after measure such as elapsed time, manual steps, or handling effort.", benefit: "Creates evidence tied directly to an efficiency outcome.", tradeoff: "A faster process is not useful if quality or correctness declines.", brief: "a measurable reduction in time or manual effort" },
      { id: "fewer-errors", title: "Record fewer errors or less rework", explanation: "Compare mistakes, omissions, or repeated corrections against the current approach.", benefit: "Provides evidence for a reliability outcome.", brief: "fewer errors or less rework in the target workflow" },
      { id: "adoption-feedback", title: "Observe repeated use and user feedback", explanation: "Look for continued voluntary use plus specific feedback about the outcome.", benefit: "Shows whether people find enough value to keep using the solution.", tradeoff: "Usage alone does not prove that the intended outcome improved.", brief: "repeated use plus specific user feedback" },
      { id: "evidence-unknown", title: "Define the evidence after one observation", explanation: "The desired outcome is known, but the most meaningful check still needs discovery.", benefit: "Keeps the evidence question explicit without inventing a metric.", brief: "an evidence plan to be refined after observing the workflow" },
    ],
  },
  {
    id: "authority",
    eyebrow: "Decision ownership",
    prompt: "How should consequential product decisions be handled?",
    context: "Wayfound keeps one authenticated product owner as the decision authority. Outside expertise can inform that owner without silently taking authority.",
    choices: [
      { id: "owner", title: "The product owner decides", explanation: "The authenticated owner makes product-scope and business-direction decisions explicitly.", benefit: "Keeps authority accountable and unambiguous.", brief: "the product owner owns consequential product decisions" },
      { id: "owner-after-input", title: "The product owner decides after outside input", explanation: "The owner seeks appropriate specialist or user input before making a consequential decision.", benefit: "Adds needed expertise while preserving explicit owner authority.", tradeoff: "The owner must distinguish advice from evidence and from the final accepted decision.", brief: "the product owner decides after obtaining appropriate outside input" },
      { id: "authority-unresolved", title: "Decision ownership still needs clarification", explanation: "The project cannot yet name the accountable decision owner or escalation path.", benefit: "Keeps a governance gap visible instead of assuming authority.", tradeoff: "Consequential decisions should not be represented as accepted until ownership is clear.", brief: "decision ownership still needs to be clarified" },
    ],
  },
];

const byId = Object.fromEntries(interviewQuestions.map((question) => [question.id, question])) as Record<InterviewQuestionId, InterviewQuestion>;

export function getInterviewQuestion(id: InterviewQuestionId): InterviewQuestion {
  return byId[id];
}

export function getInterviewChoice(id: InterviewQuestionId, choiceId: string | undefined): InterviewChoice | undefined {
  if (!choiceId) return undefined;
  return byId[id].choices.find((choice) => choice.id === choiceId);
}

function contains(text: string, terms: string[]) {
  const value = text.toLowerCase();
  return terms.some((term) => value.includes(term));
}

export function getInterviewRecommendation(id: InterviewQuestionId, context: InterviewContext): InterviewRecommendation | null {
  const idea = context.idea.toLowerCase();
  const answers = context.answers;
  const pick = (choiceId: string, rationale: string): InterviewRecommendation => ({ choiceId, rationale });

  switch (id) {
    case "change":
      if (contains(idea, ["email", "spreadsheet", "manual", "workflow", "process", "requests", "tracking"])) return pick("improve-workflow", "Your description points to an existing process with friction, so improving that workflow is a smaller assumption than inventing an entirely new one.");
      if (contains(idea, ["replace", "legacy", "old system", "outdated tool"])) return pick("replace-system", "You described an existing tool or system as part of the problem, so replacement is the clearest direction to examine first.");
      if (contains(idea, ["not sure", "understand", "explore", "why", "problem"])) return pick("understand-first", "The problem appears clearer than the solution. Keeping the intervention open protects the discovery work from a premature commitment.");
      return pick("new-capability", "Your idea reads primarily as a new outcome or capability rather than a clearly established workflow replacement.");
    case "beneficiary":
      if (contains(idea, ["customer", "client", "consumer", "member", "visitor"])) return pick("customers", "The idea explicitly names an external user or recipient, so that group is the strongest first beneficiary in the current evidence.");
      if (contains(idea, ["manager", "leader", "supervisor", "director"])) return pick("managers", "The idea emphasizes management visibility or decisions, so managers are the strongest first beneficiary in the current description.");
      if (contains(idea, ["operator", "technician", "engineer", "agent", "staff", "employee", "team"])) return pick("internal-team", "The problem is described inside an existing team workflow, so starting with the people already doing that work keeps the first scope observable.");
      return pick("internal-team", "An internal team is the most conservative starting point when the beneficiary is not explicit because it keeps the first user group close to the described work.");
    case "job":
      if (answers.change === "improve-workflow" || contains(idea, ["request", "status", "handoff", "track", "coordinate"])) return pick("coordinate-work", "The current direction is about improving an existing flow, so coordination and shared context are the most likely user job to clarify first.");
      if (contains(idea, ["search", "find", "lookup", "information", "data"])) return pick("find-information", "Your description centers on finding or combining information, so information access is the clearest user job in the current evidence.");
      if (contains(idea, ["decision", "choose", "compare", "prioritize"])) return pick("make-decision", "The idea is framed around choosing or prioritizing, so supporting a better-informed decision is the strongest user job.");
      if (contains(idea, ["automate", "copy", "repetitive", "manual"])) return pick("automate-repetition", "The problem includes repeated manual handling, so reducing that repetition is the most directly supported job.");
      return pick("complete-task", "A bounded recurring task is the smallest assumption when the exact user job is not yet explicit.");
    case "friction":
      if (contains(idea, ["email", "spreadsheet", "multiple", "several", "fragment", "different systems", "scattered"])) return pick("fragmented", "Multiple channels or tools appear in the problem description, which makes fragmented context the most directly supported friction.");
      if (contains(idea, ["slow", "manual", "time", "copy", "wait", "repetitive"])) return pick("slow-manual", "The description points to repeated manual effort or delay, so speed and handling effort are the clearest current friction.");
      if (contains(idea, ["owner", "status", "who", "visibility", "unclear"])) return pick("unclear-ownership", "The problem appears to involve uncertainty about status or responsibility, so ownership visibility is the strongest current hypothesis.");
      return pick("friction-unknown", "The idea identifies a need for change but does not yet provide enough evidence to name the main friction confidently.");
    case "outcome":
      if (answers.friction === "fragmented" || answers.friction === "unclear-ownership") return pick("visibility", "Fragmented context or unclear ownership is best tested first by making status and shared context easier to understand.");
      if (answers.friction === "slow-manual") return pick("speed", "The stated friction is time and manual effort, so the first useful outcome should directly reduce that burden.");
      if (answers.friction === "errors") return pick("consistency", "Errors and rework point first toward a more consistent way to perform the work.");
      return pick("learning", "The current evidence is still broad, so learning from a small useful version is safer than optimizing a metric that has not been established.");
    case "scope":
      if (answers.job === "complete-task") return pick("one-user-job", "The user job is already bounded, so making that one high-value job useful is the clearest first scope.");
      if (answers.change === "understand-first" || answers.outcome === "learning") return pick("thin-slice", "The project is still resolving uncertainty, so a thin end-to-end slice can produce evidence without committing to broad scope.");
      return pick("one-workflow", "One complete workflow is usually the smallest scope that can demonstrate a real operational outcome instead of isolated components.");
    case "form":
      if (answers.change === "understand-first" || answers.outcome === "learning") return pick("form-unknown", "The project is intentionally still learning, so keeping the solution form open avoids turning a discovery decision into a premature architecture choice.");
      if (answers.job === "automate-repetition") return pick("automation", "The user job centers on repeated manual handling, so automation behind the existing workflow is the most directly supported form.");
      if (answers.job === "complete-task" && answers.scope === "one-user-job") return pick("focused-tool", "A single bounded user job is usually better served by a focused tool than a broad workspace.");
      if (answers.job === "coordinate-work" || answers.outcome === "visibility") return pick("guided-workspace", "Coordination and shared visibility depend on continuity across status, context, and next actions, which fits a guided workspace.");
      return null;
    case "constraints":
      if (contains(idea, ["secure", "security", "private", "privacy", "access", "auth", "sensitive"])) return pick("security-access", "Your idea already names a trust, access, or sensitive-information concern, so it should shape the solution from the start.");
      if (contains(idea, ["integrate", "existing system", "jira", "salesforce", "sap", "microsoft", "legacy"])) return pick("existing-systems", "The solution is expected to live with established systems, so integration boundaries are a material constraint rather than a later detail.");
      if (contains(idea, ["small team", "maintain", "simple", "low maintenance"])) return pick("low-ops", "The description suggests that ongoing ownership capacity matters, so operating burden should influence the first design.");
      return null;
    case "evidence":
      if (answers.outcome === "speed") return pick("measured-improvement", "A time or effort outcome should be supported by a before/after measure rather than confidence alone.");
      if (answers.outcome === "consistency" || answers.friction === "errors") return pick("fewer-errors", "Reliability is best supported by observed reductions in mistakes, omissions, or rework.");
      if (answers.outcome === "learning") return pick("observed-task", "Direct observation is the strongest first evidence when the purpose of the initial scope is to learn what users actually need.");
      return pick("observed-task", "Watching the primary user complete the target job provides direct evidence about usefulness and exposes friction that usage counts alone cannot explain.");
    case "authority":
      if (answers.constraints === "security-access" || answers.form === "automation") return pick("owner-after-input", "The owner remains the product authority, but the current direction includes consequential technical or trust considerations where appropriate outside expertise may be needed before deciding.");
      return pick("owner", "Wayfound's active first-version governance keeps one authenticated product owner accountable for product-scope and business-direction decisions.");
  }
}

export function synthesizeProductBrief(idea: string, answers: InterviewAnswers): ProductBrief {
  const choice = (id: InterviewQuestionId) => getInterviewChoice(id, answers[id]);
  const change = choice("change");
  const beneficiary = choice("beneficiary");
  const job = choice("job");
  const friction = choice("friction");
  const outcome = choice("outcome");
  const scope = choice("scope");
  const form = choice("form");
  const constraints = choice("constraints");
  const evidence = choice("evidence");
  const authority = choice("authority");

  const sentences: string[] = [];
  const cleanIdea = idea.trim();
  if (cleanIdea) sentences.push(`The starting problem or opportunity is: ${cleanIdea.replace(/[.\s]+$/, "")}.`);
  if (beneficiary && job) sentences.push(`The first version should help ${beneficiary.brief} ${job.brief}.`);
  else if (beneficiary) sentences.push(`The first version should benefit ${beneficiary.brief}.`);
  if (friction) sentences.push(`Today, ${friction.brief}.`);
  if (change && outcome) sentences.push(`The current direction is to ${change.brief} in order to ${outcome.brief}.`);
  else if (change) sentences.push(`The current direction is to ${change.brief}.`);
  if (scope && form) sentences.push(`The initial scope should be ${scope.brief}, expressed as ${form.brief}.`);
  else if (scope) sentences.push(`The initial scope should be ${scope.brief}.`);
  if (constraints) sentences.push(`The solution should ${constraints.brief}.`);
  if (evidence) sentences.push(`Usefulness should be demonstrated through ${evidence.brief}; completing the interview itself is not verification.`);
  if (authority) sentences.push(`For governance, ${authority.brief}.`);

  const fields = [
    ["Problem or opportunity", cleanIdea || "Not described yet"],
    ["Primary user", beneficiary?.title ?? "Not decided yet"],
    ["User job", job?.title ?? "Not decided yet"],
    ["Current friction", friction?.title ?? "Not decided yet"],
    ["Desired outcome", outcome?.title ?? "Not decided yet"],
    ["Product direction", change?.title ?? "Not decided yet"],
    ["Initial scope", scope?.title ?? "Not decided yet"],
    ["Solution form", form?.title ?? "Not decided yet"],
    ["Material constraint", constraints?.title ?? "Not decided yet"],
    ["Success evidence", evidence?.title ?? "Not decided yet"],
    ["Decision ownership", authority?.title ?? "Not decided yet"],
  ].map(([label, value]) => ({ label, value }));

  return {
    narrative: sentences.join(" "),
    fields,
    complete: cleanIdea.length >= 20 && interviewQuestionIds.every((id) => Boolean(answers[id])),
  };
}
