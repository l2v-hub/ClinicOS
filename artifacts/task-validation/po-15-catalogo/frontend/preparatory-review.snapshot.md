# PO15 — rischi osservati prima del GO

Revisione indipendente in sola lettura sulla baseline PO13, comunicata da clinical_forms_source_audit. Nessuna implementazione o prova PO15 in questo passaggio.

- Il reader del catalogo deve proiettare metadati dedicati: current/history/assessmentDto leggono risposte o snapshot prima di scartarli. Una richiesta e una query aggregata per cinque tipi oltre allo scope, conteggi esatti prima del limite. Finale corrente terminale, ordinato per data clinica/registrazione/id; una rettifica in bozza non nasconde l'originale. Route statica prima di `/:id`, private/no-store e lockPatient.
- NRS è modificabile dal modulo e dal percorso ingresso. nrsSeverity assegna erroneamente fasce a -1/undefined/NaN. Storico e stampa devono dare fascia soltanto a interi0..10, mantenendo il dato originale.
- La protezione della Cartella va applicata sotto lock e nel merge dell'importazione, come Tinetti: omissione conserva, uguale ammesso, modifica esplicitamente rifiutata. Assente, null e array vuoto non sono equivalenti.
- PainAssessmentEditor e buildConfirmCartella collegano `data.dolore` dell'ingresso a `valutazioniNRS`: evitare che l'interfaccia proponga nuove schede NRS poi rifiutate dal backend. I parametri vitali NRS/dolore sono un flusso separato da preservare. I dati storici/draft precedenti non vanno cancellati o convertiti in PAINAD.
- TAB_GROUPS serve anche Agnos; il catalogo sostituisce soltanto la seconda navigazione Moduli. Preservare destinazioni storiche e percorso nrs. Entrare in Moduli deve mostrare il catalogo.
- Le bozze locali appartengono allo store di App. Nuova compilazione è locale; il refetch dopo salvataggio/finale deve essere vincolato al paziente/sessione. Errore di caricamento e nessuna compilazione sono stati diversi.
