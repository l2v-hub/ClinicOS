Correzione preliminare dell'ingresso **pubblicata online**: per il nuovo ingresso sono obbligatori nome, cognome, codice fiscale valido e data di nascita valida. Telefono e altri dati assenti si possono completare successivamente; non serve un ulteriore clic di conferma anagrafica. Le prescrizioni effettive e le proposte di importazione mantengono i controlli di revisione.

Applicazione: commit [`318b81a0`](https://github.com/l2v-hub/ClinicOS/commit/318b81a056897bb5c3f4bae273f1225febca8297), Vercel production READY, alias [ClinicOS](https://clinicos-eosin.vercel.app). Metadata gitSource e GitHub SHA verificati, HTTP200 e backend health ok.

Screenshot con **soli dati sintetici**, verificato sul componente reale e sul commit definitivo:

![Quattro dati obbligatori; riepilogo e creazione disponibili senza telefono](https://raw.githubusercontent.com/l2v-hub/ClinicOS/main/artifacts/task-validation/intake-minimum-identity-20261008/postcommit/screenshots/minimum-identity-ready.png)

[QA indipendente](https://github.com/l2v-hub/ClinicOS/blob/main/artifacts/task-validation/intake-minimum-identity-20261008/postcommit-qa-report.md) · [18 assert browser](https://github.com/l2v-hub/ClinicOS/blob/main/artifacts/task-validation/intake-minimum-identity-20261008/postcommit/test-results/browser-results.json) · [Trace](https://github.com/l2v-hub/ClinicOS/blob/main/artifacts/task-validation/intake-minimum-identity-20261008/postcommit/trace.zip) · [Receipt deploy](https://github.com/l2v-hub/ClinicOS/blob/main/artifacts/task-validation/intake-minimum-identity-20261008/frontend-release-receipt.json).

133 test mirati e build/types/secret scan superati. La suite generale conserva12 fallimenti preesistenti dichiarati nel report; nessun nuovo fallimento. La persistenza nel browser è simulata e non prova una creazione in produzione.

Ora procedo con i27 bug individuali, **uno alla volta**, partendo da #402. Questa nota non certifica ancora #402 né chiude l'audit complessivo: le prove cliniche e su dispositivi reali in reparto restano da effettuare.
