# Autorizzazione del rilascio — 4 ottobre 2026

Richiesta dell'utente: push delle modifiche per poterle vedere online. Destinazione GitHub confermata esplicitamente dall'utente: `https://github.com/l2v-hub/ClinicOS`, remote `origin`. Il primo rifiuto automatico del push riguardava la destinazione non confermata; dopo conferma il push è riuscito.

Commit applicativo: `b0a44892f0e5f358f658670da41d75a555aae96c`, ramo `codex/ux-turno-review`, già verificato sul remoto. La seconda commit corregge soltanto un'asserzione del test diario per il cambio giorno. Il sorgente applicativo è identico al commit UX `d445bf68`.

QA indipendente in checkout separato: build PASS (660 moduli), test mirati 59/59 PASS, runtime Playwright PASS, revisione screenshot desktop/mobile e sicurezza senza nuove segnalazioni. Le nove anomalie della suite generale erano già presenti nella baseline e non sono state incluse nelle modifiche.

Decisione del coordinatore: consentiti push al repository confermato e deploy manuale del frontend al progetto Vercel esistente `clinicos__`, ID `prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6`, alias `clinicos-eosin.vercel.app`, root directory `frontend`. L'account Vercel è stato autenticato dall'utente con il flusso device del CLI. Nessuna modifica a backend, database, schema, autorizzazioni, variabili d'ambiente o altri lavori locali.

Il deploy deve partire dal worktree del commit verificato. Una successiva commit di sola documentazione/evidenza non altera gli input applicativi. Esito, identificativo Vercel e alias saranno registrati dopo la risposta del servizio.

## Esito

- Push del commit applicativo: `b0a44892f0e5f358f658670da41d75a555aae96c`, verificato con `git ls-remote`.
- Comando: `vercel deploy --prod --archive=tgz --yes`, dal worktree isolato del commit verificato.
- Build Vercel: TypeScript/Vite PASS, 660 moduli; deployment status `READY`, target `production`.
- Deploy: `dpl_5xQ7vMRfBB159God9KxFHVj9LMhf`.
- URL immutabile: `https://clinicos-mreouxjfe-lucalavia-2482s-projects.vercel.app`.
- Alias pubblico: `https://clinicos-eosin.vercel.app`, verificato tramite `vercel inspect` sullo stesso deployment ID.
- Inspector: `https://vercel.com/lucalavia-2482s-projects/clinicos__/5xQ7vMRfBB159God9KxFHVj9LMhf`.
- Protezione Vercel esistente conservata; nessuna operazione su pazienti o dati clinici reali.

La commit successiva contiene solamente documentazione ed evidenze del rilascio, senza cambiare il frontend pubblicato. Gli altri lavori nel checkout principale sono rimasti intatti. Nessuna merge su main, deploy backend o migrazione database è stata eseguita.
