import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const routes = ["/", "/journey", "/work", "/more", "/handoffs", "/records", "/release-care"];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1200 },
];
const failures = [];

function fail(message) {
  failures.push(message);
}

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();

    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      if (dimensions.content > dimensions.viewport) {
        fail(`${viewport.name} ${route}: horizontal overflow (${dimensions.content}px content in ${dimensions.viewport}px viewport).`);
      }

      if (viewport.name === "mobile" && route === "/records") {
        const fieldsFit = await page.locator(".record-row .record-field").evaluateAll((fields) =>
          fields.length === 12 && fields.every((field) => {
            const rect = field.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.right <= window.innerWidth;
          }),
        );
        if (!fieldsFit) fail("mobile /records: Stage, Status, and Version must remain visible within the viewport on all four cards.");
      }

      const expected = await page.evaluate(() => {
        const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const elements = [...document.querySelectorAll(selector)].filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        });
        elements.forEach((element, index) => element.setAttribute("data-keyboard-probe", String(index)));
        return elements.map((element, index) => ({
          id: String(index),
          label: element.getAttribute("aria-label") || element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || element.tagName,
        }));
      });

      if (!expected.length) {
        fail(`${viewport.name} ${route}: no visible keyboard targets found.`);
        continue;
      }

      const seen = new Set();
      const focusProblems = [];
      const maxTabs = expected.length + 4;

      for (let index = 0; index < maxTabs; index += 1) {
        await page.keyboard.press("Tab");
        const state = await page.evaluate(() => {
          const active = document.activeElement;
          if (!(active instanceof HTMLElement)) return null;
          const style = window.getComputedStyle(active);
          return {
            id: active.getAttribute("data-keyboard-probe"),
            tag: active.tagName,
            outlineStyle: style.outlineStyle,
            outlineWidth: parseFloat(style.outlineWidth || "0"),
          };
        });
        if (!state?.id) continue;
        seen.add(state.id);
        if (state.outlineStyle === "none" || state.outlineWidth < 1) {
          focusProblems.push(`${state.tag}[${state.id}]`);
        }
        if (seen.size === expected.length) break;
      }

      const missing = expected.filter((item) => !seen.has(item.id));
      if (missing.length) {
        fail(`${viewport.name} ${route}: keyboard traversal missed ${missing.map((item) => item.label).join(", ")}.`);
      }
      if (focusProblems.length) {
        fail(`${viewport.name} ${route}: focus indicator missing for ${[...new Set(focusProblems)].join(", ")}.`);
      }

      if (viewport.name === "mobile" && route === "/more") {
        const moreTargets = expected.filter((item) => ["Handoffs", "Records", "Release & Care"].some((label) => item.label.includes(label)));
        if (moreTargets.length < 3) {
          fail("mobile /more: expected keyboard-accessible Handoffs, Records, and Release & Care links.");
        }
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("Keyboard validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Keyboard validation passed: visible controls are reachable by Tab with visible focus indicators across all primary routes at mobile and desktop viewports.");
