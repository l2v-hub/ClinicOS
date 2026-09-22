# Note tecniche per l'esecuzione del piano

Analisi indipendenti preparatorie; non indicano attività implementate. Stato delle consegne nel registro di esecuzione.

## PO-04 — Ricerca e confezione

Baseline applicativa b405c8ff. Lettura del catalogo demo 23 settembre: query `Tachipirina 1000 compresse`, limite 25, restituisce sciroppi/500 mg/supposte prima delle confezioni corrette AIC 012745170 e 012745182, posizioni 13 e 14. Query attaccata `Tachipirina1000 compresse`, limite 12, restituisce zero. Tutti i risultati osservati hanno quantità/unità del principio attivo nulle: il dosaggio è nella descrizione ufficiale. Un filtro basato esclusivamente su FarmacoPrincipioAttivo non risolve il caso reale.

Non modificare nucleoNome senza migrazione: alimenta denominazioneNorm durante l'import. Parser della sola query per nome/dose/forma; conservare nomi con cifre, preferendo il match del brand completo prima di dividere un suffisso numerico. Filtri e ranking delle confezioni precedono il limite; spareggio stabile per AIC e continuazione bounded. Fallback sul dosaggio della descrizione con unità/confini espliciti, senza equivalenze ambigue o semplice ricerca per sottostringa numerica. Tenere distinta la compressa ordinaria da effervescente/rilascio modificato.

drugPackageRef esiste già in schema, create, GET e whitelist PUT, ma CampoFarmaco scarta AIC/descrizione/dosaggio. Collegare selezione, form, edit e mapper intake; cambio a nome libero rimuove il riferimento precedente. Nessun cambiamento automatico a quantità/orari prescritti. Test con oltre 12 confezioni e PA senza quantità, B12/covid19, query attaccata, typo, principio attivo, pagine senza duplicati, AIC dopo reload/edit/intake. Cache nomi oggi globale: non mescolare client reali e fixture.

## PO-05 — Pagine e lettere persistenti

Audit preparatorio del parser/runtime/UI: scanner PDF singola pagina, logicalDoc/sortOrder, SHA e archivio transazionale esistono. Manca la semantica gruppi nel runtime: oggi tutta la sessione diventa un unico DocResult. Riutilizzare mergeExtractions con un risultato per lettera e conservare conflitti/candidati/condizioni; nessuna scelta implicita della lettera più recente e nessuna nuova UX di fonte unica.

Manifest versionato con gruppi e pagine stabili riferite a documento originale e indice pagina; conteggio PDF effettivo, caricamenti piccoli e incrementali, ripresa tramite ID sessione per operatore senza bytes clinici nel local storage. Chiusura non distruttiva, eliminazione esplicita. Sostituzione atomica a capienza raggiunta e upload idempotenti; serializzare contatori/order/SHA sul job. Mostrare limiti pagine/file/MB prima del blocco.

Checkpoint OCR per pagina ed estrazione per gruppo, hash degli input; caricamento bytes DB verificati con SHA anche senza disco effimero; CAS di revisione/token e lease sui worker per evitare risultati di esecuzioni superate e recuperare soltanto lease scadute. GET metadata non deve rileggere tutti i base64. Runtime create/run idempotenti entro la sua vita; nessuna promessa exactly-once del provider dopo riavvio completo.

PDF composto per gruppo nell'archivio corrente con riferimenti agli originali immutati; riusare direttamente un PDF originale quando già coincide col gruppo. Generazione prima della transazione, salvataggio e associazione alla conferma atomici. Dipendenza PDF da aggiungere solo dall'integratore; non estendere il generatore manuale per singola scansione a PDF arbitrari.

Collaudo sintetico: 30 pagine e tre lettere da 10; marcatori iniziali/centrali/finali e ordine PDF; errore pagina 17, response loss, restart backend/runtime, sorgenti solo DB, riordino durante elaborazione, retake alla pagina 30, due worker concorrenti, seconda conferma senza duplicati e conflitti clinici preservati. I test con fotocamera sintetica e PGlite non dimostrano comportamento fisico Safari/iOS/Android o isolamento completo PostgreSQL.

## PO-10 — Infrastruttura moduli e PAINAD

Le scale legacy sono array del JSON Cartella, sostituito dal PUT completo: inadatto a finali immutabili e concorrenza fra operatori. Record dedicato PatientAssessment giustificato, senza conversione dei dati storici; modello/versione, risposte, data valutazione e registrazione distinte, autore autenticato, stato bozza/finale, versione di modifica, rettifica collegata e snapshot identità. Bozze aggiornabili dal proprietario; finali rettificati tramite nuovo record.

Riutilizzare il contratto idempotente dei parametri vitali. Finalizzazione persistente distinta dallo stato PDF pending/ready/failed; retry del documento sulla stessa valutazione, transazione per collegamento univoco. PatientDocument conserva già bytes/SHA e anteprima/stampa multipla; PrintButton è solo window.print, manca un renderer PDF persistente. Non replicare upload non idempotente o senza autore. Verificare scope documento senza ampliare i permessi.

UI PAINAD: cinque item con descrizioni complete, risposte mai preselezionate, zero distinto da assente, avanzamento, bozza, riepilogo, storico e PDF finalizzato dallo snapshot. 243 combinazioni, soglie, incompletezza, conflitto, retry, impossibilità di cancellazione tramite PUT Cartella legacy, errore PDF e recupero. Nuovi moduli nella navigazione esistente, nessuna rimozione anticipata di NRS.

## PO-12/13 — Limiti delle fonti

Tinetti: quattro voci DX/SX per lunghezza/altezza sono corroborate dalle fonti universitarie e già presenti; preservare struttura e soglie esistenti. Correggere sentinelle -1 e rischio su parziali. Non qualificare questo come convalida clinica di un nuovo modello.

MNA: versione inglese ufficiale amended 2023 riporta CB <21=0, 21–22 inclusi=0,5, >22=1; italiano mantiene refuso, guida 2013 sovrappone 22. Integrazione definitiva italiana/licenza sanitaria-commerciale non dimostrate; il piano consente di proseguire attività indipendenti mantenendo aperto questo limite. Nessun accordo accettato o conferma clinica inventata.
