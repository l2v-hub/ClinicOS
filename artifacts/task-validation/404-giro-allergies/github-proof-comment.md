## Risolto e verificato online

Commit applicativo: `848ae9613c3cfe2a6eae81308719964475dc9afe`. Vercel production `dpl_GrzPUgT6JHKFwNCkEhzwLBTxqR6C` READY sullo stesso commit; alias [ClinicOS](https://clinicos-eosin.vercel.app/#/terapie) verificato.

Le schede Giro mostrano lo stato letto dalla cartella e gli allergeni con gravità/reazione prima di **Somministra**. Assenza verificata, paziente nega, dato non documentato/non disponibile sono distinti. Dettagli locali con tastiera/click mantengono paziente, data, fascia, filtro e posizione. Nessuna decisione automatica di compatibilità o modifica al payload di somministrazione.

QA indipendente e ripetizione Codex: **17/17 controlli sulla SPA reale**, **34/34 test mirati**, types/build OK. Conferma supervisore: annullamento senza scritture; conferma con chiave corretta; aggiornamento e ricaricamento verificati. Errori401/403/503, retry, timeout, cambio operatore e risposte obsolete verificati. Massimo4 letture fresche contemporanee, capability negata senza letture.

Regressione completa:1163 PASS/12 fallimenti preesistenti identici, **zero nuovi**; non è una suite globalmente verde.

### Infermiere — allergie prima dell’azione
![Giro infermiere, dati sintetici](https://raw.githubusercontent.com/l2v-hub/ClinicOS/PROOF_COMMIT/artifacts/task-validation/404-giro-allergies/screenshots/nurse-allergy-before-action.png)

### Mobile — informazione leggibile senza uscire dal giro
![Giro mobile, dati sintetici](https://raw.githubusercontent.com/l2v-hub/ClinicOS/PROOF_COMMIT/artifacts/task-validation/404-giro-allergies/screenshots/mobile-allergy-before-action.png)

### Conferma completa in ambiente di test
![Conferma supervisore sintetica](https://raw.githubusercontent.com/l2v-hub/ClinicOS/PROOF_COMMIT/artifacts/task-validation/404-giro-allergies/screenshots/supervisor-confirmation-dialog.png)

[Report e ricevute](https://github.com/l2v-hub/ClinicOS/tree/PROOF_COMMIT/artifacts/task-validation/404-giro-allergies) includono screenshot, trace, video nominati, report HTML/JSON, hash del sorgente e verifica di rilascio. Sono prove sulla SPA con API locali intercettate e dati sintetici: la persistenza è simulata nel trasporto, non una certificazione del database, della compatibilità clinica o dell’hardware in reparto. **Nessuna scrittura su pazienti reali**. I quattro criteri della issue sono verificati entro questi limiti.
