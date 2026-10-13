# Task Validation Report

## Task
- Title: 450 ingresso correzioni minime
- Slug: 450-ingresso-correzioni-minime
- Issue: #450 (epic #455)
- Decisione del responsabile (13/10/2026): resta l'ingresso completo in una pagina approvato il
  28/09; solo correzioni minime. Fuori scope: riduzione a 2 schermate / 5 campi e la lista «da
  completare» in cartella.
- Commit: branch `ux3/450-ingresso-minimo` (hash nel commit che contiene questo report)
- Date: 2026-10-13

## Implementation Summary

1. **Una sola opzione documenti.** «Nuovo ingresso» mostra «Lettera o trasferimento» (fotografa o
   carica PDF e foto, anche più file) e «A mano». Lettera e trasferimento portavano allo stesso
   flusso. Il riquadro «Come funziona» è stato tolto.
2. **Nessuna sezione completata senza dati.** «Ingresso» è completata solo se l'operatore ha
   scritto qualcosa oltre a data e ora di presa in carico, che si compilano da sole all'apertura
   (`intakeProgress`).
3. **Niente ripetizioni.** Sopra l'anagrafica non c'è più il riquadro «Anagrafica da completare»
   che ripeteva i 4 campi sottostanti; resta nel Riepilogo, dove riassume. Sono stati tolti anche i
   due testi sui campi obbligatori: restano gli asterischi e gli errori sul campo.
4. **Niente aiuti ovvi.** Tolti «Usato per calcolare il CF», «Necessario per il calcolo automatico
   del codice fiscale», «Sigla provincia; EE per l'estero» (diventato il placeholder «MI · EE
   estero») e «Si compila automaticamente con…». Resta l'avviso quando il codice fiscale è stato
   calcolato automaticamente.

## Correzioni dopo il QA indipendente (FAILED VALIDATION su fa9fd76cb)

5. **Bloccante.** La riga di stato per lo screen reader sotto il codice fiscale usava la classe
   `sr-only`, che non esiste a livello globale, quindi compariva a schermo:
   - a modulo vuoto: «Codice fiscale automatico non disponibile»;
   - dopo il calcolo: «Codice fiscale compilato automaticamente: …», che ripeteva il campo.

   Il difetto esisteva prima di questa issue. Ora la riga usa `ds-sr-only`. Lo stesso difetto è
   corretto nei due stati di `InlineEditableField`. Nuovi controlli: E2E AC3b e un test unitario.
6. Tolto il CSS morto del riquadro «Come funziona» (`NewPatientStart.css`).

## Files Changed

- `frontend/src/components/operator/NewPatientStart.tsx`
- `frontend/src/components/operator/NewPatientStart.css`
- `frontend/src/components/shared/intake/intakeProgress.ts`, `StepAnagrafica.tsx`, `IntakeWorkspace.tsx`
- `frontend/src/components/shared/InlineEditableField.tsx` — `ds-sr-only`
- Test: `frontend/src/components/shared/intake/__tests__/intakeMinimal450.test.ts` (nuovo)
- `scripts/e2e/issue-450-ingresso.mjs`

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | opzioni `["Lettera o trasferimento","A mano"]`, nessun «Come funziona» (`screenshots/01-nuovo-ingresso.png`) |
| AC2 | PASS | appena aperto «A mano», con data presa in carico già impostata: «Ingresso» → «facoltativa, vuota», nessuna spunta (`02-a-mano-apertura.png`); unit `450 «Ingresso» is not complete…` |
| AC3 | PASS | sezione anagrafica senza riquadro ripetuto, paragrafi sui campi obbligatori né aiuti ovvi (`03-anagrafica-compilata.png`); la riga per lo screen reader del codice fiscale non è visibile (AC3b); unit sui sorgenti |
| AC4 | PASS | creazione a mano: codice fiscale calcolato dall'app, paziente nel DB locale (`04-dopo-crea.png`); tsc + build verdi, unit 1381/1381 |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | `logs/unit-tests.log` (1381/1381) |
| Integration | NA | |
| API | NA | nessuna modifica backend |
| Playwright | PASS | `scripts/e2e/issue-450-ingresso.mjs` 5/5, `logs/playwright-after.log`, `trace/ingresso.zip` |
| Persistence | PASS | paziente creato nel DB locale |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | flusso documenti non modificato (stessa destinazione) |
| Security/privacy | PASS | nessun endpoint nuovo, dati sintetici |

## Runtime Evidence

Stack locale sintetico (DB `uxaudit`, backend demo :3111, vite :5211, 1180×820, Infermiere 1).
Ogni giro usa una data di nascita diversa: lo stesso codice fiscale sarebbe un duplicato e l'app lo
rifiuta, com'è giusto.

## Logs

`logs/build.log`, `logs/unit-tests.log`, `logs/playwright-after.log`. Console del browser: 0
errori.

## Residual Risks

- Restano, per decisione, le 8 sezioni della pagina unica e la loro lunghezza.
- «EE» per i nati all'estero resta solo come placeholder della provincia: sparisce quando si scrive.
- Il commit `a51949079` (creazione con dati incompleti, solo su `ux2/cycle`, mai verificato) non è
  incluso.
- Verifica su stack locale sintetico, non su prod.

## Final Decision

CLOSED — VERIFIED
