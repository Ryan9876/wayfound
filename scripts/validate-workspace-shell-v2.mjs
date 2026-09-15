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
  await page.locator(".wf-projects-hero").waitFor();
  await page.locator(".wf-projects-grid").waitFor();

  const projectCard = page.locator(".wf-project-card").first();
  await projectCard.waitFor();
  const cardRadius = await projectCard.evaluate((element) => parseFloat(getComputedStyle(element).borderRadius));
  assert(cardRadius >= 20, `Expected redesigned project card radius; found ${cardRadius}px`);
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v2-projects-desktop.png", fullPage: true });

  await projectCard.click();
  await page.waitForURL(/\/workspaces\/[0-9a-f-]+(?:\?.*)?$/);
  await page.locator(".guided-workspace").waitFor();
  const desktopNav = page.getByRole("navigation", { name: "Project navigation", exact: true });
  await desktopNav.waitFor();
  assert.deepEqual(
    await desktopNav.getByRole("link").allTextContents(),
    ["Overview", "Interview", "Journey", "Work", "Records", "Project Files", "Release & Care"],
  );
  const sidebarPosition = await page.locator(".project-sidebar").evaluate((element) => getComputedStyle(element).position);
  assert.equal(sidebarPosition, "sticky", "Redesigned desktop project navigation must remain sticky");
  await page.locator(".guided-next").waitFor();
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v2-overview-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileNav = page.getByRole("navigation", { name: "Mobile project navigation", exact: true });
  await mobileNav.waitFor();
  assert.deepEqual(
    await mobileNav.getByRole("link").allTextContents(),
    ["Overview", "Interview", "Journey", "Work", "More"],
  );
  assert.equal(await desktopNav.isVisible(), false, "Desktop project navigation must be hidden on phone layouts");
  await noOverflow();
  await page.screenshot({ path: "artifacts/workspace/shell-v2-overview-mobile.png", fullPage: true });

  assert.deepEqual(errors, []);
  console.log("PASS: redesigned Wayfound project landing and durable workspace shell render on desktop/mobile with the approved navigation hierarchy and no horizontal overflow.");
} finally {
  await browser.close();
}
