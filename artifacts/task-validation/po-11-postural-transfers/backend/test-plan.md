# PO11 — Piano verifiche dopo GO

Piano preparatorio: nessun test applicativo nuovo scritto o eseguito. Test sintetici, PostgreSQL nativo loopback e timezone Europe/Rome; nessun dato paziente live. Il runner legherà input prima/dopo, migrazioni e risultati agli hash esatti. Non ripetere suite verdi senza modifiche o problemi nuovi.

## 1. Input e completezza

- Ogni enum documentato accettato; null distinto da false/none, nessuna risposta iniziale preselezionata.
- Tre trasferimenti indipendenti;8 modalità letto↔carrozzina e6 WC; WC con sollevatore rifiutato.
- Tutti i12 ausili verificati; proprietà per i9 OwnedAid solo se presenti. Rifiutare proprietà nei3 PlainAid e in ausilio assente. Nessuna inferenza da modalità trasferimento.
- Applicabilità carico null/incompleta; true richiede lato/livello nel finale, false impone entrambi null. Bozze coerenti ma incomplete salvabili.
- Contesto noto/indisponibile, diagnosi fornita/indisponibile motivata; rifiuto date calendario invalide, enum/coercizioni/campi sconosciuti e combinazioni contraddittorie.
- Limite corpo32KiB, diagnosi/motivo1000 caratteri, note4000; Unicode ai confini e a capo preservati. `result` resta null anche con scheda completa.
- Percorsi missingPaths stabili per focus UI; nessuna modifica al contratto errori/risultati PAINAD.

## 2. Ciclo persistente e compatibilità

- Creazione concorrente idempotente, intento iniziale immutabile dopo PATCH, replay da processo riavviato.
- CAS concorrente con un solo vincitore; finalizzazione incompleta422, completa sullo stesso id; replay finalizzazione.
- Bozza privata anche rispetto a manager; scope revocato blocca read/write/replay.
- Rettifica stesso paziente/tipo e motivo obbligatorio; cross-type rifiutata, unico successore finale concorrente.
- UPDATE/DELETE SQL di finale respinti; Cartella/degenza/prescrizioni non cambiano. PAINAD e snapshot/hash/documenti precedenti invariati.

## 3. Current e storico

- Vuoto → current null; corrente solo finale, bozza propria/altrui mai sostituisce il finale.
- Catena di almeno3 finali, solo foglia effettiva candidata; bozza successore ignorata.
- Vecchia valutazione rettificata dopo una nuova resta precedente per data clinica. Date uguali: tie-break stabile. Nessun ordinamento primario per finalizedAt.
- Storico multipagina di entrambi i tipi; filtro tipo/privacy/scope prima di limit+1, nessuno snapshot o risposta completa nei metadati.
- Binding cursore rifiuta paziente/tipo/attore/filtri differenti, cambio scope e anchor non disponibile.

## 4. Attestazioni personali

- New201/replay200 con stesso evento; richieste concorrenti producono una sola riga per assessment/kind/actor.
- Autore/nome/qualifica/tempo dal DB/server; rifiuto input falsificato e hash mismatch409; bozza/fuori scope non attestabile.
- Qualifica ` fisioterapista ` e maiuscole ammesse dopo sola normalizzazione prevista. Qualifiche diverse, ruolo manager o reparto fisioterapia non bastano.
- Revoca qualifica fra lettura capability e POST impedisce nuova attestazione; test con lock reale riga operatore per il controllo al momento della decisione. Cambio ownership paziente equivalente.
- Evento append-only SQL; hash deve essere quello del finale. Rettifica genera nuova versione senza ereditare firme; lettura precedente indica correctedById.
- Nessun quorum richiesto. Conferme non cambiano assessment version, snapshot/hash o bytes/hash PDF.
- Counts/me e pagine si riferiscono allo stesso finale/hash; pagina bounded25/max100; nessun elenco non limitato.

## 5. PDF, documenti e HTTP

- PDF da snapshot Transfers completo: tutti5 gruppi,12 ausili/proprietà, date, firma fisioterapista/operatori, assenza punteggio.
- Testo Unicode lungo e note a capo; render A4 e ispezione di ogni pagina, intestazioni ripetute, nessun taglio/sovrapposizione. Regressione PDF PAINAD.
- Errori renderer/retry/lease/token dopo lock restano protetti; un solo documento archiviato immutabile.
- Metadata/detail/bytes/list/count/sourceMatch/AI applicano scope dei PDF generati per entrambi i tipi; documenti legacy preservati.
- HTTP current prima della route /:id, discriminator/deep-link coerenti, codici400/404/409/422 e content disposition verificati.

## 6. Evidenze finali

Suite mirata nuova + regressioni PO10 necessarie;44 migrazioni baseline più migrazione PO11 su cluster nuovo; chiusura DB in finally. Typecheck con client Prisma privato aggiornato soltanto dopo GO; validazione schema, diff, limiti file<500linee, manifest/hash e preservation dei file protetti. Root svolge build/secret scan/browser integrati e pubblicazione; il worker non dichiara quei risultati come propri.
