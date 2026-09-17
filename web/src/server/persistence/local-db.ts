import { mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import Database from 'better-sqlite3';

let singleton: Database.Database | null = null;
let singletonPath: string | null = null;

export function localDatabasePath(): string {
  const configured = process.env.WAYFOUND_LOCAL_DB?.trim();
  if (configured) return resolve(configured);
  return join(homedir(), '.wayfound', 'wayfound.sqlite');
}

function migrationSql(): string {
  return readFileSync(join(process.cwd(), 'db', 'local', '0001_local_durable_project.sql'), 'utf8');
}

export function openLocalDatabase(path = localDatabasePath()): Database.Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  const hasMigrations = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
  if (!hasMigrations) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(migrationSql());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      db.close();
      throw error;
    }
  }
  return db;
}

export function getLocalDatabase(): Database.Database {
  const path = localDatabasePath();
  if (!singleton || singletonPath !== path) {
    singleton?.close();
    singleton = openLocalDatabase(path);
    singletonPath = path;
  }
  return singleton;
}

export function closeLocalDatabaseForTests(): void {
  singleton?.close();
  singleton = null;
  singletonPath = null;
}
