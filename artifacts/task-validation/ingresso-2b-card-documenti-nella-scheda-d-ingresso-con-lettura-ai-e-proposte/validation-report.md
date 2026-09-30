# Task Validation Report

## Task

- Title: Ingresso 2b: card Documenti nella scheda d'ingresso con lettura AI e proposte
- Slug: ingresso-2b-card-documenti-nella-scheda-d-ingresso-con-lettura-ai-e-proposte
- Commit: (vedi PR)
- Date: 2026-09-30

## Implementation Summary

Solo frontend, sugli endpoint del ciclo 2a (#372) già in produzione e su quelli dei job a pagine. Backend e schema invariati.

- **Card Documenti** (`IntakeDocumentsCard.tsx`, `useIntakeDocuments.ts`), in cima alla scheda d'ingresso compilata qui:
  - mostra "N/M pagine lette", "Scatta pagina" e "Carica file", la barra di avanzamento e la frase AI del prototipo;
  - il primo file crea il job e lo collega alla bozza (`import-job`); i successivi vanno nello stesso job;
  - riusa `ImportSessionApi`, la coda di upload e i controlli sui file esistenti.
- **Lettura e unione**:
  - il job viene interrogato ogni 2,5 s solo con un job collegato; l'interrogazione è in pausa a scheda nascosta e si ferma a fine lavoro o a sessione chiusa;
  - ogni lettera si unisce una volta per (gruppo, hash); la finale una sola volta;
  - link, unioni, decisioni e ricariche passano dalla stessa coda dell'autosalvataggio (`intakeDraftApi.ts`), quindi non ci sono scritture concorrenti;
  - dopo ogni unione la bozza ricaricata conserva quanto l'operatore sta scrivendo (`rebaseLocalEdits`);
  - su un 409 di versione la bozza viene ricaricata e l'operazione ripetuta una volta.
- **Campi AI** (`intakeAiOrigin.ts`, `IntakeAiBadge.tsx`), letti da `_fieldOrigin`:
  - in anagrafica ogni campo ha la tinta viola e il badge "AI";
  - anamnesi, diagnosi e allergie sono segnate per sezione;
  - i colori sono token in `design-system.css` (`--ds-ai*`, `ds-badge--ai`).
- **Proposte** (`IntakeFieldProposals.tsx`):
  - "L'AI ha letto X · Il tuo valore: Y", con "Usa questo valore" e "Tieni il mio" (`decide`);
  - con proposte aperte "Crea paziente" è bloccato e il motivo compare fra i passaggi mancanti;
  - il 409 `field_proposals_pending` è tradotto in italiano;
  - dopo una decisione il focus va alla proposta successiva o al campo appena deciso.
- **Patch**: il PATCH della bozza non invia mai `_fieldOrigin`, `_fieldProposals` né `_aiMerge`.
- **Scollega documenti**: dietro conferma e solo prima dell'unione finale (`_importSource`); i valori restano.
- **Errori** in italiano: limite di letture AI, file non accettato, sessione chiusa, rete. Un nuovo tentativo riuscito cancella il messaggio precedente.
- **Flusso separato "da documenti"** (DischargeImportModal): invariato. La costruzione dell'API operatore è stata spostata in `import/operatorImportApi.ts`, condivisa, con la stessa logica.

## Files Changed

- frontend/src/components/shared/intake/:
  - nuovi: intakeDocuments.ts, useIntakeDocuments.ts, IntakeDocumentsCard.tsx, IntakeFieldProposals.tsx, intakeAiOrigin.ts, IntakeAiBadge.tsx, **tests**/intakeDocuments.test.ts;
  - modificati: IntakeWorkspace.tsx, intakeDraftApi.ts, intakeProgress.ts, StepAnagrafica.tsx, StepClinica.tsx, IntakePage.css.
- frontend/src/components/shared/import/:
  - nuovo: operatorImportApi.ts;
  - modificato: importSessionTypes.ts.
- frontend/src/components/shared/DischargeImportModal.tsx, frontend/src/design-system.css

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                              |
| --- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Un file: job creato e collegato con una sola `import-job` (`expectedDraftVersion`, `requestId`), "0/1 pagine lette", frase AI; i campi restano scrivibili durante la lettura.                                                                                         |
| AC2 |   PASS | Lettera pronta: `merge-import` con `groupId` e `resultHash`, bozza ricaricata; i campi vuoti si riempiono con stile AI e badge; il cognome scritto dall'operatore non cambia e compare la proposta "L'AI ha letto Galli".                                             |
| AC3 |   PASS | "Tieni il mio" e "Usa questo valore" via `decide` con `requestId` ed `expectedDraftVersion`. Con apply il valore letto diventa dell'operatore, senza stile AI, come fa il backend. "Crea paziente" è bloccato con il motivo "Una proposta dei documenti da decidere". |
| AC4 |   PASS | Un'unica unione finale e "1/1 pagine lette"; su un 409 di versione durante l'unione, ricarica e UN solo nuovo tentativo.                                                                                                                                              |
| AC5 |   PASS | Nessun PATCH con chiavi riservate. "Scollega" manda `DELETE import-job` dopo la conferma e i valori restano; dopo l'unione finale "Scollega" non c'è più.                                                                                                             |
| AC6 |   PASS | Scheda a mano senza documenti: nessun job, nessuna interrogazione, nessuna unione. npm test: 936 test, 927 passati, 9 falliti, tutti della baseline; build ok; guardia del design system ok.                                                                          |
| AC7 |   PASS | 390, 768, 1024, 1180, 1440: nessuno scorrimento orizzontale, controlli ≥ 44px su touch; nessun dato clinico negli URL né in console.                                                                                                                                  |

## Test Results

| Test                      | Result | Evidence                                                                                                                                                                                                                   |
| ------------------------- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |   PASS | intakeDocuments.test.ts, 12 test                                                                                                                                                                                           |
| Playwright                |   PASS | evidence.mjs 26/26 (logs/playwright-evidence.txt). Job e bozze simulati con le regole di draft-merge.ts: job creato `uploaded`, lettera idempotente, apply → operatore, finale → `_importSource`, versione su `import-job` |
| OCR/import test           |   PASS | sequenza lettera → finale, 409 con un solo nuovo tentativo, limite di letture e nuovo tentativo                                                                                                                            |
| Persistence after refresh |   PASS | stato server verificato nell'evidence; la QA ha ricaricato davvero la pagina: campi AI, proposta, documento collegato e "3/3" restano                                                                                      |
| Security/privacy          |   PASS | nessun dato clinico negli URL né in console                                                                                                                                                                                |

## Independent QA

clinicos-qa: **READY FOR QA**. La QA ha fatto anche una sonda propria, più vicina al backend:

- 3 file insieme → un solo job, un solo collegamento;
- ricarica reale della pagina;
- interrogazione in pausa a scheda nascosta e ferma dopo la finale;
- 25 caratteri digitati durante un'unione, nessuno perso;
- 409 dell'autosalvataggio gestito;
- errori 429 e rete.

Difetti segnalati e corretti prima della chiusura:

1. dopo "Riprova lettura" riuscito restava il vecchio messaggio di limite: ora viene cancellato, con un controllo Playwright;
2. il focus andava perso dopo l'ultima proposta: ora va al campo deciso, con un controllo Playwright;
3. la formulazione di AC3 era in contrasto col backend ("il campo diventa AI"): contratto corretto, evidence allineata (`by: operator`, nessuno stile AI);
4. evidence resa più fedele al backend (vedi Test Results).

## Residual Risks

- Dopo una ricarica della bozza una lettera già unita viene richiesta di nuovo: il backend la ignora (`draft-link.ts`), quindi è una chiamata in più senza effetti.
- Tutte le pagine vanno nella prima lettera; la divisione in più lettere, la provenienza per pagina e il documento a fianco arrivano nel ciclo 3.
- Con conflitti fra lettere l'unione finale non parte: la card lo dice, ma la revisione dei conflitti dalla card manca.
- "Scatta pagina" è un input file con `capture`, non la fotocamera integrata.
- Il 409 `field_proposals_pending` è gestito ma non si è potuto provocare: il client blocca prima.
- La produzione è dietro Entra: la verifica reale con documenti veri spetta all'utente, con ricarica forzata.

## Final Decision

CLOSED — VERIFIED
