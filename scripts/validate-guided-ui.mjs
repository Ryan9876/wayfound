import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.WAYFOUND_UI_TEST_URL || "http://127.0.0.1:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Guided UI validation must run against a loopback app.");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

async function noOverflow() {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "Page has horizontal overflow");
}

async function choose(title) {
  await page.getByRole("radio", { name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }).click();
}

try {
  await page.goto(`${base}/interview`);
  await page.getByRole("heading", { name: "Turn an incomplete idea into a coherent product brief." }).waitFor();
  await page.getByRole("link", { name: "Interview", exact: true }).filter({ visible: true }).first().waitFor();
  assert.equal(await page.getByRole("link", { name: "Interview", exact: true }).first().getAttribute("aria-current"), "page");
  await noOverflow();

  const idea = page.getByLabel("Idea or problem", { exact: true });
  await idea.fill("Too short");
  await page.getByRole("button", { name: "Start interview" }).click();
  await page.getByRole("alert").waitFor();
  assert.match(await page.getByRole("alert").innerText(), /enough information/i);

  await idea.fill("Our team tracks requests through email and several spreadsheets, so nobody has a reliable view of status or ownership.");
  await page.getByRole("button", { name: "Start interview" }).click();
  await page.getByRole("heading", { name: "What are you mainly trying to change?" }).waitFor();
  await page.getByRole("note", { name: "Wayfound recommendation" }).waitFor();
  assert.match(await page.getByRole("note", { name: "Wayfound recommendation" }).innerText(), /Improve an existing workflow/i);
  assert.equal(await page.getByRole("radio", { name: /Create a new capability/ }).getAttribute("aria-checked"), "false", "Recommendation must not silently select an answer");

  await choose("Create a new capability");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Who should benefit first?" }).waitFor();
  await choose("An internal team");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "What job must the product help that person perform?" }).waitFor();
  await choose("Coordinate work across people or steps");
  await page.getByRole("button", { name: "Back" }).click();
  await choose("Managers or decision makers");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "What job must the product help that person perform?" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Continue" }).isDisabled(), true, "Changing an earlier answer must clear invalidated downstream answers");

  for (let guard = 0; guard < 12; guard += 1) {
    if (await page.getByRole("heading", { name: "Brief ready for review" }).isVisible().catch(() => false)) break;
    const recommended = page.locator('.wf-choice-card[data-recommended="true"]');
    if (await recommended.count()) await recommended.first().click();
    else await page.locator(".wf-choice-card").first().click();
    await page.getByRole("button", { name: "Continue" }).click();
  }

  await page.getByRole("heading", { name: "Brief ready for review" }).waitFor();
  await page.getByText("Draft", { exact: true }).waitFor();
  await page.getByText(/has not been approved, validated, or released/i).waitFor();
  const briefText = await page.locator(".wf-brief-narrative").innerText();
  assert.match(briefText, /Our team tracks requests through email/i);
  assert.match(briefText, /product owner/i);
  assert(!/User:\s|Problem:\s*Email|Solution:\s*Workspace/.test(briefText), "Brief must read as connected reasoning rather than an answer dump");

  await page.emulateMedia({ reducedMotion: "reduce" });
  const animationName = await page.locator(".wf-question-card").evaluate((element) => getComputedStyle(element).animationName);
  assert(animationName === "none" || animationName === "", "Reduced-motion mode must remove question animation");

  await page.goto(`${base}/project-files`);
  await page.getByRole("heading", { name: "Keep useful project context close to the work." }).waitFor();
  await page.getByText("No project files in this session.", { exact: true }).waitFor();
  await page.getByLabel("Choose project files").setInputFiles([
    { name: "problem-notes.txt", mimeType: "text/plain", buffer: Buffer.from("notes") },
    { name: "very-long-project-context-file-name-that-must-not-break-the-layout.md", mimeType: "text/markdown", buffer: Buffer.from("context") },
  ]);
  await page.getByText("problem-notes.txt", { exact: true }).waitFor();
  await page.getByText("very-long-project-context-file-name-that-must-not-break-the-layout.md", { exact: true }).waitFor();
  await page.getByText("2 files", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Remove problem-notes.txt" }).click();
  await page.getByText("1 file", { exact: true }).waitFor();
  await page.getByText("Browser session only", { exact: true }).waitFor();
  assert.match(await page.locator(".wf-boundary-note").innerText(), /does not create cloud storage, database records, evidence, or project artifacts/i);
  await noOverflow();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/interview`);
  await page.getByRole("heading", { name: "Turn an incomplete idea into a coherent product brief." }).waitFor();
  await page.locator(".wf-brief-panel").waitFor();
  await noOverflow();
  await page.goto(`${base}/project-files`);
  await page.getByRole("heading", { name: "Keep useful project context close to the work." }).waitFor();
  await noOverflow();

  assert.deepEqual(errors, []);
  console.log("PASS: guided Interview validates initial input, recommendation without auto-selection, non-recommended choice, back/change invalidation, adaptive progression, coherent brief completion, reduced motion, and responsive Project Files session behavior.");
} finally {
  await browser.close();
}
