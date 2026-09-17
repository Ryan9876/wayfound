BEGIN;

CREATE TABLE actors (
  id uuid PRIMARY KEY,
  provider text NOT NULL,
  external_subject text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('human','service','ai')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_subject)
);

CREATE TABLE projects (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  starting_idea text NOT NULL,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('active','archived')),
  version bigint NOT NULL CHECK (version >= 1),
  created_by_actor_id uuid NOT NULL REFERENCES actors(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_memberships (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES actors(id),
  role text NOT NULL CHECK (role IN ('owner')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, actor_id)
);

CREATE TABLE interview_runs (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  routing_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('active','completed','superseded')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE answers (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  interview_run_id uuid NOT NULL REFERENCES interview_runs(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  current_revision_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (interview_run_id, question_key)
);

CREATE TABLE answer_revisions (
  id uuid PRIMARY KEY,
  answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number >= 1),
  option_key text NOT NULL,
  value_text text,
  actor_id uuid NOT NULL REFERENCES actors(id),
  predecessor_revision_id uuid REFERENCES answer_revisions(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (answer_id, revision_number)
);
ALTER TABLE answers ADD CONSTRAINT answers_current_revision_fk FOREIGN KEY (current_revision_id) REFERENCES answer_revisions(id);

CREATE TABLE records (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  record_key text NOT NULL,
  record_type text NOT NULL CHECK (record_type IN ('decision','assumption','blocker','open-question')),
  current_revision_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, record_key)
);

CREATE TABLE record_revisions (
  id uuid PRIMARY KEY,
  record_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number >= 1),
  title text NOT NULL,
  statement text NOT NULL,
  source_answer_revision_id uuid REFERENCES answer_revisions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (record_id, revision_number)
);
ALTER TABLE records ADD CONSTRAINT records_current_revision_fk FOREIGN KEY (current_revision_id) REFERENCES record_revisions(id);

CREATE TABLE artifacts (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artifact_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('requirement','work-item')),
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('draft','proposed','set-aside')),
  current_revision_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, artifact_key)
);

CREATE TABLE artifact_revisions (
  id uuid PRIMARY KEY,
  artifact_id uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number >= 1),
  title text NOT NULL,
  statement text NOT NULL,
  content_hash text NOT NULL,
  created_by_actor_id uuid NOT NULL REFERENCES actors(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, revision_number)
);
ALTER TABLE artifacts ADD CONSTRAINT artifacts_current_revision_fk FOREIGN KEY (current_revision_id) REFERENCES artifact_revisions(id);

CREATE TABLE trace_links (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_revision_type text NOT NULL CHECK (from_revision_type IN ('answer','record','artifact')),
  from_revision_id uuid NOT NULL,
  to_revision_type text NOT NULL CHECK (to_revision_type IN ('answer','record','artifact')),
  to_revision_id uuid NOT NULL,
  relation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trace_links_project_idx ON trace_links(project_id);
CREATE INDEX trace_links_from_idx ON trace_links(from_revision_type, from_revision_id);
CREATE INDEX trace_links_to_idx ON trace_links(to_revision_type, to_revision_id);

CREATE TABLE state_transitions (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  revision_id uuid,
  prior_state text,
  resulting_state text NOT NULL,
  actor_id uuid NOT NULL REFERENCES actors(id),
  operation text NOT NULL,
  request_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX state_transitions_project_idx ON state_transitions(project_id, created_at);

CREATE TABLE command_receipts (
  id uuid PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES actors(id),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  operation text NOT NULL,
  request_id text NOT NULL,
  result_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, operation, request_id)
);

COMMIT;
