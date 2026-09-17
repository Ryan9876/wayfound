import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const { Client } = pg;

test('restored M2 backup contains durable project, revisions, artifact, and trace data', async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(`
      SELECT
        (SELECT count(*)::int FROM projects) AS projects,
        (SELECT count(*)::int FROM answer_revisions) AS answer_revisions,
        (SELECT count(*)::int FROM record_revisions) AS record_revisions,
        (SELECT count(*)::int FROM artifacts) AS artifacts,
        (SELECT count(*)::int FROM trace_links) AS trace_links
    `);
    const row = result.rows[0];
    assert.ok(row.projects >= 1);
    assert.ok(row.answer_revisions >= 2);
    assert.ok(row.record_revisions >= 2);
    assert.ok(row.artifacts >= 1);
    assert.ok(row.trace_links >= 2);
  } finally {
    await client.end();
  }
});
