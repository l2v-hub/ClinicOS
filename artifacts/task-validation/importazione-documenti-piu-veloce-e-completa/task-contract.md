# Task Contract

## Task

- Title: Importazione documenti piu veloce e completa
- Slug: importazione-documenti-piu-veloce-e-completa
- Type: change
- Date: 2026-11-22

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |      yes |

Note: richiesta esplicita dell'utente (2026-11-22): analizzare e migliorare l'inserimento automatico
del paziente da foto/PDF — oggi lento, e molti dati presenti nel documento non vengono compilati;
saltare intestazioni, piè di pagina e informazioni non necessarie. La richiesta autorizza modifiche
a backend (`backend/src/ai/upload`, `backend/src/intake`, `backend/ai-assets`) e al servizio AI
(`clinicos-ai-runtime`). Nessuna modifica a Prisma, a rotte esistenti (forma delle risposte
invariata salvo campi aggiunti) o a `VITE_API_URL`. Nessun dato clinico o segreto nuovo verso
l'esterno: stessi fornitori e stessi endpoint già configurati.

## Current Behaviour

Misure sulla demo con una lettera sintetica di 2 pagine (`logs/baseline/`): 51 s da «Avvia
elaborazione» alla revisione, sia da PDF sia da foto — circa 11 s di OCR (pagine una dopo
l'altra, ~5–6 s l'una) e circa 38 s di estrazione (`azure:gpt-6.1-sol`). In locale, con modelli
simulati istantanei, 4,3 s di sola orchestrazione.

- L'OCR (Mistral su Foundry) è corretto, tabelle comprese.
- Al modello si chiede uno schema ampio (parametri vitali, diario, indicatori, note…) che
  l'importazione poi non usa: output lungo = tempo. Lo schema inviato è quello di validazione,
  senza descrizioni dei campi.
- Dati trovati dal modello e persi a valle: telefono, indirizzo ed email non arrivano alla scheda
  di revisione; referente/familiare, comune, provincia, CAP, luogo di nascita, struttura inviante
  e motivo d'ingresso non vengono mai compilati.
- Intestazioni e piè di pagina ripetuti finiscono nel testo clinico (es. dentro «Decorso») e nel
  testo passato al modello.
- Il lavoro parte fino a 2 s dopo la richiesta; ogni pagina costa più richieste e attese fisse di
  1 s verso il servizio AI.

## Expected Behaviour

Stesso flusso OCR → testo markdown → modello → campi, ma:

- pagine lette in parallelo, lettere estratte in parallelo, avvio immediato, attese più corte;
- al modello va il testo già ripulito da intestazioni e piè di pagina ripetuti, con uno schema
  ridotto ai soli campi che l'ingresso usa, descritti uno per uno; sforzo di ragionamento del
  modello regolabile da variabile (nessun cambio di modello nel codice);
- i dati estratti arrivano tutti ai campi dell'ingresso: recapiti, luogo di nascita, residenza
  (comune, provincia, CAP), referente, struttura inviante, motivo d'ingresso, oltre a quelli
  già compilati; ogni campo scritto dall'AI resta segnato come tale e verificabile;
- regole cliniche invariate: nessun dato inventato, allergie e terapia con le stesse cautele,
  mai sovrascrivere ciò che ha scritto l'operatore.

## Acceptance Criteria

- AC1: le pagine di una sessione vengono lette in parallelo (limite configurabile) e le lettere
  estratte in parallelo; con modelli simulati il tempo locale per 2 pagine scende sotto 2,5 s
  (era 4,3 s) e con un ritardo simulato di 3 s per pagina il tempo OCR di 4 pagine è ~1 pagina, non 4.
- AC2: le garanzie esistenti del lavoro restano: unità già completate non si rieseguono, una
  pagina fallita lascia le altre conservate e riprovabili, un lavoro superato non scrive.
- AC3: il testo passato al modello e alle sezioni non contiene intestazioni/piè di pagina ripetuti
  fra le pagine; il testo originale di ogni pagina resta intatto e consultabile.
- AC4: lo schema richiesto al modello contiene solo campi usati dall'ingresso, con descrizioni; un
  risultato con quei campi compila nella bozza: nome, cognome, data e luogo di nascita, sesso, CF,
  telefono, email, indirizzo, comune, provincia, CAP, referente (nome, relazione, telefono),
  struttura inviante, provenienza, motivo d'ingresso, diagnosi, allergie, anamnesi, terapia.
- AC5: la scheda di revisione di una sola lettera mostra telefono, email e indirizzo estratti.
- AC6: i campi nuovi seguono le stesse regole di proprietà: scritti solo se vuoti e mai toccati,
  altrimenti proposti; nell'interfaccia portano il segno «AI» come gli altri.
- AC7: lo sforzo di ragionamento si imposta da variabile sul servizio AI; se non impostata la
  richiesta al modello è identica a oggi. Uno schema compatibile viene chiesto in modalità
  vincolata, con ricaduta automatica alla modalità attuale se il fornitore la rifiuta.
- AC8: suite backend, suite del servizio AI, suite frontend e `npm run build` passano.
- AC9 (dopo il rilascio, non parte di questo commit): nuova misura sulla demo con gli stessi
  documenti, tempi e campi compilati a confronto con `logs/baseline/`.

## Test Plan

| Test type                 | Required | Reason                                                       |
| ------------------------- | -------: | ------------------------------------------------------------ |
| Unit                      |      yes | filtro intestazioni, mappatura campi, unione nella bozza      |
| Integration               |      yes | lavoro a pagine con servizio AI locale (simulato e con ritardi) |
| API                       |      yes | risultato e bozza via API locale                             |
| Playwright                |      yes | importazione dall'interfaccia, campi compilati, segni «AI»    |
| Persistence after refresh |      yes | la bozza importata si riapre con gli stessi campi            |
| Agnos action registry     |       no |                                                              |
| Voice simulation          |       no |                                                              |
| OCR/import test           |      yes | lettera sintetica PDF e foto                                 |
| Security/privacy scan     |      yes | nessun testo clinico nei log; nessun segreto nel repository  |

## Evidence Plan

Required evidence:

- validation-report.md
- `logs/baseline/` misure prima (demo) e `logs/` misure dopo (locale; demo dopo il rilascio)
- `screenshots/` scheda di revisione e bozza compilata
- log delle suite e della build

## Risks

- I modelli veri (Foundry) non sono raggiungibili da questo ambiente: tempi e qualità reali si
  misurano solo dopo il rilascio sulla demo. In locale si verifica con un fornitore di prova che
  restituisce il testo OCR reale salvato e un'estrazione nota.
- Il lavoro a pagine ha recinti di concorrenza e impronte: il parallelismo va provato sui casi di
  ripresa ed errore.
- Cambiando schema e istruzioni, le unità già calcolate di sessioni aperte vengono ricalcolate.
- Lo sforzo di ragionamento e la modalità vincolata dipendono dal modello distribuito: per questo
  restano facoltativi e con ricaduta.

## Gate Status

READY FOR IMPLEMENTATION
