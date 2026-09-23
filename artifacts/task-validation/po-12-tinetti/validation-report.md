# PO12 — Tinetti versionata e storico conservato

Modulo a 20 voci e 28 punti già in uso, ora con bozze, anteprima, finale immutabile, rettifiche e PDF in archivio. Le vecchie schede restano in sola lettura; PUT e importazioni conservano il ramo originale sotto lock e rifiutano modifiche differenti.

- Backend: 40/40 test in 12 file, 46 migrazioni PostgreSQL sintetiche, typecheck; Tinetti PDF normale/lungo e regressioni PAINAD/Trasferimenti, 18 pagine ispezionate. Input completo `745439cba8628a28d3bee99281a5f7953e8046d0b904c7b5a6000a5de07e3b2e`.
- Frontend: 105/105 test, 48 opzioni e spazi di combinazioni, snapshot/legacy/Unicode, build e nessun nuovo lint. Stato worker `ede22f419330266315a9912b6239198607eaea8ee0613931ecdc84854f516b63`.
- Root: 2/2 prove HTTP/PG, build backend e frontend finale, scansione sorgenti/bundle senza firme di segreti. Il primo test root ometteva l'header di scope demo richiesto dai documenti: corretto il test, nessun indebolimento del gate applicativo.
- Browser: bozza parziale senza risultato, salvataggio e ripresa dopo ricarica, 20 risposte/28 punti, rettifica a23/rischio moderato con data originale conservata, archivio e ritorno al tipo corretto. Due risposte perse recuperate tramite identico reinvio, senza duplicati. Salvataggio lento di Bruno separato da Anna.
- Stato esportato: 2 finali, 1 bozza, 2 documenti e zero attestazioni; tutte le cartelle iniziali e finali identiche. Console senza errori.
- QA mobile ha rilevato uno scrollport intermedio che faceva sparire l'identità. Correzione root limitata ai workspace valutazioni sotto1024px: overflow visibile e identità sotto la topbar. Misure390/768: top64, nessun overflow orizzontale, focus sotto l'identità; desktop conservato. Revisione indipendente del fix completata.
- PDF dal renderer compilato: due file generati, font/licenza identici ai sorgenti; entrambe le pagine della rettifica renderizzate e ispezionate. Venti item, subtotali, note, date e fonte leggibili.
- Stampa legacy: catturato il DOM realmente selezionato dalla sua azione, applicate a schermo le regole print degli stylesheet. Una sola scheda e20righe; antenati con overflow visibile e altezza completa. Questa prova verifica lo stile e l'assenza di clipping, non il dialogo nativo né la paginazione fisica.

Il middleware Vite locale si bloccava durante l'ottimizzazione; la preview usa ora un build statico dei componenti di produzione e il medesimo backend sintetico. I cluster dei tentativi precedenti sono chiusi. Nessuna prova scrive sui pazienti online. Operatori clinici/dispositivi fisici e dialoghi nativi di stampa/uscita non sono stati collaudati. Le sei guardie statiche note della baseline non sono dichiarate verdi.

Pubblicazione autorizzata: backend/migrazione prima del frontend; runtime IA invariato. Il gate lega sorgenti ed evidenze al commit esportato.
