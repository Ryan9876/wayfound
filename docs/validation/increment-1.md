# Increment 1 validation

**Status:** Validated  
**Date:** 2026-09-13  
**Application commit:** `4cbc8fddc092dc27ee3b59fddb039e42e7e3a1cf`  
**Reviewer:** Codex agent; no independent participant research claimed

## Result

The foundation and orientation increment meets the checks in DELIVERY_PLAN.md. This result applies to the fixture-backed prototype. It does not establish production readiness or a release.

## Executed evidence

[CI run 62](https://github.com/Ryan9876/wayfound/actions/runs/34769762602), job `103757083713`, completed successfully:

- prototype structure and deterministic-status checks;
- accessibility baseline, including selected normal-text contrast pairs at 4.5:1 or higher;
- TypeScript;
- production build;
- keyboard traversal and visible focus on seven routes at mobile and desktop sizes;
- horizontal overflow checks on those routes;
- Stage, Status, and Version field bounds on all four mobile record cards;
- screenshot capture and artifact upload.

Artifact: `ui-screenshots`, ID `10321556948`. Artifact digest: `sha256:4ef831d953d4d1b8ceef8813a60a73e722d80da2d436ccb7b85d30f53a380d00`. GitHub retention currently expires on 2026-09-20; the committed workflow can reproduce screenshots.

Build, TypeScript, prototype, and accessibility checks also passed locally on the same application content. Browser-level evidence cited here comes from CI.

## Visual review and defect correction

Reviewed the CI screenshots for all seven mobile surfaces and six desktop primary routes. Overview retains clear next-action hierarchy. Journey presents the 15-stage map. Handoffs keeps returns proposed. Release & Care shows missing readiness evidence. More links to Handoffs, Records, and Release & Care.

Initial review at `4c98f49834d286a27b745328997eb5264f4171d7` found Records rendered at 518 pixels in a 390-pixel viewport. An inherited 500-pixel table-row minimum caused overflow. The correction overrides that minimum for mobile record cards and adds a rendered regression check.

The corrected Records screenshot is 390 pixels wide. Stage, Status, and Version remain visible. The other 13 screenshots are pixel-identical to the reviewed baseline. Desktop Records was also inspected at full size after the correction.

## Orientation task review

Agent walkthrough using rendered screenshots and repository source:

| Task | Observed result |
| --- | --- |
| Identify current release | Borrow Desk, Release 1.0 |
| Identify current stage | Stage 2: Validate and compare |
| Identify next action | Observe one equipment checkout next |
| Explain why | Observe real behavior to expose gaps and inform requirements |
| Identify an open assumption | Borrowers do not need self-service/accounts for this release |
| Identify evidence state | Direct observation pending; reviewer not assigned |
| Locate other records | Records is present on desktop and under mobile More |

## Limits and remaining work

This is a prototype task walkthrough, not a study with representative users. Charter success measures remain TBD. The accessibility checks are a baseline, not a full conformance audit. Illustrative action, search, and account controls do not establish working durable workflows. Authentication and persistence are not implemented. PR #1 remains draft and has no independent reviewer approval. No Released claim is made.
