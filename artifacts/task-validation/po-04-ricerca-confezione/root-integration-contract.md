# PO-04 — Contratto di integrazione

Baseline applicativa: 553fa24bcbcfbf20def0dfa96de06cd52684c9bd. Autorizzazione: piano completo, push e deploy esplicitamente approvati dall'utente. Decisione locale ALLOW per implementazione circoscritta e collaudo sintetico; pubblicazione subordinata alle prove. Il tool Ruflo policy_evaluate non ha accettato lo schema della richiesta dei worker: non si dichiara un'autorizzazione ottenuta dal tool né si attribuisce un rifiuto che non ha emesso.

Unico writer per checkout: root integra e prepara fixture/prove in subtle-dashboard-notifications; worker backend in po04-drug-search, worker frontend in po04-drug-selection. Nessun test modifica il catalogo o pazienti del sito. Database PGlite loopback selezionato prima dell'importazione di Prisma.

Accettazione: ricerca nome/dose/forma prima del limite; Tachipirina 1000 compresse con PA senza quantità; distinzione da 500 mg, supposte ed effervescenti; query attaccata, typo e principio attivo; paginazione stabile e recuperabile. Confezione/AIC conservati dopo selezione, POST/GET/PUT terapia e conferma importata; cambio libero elimina riferimento precedente; dose e orari non cambiano automaticamente.

Prove: fixture database e router reali, mapper frontend reali, snapshot intake e replay; component test worker, tipi e build; browser sintetico desktop/mobile per ricerca, selezione, persistenza e fallimento del servizio. Nessuna dichiarazione di convalida clinica del catalogo. Nessuna migrazione o modifica alla normalizzazione usata nell'import.
