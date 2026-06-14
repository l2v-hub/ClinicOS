---
name: process-requirement
description: Processa una singola GitHub Issue ClinicOS end-to-end in ambiente isolato, con Dynamic Workflow, esecuzione reale dell'app, verifica visuale iterativa, screenshot, test, push, deploy e chiusura della issue.
disable-model-invocation: true
allowed-tools: Bash Read Edit Write Glob Grep Agent Skill
disallowed-tools: AskUserQuestion
---

ultracode: processa autonomamente la GitHub Issue $ARGUMENTS come requisito ClinicOS completo.

# Regola fondamentale

Non chiedere chiarimenti all'utente.

Quando un dettaglio non è esplicito:

1. ricavalo dalla issue;
2. ricavalo dal codice esistente;
3. ricavalo dalle immagini allegate alla issue;
4. ricavalo da `.claude/design-reference/`;
5. applica la soluzione più coerente con i pattern esistenti.

Se un requisito non può essere verificato tecnicamente, documenta il blocco sulla issue, applica `status-blocked` e non chiuderla.

# 1. Lettura della issue

L'argomento `$ARGUMENTS` deve contenere il numero della GitHub Issue.

Esegui:

gh issue view $ARGUMENTS --json number,title,body,labels,state,url

Verifica che:

- la issue sia aperta;
- abbia label `clinicos-requirement`;
- non sia già chiusa;
- non sia già completata.

Ricava dalla issue:

- numero;
- REQ ID;
- titolo;
- contesto;
- scope incluso;
- scope escluso;
- acceptance criteria;
- test richiesti;
- eventuali immagini reference;
- pagina o route da verificare.

Se il REQ ID non è esplicito, usa il numero indicato nel titolo o nel corpo.

Aggiungi `status-processing` e rimuovi `status-ready`:

gh issue edit $ARGUMENTS --add-label "status-processing"
gh issue edit $ARGUMENTS --remove-label "status-ready"

# 2. Dynamic Workflow e agent team

Usa Dynamic Workflow.

Crea dinamicamente almeno questi ruoli:

- planner e codebase analyst;
- implementer;
- UI/UX visual reviewer;
- QA e regression tester;
- deployment verifier.

Aggiungi backend/API reviewer solo quando la issue coinvolge backend o persistenza.

Non permettere a più agenti di modificare contemporaneamente gli stessi file centrali.

Solo l'implementer principale modifica il codice condiviso. Gli altri agenti revisionano, testano e producono feedback.

# 3. Sandbox e sicurezza dati

Lavora esclusivamente nel worktree isolato in cui la sessione è stata avviata.

Non eseguire mai:

- prisma migrate reset;
- prisma db push --force-reset;
- seed distruttivi;
- reset database;
- cancellazioni massive;
- modifica di variabili production;
- scritture di test sul database production.

Per i requisiti esclusivamente UI:

- usa il backend reale solo per operazioni GET/read-only;
- non modificare API client, VITE_API_URL o mapping dati se non previsto dal REQ;
- non sostituire dati reali con mock, array statici o localStorage.

Per requisiti che necessitano scritture:

- usa un backend/database sandbox se configurato;
- se manca un ambiente dati sicuro, non eseguire scritture production;
- testa con fixture isolate o marca il requisito come bloccato.

# 4. Smoke test dati iniziale

Prima di modificare codice, verifica il backend:

curl -k -sS https://clinicos-backend-production-df88.up.railway.app/patients

Salva il risultato sintetico in:

requirements/evidence/<REQ-ID>/data-smoke-before.txt

Il test deve indicare:

- HTTP status;
- numero pazienti;
- struttura generale della risposta.

Se il backend contiene pazienti ma l'interfaccia non li mostra, considera il problema una regressione frontend.

# 5. Matrice di accettazione

Crea:

requirements/evidence/<REQ-ID>/acceptance-matrix.md

Per ogni acceptance criterion registra:

- criterio;
- metodo di verifica;
- pagina/route;
- test automatico o manuale;
- stato iniziale;
- stato finale;
- evidenza associata.

Non iniziare l'implementazione finché la matrice non è stata creata.

# 6. Avvio reale dell'applicazione

Usa prima le skill integrate:

/run
/verify

Se la ricetta di avvio ClinicOS non è ancora configurata, usa il progetto, i package.json e gli script esistenti per:

1. installare le dipendenze;
2. eseguire la build;
3. avviare frontend e servizi indispensabili;
4. usare una porta dedicata;
5. raggiungere la pagina interessata dal requisito.

Non considerare `npm run build` una verifica sufficiente.

L'applicazione deve essere realmente aperta e utilizzata.

# 7. Browser e screenshot

Usa Playwright con Chromium.

Se Playwright non è disponibile, installalo come dipendenza di sviluppo nel package corretto:

npm install --save-dev @playwright/test
npx playwright install chromium

Individua la route interessata dalla issue.

Per un requisito visuale, acquisisci almeno:

requirements/evidence/<REQ-ID>/before-desktop.png
requirements/evidence/<REQ-ID>/after-desktop.png
requirements/evidence/<REQ-ID>/after-tablet.png

Viewport obbligatori:

- desktop: 1366 × 768;
- tablet: 1024 × 768.

Lo screenshot deve includere:

- sidebar quando presente;
- header;
- navigazione interessata;
- contenuto modificato;
- area sufficiente a verificare visivamente il requisito.

Se la issue contiene immagini reference:

- scaricale o analizzale;
- confronta spaziature, allineamenti, gerarchia, colori e comportamento;
- non copiare brand o asset proprietari;
- usa palette blue medical ClinicOS.

# 8. Ciclo visuale iterativo obbligatorio

Non fermarti dopo la prima modifica.

Ripeti:

1. implementa;
2. build;
3. avvia o aggiorna l'app;
4. naviga sulla pagina target;
5. acquisisci screenshot;
6. fai valutare lo screenshot al visual reviewer;
7. confronta screenshot e acceptance criteria;
8. correggi ciò che non è conforme;
9. ripeti test e screenshot.

Continua finché:

- tutti i criteri visuali sono PASS;
- tutti i criteri funzionali sono PASS;
- non ci sono regressioni;
- oppure emerge un blocco tecnico reale e documentabile.

Il visual reviewer deve produrre per ogni iterazione:

- PASS/FAIL;
- differenze residue;
- elemento preciso da correggere;
- criterio della issue non ancora coperto.

Salva il report finale in:

requirements/evidence/<REQ-ID>/visual-verification.md

# 9. Test funzionali e regressione

Esegui:

- test richiesti nella issue;
- test unitari pertinenti;
- test di integrazione pertinenti;
- test Playwright;
- npm run build.

Verifica sempre almeno:

- pagina Pazienti mostra dati reali;
- Dettaglio Paziente mostra nome e dati;
- refresh non fa scomparire i dati;
- nessun errore API viene trasformato silenziosamente in lista vuota;
- navigazione principale continua a funzionare;
- nessun overflow orizzontale globale.

Ripeti lo smoke test dati e salva:

requirements/evidence/<REQ-ID>/data-smoke-after.txt

Il numero e la disponibilità dei pazienti non devono essere peggiorati dall'implementazione.

# 10. Condizioni per dichiarare il REQ completato

Il REQ è completato solo se:

- tutti gli acceptance criteria sono PASS;
- test richiesti PASS;
- build PASS;
- smoke test dati PASS;
- screenshot desktop prodotto;
- screenshot tablet prodotto;
- visual reviewer restituisce PASS;
- nessuna regressione sui dati;
- codice committato;
- branch pushato;
- preview deploy verificato;
- produzione verificata quando prevista;
- screenshot aggiunto al commento finale della issue.

# 11. Commit e tracciabilità

Crea un commit con formato:

<REQ-ID>: <titolo sintetico>

Esempio:

REQ-011: align patient detail gutter

Il commit deve includere:

- codice;
- test;
- acceptance matrix;
- visual verification report;
- screenshot finali.

Non includere segreti, file .env o dati sanitari identificativi negli screenshot.

# 12. Push, PR e deploy

Esegui:

git status
git add .
git commit -m "<REQ-ID>: <titolo sintetico>"
git push --set-upstream origin HEAD

Crea una Pull Request collegata alla issue:

gh pr create --title "<REQ-ID>: <titolo>" --body "Closes #$ARGUMENTS"

Attendi e verifica i controlli della PR.

Se il push genera un preview deployment:

- individua la preview;
- aprila;
- esegui nuovamente smoke test e screenshot;
- non procedere se la preview non soddisfa il requisito.

Effettua il merge solo se tutti i controlli sono verdi.

Dopo il merge:

- verifica il deployment production;
- esegui smoke test production;
- verifica nuovamente la pagina interessata.

# 13. Screenshot nella GitHub Issue

Dopo il push o il merge, ricava:

- repository;
- commit SHA finale;
- percorso screenshot;
- eventuale deploy URL.

Crea un commento conclusivo che includa:

- REQ ID;
- sintesi implementazione;
- file modificati;
- acceptance criteria;
- test eseguiti;
- risultato build;
- smoke test dati;
- commit SHA;
- branch;
- PR;
- deploy;
- screenshot desktop;
- screenshot tablet.

Usa collegamenti Markdown alle immagini committate, ad esempio:

![Desktop](https://github.com/<owner>/<repo>/blob/<commit-sha>/requirements/evidence/<REQ-ID>/after-desktop.png?raw=1)

![Tablet](https://github.com/<owner>/<repo>/blob/<commit-sha>/requirements/evidence/<REQ-ID>/after-tablet.png?raw=1)

Il commento deve mostrare o collegare chiaramente gli screenshot finali.

# 14. Chiusura issue

Chiudi la issue esclusivamente dopo:

- test PASS;
- visual verification PASS;
- screenshot allegati/commentati;
- push riuscito;
- deploy verificato;
- smoke test production PASS.

Poi:

gh issue edit $ARGUMENTS --remove-label "status-processing"
gh issue edit $ARGUMENTS --add-label "status-tested"
gh issue edit $ARGUMENTS --add-label "status-deployed"
gh issue close $ARGUMENTS

In caso di fallimento:

- non chiudere la issue;
- rimuovi `status-processing`;
- aggiungi `status-blocked` o `status-deploy-failed`;
- commenta il motivo preciso;
- allega comunque eventuali evidenze utili.

# Output finale

Restituisci:

- issue processata;
- stato finale;
- acceptance criteria PASS/FAIL;
- test;
- screenshot;
- commit;
- PR;
- deploy;
- eventuali blocchi.
