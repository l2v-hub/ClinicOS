# MNA — resa tipografica PDF

Root ha autorizzato nei soli blocchi editoriali e di fonte del PDF MNA la rappresentazione semanticamente equivalente dei tre simboli non coperti dai font correnti: ≤ diventa <=, ≥ diventa >=, → diventa «diventa». La sostituzione avviene in `mna-pdf-content.ts`, prima del layout. Snapshot, UI e definizione mantengono i caratteri Unicode originali.

Note, dati anagrafici, operatore, sesso e motivo di rettifica non vengono traslitterati. Se uno di questi campi contiene un glifo non coperto dai font correnti, la generazione PDF segnala `assessment_pdf_unsupported_glyph`: valutazione finalizzata, snapshot e risposte originali restano conservati e non viene archiviato un documento alterato. Il test MNA dedicato verifica la nota con tutti e tre i simboli, l'errore esplicito, l'hash immutato e l'assenza di un documento; verifica inoltre il rifiuto per identità, sesso e motivo di rettifica.

Il controllo dei glifi non supportati del renderer condiviso resta invariato. Nessun font, dipendenza o comportamento degli altri moduli cambia. La QA verifica la correzione Q, le soglie e il copyright nell'estrazione PDF e tutte le pagine renderizzate. Il limite dei font per i dati liberi rimane esplicito; questa modifica non introduce una copertura Unicode completa.
