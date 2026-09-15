import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const value = hex.replace("#", "");
  const r = channel(parseInt(value.slice(0, 2), 16));
  const g = channel(parseInt(value.slice(2, 4), 16));
  const b = channel(parseInt(value.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

const pairs = [
  ["Primary ink on canvas", "#172B2A", "#F7F7F2"],
  ["Secondary ink on canvas", "#526260", "#F7F7F2"],
  ["Pine action on white", "#176B5B", "#FFFFFF"],
  ["Pine action on canvas", "#176B5B", "#F7F7F2"],
  ["Caution text on warm surface", "#8A4B08", "#FCF8EF"],
  ["Error text on white", "#A52D35", "#FFFFFF"],
  ["Small metadata on canvas", "#60706C", "#F7F7F2"],
  ["Small metadata on white", "#60706C", "#FFFFFF"],
];

for (const [name, foreground, background] of pairs) {
  const ratio = contrast(foreground, background);
  check(ratio >= 4.5, `${name} contrast is ${ratio.toFixed(2)}:1; expected at least 4.5:1.`);
}

const accessibilityCss = read("app/accessibility-polish.css");
const shell = read("components/app-shell.tsx");
const overview = read("components/overview-dashboard.tsx");

check(accessibilityCss.includes(":focus-visible"), "Keyboard focus treatment must use :focus-visible.");
check(accessibilityCss.includes("prefers-reduced-motion"), "Reduced-motion preference must be respected.");
check(shell.includes('aria-label="Primary navigation"'), "Desktop primary navigation needs an accessible label.");
check(shell.includes('aria-label="Mobile navigation"'), "Mobile navigation needs an accessible label.");
check(overview.includes('aria-label="Release progress"'), "Release progress needs an accessible label.");
check(overview.includes('type="button"'), "Action controls must use explicit button types.");

if (failures.length) {
  console.error("Accessibility validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Accessibility validation passed: key normal-text contrast pairs meet 4.5:1, focus-visible treatment is present, reduced motion is respected, and primary navigation/progress controls are labeled.");
