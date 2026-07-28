# Task Validation Report

## Task

- Title: Terapia: una riga con più farmaci non viene spezzata e la forma non assorbe il secondo farmaco
- Slug: terapia-una-riga-con-piu-farmaci-non-viene-spezzata-e-la-forma-non-assorbe-il-se
- Commit: vedi "Residual Risks" (branch `feat/terapia-parser-intestazione-note`)
- Date: 2026-07-28

## Implementation Summary

Aggiunto un quarto marcatore al calcolo di `forma` in `parseTherapyLine`: il primo separatore di
elenco (`;`, `+`, oppure `,` non seguita da cifra). `forma` si ferma lì e il testo successivo
confluisce in `note`, come qualunque altro residuo non collocabile.

Una forma farmaceutica non contiene separatori di elenco: quando la riga ne porta uno, da lì in poi
sta parlando d'altro — tipicamente di un secondo farmaco. La virgola decimale è esclusa dalla regola
(`,(?!\d)`) perché fa parte di un numero (`2,5 mg`), non separa un elenco.

**Nessuno split automatico è stato introdotto**, per scelta esplicita dell'utente ("non lo
considerare adesso una riga con più farmaci"): sbagliare il punto di taglio inventerebbe una
prescrizione inesistente, danno peggiore di una riga da rivedere a mano.

## Files Changed

| File                                                           | Tipo       |
| -------------------------------------------------------------- | ---------- |
| `backend/src/intake/parse-discharge-therapy.ts`                | produzione |
| `backend/src/intake/__tests__/parse-discharge-therapy.test.ts` | test       |

Nessuna modifica a UI, schema Prisma, rotte o contratti API.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                       |
| --- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `logs/unit-parser.txt` — test "multi-farmaco AC1": `Eutirox, Omeprazolo e Ramipril 1 cpr al mattino` → `farmacoNome=EUTIROX`, `forma` NON contiene `Omeprazolo`, `note` sì, `stato=da_verificare`. Confronto diretto in `logs/probe-dopo.txt` contro la tabella Current Behaviour del contract |
| AC2 |   PASS | `logs/unit-parser.txt` — test "multi-farmaco AC2": per tutte e 4 le righe multi-farmaco il secondo farmaco è presente in `note`, `stato=da_verificare`, `originalText` verbatim                                                                                                                |
| AC3 |   PASS | `logs/unit-parser.txt` — test "multi-farmaco AC3": `parseDischargeTherapy` restituisce esattamente 1 riga per ciascuna delle 4 righe in ingresso — nessuno split                                                                                                                               |
| AC4 |   PASS | `logs/unit-parser.txt` — test "multi-farmaco AC4": `KEPPRA ... CPR RIV ...` mantiene `forma="CPR RIV"` e `stato=ok`; `PEVARYL POLVERE INGUINE ...` mantiene la forma multi-token; `Bisoprololo 2,5 mg` mantiene `dosaggio="2,5 mg"` (la virgola decimale non tronca)                           |
| AC5 |   PASS | `logs/backend-suite.txt` → 409/409 pass, 0 fail; `logs/backend-build.txt` → `prisma generate` + `tsc -p tsconfig.json` exit 0                                                                                                                                                                  |

## Test Results

| Test             | Result | Evidence                                                                                                |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | `logs/unit-parser.txt` — 32 tests, 32 pass, 0 fail (28 preesistenti + 4 nuovi)                          |
| Integration      |   PASS | `logs/backend-suite.txt` — `seedDraftFromImport` verde: `terapiaImport` non cambia cardinalità          |
| API              |     NA | Nessuna rotta o contratto API modificato                                                                |
| Playwright       |     NA | Nessuna modifica di UI                                                                                  |
| Persistence      |     NA | Nessuna modifica di schema o di scrittura su DB                                                         |
| Agnos AI         |     NA | Non toccato                                                                                             |
| Voice            |     NA | Non toccato                                                                                             |
| OCR / Import     |   PASS | `logs/backend-suite.txt` — suite `backend/src/intake` e `backend/src/ai` verdi nel run completo 409/409 |
| Security/privacy |   PASS | Il modulo resta puro e non logga: nessun testo clinico su log (vincolo invariato in testa al file)      |

## Runtime Evidence

Ambiente: Postgres locale `clinicos-e2e-265` (Podman, `localhost:5433/clinicos_test`).
Base: branch `feat/terapia-parser-intestazione-note`, allineato a `origin/main`.

| Comando                                                                                             | Exit | Esito                       |
| --------------------------------------------------------------------------------------------------- | ---: | --------------------------- |
| `node ../node_modules/tsx/dist/cli.mjs --test src/intake/__tests__/parse-discharge-therapy.test.ts` |    0 | 32/32 pass                  |
| `npm test`                                                                                          |    0 | 409 tests, 409 pass, 0 fail |
| `npm run build`                                                                                     |    0 | 0 errori TypeScript         |

Prima/dopo misurati sulle stesse 5 righe (`logs/probe-dopo.txt`): l'unico campo cambiato è quello
del caso rotto — `forma: ", Omeprazolo e"` → `forma` vuota e `note: "Omeprazolo Ramipril al mattino"`.
Gli altri 4 casi restano identici a prima.

## Logs

- `logs/unit-parser.txt`
- `logs/backend-suite.txt`
- `logs/backend-build.txt`
- `logs/probe-dopo.txt`

Solo output di test/build su fixture sintetiche: nessun dato clinico reale, nessun segreto.

## Residual Risks

1. **Una riga con più farmaci resta una riga sola.** È il limite accettato per scelta: l'operatore
   la separa a mano partendo da una riga marcata `da_verificare` col testo completo in `note`.
   Non è perdita di dati, è lavoro manuale che resta.
2. **Forme farmaceutiche contenenti `+`** (associazioni come `AMOXICILLINA + AC. CLAVULANICO`
   scritte come forma anziché come nome) verrebbero troncate in `forma`, col resto in `note` e la
   riga a `da_verificare`. Degrado visibile, non perdita: `originalText` resta verbatim. Nessun caso
   del genere compare nelle fixture reali di #156.
3. **`/` volutamente escluso** dai separatori per non spezzare dosaggi come `1GR/880UI`: una riga
   che separasse due farmaci con `/` non verrebbe intercettata.

## Final Decision

CLOSED — VERIFIED
