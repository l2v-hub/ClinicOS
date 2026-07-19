# Parallel Evidence Remediation

## Overview

**Parallel Evidence Remediation** è la modalità operativa che ClinicOS usa quando
Codex (Product Owner + QA Gatekeeper) rifiuta una o più GitHub Issue per **mancanza
di evidenza oggettiva**. L'obiettivo è chiudere il gap tra "il codice compila / la AC
sembra soddisfatta" e "esiste una prova verificabile che Codex può ispezionare",
lavorando su **più issue in parallelo** ma con l'**esecuzione Playwright serializzata**
sullo stack locale condiviso.

Il principio guida è unico e non negoziabile: **niente evidenza oggettiva → niente
chiusura**. Claude produce codice, test e artefatti di prova; Codex riesegue il QA Gate
e decide. Claude non chiude, non fa merge, non fa deploy.

Questa modalità è la contropartite operativa della governance descritta in
`.ai/PROJECT_RULES.md`, `AGENTS.md`, `CLAUDE.md` (Mandatory Codex Gate Override) e del
metodo di validazione (`artifacts/validation/` → qui `artifacts/task-validation/`).

---

## When to use this mode

Attiva la Parallel Evidence Remediation quando accade una qualsiasi di queste cose:

- Codex marca una issue come **"QA FAILED — MISSING OBJECTIVE EVIDENCE"**.
- Una issue riceve una delle label: `qa-failed`, `needs-evidence`, `playwright-required`.
- Una issue **non è chiudibile** perché mancano prove oggettive (screenshot / trace).

**Trigger phrases** (in issue, commenti, richieste): `QA FAILED`,
`MISSING OBJECTIVE EVIDENCE`, `needs-evidence`, `playwright-required`,
`evidence remediation`, `Codex QA gate`, `issue non chiudibile`,
`screenshot mancanti`, `trace mancanti`.

Se vedi uno di questi segnali, non "rispiegare" a parole che la feature funziona:
**genera l'evidenza oggettiva** secondo questo documento.

---

## Roles & governance

| Ruolo                             | Chi        | Cosa può fare                                                                                                                                     | Cosa NON può fare                                                                           |
| --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Product Owner + QA Gatekeeper** | **Codex**  | Rieseguire il QA Gate, decidere QA PASSED / QA FAILED, applicare `qa-passed` / `closed-verified`, **chiudere** le issue, autorizzare merge/deploy | —                                                                                           |
| **Implementer**                   | **Claude** | Scrivere codice, scrivere test, **produrre evidenza oggettiva**, allegarla alla issue, dichiarare lo stato                                        | Chiudere issue, applicare `qa-passed`/`closed-verified`, fare merge, push su `main`, deploy |

**Claude non dichiara mai "done" / "fixed" / "closed".** Claude dichiara esattamente
uno di questi tre stati:

- **READY FOR CODEX QA** — evidenza oggettiva completa e allegata alla issue.
- **BLOCKED** — impossibile procedere (dipendenza, ambiente, credenziali, PHI); motivo esplicito.
- **FAILED VALIDATION** — la verifica è stata eseguita ma il risultato NON soddisfa la AC; nessuna prova falsamente positiva.

---

## What counts as objective evidence

Codex **rifiuta** tutto ciò che non è verificabile. Non sono evidenza:

- commenti testuali ("ho verificato", "AC soddisfatta");
- un `validation-report.md` **senza** prove allegate;
- riferimenti a SPEC o ad altre issue;
- dichiarazioni "AC satisfied" senza artefatti.

**È evidenza oggettiva**, e va salvata sotto
`artifacts/task-validation/<issue-number>-<slug>/`:

| Artefatto                      | Obbligatorio                                 | Note                                                                       |
| ------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------- |
| `task-contract.md`             | Sì                                           | Scope, AC, perimetro file, definizione di "verificato" per questa issue    |
| `validation-report.md`         | Sì                                           | Con **percorsi file REALI** agli artefatti sottostanti + tabella PASS/FAIL |
| Screenshot finale Playwright   | Sì                                           | Mostra il **RISULTATO verificato** (non una homepage generica)             |
| `trace.zip` (Playwright trace) | Sì                                           | Trace completo del flusso                                                  |
| `playwright-report/` (HTML)    | Sì                                           | Report HTML della run                                                      |
| `test-results/`                | Sì                                           | Output della run (incl. screenshot/trace per test)                         |
| Video `.webm`                  | Sì se l'issue tocca **UI / chatbot / voice** | Registrazione del flusso                                                   |

### Rendere l'evidenza VISIBILE a Codex

Pushare un branch **non basta**: Codex legge la **issue**. Per ogni issue rimediata:

1. **Allegare lo screenshot finale alla GitHub Issue**, embeddato via URL
   `raw.githubusercontent.com` **pinnato allo SHA del commit** (non `main`, che si muove).
   Esempio:
   `https://raw.githubusercontent.com/l2v-hub/ClinicOS/<COMMIT_SHA>/artifacts/task-validation/<issue>-<slug>/final.png`
2. Aggiungere **link** a `trace.zip`, `playwright-report/`, `test-results/` (stessi path pinnati allo SHA).
3. Scrivere la **decisione** dichiarata da Claude (READY FOR CODEX QA / BLOCKED / FAILED VALIDATION).

---

## Playwright minimum bar

Un test non è evidenza se si limita a navigare e fare screenshot. Ogni test deve avere
**asserzioni reali**:

- `expect(locator).toBeVisible()` sul **risultato** (non su un contenitore qualsiasi).
- Verifica del **valore reale** del risultato: `expect(...).toContain(...)` / `.toBe(...)`.
- **Nessun console error**: registrare `page.on('console', ...)` e asserire che non ci sia
  nessun messaggio di tipo `'error'`.
- **Nessun HTTP 4xx/5xx rilevante**: registrare `page.on('response', ...)` /
  asserire `response.ok()` sulle chiamate del flusso.
- **Persistenza dopo reload**: quando il flusso **crea o aggiorna** dati, ricaricare la
  pagina e verificare che il dato sia ancora presente.
- Lo **screenshot finale** deve rappresentare il **risultato verificato** della issue.

Uno scheletro di riferimento:

```ts
const consoleErrors: string[] = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

const badResponses: string[] = [];
page.on('response', (r) => {
  if (r.status() >= 400 && isRelevant(r.url())) badResponses.push(`${r.status()} ${r.url()}`);
});

// ... esegui il flusso ...

await expect(result).toBeVisible();
await expect(result).toContainText('valore atteso');

// persistenza
await page.reload();
await expect(result).toBeVisible();

expect(consoleErrors, consoleErrors.join('\n')).toHaveLength(0);
expect(badResponses, badResponses.join('\n')).toHaveLength(0);

await page.screenshot({ path: `${process.env.EV_OUT}/final.png`, fullPage: true });
```

---

## How to split work into parallel batches

Le issue si raggruppano in **batch** per natura tecnica e perimetro file, così più agenti
lavorano in parallelo senza collidere. Esempio dal programma reale:

- **Batch A — Action Registry / Agnos / internal layer** (es. `#186 #187 #201 #202`)
  Feature interne → costruire una **superficie QA/test-only sicura** per poterle provare.
- **Batch B — Frontend / UI** (es. `#133 #137 #157`)
  Playwright su **UI reale**, con screenshot che prova il risultato.
- **Batch C — Routine / patients / persistence** (es. `#171 #204 #205 #206`)
  Flussi reali con **dati sintetici** + verifica **after-refresh**.
- **Batch D — Import / OCR / voice / advanced flows** (es. `#207 #214 #223 #224`)
  Flussi avanzati (upload, OCR, voce) con fixture sintetiche.

### Agenti coinvolti

Coordinator, Issue-Analysis, Frontend/Playwright, Backend/API,
Agnos-AI/Action-Registry, OCR/Import, QA-Evidence, Integration, Documentation.

Ogni agente ha un **perimetro file chiaro**. Regole:

- **Niente edit concorrenti sullo stesso file**.
- Usare **worktree/branch** separati per isolare il lavoro.
- **VINCOLO IMPORTANTE**: l'**ESECUZIONE Playwright deve essere serializzata** contro
  l'unico stack locale condiviso + Postgres. Run paralleli **corrompono** le asserzioni di
  refresh/persistence (stato DB condiviso). Il parallelismo vale per **analisi, stesura
  degli spec e reporting**, **non** per l'esecuzione dei test E2E.

---

## Internal features without a UI

Regola culturale: **mai dire "non posso fare uno screenshot di una feature backend".**
Per ogni feature interna senza UI, produrre **una** di queste tre opzioni:

- **(A)** un **endpoint interno QA/test-only** + test Playwright che lo interroga + screenshot del risultato;
- **(B)** una **pagina QA interna non-production** + Playwright + screenshot;
- **(C)** un **report HTML/JSON generato dal test**, aperto da Playwright, **asserito** e screenshottato.

Lo screenshot deve mostrare il **risultato finale verificato**, ad esempio:

- la lista dell'action-registry con **solo CRU** e **nessun Delete**;
- provider/model letti da **env** senza esporre alcun **secret**;
- un record **persistito e visibile dopo refresh**.

**Vincoli di sicurezza per qualsiasi superficie QA/test-only:**

- **disabilitata in produzione** oppure protetta da un **env flag**;
- **non** logga PHI / secret / token;
- usa **solo fixture sintetiche**.

---

## Privacy

- **Solo fixture sintetiche.** Mai dati paziente reali.
- I log possono contenere **solo**: `correlationId`, numero issue, nome test,
  provider/model (se rilevante), esito, errore **sanitizzato**.
- **Mai** loggare: dati paziente reali, prompt completi, output LLM completo,
  trascrizioni complete, secret, API key, token.

---

## Local stack (how ClinicOS runs for evidence)

- **Database**: Podman Postgres, container `clinicos-postgres`.
- **Backend**: porta `:3001` → `npm run dev:backend`.
- **Frontend**: porta `:5173` → `npm run dev:frontend`.
- **Role gate**: all'avvio, cliccare **"Operatore"** o **"Amministratore"**.
- **Agnos chatbot**: aprire via **FAB** con `aria-label` `"Agnos — Assistente ClinicOS"`;
  textarea `.agnos-input`; pulsante di invio **"Invia"**.

**Harness Playwright**: `@playwright/test` con una config che abilita
**trace + video + screenshot + HTML report**. Eseguire **una issue per invocazione**,
usando la env `EV_OUT` che punta alla cartella artefatti della issue
(`artifacts/task-validation/<issue-number>-<slug>/`).

Esempio invocazione:

```bash
EV_OUT="artifacts/task-validation/204-patient-persistence" \
  npx playwright test tests/evidence/issue-204.spec.ts
```

Config di riferimento (estratto):

```ts
export default defineConfig({
  outputDir: process.env.EV_OUT + '/test-results',
  reporter: [['html', { outputFolder: process.env.EV_OUT + '/playwright-report', open: 'never' }]],
  use: {
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    baseURL: 'http://localhost:5173',
  },
  workers: 1, // esecuzione serializzata sullo stack condiviso
});
```

---

## Workflow per issue (step by step)

1. **Analisi** — leggere la issue, la label (`qa-failed`/`needs-evidence`/`playwright-required`)
   e il commento di Codex. Capire quale **risultato** deve essere provato.
2. **Task contract** — scrivere `task-contract.md`: scope, AC, perimetro file, cosa significa
   "verificato" per questa issue.
3. **Batch & perimetro** — assegnare la issue al batch corretto (A/B/C/D) e all'agente con il
   perimetro file giusto; usare worktree/branch dedicato; niente edit concorrenti.
4. **Superficie di prova** — se UI reale → test su UI reale; se feature interna senza UI →
   scegliere strategia (A)/(B)/(C) e proteggerla con env flag / disabilitarla in prod.
5. **Test Playwright** — scrivere il test rispettando la **minimum bar** (visibilità, valore,
   no console error, no 4xx/5xx, persistenza after-refresh).
6. **Esecuzione serializzata** — eseguire **una issue alla volta** contro lo stack locale
   (`workers: 1`), con `EV_OUT` sulla cartella della issue.
7. **Raccolta evidenza** — verificare che in `artifacts/task-validation/<issue>-<slug>/` ci
   siano: `task-contract.md`, `validation-report.md` (path reali), screenshot finale del
   risultato, `trace.zip`, `playwright-report/`, `test-results/`, e `.webm` se UI/chatbot/voice.
8. **Commit & push** — commit con messaggio tracciabile; annotare lo **SHA** (serve per gli URL raw).
9. **Rendere visibile a Codex** — allegare alla **issue** lo screenshot finale embeddato via
   `raw.githubusercontent.com` pinnato allo SHA, più i link a trace/report/test-results, più la decisione.
10. **Dichiarazione di stato** — chiudere il lavoro con **READY FOR CODEX QA** (oppure
    **BLOCKED** / **FAILED VALIDATION**). **Mai** "done"/"fixed"/"closed".

---

## Output format (dichiarazione per issue)

```
Issue: #<n> — <titolo>
Batch: <A|B|C|D>
Stato: READY FOR CODEX QA | BLOCKED | FAILED VALIDATION
Commit SHA: <sha>
Evidenza (artifacts/task-validation/<n>-<slug>/):
  - task-contract.md
  - validation-report.md (path reali + tabella PASS/FAIL)
  - final.png (screenshot del risultato verificato)   ← allegato alla issue via raw URL @SHA
  - trace.zip
  - playwright-report/  (HTML)
  - test-results/
  - video.webm (se UI/chatbot/voice)
Asserzioni: toBeVisible ✓ · valore ✓ · no console error ✓ · no 4xx/5xx ✓ · persistenza after-reload ✓
Privacy: fixture sintetiche · nessun PHI/secret nei log
```

---

## What Codex does next

Dopo che l'evidenza oggettiva è allegata alle issue, **Codex riesegue il QA Gate** contro
gli artefatti allegati (screenshot pinnato allo SHA, trace, report, test-results, video) e
decide **close / keep-open**. Se l'evidenza è insufficiente, la issue torna
`qa-failed`/`needs-evidence` con il motivo, e il ciclo riparte.

Claude deve **sempre** chiudere il proprio intervento dichiarando esplicitamente:

> **Codex must now re-run the QA Gate.**
