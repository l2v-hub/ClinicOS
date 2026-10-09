Correzione #406 pubblicata e verificata in produzione.

- Via di somministrazione: rimossi i regimi terapeutici; «Al bisogno» resta solo nel Tipo terapia.
- I cambi di tipo conservano la via effettiva e la bozza degli orari; il regime PRN non genera somministrazioni programmate.
- Riepilogo con Via e Tipo terapia distinti. I valori legacy ambigui richiedono revisione esplicita, senza conversioni automatiche.
- Backend/intake respingono il regime usato come via prima delle scritture. Le modifiche parziali non aggirano la verifica; sospensione/conclusione esatta non riscrive i dati clinici.

Applicazione: [`c11c0990`](https://github.com/l2v-hub/ClinicOS/commit/c11c0990f6313a53a8bcde467046eecef69e012a). Prove immutabili: [`PROOF_SHA`](https://github.com/l2v-hub/ClinicOS/commit/PROOF_SHA). #405 escluso da questa release.

QA indipendente e ripetizione del root: frontend 38/38, backend 48/48; types/build/security superati; PostgreSQL reale 6/6 casi specifici + 21/21 regressioni; SPA reale desktop/mobile 9/9. Suite completa: 1179 test, 1167 pass e 12 errori preesistenti identici alla baseline, zero nuovi errori. Browser con trasporto sintetico; persistenza DB verificata separatamente. PostgreSQL locale 18.4, non identico al CI 16. Nessuna scrittura su pazienti di produzione, nessun PHI o segreto negli allegati.

Deployment Vercel `dpl_FsEgnzXDHUsKqDs67R3swyPnjpXe` READY sul commit applicativo, alias e chunk live verificati HTTP200. [Workflow backend](https://github.com/l2v-hub/ClinicOS/actions/runs/37893378620): checkout effettivo c11c0990; Railway `208694a8-aed2-4895-abf4-e101cb67c40f` SUCCESS, image digest registrato, health HTTP200.

### Risultato su dati sintetici

![PRN dopo ricaricamento: via SC e tipo Al bisogno distinti](https://raw.githubusercontent.com/l2v-hub/ClinicOS/PROOF_SHA/artifacts/task-validation/406-therapy-route-regime/independent/screenshots/desktop-created-prn-after-reload.png)

![Record legacy da verificare senza conversione automatica, mobile](https://raw.githubusercontent.com/l2v-hub/ClinicOS/PROOF_SHA/artifacts/task-validation/406-therapy-route-regime/independent/screenshots/mobile-legacy-review-field.png)

[QA indipendente](https://github.com/l2v-hub/ClinicOS/blob/PROOF_SHA/artifacts/task-validation/406-therapy-route-regime/independent/validation-report.md) · [Ripetizione root](https://github.com/l2v-hub/ClinicOS/blob/PROOF_SHA/artifacts/task-validation/406-therapy-route-regime/root-rerun/validation-report.md) · [Receipt deploy](https://github.com/l2v-hub/ClinicOS/blob/PROOF_SHA/artifacts/task-validation/406-therapy-route-regime/deployment-receipt.json) · [Manifest hash](https://github.com/l2v-hub/ClinicOS/blob/PROOF_SHA/artifacts/task-validation/406-therapy-route-regime/independent/publication-manifest.json) · [Risultati browser](https://github.com/l2v-hub/ClinicOS/blob/PROOF_SHA/artifacts/task-validation/406-therapy-route-regime/independent/test-results/browser-results.json) · [Report HTML](https://github.com/l2v-hub/ClinicOS/blob/PROOF_SHA/artifacts/task-validation/406-therapy-route-regime/independent/playwright-report/index.html) · [Trace desktop](https://github.com/l2v-hub/ClinicOS/blob/PROOF_SHA/artifacts/task-validation/406-therapy-route-regime/independent/trace.zip) · [Video desktop](https://github.com/l2v-hub/ClinicOS/blob/PROOF_SHA/artifacts/task-validation/406-therapy-route-regime/independent/video/desktop.webm) · [Procedura revisione clinica](https://github.com/l2v-hub/ClinicOS/blob/c11c0990f6313a53a8bcde467046eecef69e012a/docs/therapy-route-regime-review.md).

AC1–4 soddisfatti. Limiti e waiver dichiarati nei report; non si dichiara concluso l'audit clinico/hardware #429.
