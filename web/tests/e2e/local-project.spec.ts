import { expect, test } from '@playwright/test';

test('durable adaptive Interview persists, resumes, revises, and rejects stale writes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your project stays here unless you choose otherwise.' })).toBeVisible();
  await expect(page.getByText('No sign-in required. This installation owns its local projects.')).toBeVisible();

  await page.getByRole('link', { name: 'Open projects' }).click();
  await page.getByLabel('Project name').fill('Durable puzzle Interview');
  await page.getByLabel('Starting idea').fill('I want to make a puzzle game for friends.');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]+$/);

  const projectId = page.url().split('/').at(-1)!;
  await expect(page.getByText('Project version 1')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'If this works really well, what would make you happiest about it?' })).toBeVisible();
  await expect(page.getByText('People enjoy using it', { exact: true })).toBeVisible();
  await page.locator('input[value="enjoy"]').check();
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await expect(page.getByText('Project version 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Who is this for first?' })).toBeVisible();
  await page.locator('input[value="small-group"]').check();
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await expect(page.getByText('Project version 3')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What will someone spend most of their time doing in the game?' })).toBeVisible();
  await expect(page.getByText('Solve puzzles or overcome challenges', { exact: true })).toBeVisible();
  await page.locator('input[value="solve"]').check();
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await expect(page.getByText('Project version 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Will more than one person share or change things?' })).toBeVisible();

  // Refresh proves browser memory is not the source of truth.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Will more than one person share or change things?' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'What will someone spend most of their time doing in the game?' })).toBeVisible();
  await expect(page.locator('input[value="solve"]')).toBeChecked();

  // Revising a persisted answer creates a new current revision and returns to the adaptive next question.
  await page.locator('input[value="explore"]').check();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByText('Project version 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Will more than one person share or change things?' })).toBeVisible();

  const snapshotResponse = await page.request.get(`/api/v1/projects/${projectId}/interview`);
  expect(snapshotResponse.ok()).toBe(true);
  const snapshotBody = await snapshotResponse.json();
  const gameLoop = snapshotBody.interview.answers.find((answer: { questionKey: string }) => answer.questionKey === 'game-loop');
  expect(gameLoop.optionKey).toBe('explore');
  expect(gameLoop.revisionNumber).toBe(2);

  // Not-sure is durable unresolved state, not an accepted decision.
  await page.locator('input[value="not-sure"]').check();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByText('Project version 6')).toBeVisible();
  const detailResponse = await page.request.get(`/api/v1/projects/${projectId}`);
  const detailBody = await detailResponse.json();
  const collaborationRecord = detailBody.project.records.find((record: { key: string }) => record.key === 'INT-COLLABORATION');
  expect(collaborationRecord.type).toBe('open-question');

  // A command from an old view must fail rather than overwrite current project version 6.
  const stale = await page.request.post(`/api/v1/projects/${projectId}/interview`, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: {
      expectedVersion: 1,
      questionKey: 'outcome',
      optionKey: 'easier',
    },
  });
  expect(stale.status()).toBe(409);
  const staleBody = await stale.json();
  expect(staleBody.error.code).toBe('CONFLICT');

  await page.reload();
  await expect(page.getByText('Project version 6')).toBeVisible();
});

test('durable Interview remains usable at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects');
  await page.getByLabel('Project name').fill('Pocket Interview');
  await page.getByLabel('Starting idea').fill('I want to make a simple study helper.');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: 'If this works really well, what would make you happiest about it?' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
