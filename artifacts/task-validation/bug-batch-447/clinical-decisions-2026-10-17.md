# Recorded user decisions — #453 and #457

User explicitly answered both pending questions on 2026-10-17 in this task.

- #453: “Avviso da confermare, senza blocco automatico”. New prescription should show the actual recorded allergy context and require explicit acknowledgement of the warning; no automatic prohibition, forced clinical override or fabricated allergy/drug-class associations. Use reliable existing structured associations only if actually available; otherwise clearly request compatibility verification without falsely asserting a proven drug conflict. Preserve existing authorized prescribing roles and manual medication safety validations.
- #457: “Richiedere una decisione esplicita dell’operatore autorizzato”. Recording a temporary PS exit must record the authorized operator's explicit decision about the administration round. No implicit/global automatic pause merely from opening or printing the sheet. Use actual existing authorization/persistence paths and preserve prescription history. Any claimed pause/resume behavior must have an authoritative persisted effect and be verifiable after reload/return; never cosmetic-only.

This removes the pending essential product decisions; implementation and acceptance proof remain required. Scope remains the current approved66files until a separate exact-file amendment is approved for any necessary backend/permission/model support. Original frozen contracts/hashes and implementation/review budgets remain unchanged.
