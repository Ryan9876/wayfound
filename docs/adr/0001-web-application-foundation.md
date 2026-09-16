# ADR-0001 — Web application foundation

**Status:** Accepted  
**Decision date:** 2026-09-13

## Context

Wayfound needs one responsive workspace that supports phone and desktop use. The approved technical baseline specifies a Next.js 14+ App Router application with TypeScript. The product definition also requires durable structured records in later increments.

The first prototype must remain easy to change because core product assumptions still need user validation.

## Options

### Option A — Next.js App Router with React and TypeScript

Benefits: matches the approved technical baseline; supports server-rendered and interactive workspace views in one application; provides a direct path to later server-side application logic and persistence; keeps the prototype close to the intended production architecture.

Costs: framework upgrades require dependency review; server/client boundaries require discipline; a full framework is more machinery than a static prototype alone needs.

### Option B — Static HTML prototype first

Benefits: minimal setup and fast disposable visual exploration.

Costs: creates a second implementation path, increases rework when navigation/state/persistence/authentication begin, and makes prototype-to-product drift more likely.

## Decision

Use Next.js App Router, React, TypeScript, and Tailwind CSS for the Wayfound application foundation.

Use fixture data for the first product-learning slice. Do not add a database merely to simulate production before the interface and record model are validated.

## Rationale

This choice follows the approved architecture while keeping the first increment reversible. The prototype can test product behavior without creating premature persistence or integration commitments.

## Consequences

- The repository becomes the implementation source of truth for the prototype.
- The prototype must label fixture-backed states accurately.
- Persistent records, authentication, and production writes remain separate increments.
- Dependency versions must be reviewed during release work.

## Conditions for reconsideration

Reconsider this decision if Next.js prevents a required deployment or runtime constraint, a validated offline-first requirement changes the application boundary, or a later security or operating constraint makes the selected hosting/runtime unsuitable.
