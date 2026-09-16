import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
export function localBackend() {
  if (process.env.WAYFOUND_LOCAL_TEST !== '1') throw new Error('Explicit WAYFOUND_LOCAL_TEST=1 required');
  const status = JSON.parse(execFileSync('node_modules/.bin/supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }));
  const url = status.API_URL;
  const db = status.DB_URL;
  if (![url,db].every(value => ['127.0.0.1','localhost'].includes(new URL(value).hostname))) throw new Error('Only isolated loopback services are allowed');
  const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
  const secret = status.SECRET_KEY || status.SERVICE_ROLE_KEY;
  if (!key || !secret) throw new Error('Local keys unavailable');
  return { url, db, key, admin: createClient(url,secret,{auth:{persistSession:false}}), client: () => createClient(url,key,{auth:{persistSession:false}}), sql: new pg.Client({connectionString:db}) };
}
