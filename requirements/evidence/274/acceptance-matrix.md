# Acceptance Matrix — Issue #274 (Import: compilazione automatica Terapia)

REQ: dopo l'import del documento, ciò che è identificato come Terapia (medicinale + quantitativo +
modalità di somministrazione) deve compilarsi automaticamente nella sezione Terapia, per approvazione
dell'operatore. Anche se non tutto è noto, inserire almeno medicinale, quantitativo e modalità.

| # | Criterio | Metodo | Dove | Stato iniziale | Stato finale | Evidenza |
|---|---|---|---|---|---|---|
| AC1 | Il medicinale viene estratto | Unit test + demo | `parse-discharge-therapy.ts` | PASS (già) | PASS | `unit-tests.txt`, `parser-demo.txt` |
| AC2 | Il **quantitativo** viene recuperato (anche parole intere: "1 compressa", "1 fiala") | Unit test | `parseTherapyLine` (UNITS estesi) | **FAIL** ("1 compressa" → vuoto) | **PASS** | test `#274: full-word quantity units` |
| AC3 | La **modalità di somministrazione** viene estratta anche in testo libero (per os, endovena, sottocute, intramuscolo…) | Unit test | `detectRoute` + `ROUTE_PHRASES` | **FAIL** (via vuota per testo libero) | **PASS** | test `#274: free-text administration route` |
| AC4 | Righe incomplete non vengono scartate ma marcate `da_verificare` (poi approvate dall'operatore) | Unit test | `parseTherapyLine` stato | PASS (già) | PASS | test `#156 AC6` |
| AC5 | Auto-fill nella sezione Terapia review + approvazione utente | Trace codice | `draft-service.ts` L173-177 → `StepClinica.tsx` (accept checkbox) → `IntakeWorkspace` confirm | PASS (già, REQ #156/#235) | PASS | analisi pipeline |
| AC6 | Nessuna regressione | Full backend suite | — | — | PASS (333/333) | `../…/logs` |

## Note

- Il flusso end-to-end era già implementato (REQ #156/#235). Il gap reale era la **modalità di
  somministrazione in testo libero** e alcune **unità di quantità in parole intere**, non catturate
  dal parser deterministico — ora risolti.
- Verifica **deterministica via unit test** (no AI service): `parse-discharge-therapy.test.ts` 13/13.
- La verifica E2E completa (upload documento reale → tabella Terapia popolata nella UI) richiede il
  servizio AI di estrazione (Gemini/Mistral) o il provider `mock`; il core deterministico è unit-verificato.
