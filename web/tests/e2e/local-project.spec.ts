import { expect, test } from '@playwright/test';

test('local project survives navigation, saves a decision, proposes exact-source work, and rejects stale writes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your project stays here unless you choose otherwise.' })).toBeVisible();
  await expect(page.getByText('No sign-in required. This installation owns its local projects.')).toBeVisible();

  await page.getByRole('link', { name: 'Open projects' }).click();
  await page.getByLabel('Project name').fill('Local browser proof');
  await page.getByLabel('Starting idea').fill('Keep a traceable project on this computer and choose whether AI is local or external.');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]+$/);

  const projectId = page.url().split('/').at(-1)!;
  await expect(page.getByText('Project version 1')).toBeVisible();
  await expect(page.getByText('Keep a traceable project on this computer and choose whether AI is local or external.')).toBeVisible();

  await page.getByRole('button', { name: 'Save decision' }).click();
  await expect(page.getByText('Project version 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Current records' })).toBeVisible();
  await expect(page.getByText('DEC-OUTCOME')).toBeVisible();

  await page.getByRole('button', { name: 'Propose requirement' }).click();
  await expect(page.getByText('Project version 3')).toBeVisible();
  await expect(page.getByText(/REQ-DECISION-SPEED · proposed/)).toBeVisible();
  await expect(page.getByText('Proposed. Still not approved — important little distinction.')).toBeVisible();

  // Reopen through the saved-project list to prove navigation/session loss is not the authority.
  await page.getByRole('link', { name: 'Projects' }).click();
  await expect(page.getByText('Local browser proof')).toBeVisible();
  await page.getByRole('link', { name: /Local browser proof/ }).click();
  await expect(page.getByText('Project version 3')).toBeVisible();
  await expect(page.getByText(/REQ-DECISION-SPEED · proposed/)).toBeVisible();

  // A command from an old view must fail rather than overwrite project version 3.
  const stale = await page.request.post(`/api/v1/projects/${projectId}/answers`, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: {
      expectedVersion: 1,
      questionKey: 'audience',
      optionKey: 'small-group',
      recordTitle: 'Initial audience',
      recordStatement: 'Start with a small group.',
    },
  });
  expect(stale.status()).toBe(409);
  const staleBody = await stale.json();
  expect(staleBody.error.code).toBe('CONFLICT');

  // The rejected command must not change current authoritative state.
  await page.reload();
  await expect(page.getByText('Project version 3')).toBeVisible();
  await expect(page.getByText('DEC-AUDIENCE')).toHaveCount(0);
});

test('local project checkpoint remains usable at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'What are you making?' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
