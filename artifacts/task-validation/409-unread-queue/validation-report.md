# #409 root exact-source validation

## Final Decision

CLOSED — VERIFIED

Formal closure receipt added after the verified deployment and GitHub closure at 2026-10-09T08:20:32Z. This evidence-only addendum changes no application source, reruns no QA, and preserves the original immutable proof commit 5c9f094fe62fa8deedf0c6b9fa7afd85022e87fd and its 92-file manifest at that commit. The manifest is not claimed to describe a later amended report.

| Area | Test | Esito | Evidence |
|---|---|---|---|
| Frontend | fresh independent plus root focused15/browser12/types/build; zero new regression failures | PASS scoped | independent-qa-report.md; root-rerun/commands/command-results.json; root-rerun/test-results/browser-results.json |
| Backend | isolated PostgreSQL12/12,57 migrations, types/build; provider migration applied | PASS | root-rerun; deployment-receipt.json |
| Agnos | not modified | NA | application diff |
| Security/privacy | credential and immutable artifact gates, synthetic screenshots HTTP200 | PASS scoped | publication-manifest.json at original proof5c9f; security-review.md |
| Release | source47a Vercel READY/backend SUCCESS/health200; original AC1–4 satisfied | PASS | release-gate-receipt.json; deployment-receipt.json; GitHub409 comment6077214216 |

Application: 47a4b16c111d9b9bfd0b138991958a8ca8f6c351; accepted baseline 973d78e5e109032a36cf89cf80fd8eb2a848a649. Source hash 3497659ff1207d2b6c2b222c2ed08a92bf63cc9341a33cf5795c06a14cf2eece, 1,437 tracked application/build inputs, identical before/after independent QA and root rerun. No untracked application overrides. Only this issue's app commit promoted; pending405/408 and dirty primary/launchers excluded.

Root read the fresh independent report and checked its frozen 35-file evidence manifest. Root then reran commands, actual isolated PostgreSQL, Prisma validation/custom-output generation and actual guarded SPA browser tests, on exactly the same commit. Each run: focused15/15, realDB12/12, browser12/12; types/backend TypeScript emission/frontend TypeScript+Vite build/secret scan PASS. Full frontend1,189/1,177/12: the same12 accepted-baseline failures, zero new; no entirely-green regression claim. Backend emission does not generate shared Prisma client; temporary isolated generation separately validates new models and production provider build performs normal client generation.

All original four AC locally PASS: exact mixed-source/count predicate across all dates/priorities/statuses and stable bounded pages; default/re-entry Non confermate; explicit reading removes a row/count without clinical takeover; patient identity/counts and textual states remain understandable in desktop and mobile grayscale. Root inspected synthetic desktop badge52 and mobile grayscale controls visually. Tests also cover failed read/count retry, no fabricated zero, patient outside first roster page, same-actor later clinical takeover, races/idempotency, append-only facts/cascade, anonymous/denied/out-of-scope/cursor gates, late view/session receipts and preserved patient drafts. No actual clinical writes or unexpected network; intentional503 fixtures disclosed.

Real isolated PostgreSQL applied57 migrations, including the additive explicit-read migration; no existing receipts/clinical statuses rewritten. Both owned7473 QA servers and private clusters closed. Mobile is viewport/vision emulation, not physical-device/sunlight or real-screen-reader certification; those are not original #409 AC. Existing seven dependency findings and same12 baseline failures remain openly disclosed. New tagged SQL scanner findings independently reviewed as parameterized-template false positives; no blanket security/accessibility certification.

Root release-gate-receipt.json records authorized scoped promotion after all local gates. Branch/main pushed exact47a. Deployment verified: Vercel dpl_6GFhZBk1mw8yCbDsQZZJPuifZ1SB READY with both source SHAs47a, production alias and unread-queue asset HTTP200; backend Actions37903586484 successful actual checkout47a, Railway ed539cb2-224c-4221-8e7a-0f0901039987 SUCCESS and health200. Provider deployment log explicitly says Applying migration `20261009090000_explicit_diary_reads` at 2026-10-09T08:15:57.713413204Z. Exact provider receipts and bundle/image hashes are in deployment-receipt.json. Publication additionally requires exact artifact hashes and credential/PHI scan; original medical photographs and failed/debug/root-initial runs are excluded. Synthetic screenshots/traces/fixtures do not claim a production-patient workflow was mutated to test.
