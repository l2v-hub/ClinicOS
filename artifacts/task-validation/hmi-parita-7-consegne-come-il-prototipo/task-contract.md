# Task Contract

## Task

- Title: HMI parità 7: consegne come il prototipo
- Slug: hmi-parita-7-consegne-come-il-prototipo
- Type: feature
- Date: 2026-09-27

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

"Consegne" differs from the HMI 1 prototype (artifacts/hmi-parity/proto/consegne.png):

- the "Giro pazienti / Feed consegne" buttons, the order panel (always open) and two search
  fields sit at full width above the page;
- the patient list is made of cards with badges;
- the composer is a narrow form.

The prototype has:

- on the left, the shift heading "TURNO …" and one row per patient: bed box, name, status;
- on the right, a large card "SBAR · Name" with the fields and a primary action at the bottom
  right.

## Expected Behaviour

Consegne laid out like the prototype, with today's data, fields and rules unchanged: the same
draft store, the same save, "Salva e prossimo", the Feed.

- **Header**: title "Consegne", subtitle "Giro pazienti e feed delle consegne". The mode chips
  "Giro pazienti" / "Feed consegne" are 48 px.
- **Patient column** (Giro):
  - heading "TURNO MATTINO/POMERIGGIO/NOTTE" (facility clock);
  - search by name/CF and by room, plus "Ordine del giro" (collapsible);
  - rows with a room box (from the current location), the name, the CF, and the real status:
    open/urgent, history, "Nessuna consegna", or the honest loading/error states. A draft or a
    just-saved handover gets a mark;
  - "Carica altri pazienti".
- **Handover card**:
  - title "Consegna · Name", with the patient's CF, room and bed;
  - the same fields: type, priority, due date/time, assignee, text;
  - actions at the bottom right: "Scarta bozza" (link), "Salva" (secondary) and "Salva e
    prossimo" (primary), all 48 px.
- **No SBAR and no AI draft.** ClinicOS has neither the data nor an endpoint for them, and they
  are not invented. This is an open decision for the user (it needs an API).

## Acceptance Criteria

- AC1: at 1180 × 820 the layout matches the prototype: shift heading, patient column with room
  box, name and status, and a large handover card with the primary action at the bottom right.
  The order panel is closed by default.
- AC2: the fields and the save are unchanged:
  - the same POST;
  - drafts are kept when switching patient and marked in the list;
  - "Salva e prossimo" moves to the next patient;
  - "Scarta bozza" asks for confirmation.
- AC3: the list status is honest, with no counts invented when the summary fails or is loading.
  Search and room filter work, as does "Carica altri".
- AC4: the Feed is unchanged and reachable. No horizontal scroll at 390, 768, 1024, 1180 or 1440.
- AC5: the build passes. No new test failures against the baseline.

## Test Plan

| Test type                 | Required | Reason                                 |
| ------------------------- | -------: | -------------------------------------- |
| Unit                      |      yes | existing consegne tests                |
| Integration               |       no |                                        |
| API                       |       no | same API                               |
| Playwright                |      yes | layout, save, drafts, statuses, widths |
| Persistence after refresh |       no | persistence unchanged                  |
| Agnos action registry     |       no |                                        |
| Voice simulation          |       no |                                        |
| OCR/import test           |       no |                                        |
| Security/privacy scan     |       no |                                        |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results (full suite, build)
- logs/playwright-evidence.txt; screenshots compared against proto/consegne.png

## Risks

- Layout-only change on a flow with drafts and "Salva e prossimo": verify that nothing is lost
  and that the next-patient move still works.

## Gate Status

READY FOR IMPLEMENTATION
