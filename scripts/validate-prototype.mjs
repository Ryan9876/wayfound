import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const stages = read("lib/demo-data.ts");
const shell = read("components/app-shell.tsx");
const overview = read("components/overview-dashboard.tsx");
const journey = read("components/journey-view.tsx");
const standardPages = read("components/standard-pages.tsx");
const moreRoute = read("app/more/page.tsx");
const css = read("app/globals.css");

const stageNumbers = [...stages.matchAll(/\{ number: (\d+), name:/g)].map((match) => Number(match[1]));
check(stageNumbers.length === 15, `Expected 15 journey stages; found ${stageNumbers.length}.`);
check(stageNumbers.every((value, index) => value === index + 1), "Journey stage numbers must be exactly 1 through 15 in order.");
check(stages.includes('"reopened"'), "Journey state model must support reopened stages.");
check(journey.includes("Reopened"), "Journey view must render reopened stage status.");
check(!journey.includes("LockKeyhole"), "Upcoming journey stages must not be presented as locked gates.");
check(journey.includes("Upcoming"), "Journey view must label upcoming stages with text.");

for (const label of ["Overview", "Journey", "Work", "Handoffs", "Records", "Release & Care"]) {
  check(shell.includes(`label: \"${label}\"`), `Desktop navigation is missing ${label}.`);
}
for (const label of [">Overview<", ">Journey<", ">Work<", ">More<"]) {
  check(shell.includes(label), `Mobile navigation is missing ${label.replace(/[<>]/g, "")}.`);
}
check(shell.includes('href="/more"'), "Mobile More navigation must open the More destination.");
check(moreRoute.includes('active="more"'), "The More route must identify itself as the mobile More destination.");
for (const href of ["/handoffs", "/records", "/release-care"]) {
  check(standardPages.includes(`href=\"${href}\"`), `More destination is missing ${href}.`);
}

check(stages.includes('title: "Observe one equipment checkout next"'), "The approved Borrow Desk next action is missing.");
check(shell.includes("Fixture data • not synced"), "Prototype fixture data must be labeled as not synced.");
check(overview.includes("So what?"), "The next-action rationale must lead with a Minto-style governing outcome.");
check(overview.includes("Because…") && overview.includes("And…"), "The next-action rationale must include supporting reasons.");
check(standardPages.includes("No specialist handoff is active in Stage 2."), "Handoffs must not imply an active specialist exchange during Stage 2.");
check(standardPages.includes("Release readiness is not yet applicable."), "Release & Care must preserve honest readiness status.");

const requiredTokens = {
  "--canvas:#F7F7F2": "Canvas #F7F7F2",
  "--surface:#FFFFFF": "Surface #FFFFFF",
  "--ink:#172B2A": "Primary ink #172B2A",
  "--muted:#526260": "Secondary ink #526260",
  "--pine:#176B5B": "Brand/action #176B5B",
  "--ochre:#D9B86C": "Accent #D9B86C",
  "--border:#D6DDDA": "Border #D6DDDA",
  "--caution:#8A4B08": "Caution #8A4B08",
  "--error:#A52D35": "Error #A52D35",
};
for (const [token, name] of Object.entries(requiredTokens)) {
  check(css.includes(token), `Missing approved design token: ${name}.`);
}

if (failures.length) {
  console.error("Prototype validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Prototype validation passed: 15-stage journey, honest stage states, desktop/mobile navigation, More routing, next action, fixture labeling, rationale structure, handoff/release status, and design tokens are present.");
