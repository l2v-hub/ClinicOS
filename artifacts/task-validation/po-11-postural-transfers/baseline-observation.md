# PO11 — Partenza verificata

Baseline applicativa d659c1b459eb72a2920cbd9f678a2c11f9bf7efd, PAINAD pubblicata e verificata. Trasferimenti non presente nella navigazione Moduli. Tre test HTTP su PostgreSQL nativo isolato eseguiti prima dell'integrazione: tutti falliscono al POST con400 assessment_invalid_input, Tipo o versione del modulo non supportati; non sono errori d'infrastruttura.

Root prepara server preview4192, fixture pazienti sintetici e test per completezza→finale/PDF, corrente dopo rettifica tardiva e attestazioni personali. Qualifica fisioterapista nel DB dell'attore principale, manager senza qualifica per test diniego. Perdita delle risposte dopo commit e ritardo salvataggio sono fault espliciti della fixture, non endpoint applicativi pubblicati.

Ambito di integrazione root: tests/fixtures/po11-transfers.mjs, tests/integration/po11-transfers.test.mts, artifacts/task-validation/po-11-postural-transfers. Backend/frontend restano nei due worktree assegnati fino al rilascio dei claim. Nessuna modifica o test scritto su pazienti online.
