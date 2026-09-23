# PO10 — PAINAD, bozze, storico e PDF

L'utente ha autorizzato il piano completo e la pubblicazione. Backend e frontend sviluppati in worktree distinti; root ha integrato solo dopo rilascio dei claim e verifica degli hash dei due manifest. Il manifest root distingue le rifiniture di AssessmentWorkspace e gli asset/dipendenze di proprietà dell'integratore. Nessun dato di pazienti reali è stato scritto per i test.

PAINAD usa cinque osservazioni senza valori preselezionati: le 243 combinazioni complete e 781 parziali distinguono zero da non valutato. Bozze private, controlli di versione e reinvii idempotenti conservano il lavoro. Un finale non è sovrascrivibile; la rettifica conserva l'istante clinico originale e crea un successore motivato. Il PDF viene archiviato dal solo snapshot immutabile, con tentativi recuperabili e controllo del perimetro del paziente su tutti i lettori, inclusa IA.

## Verifiche

- Backend worker: 51 test in 11 file, typecheck, schema, 44 migrazioni su PostgreSQL locale e PDF.
- Frontend worker: 72 test, build; lint 21 problemi baseline e 21 candidate, nessuno introdotto.
- Root: 3 test HTTP/PostgreSQL con replay, conflitti, finale, rettifica, bytes/SHA e revoca del perimetro; 19 test frontend dopo rifinitura; build backend/frontend e scansione segreti sorgenti/bundle superati.
- Browser locale: cambio paziente conserva le bozze; perdita della risposta di creazione/finalizzazione reinvia la stessa richiesta senza duplicati; errore PDF recuperato; documento riaperto dall'archivio; rettifica da 4/10 a 3/10 senza alterare l'originale. Risultato database: 2 finali, 2 bozze, 2 documenti. Manager non vede bozze altrui; operatore fuori perimetro non vede i finali; risposta tardiva di Bruno non cambia Anna.
- PDF: renderer sorgente normale e lungo, Unicode, e due PDF prodotti dal renderer compilato ispezionati come immagini. Font Noto Sans SIL OFL e tre asset byte-identici nel build.
- UI: identità sticky, focus non coperto e nessun overflow orizzontale a 390, 768 e 1262 px. Il difetto tablet è stato riprodotto e corretto allineando lo scroll al breakpoint 1023. Revisione indipendente chiusa senza P1/P2 residui; console browser vuota.

## Limiti espliciti

La conferma nativa del cambio sessione con bozza sporca non è stata completata tramite IAB (tab bloccata, poi chiusa). Test di isolamento/clear/sessione verdi e cambi profilo senza modifiche pendenti provati; non si attribuisce al browser la prova di «Annulla».

Non sono stati eseguiti osservazione con operatori, dispositivi fisici, zoom nativo 200% o convalida clinica indipendente. Le guardie statiche roster (sei) e therapyAgendaDateGuard restano fallimenti baseline già documentati: non si dichiara verde l'intera suite.

ALLOW_RELEASE: esportare commit immutabile, pubblicare migrazione/backend prima del frontend, verificare health e alias/sourceCommit. Nessun nuovo deploy del runtime IA. PO11 parte dopo questa verifica.
