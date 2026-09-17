# Wayfound Web — M2 production scaffold

This directory is the accepted Next.js/TypeScript production application scaffold. The validated dependency-free prototype remains in the repository root `app/` directory while production behavior is moved here in bounded slices.

## M2 proof path

1. Clerk authenticates a user.
2. Wayfound maps the Clerk subject to an internal human Actor.
3. The Actor creates a private project through a server command.
4. An accepted answer creates an immutable Answer Revision and current Record Revision in one transaction.
5. A requirement/work candidate stays transient until `Propose`.
6. `Propose` snapshots an exact Artifact Revision and exact source Record Revision links.
7. A stale project version or stale source revision is rejected.
8. M2 intentionally has no `Approve` command.

## Local setup

Copy `.env.example` to `.env.local` and use development-only Clerk and PostgreSQL/Neon values. Never commit secrets.

```bash
npm install
npm run migrate
npm test
npm run typecheck
npm run dev
```

The first migration and rollback script are pre-release scaffolding. The rollback script is destructive and must not be used after real user data exists.
