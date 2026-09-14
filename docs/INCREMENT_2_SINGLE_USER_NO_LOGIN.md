# Increment 2 — Local single-user no-login experience

**Status:** Implementing

## Outcome

The active local single-user Wayfound test opens directly into the owner workspace without asking the sole user to enter credentials.

This is a user-experience simplification, not removal of authentication. Wayfound must retain the seeded owner identity, RLS enforcement, actor attribution, and audit semantics underneath the interface.

## Behavior

1. The local setup seeds exactly one owner account.
2. The setup stores that owner identity only in local private configuration.
3. On a protected request without a current session, Wayfound may automatically establish the seeded owner session only inside the guarded loopback local-test configuration defined by ADR-0006.
4. The package opens `/workspaces`, not `/sign-in`.
5. `/sign-in` redirects to `/workspaces` after the owner session is established.
6. `Sign out` is hidden in this mode because normal use should not require session management.
7. If automatic session establishment fails, Wayfound shows a recoverable configuration error rather than presenting the normal interactive login form in the no-login mode.

## Security constraints

Automatic session establishment MUST NOT activate unless single-user mode, the explicit auto-sign-in flag, the explicit local-test flag, loopback application origin, loopback Supabase endpoint, and valid owner credentials are all present.

The application must continue to use the publishable/anon key and authenticated user session. It must not add an application service-role key or bypass RLS.

## Acceptance criteria

- A fresh local test browser can open `/workspaces` without entering credentials and receives the authenticated owner workspace experience.
- The resulting request is authenticated as the seeded owner, not anonymous.
- The single-user header contains no sign-out control.
- Visiting `/sign-in` does not expose the credential form while no-login mode is enabled.
- Existing normal authentication remains available when the guarded no-login mode is disabled.
- Hosted or non-loopback configuration cannot enable the automatic owner session.
