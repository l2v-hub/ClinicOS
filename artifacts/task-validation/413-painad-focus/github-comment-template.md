## Correzione verificata e pubblicata

Applicazione [`e01bd551`](https://github.com/l2v-hub/ClinicOS/commit/e01bd55114e2b5b1615b4088d988a41aad60eb80), baseline3790a95b. Frontend Vercel `{{DEPLOYMENT}}` **READY**, commit Git e alias [demo online](https://clinicos-eosin.vercel.app/) verificati; index e chunk PAINAD HTTP200. Backend409 invariato, health200.

- AC1: avvio sulla prima domanda «Respirazione», con focus e nome accessibile; contesto paziente e identificatore mantenuti senza le due anagrafiche ripetute.
- AC2: «Bozza in modifica», nessun Riprendi per la bozza attiva; nessun Riprendi nemmeno in anteprima; bozze inattive recuperabili e ripresa dopo chiusura e ricaricamento conservata.
- AC3: progresso/azioni persistenti e non coperti su desktop1150×1004, mobile390×844 e tablet820×1180; metadati compatti ma modificabili.
- AC4: testi/opzioni/punti/criteri/engine/versioni invariati, parziale distinto dal completo, anteprima e finalizzazione esplicite. Data obbligatoria mancante: metadati aperti e focus sul campo, nessun invio, sia con Salva che con Anteprima.

QA indipendente **nuova** poi rerun dell’integratore:38 test mirati ciascuno,9 browser ordinari +4 gruppi adversarial ciascuno. Le stesse13 prove browser sono passate sul frontend compilato online, con **ogni richiesta backend intercettata con dati sintetici prima della rete**. Nessuna scrittura su pazienti reali, nessuna finalizzazione di test. Reload delle risposte prova sessionStorage locale, non persistenza DB. Tre candidati intermedi superati: due respinti dalla QA e uno inizialmente READY ma respinto dall’integratore per il Riprendi ridondante in anteprima; tutte le prove precedenti conservate con manifest immutabili, report finale le supera e corregge esplicitamente la ricevuta post87 mancante.

Limiti espliciti: full suite1206 test,1194PASS,12 fallimenti identici alla baseline,0nuovi. CI backend: stesso singolo fallimento preesistente, import downstream saltato; nessuna dichiarazione “tutto verde”. Secret scan PASS; scansione ampia481 rilievi preesistenti,7dipendenze invariate,0rilievi nei file toccati. Nessuna certificazione hardware/sole/screen-reader.

[Report e prove pinning al commit](https://github.com/l2v-hub/ClinicOS/blob/{{PROOF}}/artifacts/task-validation/413-painad-focus/validation-report.md) · [QA indipendente](https://github.com/l2v-hub/ClinicOS/blob/{{PROOF}}/artifacts/task-validation/413-painad-focus/independent-qa/refinement-e01/validation-report.md) · [Manifest degli artefatti](https://github.com/l2v-hub/ClinicOS/blob/{{PROOF}}/artifacts/task-validation/413-painad-focus/publication-manifest.json).

### Prima domanda e azioni persistenti — desktop
Evidenze rieseguibili: [trace desktop](https://github.com/l2v-hub/ClinicOS/blob/{{PROOF}}/artifacts/task-validation/413-painad-focus/root-refinement-e01/online-verified/desktop-trace.zip) · [report browser](https://github.com/l2v-hub/ClinicOS/blob/{{PROOF}}/artifacts/task-validation/413-painad-focus/root-refinement-e01/online-verified/playwright-report/index.html) · [risultati](https://github.com/l2v-hub/ClinicOS/blob/{{PROOF}}/artifacts/task-validation/413-painad-focus/root-refinement-e01/online-verified/test-results/browser-results.json) · [video desktop](https://github.com/l2v-hub/ClinicOS/blob/{{PROOF}}/artifacts/task-validation/413-painad-focus/root-refinement-e01/online-verified/video/desktop.webm).

![PAINAD sintetico desktop](https://raw.githubusercontent.com/l2v-hub/ClinicOS/{{PROOF}}/artifacts/task-validation/413-painad-focus/root-refinement-e01/online-verified/screenshots/desktop-first-question.png)

### Prima domanda — mobile
![PAINAD sintetico mobile](https://raw.githubusercontent.com/l2v-hub/ClinicOS/{{PROOF}}/artifacts/task-validation/413-painad-focus/root-refinement-e01/online-verified/screenshots/mobile-first-question.png)

### Data mancante: campo raggiungibile, nessun invio
![Correzione data sintetica](https://raw.githubusercontent.com/l2v-hub/ClinicOS/{{PROOF}}/artifacts/task-validation/413-painad-focus/root-refinement-e01/online-extra-verified/screenshots/mobile-invalid-preview-date.png)

### Anteprima read-only: scheda completa originale
![Anteprima PAINAD sintetica](https://raw.githubusercontent.com/l2v-hub/ClinicOS/{{PROOF}}/artifacts/task-validation/413-painad-focus/root-refinement-e01/online-verified/screenshots/preview-full-source-sheet.png)
