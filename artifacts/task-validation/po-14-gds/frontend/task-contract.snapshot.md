# PO14 — GDS-15

Preparazione soltanto; GO dopo PO13 pubblicata e verificata. Utente ha autorizzato piano completo, push/deploy e prosecuzione senza domande. Worker isolati, root integra/verifica/pubblica. Collaudi solo sintetici/loopback.

## Fonte e modello

Allegato `scala GDS.pdf`, SHA256 f2d4494b49d96de08eceed69b1d793c45260f22aca7d62f98080ccee6133d709. Testo e inventario già verificati in ../po-10-painad/source-text/gds.txt e forms-inventory.json. Tipo `gds15`, versione `gds15-it-2026-09-22-v1`. Riprodurre esattamente le quindici domande nell'ordine dell'allegato; normalizzazione spazi soltanto.

Istruzione sempre visibile prima della compilazione: risposte del paziente riferite all'ultima settimana. Opzioni Sì/No nello stesso ordine per tutti gli item, senza preselezioni. `answers` con q1..q15 `null|boolean`; true=Sì, false=No, null=non risposto; note facoltative massimo4000caratteri. Stringhe, numeri o campi sconosciuti rifiutati. Non inferire risposte dalla cartella o da altre scale.

Scoring server-authoritative: NO=1 per q1/q5/q7/q11/q13; SÌ=1 per tutte le altre; risposta opposta=0. Avanzamento/percorsi mancanti; risultato null fino a tutte15valide. Nessuna fascia sui parziali. Totale0..15; fasce fonte0–5 Assente / Nella norma;6–9 Depressione lieve–moderata;10–15 Depressione grave, sempre presentate come interpretazione dello screening e non diagnosi confermata. Nessuna diagnosi o terapia creata in automatico.

Conservare note della fonte: GDS è strumento di screening, non sostituisce diagnosi clinica. In deficit cognitivo moderato-severo (es.MMSE<15) il modello consiglia scale etero-somministrate, es.Cornell; non aggiungere Cornell al catalogo o prendere decisioni cliniche automatiche. Riferimento Sheikh/Yesavage1986 nel dettaglio fonte e PDF. Nessuna convalida clinica indipendente dichiarata.

## Flusso e PDF

Riutilizzare infrastruttura moduli: paziente+tipo+sessione, bozze private, CAS, retry idempotenti e callback isolate, anteprima prima del finale, rettifica distinta e motivata, snapshot immutabile, PDF archiviato e rigenerabile senza duplicazione, ritorno documento/modulo tipato. Non alterare modelli/snapshot già pubblicati.

UI una scheda con quindici item leggibili verticalmente, identità persistente, avanzamento e azioni comuni. Ogni scelta esplicita ha descrizione; i punti sono di supporto, non sostituiscono Sì/No. Dopo finalizzazione, snapshot/PDF contengono domanda, risposta e punto per ciascun item, totale/fascia/nota screening, fonte/versione, identità, compilatore e date distinte. Rettifica conserva originale e documento precedente.

## Prove

Importare funzioni produzione:32768 combinazioni complete, singole inversioni, tutteSì=10 e tutteNo=5, totale0/15, soglie5/6/9/10; ciascuno15item mancante, tutti null, dominio/limiti. API/PDF/storico/permessi/cambio paziente-tipo e regressioni altri moduli. Browser desktop/tablet/mobile: bozza ripresa, incompletezza, anteprima/finale, rettifica, archivio. PDF con15domande e note lunghe renderizzato e ispezionato; nessuna diagnosi automatica.

Build e secret scan; source/artifact manifest e claim rilasciati prima dell'integrazione. Deploy backend poi frontend, health/alias/sourceCommit primaPO15.
