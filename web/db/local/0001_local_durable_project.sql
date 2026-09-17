CREATE TABLE actors (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  external_subject TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human','service','ai')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (provider, external_subject)
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  starting_idea TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('active','archived')),
  version INTEGER NOT NULL CHECK (version >= 1),
  created_by_actor_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE project_memberships (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  role TEXT NOT NULL CHECK (role IN ('owner')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (project_id, actor_id)
);

CREATE TABLE interview_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  routing_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','completed','superseded')),
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);

CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  interview_run_id TEXT NOT NULL REFERENCES interview_runs(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  current_revision_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (interview_run_id, question_key)
);

CREATE TABLE answer_revisions (
  id TEXT PRIMARY KEY,
  answer_id TEXT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  option_key TEXT NOT NULL,
  value_text TEXT,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  predecessor_revision_id TEXT REFERENCES answer_revisions(id),
  accepted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (answer_id, revision_number)
);

CREATE TABLE records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  record_key TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('decision','assumption','blocker','open-question')),
  current_revision_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (project_id, record_key)
);

CREATE TABLE record_revisions (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  source_answer_revision_id TEXT REFERENCES answer_revisions(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (record_id, revision_number)
);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artifact_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('requirement','work-item')),
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('draft','proposed','set-aside')),
  current_revision_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (project_id, artifact_key)
);

CREATE TABLE artifact_revisions (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (artifact_id, revision_number)
);

CREATE TABLE trace_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_revision_type TEXT NOT NULL CHECK (from_revision_type IN ('answer','record','artifact')),
  from_revision_id TEXT NOT NULL,
  to_revision_type TEXT NOT NULL CHECK (to_revision_type IN ('answer','record','artifact')),
  to_revision_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX trace_links_project_idx ON trace_links(project_id);
CREATE INDEX trace_links_from_idx ON trace_links(from_revision_type, from_revision_id);
CREATE INDEX trace_links_to_idx ON trace_links(to_revision_type, to_revision_id);

CREATE TABLE state_transitions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  revision_id TEXT,
  prior_state TEXT,
  resulting_state TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  operation TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX state_transitions_project_idx ON state_transitions(project_id, created_at);

CREATE TABLE command_receipts (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  request_id TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (actor_id, operation, request_id)
);

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO schema_migrations(version) VALUES (1);
