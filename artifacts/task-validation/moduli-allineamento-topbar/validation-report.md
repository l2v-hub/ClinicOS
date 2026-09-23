# Allineamento catalogo Moduli

Richiesta: allineare a sinistra il catalogo con la barra delle aree della cartella. Baseline8ea3460b; sul sito il pannello parte da120px e la barra da144px. Il catalogo non applicava il margine interno della navigazione.

Modifica esclusivamente CSS: margine orizzontale del catalogo24px su desktop,16px fino900px e12px fino600px, come TopNav. Le regole valgono soltanto su schermo. Nessun cambiamento di dati, API, azioni o stampa.

Verifica locale con i componenti reali TopNav e AssessmentCatalogView, dati sintetici e nessuna API: a1294px tutti i bordi sinistri (barra, catalogo, titolo e prima scheda) sono144px; a768px sono40px; a390px sono26px. Nessun overflow del documento o del pannello, comandi mobili44px, console senza errori/warning. Screenshot e geometry.json registrano i risultati. Build frontend e scansione segreti superate, diff check riuscito. Non aggiunti test statici per una modifica puramente visiva.

Il tab dell'utente è stato soltanto letto e resta intatto. Anteprima locale chiusa, viewport ripristinato. Pubblicazione frontend autorizzata dalle istruzioni persistenti dell'utente; backend invariato. Il commit immutabile e la verifica dell'alias sono registrati nella ricevuta di deployment.
