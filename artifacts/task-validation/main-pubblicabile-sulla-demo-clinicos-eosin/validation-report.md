# Task Validation Report

## Task

- Title: Main pubblicabile sulla demo clinicos-eosin
- Slug: main-pubblicabile-sulla-demo-clinicos-eosin
- Commit: vedi la pull request verso `main`
- Date: 2026-11-19

## Implementation Summary

Richiesta dell'utente: vedere tutto `main` online su `clinicos-eosin.vercel.app`, con il rilascio
eseguito da lui. `frontend/vercel.json` ammette di nuovo in `connect-src` i due host del backend
della demo presenti prima di #532, accanto al backend development: lo stesso `main` funziona sui
due siti. Aggiunta la procedura `docs/operations/demo-release.md`; `CLAUDE.md` aggiornato (due
siti, una sorgente; i workflow della demo li riattiva solo il proprietario).

## Files Changed

`frontend/vercel.json`, `docs/operations/demo-release.md` (nuovo), `CLAUDE.md`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                         |
| --- | -----: | ------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | `logs/csp-diff.txt`: cambia la sola direttiva `connect-src` (14 direttive prima e dopo), resto del file identico, riscrittura SPA invariata |
| AC2 |   PASS | JSON valido; build frontend OK; suite frontend 1597/1597                                         |
| AC3 |   PASS | `docs/operations/demo-release.md` (con l'elenco di ciò che non è verificato), `CLAUDE.md`        |
| AC4 |   PASS | nessun workflow riattivato o avviato; nessun rilascio eseguito da questa sessione                |

## Test Results

| Test             | Result | Evidence                                                    |
| ---------------- | -----: | ----------------------------------------------------------- |
| Unit             |   PASS | suite frontend 1597/1597; nessun test vincola gli host      |
| Integration      |     NA |                                                             |
| API              |     NA |                                                             |
| Playwright       |     NA | la politica vale solo sul sito pubblicato                   |
| Persistence      |     NA |                                                             |
| Agnos AI         |     NA |                                                             |
| Voice            |     NA |                                                             |
| OCR              |     NA |                                                             |
| Security/privacy |   PASS | `logs/csp-diff.txt`: due host aggiunti, nessuna direttiva allargata oltre `connect-src` |

## Runtime Evidence

Nessuna: il comportamento si vede solo sul sito pubblicato. Da questa sessione Vercel e Railway non
sono raggiungibili; il rilascio e la verifica sul sito restano all'operatore
(`docs/operations/demo-release.md`, sezione «Verifica sul sito»).

## Logs

Only sanitized logs are allowed. `logs/csp-diff.txt`.

## Residual Risks

- Non verificato: a quale progetto punta il segreto `RAILWAY_TOKEN`, quale progetto Vercel serve
  l'alias `clinicos-eosin.vercel.app`, quale commit la demo serve oggi.
- Il sito development ora può collegarsi anche ai due backend della demo.
- Frontend nuovo su backend della demo non aggiornato: le funzioni nuove non rispondono. Ordine
  obbligato: backend, poi frontend.
- Nessuna revisione indipendente di questa modifica (una direttiva di configurazione e documenti).

## Final Decision

IMPLEMENTED — NOT VERIFIED
