import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.WAYFOUND_UI_TEST_URL;
if (!base || !["127.0.0.1", "localhost"].includes(new URL(base).hostname)) {
  throw new Error("Set WAYFOUND_UI_TEST_URL to the isolated local Wayfound app.");
}

await mkdir("artifacts/workspace", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

async function noOverflow() {
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "Workspace shell has horizontal overflow",
  );
}

async function assertLargeDestinationHeading(name) {
  const heading = page.getByRole("heading", { name, exact: true });
  await heading.waitFor();
  const size = await heading.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  assert(size >= 50, `${name} heading is too small for the prototype hierarchy: ${size}px`);
  const projectHeading = page.locator(".project-heading");
  assert.equal(await projectHeading.isVisible(), false, `${name} must not repeat project identity above the page title`);
  await noOverflow();
}

try {
  await page.goto(`${base}/workspaces`);
  await page.getByRole("heading", { name: "What would you like to work on?" }).waitFor();
  await page.locator(".wf-projects-page").waitFor();

  const projectCard = page.locator(".wf-project-card").first();
  await projectCard.waitFor();
  const landingStyles = await projectCard.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      radius: parseFloat(style.borderRadius),
      background: style.backgroundColor,
    };
  });
  assert(landingStyles.radius >= 28, `Expected prototype-scale project card radius; found ${landingStyles.radius}px`);
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v4-projects-desktop.png", fullPage: true });

  await projectCard.click();
  await page.waitForURL(/\/workspaces\/[0-9a-f-]+(?:\?.*)?$/);
  await page.locator(".guided-workspace").waitFor();
  const projectPath = new URL(page.url()).pathname;
  const projectUrl = `${base}${projectPath}`;

  const rail = page.locator(".wf-project-rail");
  await rail.waitFor();
  const railStyles = await rail.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      position: style.position,
      width: parseFloat(style.width),
      height: parseFloat(style.height),
    };
  });
  assert.equal(railStyles.position, "fixed", "Desktop project navigation must be a persistent fixed rail");
  assert(railStyles.width >= 240 && railStyles.width <= 255, `Expected approximately 248px project rail; found ${railStyles.width}px`);
  assert(railStyles.height >= 900, `Project rail must span the viewport; found ${railStyles.height}px`);

  const desktopNav = page.getByRole("navigation", { name: "Project navigation", exact: true });
  assert.deepEqual(
    await desktopNav.getByRole("link").allTextContents(),
    ["Overview", "Interview", "Journey", "Work", "Records", "Project Files", "Release & Care"],
  );

  const floatingHeader = page.locator(".wf-app-header");
  const headerStyles = await floatingHeader.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      position: style.position,
      radius: parseFloat(style.borderRadius),
    };
  });
  assert.equal(headerStyles.position, "fixed", "Project top bar must float independently of the page canvas");
  assert(headerStyles.radius >= 30, `Expected pill-like project top bar; found ${headerStyles.radius}px radius`);

  const visibleContentLeft = await page.locator(".project-heading h1").evaluate(
    (element) => element.getBoundingClientRect().left,
  );
  assert(
    visibleContentLeft >= railStyles.width + 24,
    `Visible workspace content must be inset from the project rail; left edge was ${visibleContentLeft}px`,
  );
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v4-overview-desktop.png", fullPage: true });

  await page.goto(`${projectUrl}/interview`);
  await page.getByRole("heading", { name: "Turn an incomplete idea into a coherent product brief." }).waitFor();
  const interviewStyles = await page.getByRole("heading", { name: "Turn an incomplete idea into a coherent product brief." }).evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: parseFloat(style.fontSize),
      fontWeight: Number(style.fontWeight),
    };
  });
  assert(interviewStyles.fontSize >= 50, `Interview hierarchy is too small for the approved prototype: ${interviewStyles.fontSize}px`);
  assert(interviewStyles.fontWeight <= 600, `Interview heading is too heavy for the approved prototype: ${interviewStyles.fontWeight}`);
  const questionRadius = await page.locator(".wf-question-card").evaluate((element) => parseFloat(getComputedStyle(element).borderRadius));
  assert(questionRadius >= 30, `Interview question surface must use prototype-scale rounding; found ${questionRadius}px`);
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v4-interview-desktop.png", fullPage: true });

  await page.goto(`${projectUrl}?view=journey`);
  await assertLargeDestinationHeading("Your journey");
  const currentStage = page.locator('.guided-journey > li[aria-current="step"]');
  await currentStage.waitFor();
  const currentStageStyles = await currentStage.evaluate((element) => ({
    radius: parseFloat(getComputedStyle(element).borderRadius),
    background: getComputedStyle(element).backgroundColor,
  }));
  assert(currentStageStyles.radius >= 24, `Current journey stage must use a large rounded surface; found ${currentStageStyles.radius}px`);
  assert.equal(currentStageStyles.background, "rgb(18, 19, 23)", "Current journey stage must use the dark focus surface");
  await page.screenshot({ path: "artifacts/workspace/shell-v4-journey-desktop.png", fullPage: true });

  await page.goto(`${projectUrl}?view=work`);
  await assertLargeDestinationHeading("Work");
  const addWork = page.getByText("Add work", { exact: true });
  const addWorkBackground = await addWork.evaluate((element) => getComputedStyle(element).backgroundColor);
  assert.equal(addWorkBackground, "rgb(18, 19, 23)", "Primary Work creation control must use the dark action treatment");
  const workCard = page.locator(".work-item-card").first();
  if (await workCard.count()) {
    const workRadius = await workCard.evaluate((element) => parseFloat(getComputedStyle(element).borderRadius));
    assert(workRadius >= 28, `Work item surfaces must use prototype-scale rounding; found ${workRadius}px`);
  }
  await page.screenshot({ path: "artifacts/workspace/shell-v4-work-desktop.png", fullPage: true });

  await page.goto(`${projectUrl}?view=records`);
  await assertLargeDestinationHeading("Records");
  const recordGroup = page.locator(".record-group").first();
  await recordGroup.waitFor();
  const groupBorder = await recordGroup.evaluate((element) => getComputedStyle(element).borderTopStyle);
  assert.equal(groupBorder, "solid", "Records must use clear horizontal section structure");
  await page.screenshot({ path: "artifacts/workspace/shell-v4-records-desktop.png", fullPage: true });

  await page.goto(`${projectUrl}/project-files`);
  await page.getByRole("heading", { name: "Keep useful project context close to the work." }).waitFor();
  const filesContext = page.locator(".wf-files-context");
  const filesContextStyles = await filesContext.evaluate((element) => ({
    radius: parseFloat(getComputedStyle(element).borderRadius),
    background: getComputedStyle(element).backgroundColor,
  }));
  assert(filesContextStyles.radius >= 30, `Project Files summary must use the prototype rounded panel; found ${filesContextStyles.radius}px`);
  assert.equal(filesContextStyles.background, "rgb(18, 19, 23)", "Project Files summary must use the dark context panel");
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v4-project-files-desktop.png", fullPage: true });

  await page.goto(`${projectUrl}?view=release-care`);
  await assertLargeDestinationHeading("Release & Care");
  const readinessCard = page.locator('section[aria-labelledby="release-title"] > article').first();
  const readinessStyles = await readinessCard.evaluate((element) => ({
    radius: parseFloat(getComputedStyle(element).borderRadius),
    background: getComputedStyle(element).backgroundColor,
  }));
  assert(readinessStyles.radius >= 30, `Release readiness must use a strong rounded surface; found ${readinessStyles.radius}px`);
  assert.equal(readinessStyles.background, "rgb(18, 19, 23)", "Release readiness must use the dark focus surface");
  await page.screenshot({ path: "artifacts/workspace/shell-v4-release-care-desktop.png", fullPage: true });

  await page.goto(`${projectUrl}?view=more`);
  await assertLargeDestinationHeading("More");
  const moreCard = page.locator('section[aria-labelledby="more-title"] .workspace-link').first();
  await moreCard.waitFor();
  const moreRadius = await moreCard.evaluate((element) => parseFloat(getComputedStyle(element).borderRadius));
  assert(moreRadius >= 28, `More destination cards must use prototype-scale rounding; found ${moreRadius}px`);
  await page.screenshot({ path: "artifacts/workspace/shell-v4-more-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${projectUrl}/interview`);
  const mobileNav = page.getByRole("navigation", { name: "Mobile project navigation", exact: true });
  await mobileNav.waitFor();
  assert.deepEqual(
    await mobileNav.getByRole("link").allTextContents(),
    ["Overview", "Interview", "Journey", "Work", "More"],
  );
  assert.equal(await rail.isVisible(), false, "Persistent project rail must collapse on phone layouts");
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v4-interview-mobile.png", fullPage: true });

  await page.goto(`${projectUrl}?view=journey`);
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v4-journey-mobile.png", fullPage: true });

  await page.goto(`${projectUrl}?view=records`);
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v4-records-mobile.png", fullPage: true });

  assert.deepEqual(errors, []);
  console.log("PASS: Wayfound uses one prototype-faithful visual system across Overview, Interview, Journey, Work, Records, Project Files, Release & Care, and More with responsive navigation and no horizontal overflow.");
} finally {
  await browser.close();
}
