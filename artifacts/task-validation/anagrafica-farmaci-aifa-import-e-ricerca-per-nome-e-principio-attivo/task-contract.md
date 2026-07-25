# Task Contract

## Task
- Title: Anagrafica farmaci AIFA: import e ricerca per nome e principio attivo
- Slug: anagrafica-farmaci-aifa-import-e-ricerca-per-nome-e-principio-attivo
- Type: change
- Date: 2026-07-25

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | yes |
| Database/Persistence | yes |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Quando un farmaco viene menzionato — importato da una lettera o scritto a mano — l'app lo
accetta come testo libero. Nessuno si accorge se il nome e' storpiato dall'OCR, se il dosaggio
non corrisponde a nessuna confezione in commercio, o se il farmaco e' stato revocato. Sul
referto reale dell'operatore l'estrazione ha prodotto 29 farmaci con il nome corretto ma dose
valorizzata solo in 20 e frequenza in 14: l'operatore deve completare a mano senza alcun aiuto.

## Expected Behaviour

Esiste una copia locale della Banca Dati Farmaci AIFA, ricaricabile, su cui l'app puo':
cercare un farmaco per nome commerciale **anche se scritto male**, cercarlo per principio
attivo, elencare i dosaggi realmente in commercio, e dire se il dosaggio citato corrisponde a
una confezione esistente. Ogni farmaco porta con se' ATC, forma, stato amministrativo, regime
di fornitura e i link ai documenti ufficiali (foglietto illustrativo e scheda tecnica).

Questa e' la PRIMA parte: dati e ricerca. L'aggancio ai due punti dell'app (pipeline di import
ed editor terapia) e la resa in interfaccia sono attivita' successive.

## Acceptance Criteria

- AC1: l'import carica l'anagrafica completa dai CSV AIFA senza tenerli in memoria (il file
  principale pesa 82 MB) e senza lasciare la tabella a meta' se fallisce.
- AC2: la ricerca trova il farmaco con nome esatto, con nome + dosaggio attaccato, e con nome
  **storpiato** (errore di OCR o di battitura).
- AC3: la ricerca per principio attivo funziona, e i dosaggi in commercio sono elencabili.
- AC4: un dosaggio inesistente in commercio viene riconosciuto come non plausibile — e'
  il segnale di un errore di lettura, e va restituito come informazione, mai come blocco.
- AC5: suite backend verde e `tsc --noEmit` pulito.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | normalizzazione, parsing CSV, mappatura dei campi, distanza |
| Integration | yes | import reale dai CSV AIFA nel database locale + ricerche sui casi veri |
| API | no | nessuna rotta esposta in questa fase |
| Playwright | no | nessuna interfaccia in questa fase |
| Persistence after refresh | no | anagrafica di sola consultazione |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | il pipeline di import non e' toccato |
| Security/privacy scan | no | anagrafica pubblica, nessun dato di paziente |

## Evidence Plan

Required evidence:

- validation-report.md
- output della suite backend
- esito dell'import reale (righe caricate, durata)
- esito delle ricerche sui casi reali, incluso almeno un nome storpiato

## Risks

- La sostituzione completa dell'anagrafica avviene in transazione: protegge dal caricamento a
  meta', ma tiene i lock per la durata dell'import. Accettabile su una tabella di sola
  consultazione ricaricata di rado.
- Il confronto approssimato gira su un indice in memoria dei soli nomi distinti (~10.500). Se
  l'anagrafica venisse ricaricata senza invalidare l'indice, la ricerca proporrebbe voci non
  piu' esistenti: per questo lo script di import lo invalida esplicitamente.
- La soglia del confronto approssimato e' un compromesso: troppo larga propone farmaci
  sbagliati, troppo stretta non recupera i refusi. Va tarata sui casi reali.

## Gate Status

READY FOR IMPLEMENTATION
