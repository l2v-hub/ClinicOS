# PO-05 — scansioni lunghe, verifica integrata

Autorizzazione: piano PO-01…16 approvato dall'utente con implementazione, push e deploy. Root integra e pubblica; ciascun writer ha rilasciato il claim prima della copia. Decisione: rilascio autorizzato sul backend demo e sull'alias già concordati, dopo i controlli sotto. Nessuna modifica a credenziali o pazienti live.

## Risultato

Sessione persistente fino a 30 pagine e 25 MiB, lettere separate, anteprima e sostituzione pagina, ripresa di errori e conflitti espliciti. Bozza con CAS e recupero delle risposte perse. Originali e PDF per lettera sono archiviati nella stessa conferma del paziente. Runtime compatibile pubblicato prima del backend e frontend per ultimo.

## Evidenze

- Backend worker: 101/101 test; include 13 nuovi scenari PostgreSQL e 88 regressioni. TypeScript e Prisma validi. Cinque fallimenti di mock obsoleti riprodotti sulla baseline e documentati separatamente, senza allentare validazioni.
- Root: 17/17 test reali PostgreSQL di worker, archivio e limiti HTTP, compresi upload concorrenti e multipart senza Content-Length. TypeScript backend e build frontend riusciti.
- Frontend: 125/125 test mirati, inclusi perdita risposta upload/handoff/autosave, scelte anagrafiche, conservazione manuali e fonti distinte; lint delta pulito. Otto fallimenti precedenti della suite generale riguardano file invariati; due errori lint IntakeWorkspace preesistenti dichiarati nel handoff.
- Runtime Python: 169/169 test, hash delle sorgenti verificato all'integrazione; nessuna rete esterna. Ambiente locale Python 3.14.6; immagine Railway Python 3.11 non eseguita localmente; il suo build remoto resta parte del gate di deploy.
- Browser integrato 390×844: tre PDF scansionati da dieci pagine, 15,7 MiB; avvio impedito per lettera vuota con spiegazione; conflitti nome/orario senza scelta implicita; nome selezionato applicato; fonte Lettera 2 apre l'originale corretto; anteprima senza overflow orizzontale; nome manuale preservato in verifica.
- Conferma browser: un paziente sintetico “Alba Corretta”, 30 pagine, sei documenti PDF (tre originali e tre lettere), zero terapie materializzate, due righe discordanti conservate non somministrabili. Esito UI e stato database esportato dalla fixture alla chiusura.
- Browser diagnostico precedente: retake pagina30, ripresa dopo reload, errore17 con29checkpoint conservati, refresh dopo riordino e fonte superata. Fotocamera simulata. La fixture Vite ha richiesto reload dopo ottimizzazione lazy di pdfjs; la build distribuita è separata dal server di sviluppo.

Correzioni root successive al manifest FE: area comandi pagina44px, prevenzione gruppi vuoti e anteprima a colonna con selettori44px. Build ripetuta dopo l'ultima modifica CSS. Identità finale in root-source-manifest.json, non nel solo manifest worker.

## Misure locali

PostgreSQL locale reale, API e provider finto nello stesso processo Node; tempi senza latenza OCR reale. Trenta JPEG: upload1,93s/lavorazione1,56s, piccoRSS361,9MiB. PDF30: upload1,15s/lavorazione1,65s, piccoRSS493,3MiB. Tre lettere: upload1,22s/lavorazione2,44s, piccoRSS473,8MiB. Il processo condivide allocazioni fra scenari e RSS non include PostgreSQL. Dettagli e SHA degli input in benchmark.json. Nessuna percentuale di miglioramento dichiarata su baseline non equivalente.

## Limiti residui

Queste prove non dimostrano qualità OCR del provider reale, convalida clinica, comportamento fisico Safari/iOS/Android o usabilità osservata con operatori. Il provider può rieseguire una chiamata dopo un riavvio prima del checkpoint; non viene promesso exactly-once del provider. Le duplicazioni applicative e le conferme sono protette e collaudate. I controlli remoti successivi al deploy sono in lettura.

Lo scan delle credenziali frontend è passato: il solo token letterale segnalato era una fixture sintetica, annotata con il marker previsto. Il commit conserva le sorgenti verificate senza autoformattazione del pre-commit; build, tipi e scan sono stati eseguiti esplicitamente. Le normali conversioni CRLF/LF di Git sono registrate nell'export da commit.
