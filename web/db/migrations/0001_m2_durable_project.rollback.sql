-- Pre-release rollback only. Do not run against a database that contains user project data.
BEGIN;
DROP TABLE IF EXISTS command_receipts;
DROP TABLE IF EXISTS state_transitions;
DROP TABLE IF EXISTS trace_links;
ALTER TABLE IF EXISTS artifacts DROP CONSTRAINT IF EXISTS artifacts_current_revision_fk;
DROP TABLE IF EXISTS artifact_revisions;
DROP TABLE IF EXISTS artifacts;
ALTER TABLE IF EXISTS records DROP CONSTRAINT IF EXISTS records_current_revision_fk;
DROP TABLE IF EXISTS record_revisions;
DROP TABLE IF EXISTS records;
ALTER TABLE IF EXISTS answers DROP CONSTRAINT IF EXISTS answers_current_revision_fk;
DROP TABLE IF EXISTS answer_revisions;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS interview_runs;
DROP TABLE IF EXISTS project_memberships;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS actors;
COMMIT;
