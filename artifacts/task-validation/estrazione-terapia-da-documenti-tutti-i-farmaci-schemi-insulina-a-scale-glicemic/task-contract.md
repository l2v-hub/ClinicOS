# Task Contract

## Task

- Title: Estrazione terapia da documenti: tutti i farmaci, schemi insulina a scale glicemiche, data inizio default al giorno di import
- Slug: estrazione-terapia-da-documenti-tutti-i-farmaci-schemi-insulina-a-scale-glicemic
- Type: change
- Date: 2026-10-11

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

- Le righe terapia sono prodotte da `parseDischargeTherapy` solo sul blocco testuale sotto un titolo
  riconosciuto come "Terapia…". Righe farmaco altrove (altra pagina, titolo non riconosciuto) si perdono.
- Il parser smette al primo paragrafo senza segnali farmaco dopo che ha già visto farmaci (#296):
  tutto ciò che segue un salto pagina o una nota viene scartato.
- Unità riconosciute solo MG/MCG/G/UI/ML: "U", "mEq", "%" non contano come dose.
- Lo schema insulinico a scala glicemica (range glicemia → unità) non è rappresentato: finisce in note
  e la riga è "da verificare".
- `dataInizio` delle righe importate resta vuota (bloccante alla conferma); la data d'ingresso si
  precompila solo al focus ed è in UTC.

## Expected Behaviour

- Ogni riga del documento (qualsiasi pagina) con farmaco + dose + periodicità diventa una riga terapia.
  Dentro la sezione terapia: riga normale. Fuori sezione: riga `da_verificare` con nota di provenienza
  (decisione utente 2026-10-11).
- Il parser non si ferma più a un paragrafo senza farmaci: lo salta e continua.
- Lo schema insulinico a scala glicemica viene riconosciuto e rappresentato in forma strutturata
  con le fasce del documento (range e unità specifici del paziente, mai valori fissi), modificabile
  dall'operatore e salvato su `PatientTherapy.doseMode/doseProtocol` — modello già presente su main
  (commit 54d65b243): la migrazione approvata dall'utente il 2026-10-11 non è servita.
  Le righe di fasce si uniscono solo a una prescrizione che annuncia lo schema, e la riga unita resta
  da_verificare (finding F1 del QA).
- `dataInizio` delle righe importate senza "dal …" = data in cui si processa (giorno locale).
  La data d'ingresso è precompilata alla data di elaborazione (locale), modificabile.

## Acceptance Criteria

- AC1: Un testo di dimissione con farmaci divisi su più paragrafi/pagine (separati da righe non farmaco
  o marcatori di pagina) produce una riga per ogni farmaco con dose+frequenza (test unitario parser).
- AC2: Una riga con farmaco+dose+periodicità fuori dalla sezione terapia (es. nel decorso) diventa una
  riga `da_verificare` con nota "fuori sezione terapia"; le righe narrative senza dose/periodicità no.
- AC3: Uno schema insulinico con range glicemici (es. "150-200: 2 UI; 201-250: 4 UI; >250: 6 UI")
  produce una scala strutturata (`doseMode='glucose_scale'`, fasce `{minMgDl,maxMgDl,units}`) con i valori del documento; righe con range diversi producono
  scale diverse (nessun valore fisso).
- AC4: la scala arriva fino a `PatientTherapy.doseMode/doseProtocol` (già presenti su main: nessuna
  migrazione necessaria) alla conferma del paziente, viene validata
  (min≤max, unità ≥0 — 0 = non somministrare —, nessuna sovrapposizione) ed è visibile/modificabile nella UI terapia.
- AC5: Righe importate senza data esplicita hanno `dataInizio` = data locale di elaborazione; la data
  d'ingresso è precompilata alla data locale di elaborazione; entrambe modificabili.
- AC6: Nessuna regressione: suite parser/intake backend e frontend esistenti verdi (al netto dei
  fallimenti di baseline documentati), `npm run build` frontend e `tsc` backend verdi.

## Test Plan

| Test type                 | Required | Reason                                                                 |
| ------------------------- | -------: | ---------------------------------------------------------------------- |
| Unit                      |      yes | parser terapia, scala glicemica, default date, validazione             |
| Integration               |      yes | seed bozza da import con testo multi-pagina                            |
| API                       |      yes | conferma terapia con glycemiaScale (validazione 400 su scala invalida) |
| Playwright                |      yes | step terapia intake mostra scala insulinica e data inizio precompilata |
| Persistence after refresh |      yes | glycemiaScale salvata su PatientTherapy (DB locale usa e getta)        |
| Agnos action registry     |       no |                                                                        |
| Voice simulation          |       no |                                                                        |
| OCR/import test           |      yes | fixture testo OCR di dimissione multi-pagina                           |
| Security/privacy scan     |       no | solo dati sintetici                                                    |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

- Falsi positivi fuori sezione (farmaci citati in anamnesi): mitigato con stato `da_verificare`.
- Scala glicemica: rischio clinico se valori interpretati male → la riga resta `da_verificare` se la
  scala non è interamente parsabile; il testo originale resta sempre visibile.
- Migrazione additiva nullable: nessun impatto su righe esistenti. Nessuna migrazione in prod in
  questo task senza deploy esplicito.

## Gate Status

READY FOR IMPLEMENTATION
