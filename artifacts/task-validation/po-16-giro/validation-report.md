# PO16 — Collaudo tecnico finale

Il piano approvato è implementato. PO01–PO15 sono già pubblicate e verificate; PO16 completa il giro tecnico sintetico e rifinisce la presentazione MNA e i comandi del catalogo. La verifica sul campo con personale e dispositivi fisici resta distinta dal rilascio tecnico.

## Prove concluse

- Giro integrato 1/1 PASS con PostgreSQL locale e richieste HTTP/servizi applicativi: ingresso incompleto e completamento, PDF30pagine in due lettere, ordine e archivio15/15/30, orario16→20, notaPA22, retry senza duplicati, camera/letto e preferenze, somministrazione con duplicato409, parametri con data/ora/nota, cinque consegne, PAINAD finale e rettifica con originali/PDF preservati, dimissione salvata esplicitamente. `integrated-round-inputs.json` lega questa prova al codice applicativo del commit36fb9675; l'estrazione OCR è iniettata e dichiarata sintetica.
- Backend15 test mirati consolidati:12regressioni MNA più3prove finali del nuovo file eseguite anche dal cwd backend. PDFv1 preesistente ripristinato dalla fixturePO15 e conservato identico dopo tre retry, con zero chiamate al renderer. NuoviPDF mna-a4-v2; confini IMC19/21/23 e dati/calcoli immutati. Dettagli e binding nei report backend.
- Frontend174/174test su37file; una nuova prova semantica per singolare, decimali italiani e non mutazione. Build backend/frontend e font PASS, scansione frontend senza rilevamenti, lint mirato0→0. I test FE usano gli shim documentati dal worker.
- Browser locale sul candidato finale: ripresa della bozzaMNA, `1 punto`, IMC25 e totale27,5; anteprima e finalizzazione esplicita, storico27,5, PDFinline di3pagine, collegamento al medesimo documento in archivio e navigazione di ritorno al modulo.
- Apertura Dimissione, compilazione locale di un campo e uscita: zeroPUT Cartella. Esportazione DB verificata: tutte le cartelle e gli ingressi identici,6finali/6documenti, hashPDF corretti, IMC persistito24.999999999999996 e misure64/160 invariati; nessuna rispostaHTTP>=400.
- Catalogo a390/768/1262 senza overflow orizzontale. Tutti i suoi comandi44px nelle due larghezze mobili, ritorno ai moduli44px a768, focus da tastiera con bordo2px visibile. Desktop conserva le dimensioni precedenti: non si dichiara44px sopra768. Console browser senza errori o warning. Banco, tab e PostgreSQL chiusi, viewport ripristinato.
- PDF generato dal backend compilato: tre font/licenza identici ai sorgenti, producer mna-a4-v2. Tutte3pagine renderizzate e ispezionate, senza tagli o sovrapposizioni, con identità, A–R, punteggi, misure, provenienza e copyright leggibili. `compiled-pdf-receipt.json` e `pdf-visual-receipt.json` legano byte e pagine.
- CatenaPO01–PO15:15ricevute verificate contro ancestry e blobGit esatti; controllo indipendente senza discrepanze. Non equivale a ripetere ogni smoke precedente.

## Ambito e limiti

`coverage-matrix.md` distingue le prove nuove dalle regressioni precedenti riutilizzate. Il giroPO16 non prova da solo ricerca umana, ordinamento di molti pazienti, cambio rapido, ogni modulo o stampa multipla: le relative evidenze sono quelle delle attività precedenti. La prova browser nuova usa dati sintetici; non modifica pazienti online. Il renderer v1 usa il vero PDF giàready della fixturePO15; le differenze fra timestamp del dump Prisma e snapshot sono conservate e spiegate dal backend, non corrette alterando lo storico.

Non sono stati coinvolti operatori clinici, fotocamere/dispositivi Safari/iOS/Android fisici, rete di reparto, stampante o zoom nativo200%. Le sei guardie statiche patientRosterGuard già fallite identiche in baseline e le diagnostiche pregresse non sono dichiarate verdi. Nessuna convalida clinica indipendente o certificazione integrale di accessibilità.

Pubblicazione autorizzata: commit immutabile, backend prima frontend, nessuna nuova migrazione e runtimeIA invariatoPO05. Verifica deployment, health, alias/sourceCommit e smoke online in sola lettura nella ricevuta separata.
