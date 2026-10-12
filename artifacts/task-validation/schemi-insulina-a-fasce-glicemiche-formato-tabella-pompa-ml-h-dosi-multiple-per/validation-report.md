# Task Validation Report

## Task

- Title: Schemi insulina a fasce glicemiche: formato tabella, pompa ml/h, dosi multiple per fascia, avvisi sovrapposizioni e buchi
- Slug: schemi-insulina-a-fasce-glicemiche-formato-tabella-pompa-ml-h-dosi-multiple-per
- Branch: feat/insulin-glucose-scale-schemes (da origin/main 59baeb86a)
- Commit: (non ancora committato)
- Date: 2026-10-12

## Implementation Summary

- Protocollo `doseProtocol` (JSON esistente, nessuna migrazione): `doseUnit` `'unità' | 'ml/h'`
  (default `'unità'` per i protocolli già salvati), `rules[].extraDoses[]` `{amount, unit, route?, label?}`.
  Sovrapposizioni rifiutate, buchi ammessi (bloccano solo la somministrazione del valore scoperto).
- Parser import: tabella (intestazione + una fascia per riga, anche staccata da riga vuota) → UNA riga;
  pompa ml/h; fasce a più dosi ("Bolo 5 U.I e.v. + 15 U.I s.c"); nome "INSULINA …" da titoli di schema;
  fasce sempre come scritte con avvisi (sovrapposizione, buco, valore sospetto, via della dose
  principale diversa); unità miste → nessuna fascia importata, trascrizione obbligatoria.
- Somministrazione: dose con l'unità del protocollo + dosi aggiuntive nel record
  (`farmacoDose`, `doseContext.doseUnit/extraDoses`).
- Frontend: editor (unità/ml/h, "+ Dose aggiuntiva", avvisi ambra non bloccanti, errori bloccanti),
  revisione import con avvisi del documento, riepiloghi e somministrazione con unità corretta.

## Files Changed

- backend: `therapies/glucose-scale.ts`, `therapies/therapy-write.ts`, `intake/parse-discharge-therapy.ts`,
  `intake/therapy-selection.ts`; test: `intake/__tests__/insulin-scale-schemes.test.ts` (nuovo),
  `routes/__tests__/glucose-scale-pump-db.test.ts` (nuovo), `glucose-review-selection`,
  `therapy-extraction-scan`, `glucose-administration`, `therapy-authoritative-write` (asserzioni aggiornate).
- frontend: `cartella/glucoseScale.ts`, `GlucoseScaleEditor.tsx`, `GlucoseAdministrationControl.tsx`,
  `TherapyFormFields.tsx`, `therapyFormMapping.ts`, `TherapyFormPreview.tsx`, `TherapyDrugList.tsx`,
  `PatientTherapySlotDetail.tsx`, `operator/TherapyGiroRows.tsx`, `shared/intake/dischargeTherapy.ts`,
  `intakeTherapies.ts`, `IntakeTherapySummary.tsx`, `DischargeTherapyReview.tsx`, `therapyFormPayload.ts`,
  `app-additions.css`; test `glucoseScale`, `glucoseScaleUi`, `glucoseIntake`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                      |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `insulin-scale-schemes.test.ts`; S3 import review, `screenshots/qa-s3a-*.png`, `test-results/qa-r2-parse-probe.json`          |
| AC2 |   PASS | `insulin-scale-schemes.test.ts` (pompa), `glucose-scale-pump-db.test.ts`; S1/S2 ml/h nel browser                              |
| AC3 |   PASS | `screenshots/qa-s3b-imola-overlap-gap-warnings.png`; test "11-120" / "10-120"                                                 |
| AC4 |   PASS | `glucose-scale-pump-db.test.ts` (POST 201, rilettura DB, PUT overlap 400, somministrazione ml/h+bolo, buco 409); S2 record DB |
| AC5 |   PASS | S1 (editor + persistenza dopo reload), S2 (dose prevista + bolo), S3/S4 (revisione import, conferma bloccata)                 |
| AC6 |   PASS | vedi Test Results                                                                                                             |

## Test Results

| Test                         |                   Result | Evidence                                                                                                                                                                                                  |
| ---------------------------- | -----------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                         |                     PASS | backend mirati 146/146 (Claude) e 128/128 (QA, DB `insqa`); frontend `npm test` 1354/1354                                                                                                                 |
| Integration                  |                     PASS | import → bozza → conferma (S3/S4, `glucose-review-selection`)                                                                                                                                             |
| API                          |                     PASS | `glucose-scale-pump-db.test.ts`; conferme forgiate rifiutate 400 (S3/S4)                                                                                                                                  |
| Playwright                   |                     PASS | `qa/s1..s4-*.mjs`, `trace/`, `video/`, `screenshots/`                                                                                                                                                     |
| Persistence                  |                     PASS | S1 reload; DB `doseProtocol` / `MedicationAdministration` verificati                                                                                                                                      |
| Agnos AI                     |                       NA |                                                                                                                                                                                                           |
| Voice                        |                       NA |                                                                                                                                                                                                           |
| OCR                          |                     PASS | fixture testuali dei due documenti forniti (solo righe di prescrizione, nessun dato paziente)                                                                                                             |
| Security/privacy             |                     PASS | QA diff review: nessuna rotta/pacchetto/schema nuovo, input limitati, nessun log clinico                                                                                                                  |
| Build                        |                     PASS | frontend `tsc -b` + `npm run build` EXIT 0; backend `tsc --noEmit` EXIT 0                                                                                                                                 |
| Regressione backend completa | PASS (al netto baseline) | `test-results/backend-full-serial.txt`: 1872 test, 12 fail tutti in `consegna-ack-db`, `adversarial`, `skills-e2e`, `assistant-e2e` — nessuno importa codice toccato; sotto la baseline documentata di 21 |

## Runtime Evidence

QA indipendente (sessione dedicata, non autrice del codice): `qa/qa-report.md`.
Round 1: FAILED VALIDATION (F1 unità miste, F2 via dose principale, F3 "10" scritto) → corretti con test
di regressione. Round 2: READY FOR QA, scenari browser S1–S4 tutti verdi.

## Logs

Solo log sanitizzati in `logs/` (dati sintetici).

## Residual Risks

- Nessun campo via per fascia: la via della dose principale diversa da quella della terapia è solo
  segnalata (avviso) e resta nel testo originale.
- Gli avvisi del parser salvati sulla riga descrivono il documento; l'editor ricalcola quelli live.
- Cosmetico: a 375px il placeholder "Senza limite" è troncato.
- Verifica eseguita in locale (DB usa e getta); commit, PR e deploy non ancora eseguiti.

## Final Decision

CLOSED — VERIFIED
