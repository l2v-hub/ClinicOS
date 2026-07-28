---
name: clinicos-git-tooling-gotchas
description: "rtk filtra l'output di git (diff/ls-files mentono) — usare `rtk proxy git`; gh account da switchare su l2v-hub; quota staging Azure SWA fa fallire la preview PR"
metadata:
  node_type: memory
  type: project
  originSessionId: 01ea8de7-1f94-469a-9de1-e1ee134bd1fe
  modified: 2026-07-28T13:20:50.676Z
---

Tre trappole incontrate il 2026-07-27 nel portare una PR fino al deploy.

**1. `rtk` filtra l'output di git e lo rende ingannevole.** L'hook riscrive `git <cmd>` in
`rtk <cmd>`, che tronca/riassume l'output. Conseguenze osservate: `git ls-files --others`
restituiva 0 righe con decine di file untracked reali; `git diff --name-only HEAD origin/main`
tornava vuoto su alberi diversi; `git diff --quiet A B && echo uguali` stampava "uguali" su
tree hash diversi. Per qualunque git di _plumbing_ usare `rtk proxy git ...` (bypassa il filtro),
oppure confrontare gli hash: `git rev-parse HEAD^{tree}` vs `git rev-parse origin/main^{tree}`.
Non fidarsi mai di un `git diff` vuoto come prova di uguaglianza.

**Why:** ho quasi concluso che il lavoro locale fosse già su main basandomi su un diff vuoto
che era solo output filtrato — una svista che avrebbe potuto far perdere il lavoro.

**How to apply:** prima di decisioni distruttive (switch/reset/rm su file "identici"), verificare
con `rtk proxy git` o con diff per contenuto (`git show origin/main:<f> | diff - <f>`).

**2. `gh` ha due account; quello attivo non ha i permessi.** `llavial2v` è attivo ma il repo è
`l2v-hub/ClinicOS` → `git push` fallisce con 403. Sbloccare con
`gh auth switch --user l2v-hub` (entrambi già autenticati nel keyring).

**3. Workflow Azure Static Web Apps — RISOLTO il 2026-07-28 (PR #309): disattivato.** Deployava il
frontend su una seconda produzione (`orange-hill-02285750f.7.azurestaticapps.net`, risorsa
`clinicos-frontend` / `clinicos-rg`) in parallelo a Vercel, che è la produzione vera, e su ogni PR
creava un ambiente di staging. Il piano Free ne consente 3, il `Close Pull Request Job` riportava
`success` senza eliminarli, e il risultato era `Build and Deploy Job` rosso su OGNI PR. Ora il file
è `azure-static-web-apps-orange-hill-02285750f.yml.disabled`: riattivarlo è un rename inverso
(secret e risorsa Azure intatti), ma prima va capito perché la chiusura non ripuliva.

Gotcha correlato: la SWA vive nella sottoscrizione **"Azure subscription 1"**, non in quella di
default della CLI (`SystemCeramics Azure Enterprise`) — `az staticwebapp list` senza
`--subscription` restituisce vuoto e sembra che la risorsa non esista.

Vedi [[clinicos-deploy-mechanics]] per la procedura di deploy e [[clinicos-branch-topology]].
