# ADR-0006 — Local single-user automatic owner session

**Status:** Accepted  
**Date:** 2026-09-13  
**Decision owner:** Product owner

## Decision

The active local single-user Wayfound test experience will not require interactive login.

Wayfound will still operate as one authenticated owner identity internally so existing row-level security, actor attribution, audit history, and owner-authority semantics remain intact. In the approved local test configuration, Wayfound establishes that owner session automatically.

The existing sign-in implementation remains in the repository for future hosted or multi-user use, but the local single-user test path hides the sign-in and sign-out controls.

## Safety boundary

Automatic owner-session establishment is enabled only when all of the following are true:

- `WAYFOUND_SINGLE_USER_MODE=true`;
- `WAYFOUND_SINGLE_USER_AUTO_SIGN_IN=true`;
- `WAYFOUND_LOCAL_TEST=1`;
- `APP_ORIGIN` is loopback HTTP (`127.0.0.1` or `localhost`);
- `SUPABASE_URL` is loopback HTTP (`127.0.0.1` or `localhost`);
- one owner email and password are supplied through local environment configuration.

If any condition is absent, Wayfound must not auto-authenticate. This prevents the convenience behavior from silently becoming a hosted passwordless mode.

## Consequences

- Opening the local test app takes the owner directly to `/workspaces`.
- Visiting `/sign-in` while the automatic owner session is healthy redirects to `/workspaces`.
- The active single-user header does not show `Sign out`.
- Local setup keeps the owner credentials private for session establishment but does not require the user to enter or manage them during normal use.
- Authentication, RLS, owner identity, and audit attribution remain active under the hood.
- Failure to establish the automatic owner session produces a recoverable local setup error rather than falling back to fixtures or a public/cloud identity provider.

## Non-goals

This decision does not create anonymous project access, remove authentication from the data layer, weaken RLS, authorize public access, or define a hosted authentication model.

## Reconsideration trigger

Revisit this decision before any hosted deployment, shared-network deployment, multi-human mode, or external access path is introduced.
