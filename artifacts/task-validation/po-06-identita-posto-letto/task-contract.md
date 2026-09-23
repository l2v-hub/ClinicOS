# PO-06 — identità e posto letto

Preparazione durante il rilascio PO-05. Baseline applicativa prevista: 0418463a94801bf2d22bdb3155eb6d4a05e9a2dd. L'implementazione inizia dopo verifica del rilascio precedente. L'intero piano, push e deploy sono già autorizzati dall'utente.

Obiettivo: nome, codice fiscale o dati mancanti e camera/letto riconoscibili e coerenti in Pazienti, Parametri, Terapia e Consegne. Il paziente resta evidente durante lo scorrimento e nelle azioni di somministrazione. Nessun MRN opaco come identificatore mostrato.

Contratto posizione: status assigned/unassigned/unavailable, source assignment/cartella/null, room/bed nullable, asOf YYYY-MM-DD. Loading è uno stato client. Relazione attiva e consistente autorevole, nessun incrocio con scalari legacy. Incoerenze o più assegnazioni attive non diventano “non assegnato”. Legacy consentito soltanto senza relazioni storiche, mai come prova di posizione storica. Non ricostruire posizioni terminate. Controllare roomId rispetto alla stanza del letto.

Query batch e scope paziente obbligatori; Consegna visibile non implica accesso al paziente. Nessun nuovo accesso amministrativo a camere, nessuna cartella intera per riga o N+1. Ricerca Parametri su posizione autorevole prima del limite; ordinamenti, cursori e preferenze restano PO-07.

Backend e test: worktree po06-operational-identity, worker backend. Frontend/tipi/CSS: worktree po06-identity-ui, worker frontend. Root integra dopo manifest/claim release, verifica interazioni e performance e pubblica dal commit verificato. Nessuna migrazione o dipendenza prevista. Root riserva porta4187 per il collaudo sintetico; nessun test scrive dati live.

Prove: assegnazione corrente/terminata/incoerente, data storica, legacy e mancanti; omonimi/CF assente/nomi lunghi; scope Consegne; query bounded; bozze Parametri conservate; header Terapia durante scroll, tastiera, zoom200%, mobile/tablet. Confrontare tempi e query con baseline senza attribuire al caricamento identità il costo dei riepiloghi clinici separati.
