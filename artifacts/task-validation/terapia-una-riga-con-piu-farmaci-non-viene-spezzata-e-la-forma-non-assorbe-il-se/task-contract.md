# Task Contract

## Task

- Title: Terapia: una riga con più farmaci non viene spezzata e la forma non assorbe il secondo farmaco
- Slug: terapia-una-riga-con-piu-farmaci-non-viene-spezzata-e-la-forma-non-assorbe-il-se
- Type: bugfix
- Date: 2026-07-28

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

Backend/API: unico file di produzione toccato `backend/src/intake/parse-discharge-therapy.ts`,
consumato da `draft-service.ts` per il seed di `draft.data.terapiaImport`. OCR/Import: il parser
lavora sul `therapyText` della pipeline di importazione. Nessuna modifica di schema, rotte o
contratti API: cambia solo il contenuto dei campi delle righe generate.

## Current Behaviour

Misurato eseguendo `parseDischargeTherapy` sul branch `main` su 5 forme realistiche di riga
multi-farmaco. Risultato osservato, non presunto:

| Riga in ingresso                                                      | righe | nome        | stato         | note                                         |
| --------------------------------------------------------------------- | ----: | ----------- | ------------- | -------------------------------------------- |
| `Ramipril 5 mg 1 cpr ore 08:00, Cardioaspirin 100 mg 1 cpr ore 20:00` |     1 | RAMIPRIL    | da_verificare | `Cardioaspirin 100 mg 1 cpr`                 |
| `Eutirox 75 mcg 1 cpr al mattino; Omeprazolo 20 mg 1 cps la sera`     |     1 | EUTIROX     | da_verificare | `al mattino; Omeprazolo 20 mg 1 cps la sera` |
| `Bisoprololo 2,5 mg 1 cpr + Furosemide 25 mg 1/2 cpr`                 |     1 | BISOPROLOLO | da_verificare | `+ Furosemide 25 mg 1/2 cpr`                 |
| `KEPPRA ... (OS) 1 Cpr ore 08:00 EUTIROX 100MCG (OS) 1 Cpr ore 08:00` |     1 | KEPPRA      | da_verificare | `EUTIROX 100MCG OS 1 Cpr`                    |
| `Eutirox, Omeprazolo e Ramipril 1 cpr al mattino`                     |     1 | EUTIROX     | da_verificare | `Ramipril al mattino`                        |

Il comportamento richiesto — **non spezzare** la riga, marcarla `da_verificare`, conservare il
testo — è quindi già soddisfatto in 4 casi su 5.

**Il difetto è il quinto caso.** `forma` è calcolata come i primi 3 token fra il nome del farmaco e
il primo marcatore strutturale. Su `Eutirox, Omeprazolo e Ramipril 1 cpr al mattino` il primo
marcatore è la quantità `1 cpr`, quindi i 3 token che la precedono — `,` `Omeprazolo` `e` —
finiscono in `forma`, che diventa `", Omeprazolo e"`. Un **nome di farmaco collocato nel campo
"forma farmaceutica"** è un dato errato: l'operatore legge una forma inesistente e il secondo
farmaco non compare in `note`, dove lo cercherebbe.

## Expected Behaviour

1. Una riga che contiene più farmaci continua a produrre **una sola riga** (nessuno split
   automatico): sbagliare il punto di taglio inventerebbe un farmaco inesistente, rischio
   superiore al beneficio. La separazione resta all'operatore.
2. `forma` non attraversa mai un separatore di elenco (`,` `;` `+`): una forma farmaceutica non
   ne contiene. Il testo dal separatore in poi confluisce in `note`.
3. La riga resta `stato = da_verificare` e `originalText` resta verbatim (invariato).
4. Nessuna regressione sulle forme legittime multi-token (`CPR RIV`, `POLVERE INGUINE`), che non
   contengono separatori.

## Acceptance Criteria

- AC1: `Eutirox, Omeprazolo e Ramipril 1 cpr al mattino` → 1 riga, `farmacoNome = EUTIROX`,
  `forma` NON contiene `Omeprazolo`, e `Omeprazolo` è presente in `note`.
- AC2: le altre 4 forme multi-farmaco della tabella Current Behaviour restano invariate: 1 riga,
  `stato = da_verificare`, testo del secondo farmaco presente in `note`.
- AC3: nessuno split automatico — nessuna riga in ingresso produce più di una riga in uscita.
- AC4: nessuna regressione sulle forme legittime: `KEPPRA CPR RIV 500 MGR (OS) ...` mantiene
  `forma = "CPR RIV"` e `stato = ok`; `PEVARYL POLVERE INGUINE SN X 1 AL DI` mantiene la forma
  multi-token.
- AC5: suite di test del backend verde e build TypeScript del backend pulito.

## Test Plan

| Test type                 | Required | Reason                                                                                  |
| ------------------------- | -------: | --------------------------------------------------------------------------------------- |
| Unit                      |      yes | Il parser è puro e deterministico: i test `node:test` sono la prova diretta di ogni AC  |
| Integration               |      yes | `seed-draft-from-import.test.ts` verifica che `terapiaImport` non cambi cardinalità     |
| API                       |       no | Nessuna rotta o contratto API modificato                                                |
| Playwright                |       no | Nessuna modifica di UI: il frontend consuma `note`/`forma` da componenti già esistenti  |
| Persistence after refresh |       no | Nessuna modifica di schema o di scrittura su DB                                         |
| Agnos action registry     |       no | Non toccato                                                                             |
| Voice simulation          |       no | Non toccato                                                                             |
| OCR/import test           |      yes | Il parser è nel percorso di import: suite `backend/src/intake` e `backend/src/ai` verdi |
| Security/privacy scan     |       no | Il modulo non logga e non tratta nuovi dati                                             |

## Evidence Plan

Required evidence:

- validation-report.md con l'esito reale dei comandi
- output della suite di test del backend (conteggio pass/fail) in `logs/`
- output del build TypeScript del backend in `logs/`
- output del probe prima/dopo sulle 5 righe multi-farmaco in `logs/`
- nessuno screenshot / trace / video: il task non tocca la UI (motivato nel Test Plan)

## Risks

- **Troncare una forma legittima contenente `/`**: alcune forme riportano dosaggi come
  `1GR/880UI`, ma quelli sono catturati da `DOSE_RE` come dosaggio e non entrano in `forma`.
  Per prudenza `/` NON è incluso fra i separatori. Mitigato da AC4 e dai test #156 esistenti.
- **`forma` che diventa vuota** dove prima conteneva testo: non è una perdita — il testo
  confluisce in `note` e `originalText` resta verbatim.
- **Nessuno split**: resta il limite noto che una riga con più farmaci produce una riga sola.
  È una scelta esplicita dell'utente ("non lo considerare adesso una riga con più farmaci"),
  non una svista: l'operatore separa a mano partendo da una riga marcata `da_verificare`.

## Gate Status

READY FOR IMPLEMENTATION
