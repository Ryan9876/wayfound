import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
const dataEnvironment = process.env.WAYFOUND_DATA_ENV;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!['development', 'preview', 'production'].includes(dataEnvironment)) throw new Error('WAYFOUND_DATA_ENV must be development, preview, or production.');
if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== dataEnvironment) throw new Error('Deployment and data environments do not match.');

const file = process.argv[2] ?? 'db/migrations/0001_m2_durable_project.sql';
const sql = await readFile(resolve(process.cwd(), file), 'utf8');
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try { await client.query(sql); console.log(`Applied ${file} to ${dataEnvironment}.`); }
finally { await client.end(); }
