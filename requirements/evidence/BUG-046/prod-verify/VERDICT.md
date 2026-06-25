# BUG-046 (#68) Prod Verification — Repeated anagraphic header bleed

Date: 2026-06-25
Target: backend https://clinicos-backend-production-df88.up.railway.app · frontend https://clinicos-eosin.vercel.app
Method: synthetic 2-page discharge letter (ROSSI MARIO, PAZIENTE FITTIZIO) driven through the
real prod import pipeline (Operatore → Pazienti → Importa → Avvia), STOPPED at the review step.
No patient created on prod (no "Crea paziente" click). Synthetic data only.

## VERDICT: PASS — backend fix is LIVE on prod.

### Why the first harness flagged a false positive
`prod-multipage-verify.mjs` reported `anamnesi_noHeaderBleed: false`. This is a harness artifact:
its assertion `!/cartella/i.test(anam)` runs on the section's whole `.textContent`, which includes
the UI chrome — the section-type chip "Cartella clinica" and the buttons
"Accetta / Modifica / Escludi / Confronta con la fonte" — NOT extracted document text.

The follow-up probe `isolate-narrative.mjs` isolates the EXTRACTED narrative body only:
- anamnesi_body_hasHeaderToken: **false**
- therapy_body_hasHeaderToken: **false**
- anamnesi_body_hasCodiceFiscaleValue (RSSMRA50A01L000T): **false**
- anamnesi_body_hasPatientName (ROSSI MARIO): **false**
- anamnesi_body_hasBirthDate (01/01/1950): **false**
- anamnesi_mergedBothPages (pagina uno + pagina due): **true**

Extracted Anamnesi body (clean):
`## Anamnesi Patologica Recente:` + "pagina uno" + "pagina due" merged. No anagraphic header row.

### Acceptance criteria
- Repeated headers do NOT appear in extracted clinical sections — PASS (page-2 header absent from narrative).
- Anagraphic data is not lost — PASS (first header preserved as anagraphic source by design; narrative clean).
- Doubtful headers are not deleted — NOT-DIRECTLY-EXERCISED on prod; covered by unit tests (AMBIGUOUS_HEADER_KEPT). Inferred-OK.
- Page number preserved — NOT-EXERCISED (synthetic letter has no "Pagina X di Y" footer); covered by unit tests.
- Configurable per document profile — PASS by code (loadHeaderFilterConfig, env DOCUMENT_HEADER_* + config override).

### Deployment confirmation
- Fix commits bf67e01 + 940f5c7 present in main; filterRepeatedHeaders wired into live pipeline
  (backend/src/ai/upload/job-service.ts:703, :771).
- Observed behavior on the live prod backend matches the fixed logic → backend deployed with fix.

## Files
- dimissione-multipagina-test.pdf — synthetic input
- multipage-stderr.log / (stdout in this run) — original harness output
- isolate-narrative.mjs + isolate-narrative-result.json — narrative-isolation probe + result
- multipage-anamnesi.png — PHI-safe crop of the Anamnesi review card (clean narrative)
- multipage-review.png — PHI-safe crop of the import review modal
