# Esecuzione del piano approvato

Approvazione: 23 settembre 2026. L'utente conferma l'intero piano, l'esecuzione autonoma senza domande e il deploy delle modifiche verificate.

Baseline: af48e322d3ba99561949f4a7901290e3cace09db. Repository ClinicOS, branch codex/subtle-dashboard-notifications. Le correzioni Parametri e navigazione Terapia sono già pubblicate e vanno preservate.

| Attività | Stato | Evidenza / decisione |
|---|---|---|
| PO-01 Ingresso progressivo | Pubblicato e verificato | Nome/cognome e operatore di presa in carico obbligatori; CF, nascita e telefono mancanti ammessi all'ingresso, necessari alla completezza; valori forniti validati. Migrazione DOB nullable, nessun valore fittizio. |
| PO-02 Correzione orari | Pubblicato e verificato | b405c8ff: 53 test, build, focus desktop/mobile; 16→20 e doppia fascia concordi in bozza/payload/DB/feed. |
| PO-03 Note e origine | Pubblicato e verificato | 553fa24b: 80 test mirati e build; istruzione PA alle 22:00 conservata nelle note senza seconda somministrazione; provenienza e archivio integri. Railway SUCCESS, Vercel READY e alias verificato. |
| PO-04 Ricerca farmaci | Pubblicato e verificato | ef562bf5: 55 test mirati aggregati, build, browser desktop/mobile e retry paginato. Railway SUCCESS e Vercel READY, alias verificato. Smoke reale: tre confezioni ordinarie 1000 mg, AIC conservato in POST/GET/PUT/intake. |
| PO-05 Scansioni lunghe | Pubblicato e verificato | 0418463a: 101 test backend, 17 prove integrate PostgreSQL, 125 frontend, 169 runtime; 30 pagine in tre lettere confermate e archiviate da browser mobile sintetico. Runtime e backend Railway SUCCESS; Vercel READY e alias legato al commit. |
| PO-06 Identità e posto letto | Pubblicato e verificato | 853b4075: 29 test backend, 7 HTTP integrati, 74 frontend, build e browser; Railway SUCCESS/health200 e Vercel READY/alias verificato. |
| PO-07 Ordine del reparto | Pubblicato e verificato | c52af623: 58 test backend, 102 frontend e 6 HTTP/PG root; browser desktop/mobile, bozze e reinvio idempotente. Railway SUCCESS/migrazione/health200; Vercel READY e sourceCommit alias verificato. |
| PO-08 Consegne dal giro | Pubblicato e verificato | 3582e0bf: 126 test backend, 116 frontend più 5 rifinitura, 5 HTTP/PG root. Giro 5 pazienti, retry, bozze, paginazione e identità mobile. Railway SUCCESS/migrazione/health200; Vercel READY e sourceCommit alias verificato. Sei guardie statiche falliscono identiche in baseline. |
| PO-09 Dimissione | Pubblicato e verificato | cfe0e16b: 11 test navigazione/Agnos, build, browser desktop/mobile/tastiera, zero scritture. Vercel READY e alias sourceCommit verificato. |
| PO-10 PAINAD e infrastruttura moduli | Pubblicato e verificato | d659c1b4: 51 test backend, 72 frontend, 19 rifiniture e 3 HTTP/PG root; PDF/archivio, retry, rettifiche, isolamento e UI 390/768/1262. Railway SUCCESS/migrazione/health200; Vercel READY/sourceCommit verificato; modulo e storico aperti online in sola lettura. |
| PO-11 Trasferimenti posturali | Pubblicato e verificato | 470a5fe7: 66 backend, 92 frontend più 17 rifiniture, 3 HTTP/PG root; browser 390/768/desktop, retry, rettifiche, conferme, archivio e PDF compilato. Railway SUCCESS/migrazione/health200; Vercel READY/alias sourceCommit verificato, smoke sola lettura. |
| PO-12 Tinetti | Pubblicato e verificato | 4e594aa3:40 backend,105 frontend,2 HTTP/PG; ciclo completo,rettifica,PDF/archivio,legacy invariato,identità mobile390/768. Railway SUCCESS/migrazione/health200,Vercel READY/alias sourceCommit,smoke sola lettura. |
| PO-13 MNA | Pubblicato e verificato | 6f8b7ded: 52 backend,127 frontend,2HTTP/PG; screening/full/rettifica, misure, Kparziale, rawinvalid/retry, PDF/archivio,390/768/1262. Railway SUCCESS/migrazione/health200, Vercel READY/alias sourceCommit; modulo corrente e storico online verificati in sola lettura. |
| PO-14 GDS-15 | Pubblicato e verificato | f445260a: 61 backend,138 frontend,2 HTTP/PG;32768 combinazioni e32793 parità, bozza/retry/finale/rettifica/PDF/archivio,390/768/1262. Railway SUCCESS/migrazione/health200; Vercel READY/alias sourceCommit; modulo corrente e storico online verificati in sola lettura. |
| PO-15 Catalogo e storico NRS | Pubblicato e verificato | 53e57d69:74backend,173frontend,4HTTP/PG;8moduli, recupero bozza/retry, originali legacy intatti, stampa NRS isolata, archivio5tipi/10pagine, responsive. Railway SUCCESS/health200 e Vercel READY/sourceCommit alias; catalogo e NRS online verificati in sola lettura. |
| PO-16 Giro completo | In esecuzione | Collaudo tecnico sintetico integrato; rifiniture presentazione MNA e comandi touch; prove con personale/dispositivi fisici distinte |

Una sola attività applicativa attiva; analisi indipendenti possono procedere in parallelo. Ogni worker scrivente usa un worktree isolato. Root integra, valida e pubblica; nessun test scrive su pazienti del sito. Le ricevute di rilascio identificano commit, sorgenti e deploy. Le convalide cliniche richieste dal piano non vengono inventate né attribuite all'utente.
