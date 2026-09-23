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
| PO-08 Consegne dal giro | Verificato, in pubblicazione | 126 test backend, 116 frontend più 5 rifinitura, 5 HTTP/PG root. Browser: giro 5 pazienti, retry senza duplicati, bozze, conflitto camera, paginazione e identità mobile persistente. Sei guardie statiche falliscono identiche in baseline. |
| PO-09 Dimissione | Da eseguire | Spostamento della destinazione |
| PO-10 PAINAD e infrastruttura moduli | Da eseguire | Versione, storico e PDF |
| PO-11 Trasferimenti posturali | Da eseguire | Fedeltà al DOCX |
| PO-12 Tinetti | Da eseguire | Verifica fonti; nessun nuovo scoring incerto |
| PO-13 MNA | Da eseguire | Verifica fonte dell'item Q |
| PO-14 GDS-15 | Da eseguire | Scoring delle domande inverse |
| PO-15 Catalogo e storico NRS | Da eseguire | Nessuna conversione delle scale |
| PO-16 Giro completo | Da eseguire | Collaudo tecnico sintetico; distinguere prove effettuabili da osservazione clinica e dispositivi reali |

Una sola attività applicativa attiva; analisi indipendenti possono procedere in parallelo. Ogni worker scrivente usa un worktree isolato. Root integra, valida e pubblica; nessun test scrive su pazienti del sito. Le ricevute di rilascio identificano commit, sorgenti e deploy. Le convalide cliniche richieste dal piano non vengono inventate né attribuite all'utente.
