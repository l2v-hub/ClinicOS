# Task Validation Report

## Task
- Title: Anagrafica farmaci AIFA: import e ricerca per nome e principio attivo
- Slug: anagrafica-farmaci-aifa-import-e-ricerca-per-nome-e-principio-attivo
- Commit: (working tree)
- Date: 2026-07-25

## Implementation Summary

Copia locale della Banca Dati Farmaci AIFA e ricerca sopra di essa.

- Tre modelli Prisma: `Farmaco` (una riga per confezione, con ATC, stato amministrativo,
  regime di fornitura e link ai documenti ufficiali), `FarmacoPrincipioAttivo` (principio
  attivo con quantita' e unita' gia' separate) e `FarmacoImport` (traccia dei ricaricamenti:
  senza, non si distingue "farmaco non trovato" da "anagrafica mai caricata").
- `services/farmaci/import.ts` legge i due CSV **a flusso** — l'80% del peso sta in un file da
  82 MB — e sostituisce l'intera anagrafica in transazione.
- `services/farmaci/ricerca.ts` cerca in tre passaggi: esatto e per prefisso sugli indici,
  poi confronto approssimato su un indice in memoria dei soli nomi distinti (~10.500), che e'
  il passaggio che recupera i refusi di OCR.
- `services/farmaci/normalizza.ts` e' condiviso da import e ricerca: se le due parti
  normalizzassero diversamente, la ricerca fallirebbe in modo silenzioso.
- Due script: `importa-farmaci.ts` (ricaricamento, riusabile dal job periodico) e
  `verifica-farmaci.ts` (diagnostica dopo un import).

## Files Changed

- `prisma/schema.prisma` + `prisma/migrations/20260725140000_anagrafica_farmaci_aifa/migration.sql`
- `backend/src/services/farmaci/{normalizza,import,ricerca}.ts`
- `backend/src/scripts/{importa-farmaci,verifica-farmaci}.ts`
- `backend/src/services/__tests__/farmaci.test.ts` (10 test)

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | Import reale eseguito: **319.300 righe scritte su 497.837 lette in 52 secondi**; 159.880 confezioni e 159.420 principi attivi in tabella. Lettura a flusso, sostituzione in transazione. |
| AC2 | PASS | Vedi riquadro sotto: nome esatto, nome+dose e nome storpiato risolti tutti. |
| AC3 | PASS | Dosaggi Ramipril in commercio: **1,25 / 2,5 / 5 / 10 mg**, letti dai campi strutturati. |
| AC4 | PASS | `"Ramipril 5 mg"` plausibile; `"Ramipril 7 mg"` **non plausibile**, con l'elenco dei dosaggi reali. Restituito come dato, nessun blocco. |
| AC5 | PASS | Backend **391/391 pass, 0 fail**; `tsc --noEmit` pulito. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | 10 test nuovi su normalizzazione, parsing CSV, mappatura campi, distanza; suite 391/391 |
| Integration | PASS | import reale + ricerche reali (sotto) |
| API | NA | nessuna rotta esposta in questa fase |
| Playwright | NA | nessuna interfaccia in questa fase |
| Persistence | NA | anagrafica di sola consultazione |
| Security/privacy | PASS | anagrafica pubblica, nessun dato di paziente, nessun segreto |

## Runtime Evidence

Import reale dai CSV AIFA nel database locale, poi ricerche sui casi che l'operatore incontra:

```
anagrafica: 159880 confezioni, 159420 principi attivi

  "Cardioaspirin 100"   -> CARDIOASPIRIN       [esatto       1.00] ATC B01AC06 · Autorizzata
  "Cardioasprina 100"   -> CARDIOASPIRIN       [approssimato 0.65] ATC B01AC06 · Autorizzata
  "Tachipirina 1000 mg" -> TACHIPIRINA         [esatto       1.00] ATC N02BE01 · Autorizzata
  "Metformna 500"       -> METFORMINA TEVA     [approssimato 0.75] ATC A10BA02 · Autorizzata
  "ramipril"            -> RAMIPRIL RATIOPHARM [prefisso     0.90] ATC C09AA05 · Autorizzata

dosaggi Ramipril in commercio: 1.25, 2.5, 5, 10 milligrammi
  "Ramipril 5 mg" -> plausibile: true
  "Ramipril 7 mg" -> plausibile: false
```

**Tachipirina trovata** e' la conferma della copertura: nelle liste di trasparenza classe A che
avevo esaminato prima dava zero riscontri, perche' e' di fascia C. La Banca Dati completa la
contiene, e con essa l'ATC e i link ai documenti.

Due difetti trovati proprio grazie a questa verifica, e corretti:

1. `"Cardioaspirin 100"` non trovava nulla: il dosaggio scritto **senza unita'** non veniva
   rimosso dal nome, quindi si cercava "CARDIOASPIRIN 100" contro "CARDIOASPIRIN". Ora i numeri
   nudi in coda vengono tolti — solo in coda e solo se interamente numerici, per non rovinare
   nomi come VITAMINA B12.
2. `"Metformna 500"` non veniva recuperato: a registro i generici sono "METFORMINA EG",
   "METFORMINA TEVA"… e il confronto sull'intera stringa e' troppo lontano. Ora si confronta
   anche il **primo termine** del nome.

Senza l'import dei dati veri nessuno dei due sarebbe emerso: i test sintetici passavano.

## Logs

- backend: `# tests 391 # pass 391 # fail 0`
- import: `[farmaci] completato: 319300 righe scritte su 497837 lette in 52s`
- Nessun dato di paziente: l'anagrafica e' pubblica; i test usano valori sintetici.

## Residual Risks

- La soglia del confronto approssimato e' tarata su pochi casi. Su nomi molto corti puo'
  proporre farmaci sbagliati: per questo ogni esito porta una confidenza e il criterio con cui
  e' stato trovato, cosi' l'interfaccia puo' distinguere "questo e' il farmaco" da "forse".
- L'import gira in transazione: sicuro ma con lock per ~1 minuto. Accettabile su una tabella
  di sola consultazione, da rivedere se un giorno l'anagrafica venisse ricaricata spesso.
- Manca ancora tutto il resto: aggancio al pipeline di import, aggancio all'editor terapia,
  ricaricamento periodico schedulato e resa in interfaccia. Questa e' la base dati, non
  la funzione vista dall'operatore.

## Final Decision

CLOSED — VERIFIED

(limitatamente al proprio perimetro: dati e ricerca. La funzione utile all'operatore richiede
gli agganci, che sono attivita' successive gia' concordate.)
