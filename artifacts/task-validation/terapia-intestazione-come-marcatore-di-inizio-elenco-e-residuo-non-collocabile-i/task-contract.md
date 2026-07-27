# Task Contract

## Task

- Title: Terapia: intestazione come marcatore di inizio elenco e residuo non collocabile in Note
- Slug: terapia-intestazione-come-marcatore-di-inizio-elenco-e-residuo-non-collocabile-i
- Type: change
- Date: 2026-07-26

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

Backend/API: cambia `backend/src/intake/parse-discharge-therapy.ts`, consumato da
`backend/src/intake/draft-service.ts` (seed di `draft.data.terapiaImport`).
OCR/Import: il parser lavora sul `therapyText` prodotto dalla pipeline di importazione della
lettera di dimissione. Nessuna modifica di schema, rotte o contratti API: cambia solo il
contenuto delle righe generate.

## Current Behaviour

Osservato leggendo `parse-discharge-therapy.ts` (branch `fix/import-azure-gpt55-swap`):

1. `HEADER_RE = /^(terapia(\s+domiciliare)?|tp\.?|home therapy|hospital therapy)\s*:?\s*$/i`
   riconosce come intestazione solo la riga esatta. Varianti reali dei referti —
   `Tp Domiciliare`, `TERAPIA ALLA DIMISSIONE:`, `Terapia consigliata:`, `TD:`,
   `## Terapia domiciliare`, `**Terapia:**` — NON vengono riconosciute e diventano righe
   farmaco spurie (es. `farmacoNome: "TERAPIA"`).
2. `forma` è calcolata come tutto il testo fra il nome del farmaco e il primo marcatore
   strutturale: su una riga senza dosaggio/quantità/via assorbe l'intera riga
   (`PEVARYL POLVERE INGUINE SN X 1 AL DI` → `forma = "POLVERE INGUINE SN X 1 AL DI"`),
   quindi il testo non collocabile non arriva mai in `note`.
3. La via riconosciuta in testo libero (`per os`, `endovena`, `sottocute`) resta duplicata in
   `note` pur essendo già mappata in `viaSomministrazione`.
4. `note` viene ripulita con `new RegExp('^' + farmacoNome)`: il nome non è escapato, quindi un
   nome con caratteri speciali di regex (`.`, `-`) produce un match errato.

## Expected Behaviour

1. Una riga-intestazione di terapia non produce una riga farmaco: marca l'inizio dell'elenco.
   Riconoscimento strutturale: dopo aver rimosso prefissi markdown (`#`), bullet (`-`, `*`, `•`,
   `>`), grassetto e i due punti finali, la riga (a) inizia con
   `terapia|terapie|tp|td|t.d.|home therapy|hospital therapy`, (b) ha al massimo 8 parole,
   (c) NON contiene segnali farmacologici (dosaggio, quantità+unità, via fra parentesi, orario
   `hh:mm`), e (d) termina con `:` oppure tutte le parole dopo la keyword sono qualificatori
   (`domiciliare`, `alla dimissione`, `consigliata`, `in atto`, `a domicilio`, ...).
   Il vincolo (d) impedisce di scartare una riga farmaco come `Terapia con Ramipril per os`.
2. Ogni riga dell'elenco resta un farmaco (comportamento già presente, non regredisce).
3. Tutto ciò che non è collocabile nei campi strutturati finisce in `note`:
   `forma` limitata a max 3 token, il resto in `note`; via in testo libero rimossa da `note`;
   nome del farmaco escapato prima dell'uso in `RegExp`; punteggiatura orfana ripulita.
   Se dopo la rimozione dei connettori resta almeno una parola significativa, `note` è
   valorizzata e `stato` diventa `da_verificare`.
4. La terapia finisce a uno stacco di paragrafo secondo la regola #296 già approvata
   (invariata): dopo che sono comparsi farmaci, il primo paragrafo separato da riga vuota che
   non parla di farmaci termina il blocco. L'intestazione non spezza il paragrafo e non conta
   come paragrafo farmacologico.

## Acceptance Criteria

- AC1: le varianti `Terapia:`, `Terapia domiciliare`, `Tp Domiciliare`, `TERAPIA ALLA DIMISSIONE:`,
  `Terapia consigliata:`, `TD:`, `## Terapia domiciliare`, `**Terapia:**` non generano righe
  farmaco; i farmaci elencati sotto di esse sì.
- AC2: `Terapia con Ramipril 5 mg 1 cpr per os` e `Terapia con Ramipril per os` restano righe
  farmaco (nome `RAMIPRIL`), non intestazioni.
- AC3: su `PEVARYL POLVERE INGUINE SN X 1 AL DI` la `forma` non assorbe l'intera riga; il testo
  non collocato è presente in `note`; `stato = da_verificare`; `originalText` invariato.
- AC4: su `Ramipril 5 mg 1 compressa al giorno per os` la via è `OS` e `note` non contiene più
  `per os`.
- AC5: nessuna regressione sui test esistenti #156 / #274 / #296 (in particolare KEPPRA resta
  `stato = ok` e i blocchi farmaci separati da riga vuota restano tutti parsati).
- AC6: la suite di test del backend è verde e il build TypeScript del backend passa.

## Test Plan

| Test type                 | Required | Reason                                                                                                              |
| ------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | Il parser è deterministico e puro: i test unitari `node:test` sono la prova diretta di ogni AC                      |
| Integration               |      yes | `seed-draft-from-import.test.ts` verifica che `terapiaImport` continui ad avere una riga per farmaco                |
| API                       |       no | Nessuna rotta o contratto API modificato                                                                            |
| Playwright                |       no | Nessuna modifica di UI: il frontend consuma `note` tramite `dischargeRowToTherapyForm`, già esistente e non toccato |
| Persistence after refresh |       no | Nessuna modifica di schema o di scrittura su DB                                                                     |
| Agnos action registry     |       no | Non toccato                                                                                                         |
| Voice simulation          |       no | Non toccato                                                                                                         |
| OCR/import test           |      yes | Il parser è nel percorso di import: la suite `backend/src/intake` e `backend/src/ai` deve restare verde             |
| Security/privacy scan     |       no | Il modulo non logga e non tratta nuovi dati; la regola "nessun log di testo clinico" resta rispettata               |

## Evidence Plan

Required evidence:

- validation-report.md con l'esito reale dei comandi
- output della suite di test del backend (conteggio pass/fail)
- output del build TypeScript del backend
- nessuno screenshot / trace / video: il task non tocca la UI (motivato sopra nel Test Plan)

## Risks

- **Falso positivo sull'intestazione** (una riga farmaco scartata come titolo): è il rischio
  peggiore perché perde silenziosamente una prescrizione. Mitigato dal vincolo (d)
  "due punti oppure soli qualificatori" e da un test dedicato (AC2).
- **Declassamento a `da_verificare` di righe oggi `ok`**: mitigato rimuovendo i connettori
  (`e`, `alle`, `ore`, `al giorno`) prima di valutare il residuo, e coperto da AC5 su KEPPRA.
- **Riduzione di `forma` a 3 token**: potrebbe troncare forme farmaceutiche molto lunghe. Il
  testo tagliato non viene perso, finisce in `note`, e `originalText` resta comunque verbatim.

## Gate Status

READY FOR IMPLEMENTATION
