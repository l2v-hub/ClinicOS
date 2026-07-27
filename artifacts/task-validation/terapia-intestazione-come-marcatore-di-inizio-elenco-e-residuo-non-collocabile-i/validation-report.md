# Task Validation Report

## Task

- Title: Terapia: intestazione come marcatore di inizio elenco e residuo non collocabile in Note
- Slug: terapia-intestazione-come-marcatore-di-inizio-elenco-e-residuo-non-collocabile-i
- Commit: `ce937ee2` su `feat/terapia-parser-intestazione-note` (base `origin/main` `92f585b7`)
- Date: 2026-07-27

## Implementation Summary

Sostituito il riconoscimento dell'intestazione di terapia (`HEADER_RE`, lista chiusa di forme
esatte) con `isIntestazioneTerapia()`, un classificatore strutturale: normalizza la riga (prefissi
markdown `#`, bullet `-*•>`, grassetto, due punti finali) e la marca come titolo solo se inizia con
`terapia|terapie|tp|td|t.d.|home therapy|hospital therapy`, ha ≤ 8 parole, non contiene segnali
farmacologici (dosaggio, quantità+unità, via fra parentesi, orario `hh:mm`) e termina con `:` oppure
ha solo qualificatori dopo la keyword. L'intestazione non spezza il paragrafo e non conta come
paragrafo farmacologico: la regola di terminazione #296 resta invariata.

In `parseTherapyLine` il residuo non collocabile ora arriva all'operatore: `forma` è limitata a max
3 token (il resto confluisce in `note`), la via riconosciuta a parole non viene più duplicata in
`note`, il nome del farmaco è escapato prima dell'uso in `RegExp` e la punteggiatura orfana è
ripulita. Se dopo la rimozione dei connettori resta una parola significativa, `note` è valorizzata e
`stato` diventa `da_verificare`. `originalText` resta verbatim in ogni caso.

Design approvato: `docs/superpowers/specs/2026-07-26-parser-terapia-intestazione-note-design.md`.

## Files Changed

| File                                                           | Tipo       |
| -------------------------------------------------------------- | ---------- |
| `backend/src/intake/parse-discharge-therapy.ts`                | produzione |
| `backend/src/intake/__tests__/parse-discharge-therapy.test.ts` | test       |

Nessuna modifica a UI, schema Prisma, rotte o contratti API (come da Impact Classification).

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                                                                                      |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `logs/unit-parse-discharge-therapy.txt` — test 19 "AC1: ogni variante di intestazione non genera una riga farmaco", test 20 "AC1: l'intestazione non interrompe l'elenco che la segue" (8 varianti: `Terapia:`, `Terapia domiciliare`, `Tp Domiciliare`, `TERAPIA ALLA DIMISSIONE:`, `Terapia consigliata:`, `TD:`, `## Terapia domiciliare`, `**Terapia:**`) |
| AC2 |   PASS | idem — test 21 "una riga che prescrive resta un farmaco anche se inizia per «Terapia»", test 22 "una riga di prosa clinica che nomina la terapia non viene scartata"                                                                                                                                                                                          |
| AC3 |   PASS | idem — test 23 "la forma non assorbe la riga; il resto finisce in note e la riga è da verificare" (`PEVARYL POLVERE INGUINE SN X 1 AL DI`, `originalText` invariato)                                                                                                                                                                                          |
| AC4 |   PASS | idem — test 24–27 (via non duplicata in `note`; `note` non ripete nome/campi mappati; nome con caratteri speciali non rompe la pulizia; posologia in lettere non declassa una riga completa)                                                                                                                                                                  |
| AC5 |   PASS | idem — test 1–18: suite #156 (9), #274 (4), #296 (5) tutte verdi **senza modifiche**; KEPPRA resta `stato = ok` (test 2), blocchi separati da riga vuota tutti parsati (test 16)                                                                                                                                                                              |
| AC6 |   PASS | `logs/backend-suite.txt` → 405/405 pass, 0 fail; `logs/backend-build.txt` → `prisma generate` + `tsc -p tsconfig.json` exit 0                                                                                                                                                                                                                                 |

## Test Results

| Test             | Result | Evidence                                                                                                                   |
| ---------------- | -----: | -------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | `logs/unit-parse-discharge-therapy.txt` — 28 tests, 28 pass, 0 fail (exit 0)                                               |
| Integration      |   PASS | `logs/backend-suite.txt` — `seedDraftFromImport` #381/#382/#383 ok: `terapiaImport` continua ad avere una riga per farmaco |
| API              |     NA | nessuna rotta o contratto API modificato                                                                                   |
| Playwright       |     NA | nessuna modifica di UI: il frontend consuma `note` via `dischargeRowToTherapyForm`, non toccato                            |
| Persistence      |     NA | nessuna modifica di schema o di scrittura su DB                                                                            |
| Agnos AI         |     NA | non toccato                                                                                                                |
| Voice            |     NA | non toccato                                                                                                                |
| OCR / Import     |   PASS | `logs/backend-suite.txt` — le suite `backend/src/intake` e `backend/src/ai` restano verdi nel run completo 405/405         |
| Security/privacy |   PASS | il modulo resta puro e non logga: nessun testo clinico scritto su log (vincolo in testa al file, invariato)                |

## Runtime Evidence

Ambiente: Postgres locale `clinicos-e2e-265` (Podman, `localhost:5433/clinicos_test`), avviato per
il run — senza DB i 28 test che usano Prisma falliscono per connessione rifiutata. Va notato che al
primo run (DB spento) i 28 fallimenti erano tutti Prisma/Entra-config e **nessuno** nel parser.

Comandi eseguiti da `backend/`:

| Comando                                                                                             | Exit | Esito                       |
| --------------------------------------------------------------------------------------------------- | ---: | --------------------------- |
| `node ../node_modules/tsx/dist/cli.mjs --test src/intake/__tests__/parse-discharge-therapy.test.ts` |    0 | 28/28 pass                  |
| `npm test` (`node ../scripts/run-node-tests.mjs`)                                                   |    0 | 405 tests, 405 pass, 0 fail |
| `npm run build` (`prisma generate` + `tsc -p tsconfig.json`)                                        |    0 | 0 errori TypeScript         |

Log integrali in `logs/`. Nessuno screenshot/trace/video: il task non tocca la UI, come motivato nel
Test Plan del Task Contract.

## Logs

- `logs/unit-parse-discharge-therapy.txt`
- `logs/backend-suite.txt`
- `logs/backend-build.txt`

Solo output di test/build su fixture sintetiche: nessun dato clinico reale, nessun segreto.

## Residual Risks

1. **Falso positivo sull'intestazione** (riga farmaco scartata come titolo) — il rischio peggiore,
   perché perderebbe silenziosamente una prescrizione. Mitigato dal vincolo "due punti oppure soli
   qualificatori" e coperto dai test 21–22 (AC2). Residuo: una forma di intestazione non prevista
   (lingua diversa, abbreviazione locale) non viene riconosciuta e produce una riga farmaco spuria —
   degrado visibile all'operatore, non perdita di dati.
2. **`forma` limitata a 3 token** — forme farmaceutiche molto lunghe vengono troncate, ma il testo
   tagliato finisce in `note` e `originalText` resta verbatim: nessuna perdita.
3. **Base di validazione**: la prima esecuzione girava sul branch `fix/import-azure-gpt55-swap`,
   che era 32 commit indietro rispetto a `origin/main` e senza commit propri — tutto il resto del
   suo working tree (Azure GPT-5.5, AIFA farmaci, DocIntel) era già su `main`. La validazione qui
   riportata è stata **rieseguita da capo** sul branch `feat/terapia-parser-intestazione-note`,
   creato da `origin/main`, che contiene come unico delta applicativo i due file di questo task.
   Verificato prima del riallineamento che la riscrittura non regredisse nulla di `main`: le
   41 righe presenti solo su `main` sono esattamente la vecchia implementazione sostituita
   (`HEADER_RE`, vecchio `detectRoute`, vecchia costruzione di `note`), e tutti i 18 test del file
   su `main` sono contenuti nella suite locale (0 test persi).

## Final Decision

CLOSED — VERIFIED
