# Implementer handoff notes

Group: #450, #472, #473, #475, #476. Branch `codex/bug-batch-450`, baseline `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`. Implementation round1 remains unchanged. No commit, push, PR, merge, issue closure, external Claude invocation or production access was performed by the implementer.

## Root causes and changes

- #450 adopts the owner-approved subset of historical PR469 (source head `29b2f5c9b72b4d909b954d5360ec08095825f29e`). The complete single-page manual intake remains. Document entry is one combined letter/transfer choice; automatic admission time alone does not imply completion. Repeated demographic guidance is removed while field errors and computed-CF notice remain. Tablet layout uses the actual two choices.
- #472 shares the import/intake lifecycle with #473/#476. Review fills the available viewport with persistent original and editable panes. Closing a new review offers actual draft save; the latest edited values are used, not a stale effect closure. Owner-authenticated import drafts are explicitly listed and resumed by their exact saved draft/job IDs. Already registered incomplete identities have a separate actionable completion area.
- #473 derives missing sex only from a validated unambiguous CF, preserves explicit values and marks backend derivation reviewable. Missing birth dates are preserved. The existing actual therapy parser already recognizes unheaded medication prose; exact behavioral regressions and the real upload/handoff now prove doses, schedules and provenance. Unsafe prescriptions remain blocked or explicitly left in draft; no administration is created.
- #475 reproduced a concrete Vite development-worker asset URL error: decoders were sought under node_modules although the pinned Vite assets are emitted under the application assets directory. The helper now handles development workers and built/non-root assets with security/version guards retained. A real JPEG2000 scanned PDF page exercises the actual OpenJPEG decoder and nonblank canvas, rather than a stub.
- #476 allows name/surname/valid CF to progress in imported intake only. Manual identity requirements remain unchanged. Invalid supplied CF/date, clinical review and conflicts retain explicit blockers. Final import confirmation is awaited as an actual201 response; persistence, reload and idempotent200 replay are verified against SQL.

## Verification environment boundaries

The single harness starts real frontend/backend, a fresh synthetic database, actual upload/storage/worker/hash+attempt lifecycle, browser PDF rendering, parser, handoff and SQL persistence, then tears down owned resources. The only external inference stand-in is a deterministic OCR/extraction provider fixture; paid provider inference is not verified. The only static dependency fixture mirrors actual pinned official Inter/JetBrains Mono font bytes, with bundled OFL licences, registry integrity and per-file SHA256. Fonts are actually loaded and normal/bold text geometry is measured. Business APIs, UI fields, canvas output and database reads are not mocked.

The normal Docker path owns only a nonprivileged loopback55450 container. Native CI creates a separate owned child database from the trusted loopback5432/clinicos_test parent. The explicit local native-proof alternate uses only a separately owned55450 fixture whose synthetic marker is checked. The native branch contains no Docker operation. Parent patient tables are never migrated/read/cleared. Cleanup checks the child ownership marker before DROP. The local dual-mode driver verifies the synthetic native parent still has zero public tables and the child has been removed.

Evidence trace redaction removes only ephemeral local simulator bearer credentials from textual trace entries; actual responses/status/timing, screenshots and binary resources remain. Trace ZIP integrity and JSON lines are validated separately. No external API/deploy/GitHub secrets are inherited by application children.

## Remaining controller gates

Dedicated independent QA, the existing required CI gates, external Claude review, release verification and issue state/closure remain controller-owned. Historical PR469 CI failed the unrelated proactive denied-access-ack test U. This implementation changes no proactive/auth test or behavior and does not waive that check; QA/CI must classify it on the final SHA. The implementer's pure backend suite is not a claim that the complete backend suite ran on this branch.

## Required outer lifecycle lock in this shared environment

The canonical harness does **not** acquire flock itself. Here the caller must acquire exactly one outer lock **before any Docker startup**, retaining it through browser verification and teardown:

```sh
flock /tmp/clinicos-browser-qa.lock node scripts/e2e/issue-450-ingresso.mjs artifacts/task-validation/bug-batch-450
```

The local two-mode proof driver is also called under that single outer lock, not a nested browser-only lock. Native CI has its trusted database lifecycle supplied externally; the canonical native branch executes no Docker command. Avoid concurrent Docker lifecycles while any browser proof holds this shared lock.
