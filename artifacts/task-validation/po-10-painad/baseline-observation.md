# Baseline PO10

Commit applicativo cfe0e16b. PAINAD non compare nei TabId/Moduli; schema Prisma privo di PatientAssessment e archivio privo di collegamento assessmentId. Le scale legacy sono array Cartella, senza lo snapshot finale immutabile richiesto dal piano.

Nessun tempo di compilazione PAINAD baseline misurabile: il percorso non esiste. Il confronto pertinente è aggiunta del flusso completo e recuperabile, senza conversione dei dati storici. Root verifica API reale e archivio usando PostgreSQL loopback e fixture sintetiche; il worker verifica combinazioni e failure-path dedicati.
