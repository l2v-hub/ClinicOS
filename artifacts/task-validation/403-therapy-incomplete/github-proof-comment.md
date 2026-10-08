## #403 — correzione verificata e online

Commit applicativo: `038dd839cc69d054d38caeac2eb17dc146440746`. Deploy Vercel production `dpl_FYwJUybuhcZX2BC7DRQX59w2UA78`: READY, SHA esatto e alias pubblico verificati. Nessuna modifica backend/schema/config.

- Conteggi distinti di dosi programmate e terapie incomplete nella prima schermata, anche su mobile.
- Zero dosi non viene più confuso con assenza di terapia; giorno/settimana e PRN distinti.
- Il medico con `therapy.update` apre la prescrizione completa già compilata, anche dalla seconda pagina. Nessun orario ricavato dalle fasce; nuove righe con ora vuota. Altri profili vedono il referente medico.
- Avviso e dettagli prima della griglia, senza scorrimento verticale interno.

QA indipendente e nuova esecuzione root:13/13 prove browser e36/36 test mirati PASS; tipi/build/security PASS. Regressione completa1165 test:1153 PASS e12 fallimenti identici alla baseline, zero nuovi. Non è una dichiarazione di suite globale verde.

Screenshot della SPA reale con **soli dati sintetici locali**, vincolati al commit pubblicato; verifica online di deploy/assets/health in sola lettura. Nessun paziente reale modificato, nessuna certificazione hardware/clinica dell'epic #429.

### Desktop: dosi e programmazione incompleta

![Desktop — conteggi distinti e avviso iniziale](https://raw.githubusercontent.com/l2v-hub/ClinicOS/PROOF_COMMIT/artifacts/task-validation/403-therapy-incomplete/screenshots/desktop-incomplete-first-screen.png)

### Mobile: avviso leggibile nella prima schermata

![Mobile — programmazione da completare visibile](https://raw.githubusercontent.com/l2v-hub/ClinicOS/PROOF_COMMIT/artifacts/task-validation/403-therapy-incomplete/screenshots/mobile-incomplete-first-screen.png)

### Prescrittore: orario da inserire, non inventato

![Prescrizione esistente — nuovo orario vuoto](https://raw.githubusercontent.com/l2v-hub/ClinicOS/PROOF_COMMIT/artifacts/task-validation/403-therapy-incomplete/screenshots/doctor-explicit-time-required.png)

[Report completo e limiti](https://github.com/l2v-hub/ClinicOS/blob/PROOF_COMMIT/artifacts/task-validation/403-therapy-incomplete/validation-report.md) · [Receipt sorgente](https://github.com/l2v-hub/ClinicOS/blob/PROOF_COMMIT/artifacts/task-validation/403-therapy-incomplete/independent-source-receipt.json) · [Trace](https://github.com/l2v-hub/ClinicOS/blob/PROOF_COMMIT/artifacts/task-validation/403-therapy-incomplete/trace.zip) · [Deploy receipt](https://github.com/l2v-hub/ClinicOS/blob/PROOF_COMMIT/artifacts/task-validation/403-therapy-incomplete/frontend-release-receipt.json)
