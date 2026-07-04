# Feature Specification: Agnos AI unificato (CRU, no Delete) + UX/Performance

**Feature Branch**: `015-agnos-unified-cru`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "Unificare chatbot testuale e voce in un unico orchestratore Agnos AI capace di comandare l'app con azioni Create/Read/Update — mai Delete (delete solo via pulsante UI). Chatbot testuale acquisisce le write-action già disponibili via voce più Create/Update appuntamenti agenda. Planner deterministico (no LLM esterno). Conferma esplicita, preview, idempotenza, allowlist deny-by-default, audit log persistente, permessi server-side, stessi service della UI. Voce nel chatbot: mic esplicito, trascrizione modificabile, TTS it-IT interrompibile. UX: feedback coerenti loading/successo/errore, mobile. Performance: eliminare chiamate API duplicate, memoizzazione, scomposizione PatientDetail. Validazione Playwright end-to-end con evidenze."

## Contesto

ClinicOS dispone già di due assistenti separati: un assistente testuale di sola lettura (pannello "Agnos" — ricerca e interrogazione dati clinici) e un assistente vocale separato che esegue 4 azioni di scrittura confermate (parametri vitali, anagrafica whitelisted, sezioni narrative append-only, note diario). L'operatore deve imparare due interfacce diverse; il chatbot testuale non può scrivere nulla; la voce non risponde a voce; l'audit è volatile (solo stdout) e le azioni lettura non sono soggette ad allowlist configurabile.

Obiettivo: un unico assistente Agnos AI (testo + voce) che comanda l'applicazione con azioni Create/Read/Update, con divieto strutturale di Delete, sicurezza server-side e piena tracciabilità — più un pacchetto di miglioramenti UX e performance misurabili.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CRU via chatbot testuale unificato (Priority: P1)

L'operatore apre il pannello Agnos, digita un comando in linguaggio naturale italiano ("registra pressione 130/80 alle 9 per Elena Moretti", "aggiungi nota al diario: paziente tranquillo", "mostrami le allergie") e ottiene: per le letture una risposta immediata con fonti; per le scritture una preview leggibile del cambiamento con richiesta di conferma esplicita. Alla conferma, il dato è salvato e la UI tradizionale si aggiorna subito.

**Why this priority**: È il cuore della richiesta — oggi il chatbot testuale è di sola lettura; le scritture esistono solo nel percorso vocale separato. Unificare porta immediatamente valore d'uso quotidiano.

**Independent Test**: Con app avviata, digitare nel pannello Agnos un comando di creazione parametro vitale e uno di nota diario; verificare preview, conferma, salvataggio, aggiornamento immediato della cartella e persistenza dopo refresh.

**Acceptance Scenarios**:

1. **Given** operatore autenticato con paziente corrente selezionato, **When** digita "registra temperatura 37,2 alle 14", **Then** appare preview con paziente, parametro, valore, orario e pulsante "Conferma e salva" attivo; alla conferma il parametro compare nella cartella senza ricaricare la pagina.
2. **Given** comando ambiguo (nessun paziente identificato o orario mancante), **When** l'operatore verifica il comando, **Then** la preview mostra l'ambiguità bloccante e la conferma è disabilitata.
3. **Given** comando di lettura ("mostra parametri di oggi"), **When** inviato, **Then** risposta testuale con risultati e fonti, senza alcuna richiesta di conferma.
4. **Given** scrittura confermata, **When** l'operatore ripete la conferma (doppio click / retry), **Then** non viene creato alcun duplicato.

---

### User Story 2 - Divieto strutturale di Delete via AI (Priority: P1)

Qualunque tentativo di cancellazione attraverso Agnos AI — testo, voce, prompt diretto o indiretto ("elimina la nota", "cancella il parametro", "rimuovi il paziente") — viene rifiutato con messaggio chiaro che indirizza l'operatore alla funzione della UI tradizionale. Nessun tool, endpoint o azione di delete è raggiungibile dall'assistente. La cancellazione resta possibile solo premendo il comando dedicato nell'interfaccia grafica, dove prevista.

**Why this priority**: Requisito di sicurezza non negoziabile del committente; deve essere dimostrabile con evidenze.

**Independent Test**: Inviare via chat e via voce comandi di cancellazione in varianti lessicali (elimina, cancella, rimuovi, togli, svuota); verificare rifiuto sistematico, audit dell'evento e assenza di variazioni nei dati. Verificare che la cancellazione via pulsante UI continui a funzionare.

**Acceptance Scenarios**:

1. **Given** chat Agnos aperta, **When** l'operatore scrive "cancella l'ultima nota del diario", **Then** Agnos rifiuta spiegando che la cancellazione è possibile solo dalla UI, nessun dato cambia, l'evento è tracciato in audit.
2. **Given** comando vocale "elimina il parametro delle 9", **When** trascritto ed eseguito, **Then** stesso rifiuto del canale testuale.
3. **Given** ispezione delle azioni disponibili all'assistente (allowlist), **When** verificata, **Then** nessuna azione di tipo Delete esiste nel catalogo.

---

### User Story 3 - Voce integrata nel chatbot con risposta vocale (Priority: P2)

Dal pannello Agnos l'operatore attiva esplicitamente il microfono, parla, vede la trascrizione comparire e può correggerla prima dell'invio. Il comando segue lo stesso identico percorso del testo (stesse preview, stesse conferme). La risposta arriva in forma testuale e, se il toggle voce è attivo, viene letta ad alta voce in italiano; l'operatore può interrompere sia l'ascolto sia la riproduzione in qualsiasi momento.

**Why this priority**: Consolida i due assistenti in un'unica esperienza; il valore dipende dall'esistenza dello US1.

**Independent Test**: Attivare mic, dettare comando di scrittura, correggere la trascrizione, confermare dalla stessa preview del canale testo; verificare risposta testuale + lettura vocale interrompibile.

**Acceptance Scenarios**:

1. **Given** pannello Agnos, **When** l'operatore preme il pulsante microfono, **Then** l'ascolto parte solo dopo il gesto esplicito e lo stato di registrazione è visibile.
2. **Given** trascrizione errata, **When** l'operatore la modifica nel campo di testo, **Then** il comando eseguito è quello corretto.
3. **Given** toggle TTS attivo, **When** Agnos risponde, **Then** la risposta viene letta in italiano e un controllo consente di fermarla immediatamente.
4. **Given** permesso microfono negato, **When** l'operatore tenta la dettatura, **Then** messaggio chiaro e possibilità di digitare il comando.

---

### User Story 4 - Appuntamenti agenda via Agnos (Priority: P2)

L'operatore crea o sposta un appuntamento in agenda tramite Agnos ("crea appuntamento fisioterapia domani alle 10:30 per Rossi", "sposta l'appuntamento delle 15 alle 16"), con preview e conferma; l'agenda a slot da 30 minuti riflette subito la modifica. Terapie e allergie restano esplicitamente vietate all'AI.

**Why this priority**: Prima estensione del catalogo CRU oltre le 4 azioni esistenti; dimostra il pattern di estensione.

**Independent Test**: Creare e aggiornare un appuntamento via chat; verificare comparsa nello slot corretto dell'agenda e persistenza dopo refresh.

**Acceptance Scenarios**:

1. **Given** agenda visibile, **When** l'operatore conferma la creazione appuntamento via Agnos, **Then** lo slot corretto si popola senza ricaricare.
2. **Given** slot già occupato, **When** Agnos prepara la preview, **Then** il conflitto è segnalato prima della conferma.
3. **Given** comando "modifica la terapia di Rossi", **When** inviato, **Then** rifiuto (entità vietata all'AI).

---

### User Story 5 - Feedback coerenti e reattività (Priority: P3)

Ogni azione dell'app (tradizionale o via Agnos) dà riscontro visivo coerente: stato di caricamento sui salvataggi con pulsanti disabilitati, conferma di successo, messaggio d'errore visibile (nessun fallimento silenzioso). Le viste pesanti (lista pazienti, dettaglio paziente) diventano più reattive e le chiamate di rete duplicate vengono eliminate.

**Why this priority**: Migliora tutta l'app ma non blocca l'obiettivo Agnos; benefici misurabili prima/dopo.

**Independent Test**: Misurare numero richieste di rete su apertura agenda e dettaglio paziente prima/dopo; verificare che ogni flusso di salvataggio mostri loading/successo/errore e che i pulsanti non consentano doppio invio.

**Acceptance Scenarios**:

1. **Given** creazione nuovo paziente, **When** l'operatore preme Salva, **Then** il pulsante si disabilita con indicatore di attesa e al termine appare esito (successo o errore) — mai silenzio.
2. **Given** apertura vista agenda/terapie, **When** misurate le richieste di rete, **Then** nessun endpoint è chiamato due volte con gli stessi parametri nello stesso flusso.
3. **Given** errore di rete su un salvataggio, **When** la richiesta fallisce, **Then** l'operatore vede un messaggio d'errore esplicito e i dati non risultano falsamente salvati.

---

### Edge Cases

- Comando misto lettura+scrittura ("mostrami i parametri e registra la pressione"): il sistema tratta un'azione per volta e chiede di separare i comandi.
- Trascrizione vocale che contiene un verbo vietato per errore di dettatura: la correzione manuale della trascrizione prima della verifica evita il rifiuto.
- Doppia conferma per retry di rete: nessun duplicato (idempotenza).
- Operatore senza permessi sul paziente indicato: rifiuto server-side con messaggio, anche se il client fosse manomesso.
- Preview generata e confermata dopo che un altro operatore ha modificato lo stesso dato: la scrittura è append/aggiunta o aggiornamento dichiarato in preview; nessuna sovrascrittura silenziosa.
- TTS attivo su dispositivo senza voci italiane disponibili: la risposta resta testuale, nessun errore bloccante.
- Backend riavviato tra preview e conferma: la conferma fallisce in modo pulito con invito a ripetere la verifica (nessuna scrittura parziale).

## Requirements *(mandatory)*

### Functional Requirements

**Orchestratore unificato (CRU)**

- **FR-001**: Il sistema MUST offrire un unico punto di interazione Agnos (pannello) che accetta comandi sia digitati sia dettati e li elabora attraverso lo stesso percorso di pianificazione/esecuzione.
- **FR-002**: Il chatbot testuale MUST poter eseguire tutte le azioni di scrittura oggi disponibili via voce: creazione parametro vitale, aggiornamento anagrafica (campi whitelisted), aggiornamento sezione narrativa (append-only), aggiunta nota diario.
- **FR-003**: Il sistema MUST supportare creazione e aggiornamento di appuntamenti agenda via Agnos, con rilevazione conflitti di slot in preview.
- **FR-004**: L'interpretazione dei comandi MUST essere deterministica (nessun invio di dati clinici a servizi LLM esterni).
- **FR-005**: Ogni azione Create/Update MUST mostrare una preview comprensibile (paziente, campi, valori, avvisi) e richiedere conferma esplicita prima dell'esecuzione; i comandi ambigui MUST bloccare la conferma.
- **FR-006**: Le esecuzioni MUST essere idempotenti rispetto a retry/doppia conferma.
- **FR-007**: Le azioni AI MUST riusare gli stessi servizi applicativi della UI tradizionale (nessuna logica di business duplicata per il percorso AI).

**Divieto Delete**

- **FR-008**: Nessuna azione di tipo Delete MUST esistere nel catalogo azioni dell'assistente; i comandi di cancellazione (in ogni variante lessicale ragionevole) MUST essere rifiutati a livello di pianificazione E di esecuzione E di API.
- **FR-009**: Il rifiuto di cancellazione MUST spiegare che l'operazione è disponibile solo tramite il comando esplicito nell'interfaccia grafica.
- **FR-010**: La cancellazione tramite UI tradizionale, dove già prevista, MUST restare invariata e funzionante.

**Sicurezza e tracciabilità**

- **FR-011**: Ogni azione AI MUST essere validata lato server rispetto all'identità e ai permessi dell'operatore autenticato; le richieste manomesse lato client MUST essere rifiutate.
- **FR-012**: Le azioni disponibili all'assistente MUST essere governate da una allowlist esplicita deny-by-default: un'azione non elencata non è eseguibile, e le nuove azioni non si abilitano da sole.
- **FR-013**: Ogni azione AI (lettura e scrittura, inclusi rifiuti) MUST essere registrata in un audit log persistente e consultabile, senza contenuti clinici sensibili (nomi campo sì, valori no), con operatore, paziente, esito e timestamp.
- **FR-014**: Le scritture significative MUST richiedere conferma; la soglia di "significativo" copre tutte le Create/Update di questa release.

**Voce**

- **FR-015**: L'ascolto MUST attivarsi solo con gesto esplicito dell'operatore; lo stato di registrazione MUST essere visibile; l'audio non lascia il dispositivo.
- **FR-016**: La trascrizione MUST essere visibile e modificabile prima dell'invio.
- **FR-017**: La risposta MUST essere sempre testuale; con toggle voce attivo MUST anche essere letta ad alta voce in italiano; ascolto e riproduzione MUST essere interrompibili in qualsiasi momento.

**UX e performance**

- **FR-018**: Ogni operazione di salvataggio MUST mostrare stato di attesa (pulsante disabilitato), esito di successo o errore visibile; nessun errore MUST essere assorbito silenziosamente.
- **FR-019**: I flussi principali MUST eliminare le richieste di rete duplicate (stesso endpoint, stessi parametri, stesso flusso) e le viste elenco pesanti MUST evitare ri-renderizzazioni non necessarie.
- **FR-020**: Le modifiche effettuate via Agnos MUST riflettersi nella UI tradizionale immediatamente e sopravvivere al refresh della pagina.

### Key Entities

- **Comando Agnos**: richiesta dell'operatore (testo o trascrizione vocale) + contesto (operatore, paziente corrente); produce un Piano d'azione.
- **Piano d'azione**: interpretazione tipizzata del comando: tipo azione (read / create / update / rifiuto), campi, ambiguità, necessità di conferma.
- **Preview**: rappresentazione leggibile del piano prima dell'esecuzione (titolo, paziente, righe campo→valore, avvisi non bloccanti, ambiguità bloccanti).
- **Allowlist azioni**: catalogo esplicito delle azioni eseguibili dall'assistente, con tipo CRUD dichiarato; deny-by-default; nessuna voce Delete.
- **Voce di audit**: registrazione persistente di ogni azione AI: operatore, paziente, tipo azione, nomi campo, canale (testo/voce), esito (ok/rifiutata/errore/dedupe), timestamp.
- **Appuntamento agenda**: slot da 30 minuti con paziente, operatore, tipologia; creabile/aggiornabile via Agnos, cancellabile solo via UI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: L'operatore completa una registrazione parametro vitale via chatbot testuale (comando → preview → conferma → dato visibile in cartella) in meno di 30 secondi.
- **SC-002**: 100% dei tentativi di cancellazione via chat e via voce (suite di varianti lessicali di test) vengono rifiutati; 0 azioni Delete presenti nel catalogo azioni; evidenza registrata in audit.
- **SC-003**: Ogni azione AI eseguita risulta nell'audit log persistente e l'audit sopravvive al riavvio del sistema (0 eventi persi nella suite di test).
- **SC-004**: Le modifiche via Agnos compaiono nella UI senza ricaricare la pagina e persistono dopo refresh nel 100% dei casi di test.
- **SC-005**: Le richieste di rete duplicate nei flussi agenda e dettaglio paziente sono azzerate (misura prima/dopo documentata); il numero di richieste su apertura agenda cala di almeno il 30%.
- **SC-006**: 100% dei flussi di salvataggio principali mostra stato attesa/successo/errore (audit UX su suite Playwright); 0 catch silenziosi nei percorsi toccati.
- **SC-007**: Suite Playwright completa (flussi tradizionali, CRU via chat, CRU via voce simulata, no-delete, sync, persistenza) passa al 100% con screenshot, trace e report archiviati.
- **SC-008**: La dettatura vocale usa lo stesso percorso di conferma del testo: 0 differenze di comportamento tra canale testo e voce negli scenari di test comuni.

## Assumptions

- Piattaforma di riferimento: Chrome/Edge desktop e tablet (Web Speech API per dettatura e sintesi vocale disponibile; su browser privi di supporto la funzionalità degrada a solo testo senza errori).
- L'identità operatore continua a basarsi sul meccanismo attuale dell'app (selezione ruolo + header operatore); l'irrobustimento con autenticazione a token è fuori scope.
- Terapie e allergie restano vietate a qualsiasi scrittura AI in questa release (decisione committente).
- La cancellazione via UI esiste già dove prevista dall'app; questa release non aggiunge nuove funzioni di cancellazione.
- L'audit persistente è richiesto come registro consultabile e durevole; la conservazione a lungo termine (retention policy) segue le pratiche correnti del progetto.
- Il pilota copre parametri vitali + note diario via chatbot testuale; le restanti azioni seguono lo stesso pattern nella stessa release.
- Lingua dell'interfaccia e dei comandi: italiano.
