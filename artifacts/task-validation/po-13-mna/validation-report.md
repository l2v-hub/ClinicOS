# PO13 — MNA screening e valutazione completa

MNA introduce screening A–F e valutazione A–R, misure/date distinte, calcoli autorevoli, bozze e rettifiche, snapshot finali e PDF nello stesso archivio paziente. Il refuso Q è corretto secondo il riscontro ufficiale già documentato, senza attribuire una convalida clinica all'utente.

- Backend52/52 in16file,47 migrazioni e build/typecheck/schema; frontend127/127, build, lint18→18 e scansione140input senza firme di segreti. Revisione indipendente e manifest in review-notes.md.
- Root2/2 HTTP/PostgreSQL, build frontend e backend, copia font e scansione sorgenti/bundle. Screening finale14/14 con J e Kparziale, G–R conservati e totale30 assente; rettifica completa27,5/30 con IMC19,CB22=0,5,CP31=1 e data clinica conservata.
- Browser sintetico: salvataggio parziale/ripresa dopo ricarica, risposte perse di creazione e finalizzazione recuperate con richieste identiche, senza duplicati. Peso abc e data2026-02-30 bloccano il salvataggio e restano editabili; nessun valore invalido trasmesso. Bozza locale conservata passando ad altro paziente. Categoria F/Q passa a misure senza categoria concorrente appena le misure sono complete.
- Stato esportato verificato:2 finali,1 bozza,2 documenti,0attestazioni; tutte le Cartelle identiche prima/dopo. Salvataggio lento su Bruno rimane su Bruno; Anna conserva il proprio finale. Nessun errore/warning console.
- Layout390/768/1262: nessun overflow orizzontale; a390/768 identità visibile sotto topbar e focus sotto l'identità. Screenshot mobile/desktop e misure effettive archiviati; tablet ispezionato direttamente. A desktop la finalizzazione è stata esercitata anche da tastiera dopo un limite del click automatico nello scroll annidato.
- PDF aperto nel visore e nel percorso Documenti → Moduli e valutazioni → MNA; ritorno Apri valutazione al tipo/record corretto. Renderer compilato:2PDF,3font/licenza identici ai sorgenti; tutte6pagine renderizzate e ispezionate, senza sovrapposizioni/clipping, Kparziale/interpretazioni/fonte/copyright leggibili. Il worker ha anche verificato9PDF/31pagine con note lunghe e regressioni dei moduli precedenti.

Limiti: nessuna prova su pazienti online, operatori clinici o dispositivi fisici; dialoghi nativi/stampa fisica non collaudati. I font attuali non coprono ogni glifo nei dati liberi: il PDF segnala errore esplicito e conserva lo snapshot, senza sostituire i caratteri inseriti. Nei soli testi editoriali MNA,≤/≥ diventano <=/>= e la freccia è resa «diventa». Nessuna modifica a snapshot o digest precedenti. Le sei guardie statiche baseline già note non sono dichiarate verdi.

Pubblicazione autorizzata dal piano completo: backend/migrazione prima del frontend, runtime IA invariato. Gate e receipt identificano gli input esatti.
