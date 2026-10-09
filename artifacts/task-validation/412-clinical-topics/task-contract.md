# Task Contract

## Task
- Title: 412-clinical-topics
- Slug: 412-clinical-topics
- Type: bugfix
- Date: 2026-10-09

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Accepted source8b327ca; isolated C:/w-412, root sole application writer, architecture agent read-only except own report. Existing chart Clinica renders structured diagnosis/risk/allergy/history plus ten expanded narrative cards including duplicate three topics and document-absence placeholders. No clinical data corruption established. Primary dirty source and unrelated launcher EOL preserved/excluded. No AgentDB DB available in this isolated checkout; source/ADR analysis fallback. Ruflo hierarchical2 ledger swarm-1791537349328-5m52k5, not release authority.

## Expected Behaviour

One existing structured card per topic, with clearly labeled current data and imported-text detail inside it. Compose via NarrativeSectionsTab render callback, retaining current editors during source loading/error. Preserve source original/reviewed text, review/edit/compare actions, conflict markers and deep links; never copy source into structured fields automatically. Collapse source details initially but show provenance/review/conflicts in summaries. Exact absence markers compactly grouped for other topics; document absence not patient-negative statement. Existing editors/transport/auth unchanged. Optional editor source footer applies only chart composition; intake behavior unchanged. Empty current history cards collapsed in chart only.

## Acceptance Criteria

- AC1 (original): Un solo punto d’ingresso per Allergie, Diagnosi e Anamnesi. Existing structured card owns its corresponding source detail; no standalone duplicate topic card. Aliased narrative deep links/assistant refresh preserved.
- AC2 (original): Fonte importata e dato corrente sono esplicitamente distinti, con accesso ai dettagli. Current label vs imported source summary, original and reviewed labels/status/provenance + source comparison + edits; conflicts visible even collapsed. No silent synchronization.
- AC3 (original): «Non presente nel documento» non viene tradotto in «assente nel paziente». Exact placeholders treated as document absence, never clinical negatives; genuine negative text or reviewed content retained, missing/error/loading not classified as absence.
- AC4 (original): Blocchi privi di contenuto non occupano una card espansa ciascuno. Other empty narrative topics in one closed disclosure; empty source inline and empty chart history collapsed, nonempty/conﬂict details remain accessible.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | RED first canonical membership/absence safety/SSR composition |
| Integration | yes | frontend/backend types, build, full-suite delta versus411 |
| API | no | |
| Playwright | yes | actual SPA synthetic transport: structured/source disagreement, detail/source/edit, role/deep links, loading/error/retry, compact absence, mobile |
| Persistence after refresh | yes | if existing reviewed-text save is exercised, synthetic transport save+reload and unchanged original/structured values |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | no secrets/PHI/unsafe markup, unchanged permission/endpoint/dependency constraints |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

No backend/API/schema/config/dependency/auth/clinical policy change. No original audit images or real patient names/identifiers in artifacts. Independent new QA after root freezes source, then root rerun. Twelve unchanged frontend failures plus one unchanged broad backend CI failure must be disclosed, never newly waived; new regressions block. No pending405/408/410 application source. User explicitly authorized scoped commits/push/deploy/synthetic proof/verified closure; provider Git-main verified on411 supersedes stale manual-only documentation. Every release bound to clean application commit and source receipts; evidence Git EOL normalization independently bound, no substantive drift.

## Gate Status

READY FOR IMPLEMENTATION
