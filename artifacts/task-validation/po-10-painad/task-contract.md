# PO10 — PAINAD, storico e PDF archiviato

Preparazione soltanto; GO dopo PO09 verificata. Il piano e la pubblicazione dei moduli allegati sono autorizzati dall'utente. Root integra schema/dipendenze/asset e release; worker backend/frontend in worktree isolati. Non convertire o cancellare scale storiche.

## Contratto clinico

Versione esplicita PAINAD dalla fonte allegata con hash e testo conservato in source-text. Cinque item, alternative descrittive complete, nessuna preselezione; null distinto da zero. Somma 0-10 e fascia solo dopo tutte le risposte. Fasce 0/1-3/4-6/7-10 come fonte, senza diagnosi o trattamento automatico. Le sole correzioni editoriali sono osservazionale/consolare, documentate in provenance.md.

## Persistenza

PatientAssessment dedicato, mai array Cartella. ID, patientId, tipo/versione, assessedAt distinto da timestamp registrazione, autore autenticato, risposte, stato draft/final, versione CAS. Creazione requestId+hash iniziale immutabile per replay anche dopo modifica della bozza. PATCH bozza del proprietario con expectedVersion, conflitto409; finalizzazione dello stesso ID con richiesta idempotente e controllo risposte server. Nessun delete. Rettifica tramite nuova bozza collegata a predecessore dello stesso paziente/tipo, motivo esplicito e unica rettifica finale per predecessore.

Snapshot finale immutabile anche nel DB: identità e posizione autorevole alla data Europe/Rome mediante loadOperationalIdentities(TransactionClient), autore, fonte/versione, risposte e descrizioni selezionate, risultato. Nessun reparto inventato dall'operatore se la posizione non lo documenta. FK paziente Restrict. Campi operativi PDF sono distinti dai contenuti clinici immutabili.

API sotto /patients/:patientId/assessments: POST, GET storico bounded default25/max100, GET/:id, PATCH/:id, POST/:id/finalize, POST/:id/pdf/retry. Bozze private all'autore; finali nel patientScope. Identità e punteggi mai autorevoli dal client. Esiti 201nuovo/200replay/409conflitto; gli errori conservano i dati della UI e non generano un nuovo requestId incerto.

## PDF e archivio

Finale persistito prima del rendering. Stato pending/ready/failed, lease e token per tentativo; renderer fuori transazione dallo snapshot. Inserimento PatientDocument con bytes/SHA/assessmentId unique e passaggio ready atomici. Retry produce lo stesso documento, callback vecchia non sovrascrive nuova. Coerenza paziente documento/assessment verificata DB. pdf-lib esiste; font Unicode incorporabile e licenza relativa valutati dall'integratore prima di aggiungere dipendenze. A4, identità, data/ora, autore, versione, domande e risposte senza tagli, righe lunghe e intestazione ripetuta.

Guardia archivio Entra legacy più ampia del patientScope: per assessmentId non nullo imporre scope assessment su metadata prima di limite/cursore, total, sourceMatch, detail, bytes, riclassificazione e accessi AI (listPatientDocumentsForAi e SQL searchDocuments). Categoria da sola non è guardia. Documenti legacy assessmentId null mantengono policy corrente. Categoria generata riservata al servizio, non assegnabile da upload manuale. Rinvio reciproco archivio/valutazione e data clinica visibile; stampa multipla esistente compatibile.

## UI e prove

Identità, data/ora, avanzamento risposte, bozza/riepilogo/finale/statoPDF nello stesso percorso. Riutilizzare PatientIdentity, ClinicalTableSection, preview e stampa archivio; non il vecchio editor NRS. Storico paginato, nuova compilazione, ripresa bozza, rettifica e riapertura PDF. Cambi paziente/sessione non trasferiscono risposte o callback; uscita con modifiche segnalata. Opzioni leggibili verticalmente su mobile con focus visibile. NRS resta disponibile finoPO15.

243 combinazioni complete, 781 incomplete, confini delle fasce; HTTP/PG CAS e response loss, finali protetti contro PUTCartella, rettifica concorrente, permessi anche dopo riclassificazione tentata, tutti readerAI, errorePDF/lease scaduta/token tardivo, un solo documento. Browser sintetico desktop/mobile/tastiera, bozza ripresa e finale riaperto da Documenti. Rendering PDF e ispezione pagine con Unicode e testi lunghi. Nessun test su pazienti live, nessuna convalida clinica indipendente inventata.
