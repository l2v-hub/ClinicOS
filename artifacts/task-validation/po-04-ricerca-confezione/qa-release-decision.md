# PO-04 — Decisione di integrazione e pubblicazione

ALLOW nell'autorizzazione esplicita al piano, push e deploy. Root ha integrato le 14 modifiche frontend e i nove file backend/test verificando SHA-256 e dopo rilascio dei claim dei due worker. Nessuna migrazione, chiave o dato clinico live modificato. Le ricevute dei worker documentano anche l'indisponibilità della chiamata policy_evaluate; questa decisione locale non è presentata come un'autorizzazione distribuita emessa dal tool.

La baseline fallisce il test realistico: la ricerca Tachipirina 1000 compresse restituisce dodici confezioni da 500 mg. Il candidato mostra soltanto le due confezioni ordinarie da 1000 mg; unità, concentrazione, formulazione effervescente/modificata, brand numerici e refusi sono trattati esplicitamente. Nucleo/import e catalogo persistito non cambiano.

## Prove

- 28 test frontend integrati passati: selezione/AIC, annullamento richieste obsolete, paginazione/retry, feedback e conferma intake.
- 17 test parser e integrazione DB passati nel primo lancio; dieci test legacy di normalizzazione/import passati con URL loopback esplicito. Totale 27 backend/DB, quindi 55 mirati aggregati. Il primo comando cumulativo includeva un file di test orari non presente e il test legacy non partiva senza DATABASE_URL: non era una regressione applicativa. Il log iniziale è conservato; il lancio corretto è import-normalization-tests.log. Non si dichiara verde la suite generale.
- Build frontend e backend passate. Le prove DB selezionano PGlite locale prima dell'import Prisma; la suite di normalizzazione usa una porta loopback irraggiungibile e non accede al DB.
- Router reali: paginazione senza duplicati, invalidazione cursor su query diversa, POST/GET/PUT della terapia, rimozione AIC a cambio libero, conferma intake con confronto AIC dello snapshot, rifiuto sostituzione non revisionata, replay senza duplicati. PO-03 note/fonte e archivio conservati.
- Browser reale su fixture locale: query audio nel selettore, scelta AIC012745170, compilazione manuale forza1000mg, salvataggio e reload/modifica; database verifica una terapia con un orario08:00 e quantità1. Confezione/forma esatta visibili dopo reload.
- Catalogo con 30 risultati:25 iniziali, errore503 sulla pagina successiva mantiene25, Riprova arriva a30. Query attaccata Tachipirina1000 compresse torna alle due confezioni attese. Viewport390px: nessun overflow orizzontale in catalogo e form.
- Revisione indipendente: risolti i tre rilievi su B12, volume/concentrazione e wrapper che perdevano la continuazione. Sei asserzioni pure superate; nessun nuovo blocker individuato. Non è un benchmark di capacità o convalida clinica del catalogo.

L'indice globale viene costruito solo per refusi; oltre30.000nomi passa a scansioni limitate con continuazione. Ogni pagina legge al massimo1.024candidati; i wrapper legacy proseguono per16pagine e segnalano esplicitamente una ricerca ancora incompleta. I cursori presuppongono catalogo invariato durante la ricerca; un'importazione concorrente non fornisce isolamento snapshot.

Pubblicazione prevista: export immutabile e verificato del commit, Railway demo prima di Vercel, health200, alias frontend al commit, ricerca live solo in lettura. Nessun paziente live di collaudo.
