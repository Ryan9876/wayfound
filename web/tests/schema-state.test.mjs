import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const { Client } = pg;
const expected = process.env.EXPECT_WAYFOUND_SCHEMA;
if (!['present', 'absent'].includes(expected)) {
  throw new Error('EXPECT_WAYFOUND_SCHEMA must be present or absent.');
}

const tables = [
  'actors',
  'projects',
  'project_memberships',
  'interview_runs',
  'answers',
  'answer_revisions',
  'records',
  'record_revisions',
  'artifacts',
  'artifact_revisions',
  'trace_links',
  'state_transitions',
  'command_receipts',
];

test(`M2 schema is ${expected}`, async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    for (const table of tables) {
      const result = await client.query('SELECT to_regclass($1) AS relation', [`public.${table}`]);
      if (expected === 'present') assert.equal(result.rows[0].relation, table);
      else assert.equal(result.rows[0].relation, null);
    }
  } finally {
    await client.end();
  }
});
