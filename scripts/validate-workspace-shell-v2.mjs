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
  await page.screenshot({ path: "artifacts/workspace/shell-v3-projects-desktop.png", fullPage: true });

  await projectCard.click();
  await page.waitForURL(/\/workspaces\/[0-9a-f-]+(?:\?.*)?$/);
  await page.locator(".guided-workspace").waitFor();

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

  const contentLeft = await page.locator(".project-content").evaluate((element) => element.getBoundingClientRect().left);
  assert(contentLeft > 248, `Workspace content must sit beside the project rail; left edge was ${contentLeft}px`);
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v3-overview-desktop.png", fullPage: true });

  await page.getByRole("link", { name: "Interview", exact: true }).first().click();
  await page.waitForURL(/\/interview$/);
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
  await page.screenshot({ path: "artifacts/workspace/shell-v3-interview-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}${new URL(page.url()).pathname}`);
  const mobileNav = page.getByRole("navigation", { name: "Mobile project navigation", exact: true });
  await mobileNav.waitFor();
  assert.deepEqual(
    await mobileNav.getByRole("link").allTextContents(),
    ["Overview", "Interview", "Journey", "Work", "More"],
  );
  assert.equal(await rail.isVisible(), false, "Persistent project rail must collapse on phone layouts");
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v3-interview-mobile.png", fullPage: true });

  assert.deepEqual(errors, []);
  console.log("PASS: Wayfound uses the prototype-faithful persistent rail, floating top bar, large calm hierarchy, rounded Interview surfaces, responsive mobile navigation, and no horizontal overflow.");
} finally {
  await browser.close();
}
