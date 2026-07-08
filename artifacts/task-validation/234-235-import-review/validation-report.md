# Validation Report — Import review: testo editabile + gate accettazione (#234 #235)

- Date: 2026-07-07T08:42:10Z · Branch: `fix/234-235-import-review` (da origin/main) · Stack locale reale + AI runtime mock.
- Governance: Claude implementa+evidenzia; chiusura autorizzata dal proprietario.

## Implementazione (frontend, migration-free)
- IntakeWorkspace: stato `saveState` (idle/saving/saved/error) + indicatore footer `aria-live`; autosave non più silenzioso; `_accepted={demographics,therapy}` in `draft.data`; gate su Conferma; early-return in handleConfirm.
- StepClinica: checkbox "Accetta terapia" (`accept-therapy`), label adattiva (nessuna terapia vs revisionata).
- StepVerifica: checkbox "Accetto i dati anagrafici" (`accept-demographics`) + checklist bloccante (`intake-blocking-checklist`); "Crea paziente" disabilitato finché non completo.
- DischargeImportModal: le sezioni revisionate (documentSections/_allergyNarrative/_importSections) sono persistite nella bozza (patchDraft) e non più perse all'handoff.

## Evidenza oggettiva (Playwright su flusso import reale, AI runtime mock)
| AC | Verifica | Esito |
|---|---|---|
| #234 testo editabile prima della conferma | editor sezione clinica editabile nel workspace | PASS |
| #234 stati loading/error/success salvataggio | indicatore "Salvataggio…/Salvato" mostrato all'autosave | PASS (screenshot: "Salvataggio…") |
| #235 gate Crea paziente | pulsante **disabilitato** prima dell'accettazione, checklist bloccante mostrata | PASS |
| #235 accettazione esplicita | "Accetta terapia" + "Accetto i dati anagrafici" → pulsante **abilitato** | PASS (screenshot: entrambi + Crea paziente attivo) |
| #235 nessuna terapia vs non revisionata | label checkbox terapia adattiva | PASS |
| build | `npm run build:frontend` OK; `tsc --noEmit` OK | PASS |
| console/HTTP | nessun errore rilevante (warning nested-button preesistente in AIImportStatus, non introdotto qui) | PASS |

## Evidenze (path reali)
- Screenshot: `artifacts/task-validation/234-235-import-review/final/after.png` · Trace/video/test-results: `artifacts/task-validation/234-235-import-review/test-results/` · Report: `artifacts/task-validation/234-235-import-review/playwright-report/index.html`
- Spec: `qa-evidence/tests/import-review.spec.ts`

## Decisione
READY FOR CODEX QA / owner-authorized close. Feature implementate + verificate end-to-end sul flusso reale.
