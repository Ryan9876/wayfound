from pathlib import Path

ui_path = Path('web/src/app/projects/[projectId]/durable-interview.tsx')
ui = ui_path.read_text()
old = '''  if (state.complete || !question) {
    const summary = getSummary(state);
    return (
'''
new = '''  if (state.complete) {
    const summary = getSummary(state);
    return (
'''
if old not in ui:
    raise SystemExit('completion branch marker missing')
ui = ui.replace(old, new, 1)
old2 = '''  const selected = state.answers[question.id] ?? '';
  return (
'''
new2 = '''  if (!question) {
    return (
      <main className="shell">
        <section className="card">
          <h1>Wayfound lost its place for a moment.</h1>
          <p className="muted">Your saved answers are still local. Reload the Interview to reconstruct the current step.</p>
          <div className="actions">
            <button className="button primary" type="button" onClick={() => void load()}>Reload Interview</button>
            <Link className="button" href="/projects">Back to projects</Link>
          </div>
        </section>
      </main>
    );
  }

  const selected = state.answers[question.id] ?? '';
  return (
'''
if old2 not in ui:
    raise SystemExit('selected marker missing')
ui = ui.replace(old2, new2, 1)
old3 = '''          <button className="button" type="button" onClick={() => setState(goBackInterview(state))}>Back</button>'''
new3 = '''          <button className="button" type="button" disabled={state.history.length === 0} onClick={() => setState(goBackInterview(state))}>Back</button>'''
if old3 not in ui:
    raise SystemExit('Back button marker missing')
ui = ui.replace(old3, new3, 1)
ui_path.write_text(ui)

spec_path = Path('web/tests/e2e/local-project.spec.ts')
spec = spec_path.read_text()
marker = '''  await expect(page.getByRole('heading', { name: 'If this works really well, what would make you happiest about it?' })).toBeVisible();
  await expect(page.getByText('People enjoy using it', { exact: true })).toBeVisible();
'''
replacement = '''  await expect(page.getByRole('heading', { name: 'If this works really well, what would make you happiest about it?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
  await expect(page.getByText('People enjoy using it', { exact: true })).toBeVisible();
'''
if marker not in spec:
    raise SystemExit('E2E initial-question marker missing')
spec = spec.replace(marker, replacement, 1)
spec_path.write_text(spec)
