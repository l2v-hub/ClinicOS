# Task Validation Report

## Task

- Title: Terapia: link al Riassunto Caratteristiche Prodotto e al Foglietto Illustrativo AIFA
- Slug: terapia-link-al-riassunto-caratteristiche-prodotto-e-al-foglietto-illustrativo-a
- Commit: branch `feat/terapia-link-rcp-aifa`
- Date: 2026-07-28

## Implementation Summary

Nella colonna "Farmaco" della scheda terapia compare, accanto al nome, un'icona che apre in una
nuova scheda il documento ufficiale AIFA del farmaco: il Riassunto delle Caratteristiche del
Prodotto se disponibile, altrimenti il Foglietto Illustrativo.

Nessuna modifica al backend: `GET /farmaci/cerca` esponeva già `aic`, `denominazione`, `linkRcp` e
`linkFi`. I dati erano in database dall'import AIFA e nessuna schermata li usava.

Due file nuovi:

- `farmacoDocumento.ts` — logica pura (normalizzazione della chiave, scelta RCP/FI, deduplicazione
  dei nomi, etichetta accessibile). Separata dal hook perché non dipende da React né da
  `import.meta.env`, quindi è verificabile con `node:test` senza montare Vite.
- `farmacoRiferimento.ts` — hook `useDocumentiFarmaco`, che risolve i nomi via
  `GET /farmaci/cerca?q=&limite=1` appoggiandosi a `cachedGetJson` (dedup delle richieste in volo +
  cache 12h).

Il render della colonna è stato unificato: un solo `renderFarmaco` sostituisce quattro definizioni
identiche, quindi il link compare in tutte e quattro le viste (attivi, programmazione, giornaliere,
sospese) senza duplicare codice.

## Files Changed

| File                                                                           | Tipo               |
| ------------------------------------------------------------------------------ | ------------------ |
| `frontend/src/components/operator/cartella/farmacoDocumento.ts`                | produzione (nuovo) |
| `frontend/src/components/operator/cartella/farmacoRiferimento.ts`              | produzione (nuovo) |
| `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`        | produzione         |
| `frontend/src/components/operator/cartella/__tests__/farmacoDocumento.test.ts` | test (nuovo)       |

Nessuna modifica a backend, schema Prisma, rotte o contratti API.

## Acceptance Criteria Result

| AC  |              Result | Evidence                                                                                                                                                             |
| --- | ------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | NON VERIFICATO (UI) | La scelta RCP→FI è coperta da test unitari (`logs/unit-farmaco-documento.txt`), ma la resa a schermo del link richiede verifica in applicazione: delegata all'utente |
| AC2 | NON VERIFICATO (UI) | `target="_blank"` e `rel="noopener noreferrer"` sono presenti nel sorgente, non dimostrati a runtime                                                                 |
| AC3 |                PASS | `logs/unit-farmaco-documento.txt` — `documentoDi` restituisce `null` senza RCP né FI; in quel caso il render non emette alcun link                                   |
| AC4 |                PASS | `logs/unit-farmaco-documento.txt` — `chiaviDistinte` deduplica e normalizza; `cachedGetJson` condivide le richieste in volo sullo stesso URL                         |
| AC5 |                PASS | `logs/unit-farmaco-documento.txt` — la chiave di ricerca contiene il solo nome commerciale; test dedicato contro l'introduzione di dati di contesto                  |
| AC6 |                PASS | `logs/frontend-build.txt` — `tsc -b && vite build` exit 0, zero errori TypeScript                                                                                    |
| AC7 | NON VERIFICATO (UI) | Assenza di errori in console e di HTTP 4xx/5xx: richiede esecuzione in applicazione                                                                                  |

## Test Results

| Test             |       Result | Evidence                                                                                                                                    |
| ---------------- | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |         PASS | `logs/unit-farmaco-documento.txt` — 8 tests, 8 pass, 0 fail                                                                                 |
| Integration      |           NA | Nessun servizio backend modificato                                                                                                          |
| API              |           NA | Nessuna rotta creata o modificata                                                                                                           |
| Playwright       | NON ESEGUITO | Rinunciato su decisione esplicita dell'utente, che verifica manualmente                                                                     |
| Persistence      |           NA | Funzionalità di sola lettura                                                                                                                |
| Agnos AI         |           NA | Non toccato                                                                                                                                 |
| Voice            |           NA | Non toccato                                                                                                                                 |
| OCR / Import     |           NA | Non toccato                                                                                                                                 |
| Security/privacy |     PARZIALE | `rel="noopener noreferrer"` presente nel sorgente e assenza di dati paziente nella query coperta da test unitario; non dimostrato a runtime |

## Runtime Evidence

| Comando                                                                  | Exit | Esito               |
| ------------------------------------------------------------------------ | ---: | ------------------- |
| `node node_modules/tsx/dist/cli.mjs --test .../farmacoDocumento.test.ts` |    0 | 8/8 pass            |
| `cd frontend && npm run build`                                           |    0 | 0 errori TypeScript |

Nota sull'ambiente: il primo tentativo di build è fallito con `ENOSPC: no space left on device` — il
disco C: era pieno al 100%. Non era un difetto del codice. Liberata la cache npm (~5,6 GB) su
approvazione dell'utente, la build è passata. Il disco resta al 98%: è una fragilità dell'ambiente
di sviluppo, non del prodotto.

**Nessuna evidenza Playwright è stata prodotta.** L'utente ha deciso di verificare la funzionalità
direttamente in applicazione. Questo report non asserisce ciò che non ha misurato.

## Logs

- `logs/unit-farmaco-documento.txt`
- `logs/frontend-build.txt`

Solo output di test e build su fixture sintetiche: nessun dato clinico, nessun segreto.

## Residual Risks

1. **Tre AC restano non verificati** (AC1, AC2, AC7): la resa del link, l'apertura in nuova scheda e
   l'assenza di errori a runtime. Sono proprio gli aspetti che un test unitario non può dimostrare.
   Verifica manuale a carico dell'utente.
2. **Prerequisito per vedere l'icona**: l'anagrafica AIFA deve essere caricata nel database
   dell'ambiente in cui si prova. Con anagrafica vuota il comportamento corretto è _nessuna icona_ —
   a occhio indistinguibile da una funzionalità che non funziona. Controllare prima
   `GET /farmaci/stato`.
3. **Omonimia commerciale**: la ricerca per nome può agganciare una confezione con dosaggio diverso.
   L'RCP è però il medesimo documento per l'intera famiglia di confezioni, quindi l'impatto pratico
   è nullo nella maggior parte dei casi.
4. **Nomi non trovati** (galenici, esteri, storpiati): nessuna icona, comportamento identico a oggi.

## Final Decision

IMPLEMENTED — NOT VERIFIED
