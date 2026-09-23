# PO15 — Contratto preparatorio backend/frontend

Preparazione soltanto sulla baseline f445260a4ca4de872c1361ff19fc215179b097fe. Nessuna API, migrazione o test applicativo PO15 eseguito prima del GO root dopo PO14 live verificata. Il task-contract root è autorevole; questa specifica fissa l'accordo DTO e la semantica NRS senza introdurre un nuovo modulo clinico.

## Lettore del catalogo

GET `/patients/:patientId/assessments/catalog`, autenticazione operatore e patientScope esistenti, nessun parametro query ammesso (extra: 400). Route statica prima di `/:id`. Cache-Control `private, no-store`, inclusi errori gestiti. Accesso negato usa la stessa risposta non enumerabile delle valutazioni esistenti.

Risposta stretta `{items:[...]}` con esattamente cinque righe nell'ordine `painad`, `postural_transfers`, `tinetti`, `mna`, `gds15`.

Ogni riga contiene soltanto:

- `type` e `formVersion` correnti implementati;
- `latestFinal`: null oppure `{id,formVersion,assessedAt,createdAt,finalizedAt}`;
- `ownDraftCount`: intero non negativo esatto, contato prima di qualsiasi limite;
- `latestOwnDraft`: null oppure `{id,formVersion,assessedAt,createdAt,updatedAt}`.

Le date sono stringhe ISO canoniche UTC. `latestOwnDraft === null` se e solo se `ownDraftCount === 0`. I contenitori distinguono finale e bozza; una bozza non è una valutazione completata. Il `formVersion` annidato proviene dalla riga persistita. Niente documentId, risposte, snapshot, hash, punteggi, autore, dati paziente, stato PDF o contenuto documento. Le tre schede legacy restano lette dalla Cartella già caricata.

Una transazione con timezone locale UTC e lockPatient/scope, poi una sola query SQL parametrizzata con proiezione esplicita dei metadati e risultato massimo cinque righe. Non usare currentAssessment, history, assessmentDto o ASSESSMENT_INCLUDE, che leggono dati clinici prima di scartarli. I conteggi non sono stime né conteggi dei record limitati.

Finale: `status=final`, nessuna figlia finale; ordine assessedAt/createdAt/id decrescente, come current. Una rettifica in bozza non nasconde il predecessore e una rettifica finalizzata tardivamente con data clinica precedente non prevale su un finale clinicamente più recente. Bozze: `status=draft` e authorOperatorId uguale all'operatore corrente, ordine updatedAt/createdAt/id decrescente; nessun dato su bozze altrui.

Frontend mostra subito nomi/azioni e distingue caricamento, errore con Riprova e assenza di compilazioni. Apri/Riprendi usa l'assessmentId e i flussi esistenti di dettaglio/storico/documenti. Nuova compilazione avvia solo la bozza locale; il catalogo non crea record. Le callback/refetch sono vincolate a paziente/sessione; stato locale delle bozze preservato al cambio modulo/paziente. Root verifica browser/HTTP e numero richieste.

## Protezione NRS precedente

Il ramo protetto è soltanto Cartella.valutazioniNRS. PUT Cartella e conferma importazione leggono paziente/cartella sotto i lock già esistenti, quindi verificano presenza della proprietà e uguaglianza JSON profonda (ordine degli array significativo, ordine delle chiavi oggetto irrilevante).

- Omissione: conserva esattamente presenza e valore corrente.
- Ramo presente e uguale al corrente: consente modifiche agli altri campi.
- Ramo differente, compresa introduzione quando assente: 409 `nrs_legacy_read_only`; nessun salvataggio parziale.

Assente, null e [] sono distinti anche nell'importazione NRS. Il messaggio spiega che lo storico NRS precedente è di sola lettura e richiede ricaricamento; nessun conflitto viene convertito in successo. La protezione Tinetti rimane attiva e conserva la propria eccezione già pubblicata per l'importazione di [] quando il ramo Tinetti è assente; questa eccezione non viene estesa a NRS.

Nella conferma importazione, validare entrambi i rami prima del merge e rimuovere Tinetti/NRS dall'incoming validato. Il merge parte dal current sotto lock, preservando i due storici senza concatenazioni, deduplicazioni o sostituzioni. Un rifiuto fa rollback anche di eventuale nuovo paziente e degli altri effetti della transazione.

Frontend: nessun editor di nuove schede NRS nel modulo o nell'ingresso; storico, dettaglio e stampa restano accessibili. I vecchi data.dolore delle bozze ingresso sono consultabili in sola lettura e conservati nel draft. buildConfirmCartella smette di convertirli in valutazioniNRS e non muta l'input; la conferma backend mantiene già il draftData aggiungendo solo _confirmation. Non cancellare bozze storiche, migrare il dato in PAINAD o inventare firma/data. I punteggi storici ricevono fascia solo se interi 0..10; zero valido, valori mancanti/invalidi senza fascia.

Parametri vitali NRS/dolore, data.parametri, altre registrazioni e relativi permessi sono fuori da questa protezione e mantengono il flusso attuale.

## Consultazione dei dati dolore dagli ingressi confermati

Decisione finale root dopo verifica PO14 live: estendere GET `/patients/:id/intake-review`, senza aggiungere dati clinici al catalogo. Conservare i campi esistenti draftId, deferredTherapies e sourceDocumentIds. Nuova coppia discriminata sempre presente sul server aggiornato:

- Successo: `legacyPainDrafts: [{draftId,confirmedAt,pain}, ...]` e `legacyPainError: null`.
- Fuori budget: `legacyPainDrafts: null` e `legacyPainError: 'intake_review_legacy_pain_too_large'`.

Entrambi i casi restituiscono HTTP 200 e preservano le terapie. Errori DB/autenticazione/scope restano risposte non 200. Non esistono legacyPainDraftsError o status413 nel body e non viene usato 413 globale per il solo budget NRS. Nessuna lista parziale o vuota viene restituita come se i dati mancassero.

`draftId` identifica il draft confermato; `confirmedAt` è ISO UTC oppure null e non è una data clinica inventata; `pain` è il valore JSON originale di data.dolore, anche null, false, zero, oggetto, array o sentinella. Includere soltanto draft con status confirmed, confirmedPatientId uguale al paziente autorizzato e proprietà dolore presente. Ordinare confirmedAt decrescente con null per ultimi e id decrescente. Draft non confermati, altri pazienti e rami estranei non sono visibili.

Leggere sotto patientScope/lock e usare private/no-store. Prima di proiettare pain, query SQL di soli aggregati verifica massimo 100 draft con dolore e massimo 2 MiB (2097152 byte) complessivi come somma di octet_length((data->'dolore')::text) UTF-8; i valori sulla soglia sono ammessi. Non esiste validazione storica specifica PainAssessmentData: resta JSON, senza coercizioni o normalizzazioni. Il limite HTTP generale attuale è 512kb, non un limite aggregato dello storico.

Il reader delle terapie proietta data senza la chiave dolore, così il precheck è effettivo anche quando pain eccede il budget. La stessa transazione/lock impedisce che una conferma concorrente cambi il set tra budget e lettura. Il superamento non altera il DB e non rende indisponibili deferredTherapies o lo storico NRS della Cartella.

Frontend: soltanto se entrambi i campi sono assenti, trattarli come server precedente e usare lista vuota senza errore. Altrimenti validare la coppia esatta; proprietà parziali, coppie incoerenti o codici sconosciuti sono DTO invalidi. Nello Storico NRS mantenere la sezione «Dati dolore dall’ingresso · non confermati come valutazione», con valori originali, nessuna fascia per valori invalidi e nessuna conversione in Cartella/PAINAD. L'overflow presenta errore esplicito e Riprova solo in quella sezione; non significa assenza di dati.

## Verifiche previste dopo GO

Catalogo: cinque righe vuote, bozza propria/altrui, conteggio oltre il limite della lista storica, ordinamento con pareggi e catene di rettifiche, query extra/scope, proiezione senza JSON/PDF, una sola query di metadati oltre lock/scope, volumi sintetici realistici. Confronto prestazionale legato a sorgente e ambiente solo dopo implementazione.

NRS: omissione/uguaglianza/cambiamento, presenza distinta assente/null/[], array con chiavi oggetto riordinate, lock concorrente e scope, PUT/import e rollback, preservazione simultanea Tinetti, vitali separati funzionanti e draft ingresso storico invariato. Regressioni del ciclo di vita e dei PDF già pubblicati. Root gestisce HTTP/browser, integrazione e deploy backend prima frontend.
