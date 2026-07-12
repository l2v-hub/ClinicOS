# Validation report — Issue #245 (Anamnesi duplicata → consolidata)

**Final Decision: CLOSED — VERIFIED**

Ambiente: stack locale reale (Postgres Podman + backend :3001 seeded + frontend :5173), codice PR #252 branch `fix/issue-245-anamnesi` sovrapposto (HMR). Paziente: Moretti, Elena. Data: 2026-07-09.

## Esito acceptance criteria (Playwright UI reale — 4/4 PASS)

| AC | Esito | Evidenza |
|----|-------|----------|
| AC1 — nessuna duplicazione operativa | ✅ il gruppo "Clinica" non mostra più il tab "Anamnesi" · `screenshots/clinica-tabs.png` |
| AC2 — dati esistenti preservati | ✅ modifica **solo di navigazione** (rimozione import/TabId/voce nav/branch render in `PatientDetail.tsx`); nessun code-path elimina `Cartella.data.anamnesi`; la superficie narrativa ANAMNESIS resta raggiungibile ed editabile (`screenshots/sezioni-narrative.png`) |
| AC3 — navigazione coerente | ✅ unica destinazione anamnesi = "Sezioni Cliniche (testo)"; nessun tab ambiguo |
| AC4 — scelta documentata | ✅ delete-not-consolidate: le due superfici avevano store indipendenti (`PatientNarrativeSection` ANAMNESIS vs `Cartella.data.anamnesi`); nessuna migrazione dati necessaria (vedi `task-contract.md`) |
| Regressione | ✅ nessun NUOVO console error introdotto (2 warning React dev-mode `<button>` annidato in `PresaInCaricoTab`/`ClinicalTableSection` sono **preesistenti** e indipendenti da #245) |

## Perché AC2 è garantito
La PR rimuove esclusivamente elementi di navigazione (voce tab, import `AnamnesisEditor`, valore `TabId 'anamnesi'`, branch di render). Non tocca né persistenza né schema: `Cartella.data.anamnesi` e la sezione narrativa ANAMNESIS restano intatti. La compilazione strutturata dell'anamnesi resta disponibile in fase di **presa in carico / intake** (`StepClinica`). Una rimozione solo-nav non può, per costruzione, perdere dati.

## Artefatti
`screenshots/clinica-tabs.png`, `screenshots/sezioni-narrative.png` · `trace/trace.zip` · `video/*.webm` · `logs/console-errors.log` · `ui-report.json` · test `e2e/issue-245-anamnesi.mjs`.

Claude non chiude, non mergia, non deploya. Codex resta l'unico QA Gatekeeper.

## Codex final gate — 2026-07-12

| Check | Result | Evidence |
|---|---:|---|
| Acceptance criteria | PASS | Duplicate tab removed and legacy data kept reachable |
| Code review | PASS | PR #252 integrated through verified PR #257 |
| Tests | PASS | Build and integrated gate #256 |
| Playwright | PASS | Integrated scenario #245 PASS |
| Runtime validation | PASS | Combined stack validation #256 |
| Persistence | PASS | Legacy anamnesis remains after reload |
| Privacy/security | PASS | Synthetic evidence; no sensitive logs |
| Evidence complete | PASS | Issue artifact plus integrated #256 bundle |
| Final decision | CLOSED — VERIFIED | Integrated release candidate verified |
