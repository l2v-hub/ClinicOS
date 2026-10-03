# Task Contract

## Task

- Title: UX direct access cycle (deep navigation, info without clicks, action in place, Moduli parity)
- Slug: ux-direct-access-cycle
- Type: change
- Date: 2026-10-03

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |      yes |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |       no |

## Current Behaviour

Discovery reports in `artifacts/task-validation/ux-cycle-discovery/`: 53 navigation entry points (S1:
Turno card / deadlines / urgent handovers / consegne feed land on Panoramica), therapy calendar hides
strength/status/prescriber, no administration from a tapped drug, PRN not recordable, supervisor
confirmation not enforced, diary urgent «presa visione» missing, Moduli scales differ from the paper
(Barthel and UCLA missing).

## Expected Behaviour

Owner rules (2026-10-03): every patient element lands on the exact useful place; information visible
without extra clicks; the natural action available in place per role; assessment scales identical to
`Moduli/*.pdf`. Owner decisions: migrations approved (new formVersions, finalized records immutable),
MNA-SF only, Tinetti classic 28, UCLA = NPI sleep item; PRN recording added; supervisor confirmation in
app AND server; diary per-reader «presa visione».

## Acceptance Criteria

- AC1: every S1/S2 entry point in deep-navigation.md lands on tab + sub-tab + item (browser-verified).
- AC2: therapy calendar/day+week, ward calendar, giro show drug, strength, quantity, route, status inline.
- AC3: tapping a drug in patient therapy offers role-appropriate administration in place (nurse, supervisor with confirm), PRN included; non-allowed actions hidden.
- AC4: diary urgent entries have per-reader «presa visione».
- AC5: PAINAD, GDS-15, MNA-SF, Tinetti, Barthel, UCLA-NPI forms and PDFs match the Moduli layout/text/scoring.
- AC6: 0 new regression failures; build passes; authorization not weakened.

## Test Plan

| Test type                 | Required | Reason                                                |
| ------------------------- | -------: | ----------------------------------------------------- |
| Unit                      |      yes | resolvers, scoring                                    |
| Integration               |      yes | PRN, confirmation, presa visione, assessment versions |
| API                       |      yes | new endpoints                                         |
| Playwright                |      yes | every journey                                         |
| Persistence after refresh |      yes | administration, ack, assessments                      |
| Agnos action registry     |      yes | nav targets                                           |
| Voice simulation          |       no |                                                       |
| OCR/import test           |       no |                                                       |
| Security/privacy scan     |      yes | authz + new tables                                    |

## Evidence Plan

- validation-report.md, screenshots per journey, Playwright traces, API test output, DB persistence proof

## Risks

Migrations on assessment tables (versioned, append-only history); PRN changes the one-dose-per-band
model — new table/constraint, existing scheduled flow untouched; server confirmation for supervisor.

## Gate Status

READY FOR IMPLEMENTATION
