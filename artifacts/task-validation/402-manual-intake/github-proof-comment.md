## #402 — risolto, verificato e pubblicato

«A mano» apre ora il modulo senza perdere la selezione durante il cambio di pagina. **Tutti i quattro criteri di accettazione verificati**:

- [x] Modulo manuale visibile per l'infermiere autorizzato, titolo e campo Nome focalizzato.
- [x] Annulla/Escape riportano alla scelta del metodo e al suo pulsante, senza creare pazienti.
- [x] Errore di apertura annunciato con Riprova; verificati anche errore del modulo e recupero.
- [x] Tastiera, contenimento del focus e percorso di ritorno, con otto cicli ripetuti. Ruolo non autorizzato senza accesso alla bozza, anche con elenco vuoto.

Su mobile il Nome focalizzato è visibile **sopra** la barra inferiore, non soltanto presente nel viewport.

Screenshot dalla **SPA reale con soli dati sintetici**, sul codice del commit [`2b7ae913`](https://github.com/l2v-hub/ClinicOS/commit/2b7ae91375289209dea113498ade8dfd5faf719a):

![A mano apre il modulo e focalizza Nome](https://raw.githubusercontent.com/l2v-hub/ClinicOS/PROOF_COMMIT/artifacts/task-validation/402-manual-intake/screenshots/manual-form-name-focused.png)

![Mobile: Nome accessibile e visibile sopra i comandi](https://raw.githubusercontent.com/l2v-hub/ClinicOS/PROOF_COMMIT/artifacts/task-validation/402-manual-intake/screenshots/mobile-manual-form.png)

[Report QA e decisione finale](https://github.com/l2v-hub/ClinicOS/blob/PROOF_COMMIT/artifacts/task-validation/402-manual-intake/validation-report.md) · [Assert browser](https://github.com/l2v-hub/ClinicOS/blob/PROOF_COMMIT/artifacts/task-validation/402-manual-intake/test-results/browser-results.json) · [Trace](https://github.com/l2v-hub/ClinicOS/blob/PROOF_COMMIT/artifacts/task-validation/402-manual-intake/trace.zip) · [Video desktop](https://github.com/l2v-hub/ClinicOS/blob/PROOF_COMMIT/artifacts/task-validation/402-manual-intake/video/final-desktop.webm) · [Receipt deploy](https://github.com/l2v-hub/ClinicOS/blob/PROOF_COMMIT/artifacts/task-validation/402-manual-intake/frontend-release-receipt.json).

Verifica indipendente, poi ripetizione del gate da parte dell'integratore: build/types e117 test mirati passano;13 controlli browser, zero errori imprevisti e zero richieste di creazione/conferma paziente. La suite generale mantiene12 fallimenti preesistenti, dichiarati e confrontati nel report, senza nuove regressioni.

Versione pubblicata su [ClinicOS](https://clinicos-eosin.vercel.app), deployment production READY con SHA/alias verificati e HTTP200. La bozza nel collaudo usa trasporto simulato: non è una prova di database reale o di validazione clinica/dispositivi in reparto. Nessun paziente di produzione usato per i test.
