# Task Contract

## Task
- Title: Loop UX ciclo 8 - Parametri Vitali, salvataggio raggruppato e valori implausibili
- Slug: loop-ux-ciclo-8-parametri-vitali-salvataggio-raggruppato
- Type: perf + refactor
- Date: 2026-08-08

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

`ParametriTab.tsx` (griglia mensile Parametri Vitali: 12 colonne x fino a 31 righe, editing
inline per cella, confermato con Enter/Tab/blur) e' il secondo flusso clinico a piu' alta
frequenza dopo Terapia Farmacologica (ciclo 7): i parametri vitali si registrano piu' volte al
giorno per ogni paziente ricoverato.

Tracciata la catena `onUpdate`: ogni singola cella confermata chiamava `saveCellValue`, che
chiamava immediatamente `onUpdate` -> (via `VitalSignsEditor` -> `PatientDetail.upd` ->
`App.updateCartella`) una **PUT dell'intera cartella del paziente** (tutti i moduli clinici, non
solo i parametri) piu' un toast "Dati salvati correttamente" condiviso da tutta l'app. Compilare
una sola riga da 12 colonne generava quindi fino a 12 PUT complete e 12 rinnovi del toast in
sequenza.

In aggiunta, le colonne numeriche (FC, SpO2, Temperatura, DTX) e PA (pressione) accettavano
testo libero senza nessuna validazione: un errore di battitura (es. "981" invece di "98.1") si
salvava silenzioso, indistinguibile a schermo da un valore corretto. Il valore mostrato in una
cella non in editing veniva troncato a 8 caratteri senza modo di leggerlo per intero (rilevante
soprattutto per la colonna NOTE) senza entrare in editing.

Analisi e implementazione tramite team coordinato (clinicos-uiux per lo spec visivo,
clinicos-implementer per il codice, clinicos-qa come gate indipendente prima di procedere).

## Expected Behaviour

Il salvataggio della griglia si raggruppa per "burst" di editing (debounce 800ms, tetto massimo
4s, flush immediato su cambio mese o uscita dal tab) invece di una PUT per cella, senza cambiare
la garanzia di non perdita dati (flush esplicito su ogni punto d'uscita). I valori
fisiologicamente implausibili (probabile errore di battitura, non una lettura clinica estrema ma
vera) ricevono un indicatore visivo non bloccante. I valori troncati sono leggibili per intero via
tooltip.

## Acceptance Criteria

### Verificati staticamente

- AC1 — Il salvataggio per singola cella non e' piu' una PUT immediata dell'intera cartella:
  le modifiche si accumulano in un overlay locale (stato React, non ref — vedi AC-lint) e si
  spediscono raggruppate dopo 800ms di pausa, con un tetto massimo di 4s per non rimandare
  indefinitamente una sessione di editing ininterrotta.
  *Verifica: lettura del codice + `flush()`/`queueCellSave` in `ParametriTab.tsx`.*
- AC2 — Nessuna perdita di dati introdotta dal raggruppamento: `flush()` gira esplicitamente su
  cambio mese (`prevMese`/`nextMese`, prima di cambiare `viewMese`/`viewAnno`) e su smontaggio del
  componente (cambio tab/paziente).
  *Verifica: lettura del codice. Da confermare a runtime (vedi AC-R1).*
- AC3 — Editing ripetuto della stessa cella prima del debounce (es. correggere un valore appena
  digitato) non accumula valori: l'overlay e' una Map, l'ultima scrittura per chiave vince.
  *Verifica: lettura del codice.*
- AC4 — Editing di colonne diverse della stessa riga si fonde correttamente in un solo record al
  flush (nessuna colonna sovrascritta da un'altra).
  *Verifica: lettura del codice (`flush()` itera le entry accumulando su `giorni` riassegnato ad
  ogni iterazione).*
- AC5 — Valori fisiologicamente implausibili (FC fuori 20-300, SpO2 fuori 0-100, Temperatura
  fuori 25-45, DTX fuori 10-900, PA non in formato "sistolica/diastolica" o con sistolica fuori
  40-300/diastolica fuori 20-200) ricevono un indicatore non bloccante (`.out-of-range`, anello
  ambra) + tooltip. Il salvataggio non e' mai bloccato: un valore estremo puo' essere clinicamente
  vero.
  *Verifica: lettura del codice + spec design confermato da clinicos-uiux (colore ambra coerente
  con l'uso esistente nel repo per "attenzione non critica", distinto da `badge--red` riservato a
  stati clinici diagnosticati).*
- AC6 — Il valore troncato (>8 caratteri) mostra il testo completo in un tooltip nativo (`title`);
  lo stesso attributo porta il messaggio di avviso quando il valore e' implausibile.
  *Verifica: lettura del codice.*
- AC7 — Il pannello "Aggiunta rapida parametro vitale" (`addVitale`, azione singola esplicita,
  lista separata `parametriVitali`) non e' toccato dal refactor: continua a chiamare `onUpdate`
  direttamente.
  *Verifica: lettura del codice, confermato da clinicos-qa.*
- AC8 — `npx tsc --noEmit` pulito, `npm run build` verde, `npm test` 140/140 invariato,
  `eslint --no-cache` senza errori nuovi (in particolare **zero** violazioni `react-hooks/refs`:
  il progetto compila con React Compuler, che richiede stato reattivo — non ref mutate/lette
  durante il render — per i dati letti nel corpo del render; un primo giro di implementazione e'
  stato respinto dal gate QA proprio per questo motivo e corretto, vedi Findings).
  *Verifica: eseguiti da clinicos-implementer, ri-verificati indipendentemente da clinicos-qa e da
  me.*

### Aperti — verificati a runtime nel validation-report

- AC-R1: il raggruppamento funziona davvero nel browser (N celle modificate in sequenza = 1 sola
  richiesta di rete, non N), i valori appaiono subito in griglia prima che la richiesta parta, e
  nessuna modifica va persa cambiando mese/uscendo dal tab prima dello scadere del debounce.
- AC-R2: l'indicatore di valore implausibile e il tooltip sono visibili e corretti a schermo.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | la logica di flush/debounce e' stata verificata da clinicos-qa con una riproduzione isolata (React reale in Chromium via Playwright) del caso Tab/Escape/blur; nessuna funzione pura nuova con logica di dominio separabile da aggiungere ai suite esistenti |
| Integration | no | nessun modulo backend toccato |
| API | no | nessuna modifica API: stesso endpoint, stesso verbo, stesso payload shape di prima (solo raggruppato) |
| Playwright | yes | flusso clinico ad alta frequenza; il raggruppamento delle richieste e' l'unica cosa che una verifica statica non puo' dimostrare da sola |
| Persistence after refresh | no | nessuna modifica al modello dati |
| Security/privacy | yes | verificare nessuna nuova esposizione nei log, nessuna richiesta aggiuntiva verso terzi |

## Risks

**R1 — finestra di esposizione dati aumentata da ~0 a ~800ms-4s.** Prima, un crash del browser a
meta' modifica perdeva al massimo il valore della cella APERTA (non ancora confermata). Ora, un
crash o una chiusura brutale del processo (non una normale navigazione: quella e' coperta dal
flush su unmount) nella finestra fra una modifica confermata e il flush del debounce puo' perdere
fino a poche celle recenti. *Mitigazione:* finestra breve (max 4s), flush esplicito su ogni uscita
normale dal componente (cambio mese, cambio tab, cambio paziente). *Accettato consapevolmente*: lo
scambio e' fra un rischio piccolo e raro (crash) e uno spreco di rete certo e frequente (12+ PUT
complete per riga compilata).

**R2 — complessita' aggiunta per rispettare le regole del React Compiler.** Il primo giro di
implementazione usava ref mutate/lette durante il render (piu' semplice da scrivere) ed e' stato
respinto dal gate QA con una motivazione concreta (bailout di memoizzazione del Compiler
potrebbe lasciare `flush()` con stato non aggiornato). La versione finale usa stato React per
l'overlay e un parametro esplicito (`overrideOverlay`) per il caso limite del tetto massimo, per
evitare una finestra di un tick in cui l'ultima modifica sarebbe stata persa dal flush forzato.
*Verificato*: 0 errori `react-hooks/refs`, comportamento re-letto riga per riga.

**R3 — fuori ambito, deliberatamente.** Nessuna modifica al modello dati/API. Nessuna estensione
del tooltip nativo a un pattern custom (limite noto: non appare a tap su tablet touch-only, senza
hover — accettato, materia di un ciclo futuro se necessario). Nessuna validazione bloccante sui
valori vitali (scelta clinica deliberata: un valore estremo vero deve poter essere registrato).

## Gate Status

CLOSED — VERIFIED (vedi validation-report.md)
