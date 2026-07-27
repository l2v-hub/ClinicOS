# Parser terapia: intestazione come marcatore d'inizio, residuo in Note

Data: 2026-07-26 · Task Contract:
`artifacts/task-validation/terapia-intestazione-come-marcatore-di-inizio-elenco-e-residuo-non-collocabile-i/task-contract.md`

## Problema

Nella lettera di dimissione l'elenco dei farmaci è introdotto da una riga-titolo (`Terapia:`,
`Tp Domiciliare`, `TERAPIA ALLA DIMISSIONE:`, `TD:`). Il parser attuale riconosce solo poche
forme esatte, quindi le altre diventano righe farmaco spurie. Inoltre il testo che il parser non
riesce a collocare in un campo strutturato non arriva all'operatore: viene assorbito da `forma`.

## Decisioni (approvate dall'utente)

1. **Riconoscimento intestazione: strutturale + keyword**, non lista chiusa di varianti.
2. **Fine terapia: regola #296 invariata** — lo stacco chiude il blocco solo quando il paragrafo
   successivo non parla di farmaci. Scartate le alternative "prima riga vuota chiude sempre"
   (perde farmaci se l'OCR spezza l'elenco, rompe i test #296 AC4) e "2+ righe vuote".
3. **Note: residuo pulito + marcatore** — il residuo non collocato valorizza `note` e porta la
   riga a `da_verificare`, così l'operatore la vede evidenziata.

## Architettura

Unico file di produzione toccato: `backend/src/intake/parse-discharge-therapy.ts`.
Scartate: rimuovere le intestazioni a monte in `ai/sections/markdown-parse.ts` (quel modulo
conserva volutamente le heading nel testo di sezione, servono a `detectSectionLoss`), e delegare
l'estrazione all'LLM (non deterministica, non testabile a costo zero).

### 1. `isIntestazioneTerapia(line): boolean`

Sostituisce `HEADER_RE`. Normalizza la riga (via prefissi `#`, bullet `-*•>`, grassetto `**`,
due punti finali) e la classifica intestazione quando **tutte** queste condizioni valgono:

| #   | Condizione                                                                           | Perché                                          |
| --- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| a   | inizia con `terapi[ae]\|tp\|td\|t.d.\|home therapy\|hospital therapy`                | è l'etichetta della sezione                     |
| b   | ≤ 8 parole                                                                           | un titolo è corto                               |
| c   | nessun segnale farmacologico: `DOSE_RE`, `QTY_RE`, via fra parentesi, orario `hh:mm` | se prescrive, è un farmaco                      |
| d   | termina con `:` **oppure** tutte le parole dopo la keyword sono qualificatori        | evita di scartare `Terapia con Ramipril per os` |

Vocabolario qualificatori: `domiciliare, alla, di, in, a, dimissione, dimissioni, consigliata/o,
atto, domicilio, farmacologica, prescritta, praticata, corrente, attuale, casa, home, hospital,
therapy, la, il, del, della`.

La condizione (d) è il punto critico del design: senza di essa una riga farmaco che inizia per
"Terapia con …" verrebbe scartata silenziosamente — la peggiore modalità di fallimento
possibile, perché perde una prescrizione senza lasciare traccia.

### 2. Inizio e fine elenco

`splitTherapyParagraphs` continua a scartare le intestazioni **senza spezzare il paragrafo**:
cambia solo il predicato (`HEADER_RE.test` → `isIntestazioneTerapia`). L'intestazione non conta
come paragrafo farmacologico, quindi non altera `talksAboutDrugs` né la regola di terminazione.
Idem per `splitTherapyLines`.

### 3. `note` = residuo non collocabile

Quattro correzioni in `parseTherapyLine`:

1. **`forma` non fa più da discarica.** Oggi è tutto il testo fra il nome e il primo marcatore
   strutturale; viene limitata a max 3 token e il resto confluisce in `note`.
2. **Via in testo libero rimossa da `note`.** `per os`, `endovena`, `sottocute` sono già mappati
   in `viaSomministrazione`: duplicarli in `note` è rumore.
3. **Escape del nome farmaco** prima di costruire `new RegExp('^' + nome)` — oggi un nome con
   `.` o `-` produce un match errato.
4. **Pulizia della punteggiatura orfana** lasciata dalle sottrazioni (`*`, `()`, `-`, `,`).

Poi si rimuovono i connettori (`e`, `ore`, `alle`, `al giorno`, …): se resta almeno una parola
significativa, `note` è valorizzata e `stato` diventa `da_verificare`. Il residuo di una riga
canonica (`KEPPRA … ore 08:00 e alle 20:00`) è la sola congiunzione `e`, quindi resta `ok` —
nessuna regressione sul test #156 AC3.

## Flusso dati

`therapyText` (da `ai/sections/markdown-parse.ts`) → `parseDischargeTherapy` →
`ParsedTherapyRow[]` → `draft-service.ts:177` → `draft.data.terapiaImport` → frontend
`dischargeRowToTherapyForm` (già esistente, porta `note` nel form manuale dell'operatore).
Nessuna modifica di UI necessaria.

## Gestione errori

Il modulo resta puro e senza eccezioni: una riga non riconosciuta degrada a `da_verificare` con
`originalText` verbatim. Nessuna riga viene mai scartata dall'interno di un paragrafo farmaci.
Il modulo non logga (vincolo privacy già presente in testa al file).

## Test

`backend/src/intake/__tests__/parse-discharge-therapy.test.ts` (`node:test`), un test per AC —
vedi Acceptance Criteria nel Task Contract. Le suite #156 / #274 / #296 esistenti devono restare
verdi senza modifiche.
