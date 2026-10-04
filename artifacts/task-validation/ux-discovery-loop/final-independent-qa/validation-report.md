# QA indipendente finale

**Verdetto: READY FOR CODEX QA**

Candidato `347b490128564e194dbe907cbee8e4e2fd30e295`; baseline `750b0a03`.
Sessione dedicata `qa_gate_compact`, solo evidenze nella worktree QA. Nessuna modifica applicativa, pubblicazione o scrittura clinica online. Anteprima5187 fermata.

| Fase | Esito | Evidenza |
|---|---|---|
| 0 Contratto | PASS | [task-contract.md](task-contract.md), validato indipendentemente; AC1-7, massimo10 cicli, frontend. Fonte: richiesta/commenti dell'utente; nessuna issue GitHub fornita. |
| 1 Diff completo | PASS | `750b0a03...347b4901`,32 file, `git diff --check` pulito. Nessun backend/schema/API/env/dependency change. Pattern design, navigazione e controlli preservati; nessun bug applicativo rilevato. |
| 2 Build/test | PASS | [discovery65/65](test-results/discovery-focused.txt), [turno65/65](test-results/focused.txt), [TypeScript noEmit](test-results/tsc.txt)exit0, [build](test-results/build.txt)tsc-b/Vite exit0,662moduli. |
| 3 Browser | PASS |11 discovery +17 turno gruppi; dashboard5larghezze e destinazione dose; App reale con programmazione collassata, toggle/reload. Artefatti sotto. |
| 4 Sicurezza | PASS | Secret/PHI/logging/input/AuthZ/XSS/dependencies/config controllati: fixture sintetiche, token simulato, nessun nuovo log applicativo/HTML non affidabile/dependency/env change; validation e permission guards provati.0markerQA nel bundle;0scritture cliniche nei harness discovery/density/default; acknowledgement solo mock. |

## Fonte esatta

[Source receipt](source-receipt.json):816input tracciati e156file build hashati SHA256.

- Frontend tree: `bcb83db530fe862ccb221c999bce9bc4ca1dca40`.
- Source tree: `57a00291ad7cab3fb6295ba665a05b8f7c29fb97`.
- Tests tree finale: `3b33f7544d74e4f29a6a978b4d508ab0062bc56f`.
- Lockfile blob: `3f9cbd93ae2b38d42ca257660d70815bedcc8b3a`.
- Fingerprint: `63af8a5d5fc3dabedd16e1648da4a32bf38384877660c5f93ac3178c9d28cee7`.

Build indipendente eseguito su ceafb0ee;130test, noEmit e11+17 browser ripetuti su d4478012. Frontend identico al candidato finale. Commit successivi modificano soltanto assert del harness dashboard, rieseguito PASS su347b4901. Diff di ogni correzione rivisto; receipt vincolato alla fonte finale. File estraneo preesistente `start-claude-team.ps1` preservato/escluso dagli input app; nessun diff app/test/package nella checkout QA.

## Criteri verificati

| AC | Esito / prova |
|---|---|
| 1 | PASS: Piano terapeutico unico, programmazione collassata, dettagli/azioni preservati, target di prescrizione/dose rivelati. |
| 2 | PASS: quantità invalida blocca invio, cambio unità/preset coerente, revoca permesso chiude editor, refresh fresco, isolamento PRN/data, feed malformato visibile, hash/history/reload/shell corretti. |
| 3 | PASS:390/768/1074/1395 e regressioni1161/1575, niente overflow; disclosure e diario focus/Escape. |
| 4 | PASS: stato legacy dichiarato indisponibile, priorità originale senza lettura inventata;12aggregate/1row, ack mock fallito/riuscito persistente e author restriction. |
| 5 | PASS:10cicli nel ledger, QA dedicata. Correzioni dei soli assert di validazione finale dichiarate; nessun nuovo ciclo applicativo. |
| 6 | PASS pre-pubblicazione:130test/TypeScript/build. Push, deploy frontend e controllo live restano al gatekeeper. |
| 7 | PASS: confronto e5larghezze sotto, testi/dose/via/stato completi, bottoni48px; azione atterra sul farmaco/dose07:00 corretto con pannello autorizzato. |

## Densità indipendente

Baseline canonica118px KPI/234px riga a1150, vincolata a9ca67e361186157e3c087d08bb3ec154635c361f in `tests/ux-discovery/density-baseline.json`: misurata dall'integrazione, fonte/CSS rivisti. Candidato rieseguito indipendentemente. Le correzioni di ID/flag fixture non cambiano testi o geometria dashboard.

| Larghezza | KPI | Riga Adesso | Bottoni | Clipping/overflow |
|---:|---:|---:|---:|---|
|390|64px|182px|48px|0/false|
|768|64px|106px|48px|0/false|
|1074|64px|162px|48px|0/false|
|1150|64px|146px|48px|0/false|
|1395|64px|126px|48px|0/false|

A1150: KPI−45.8%, righe−37.6%, includendo la singola posizione validata. Nessuna informazione clinica/azione rimossa.

## Evidenze

- Screenshot: [dashboard1150](screenshots/dashboard-1150.png), [dashboard390](screenshots/dashboard-390.png), [terapia App collassata1074](screenshots/actual-therapy-default-collapsed-1074.png), [prescrizione](screenshots/therapy-programming.png), [errore quantità](screenshots/invalid-quantity.png), [allergia/parametri](screenshots/actual-patient-1074.png), [diario](screenshots/actual-diary-1074.png).
- Trace: [discovery](trace/ux-discovery.zip), [turno](trace/ux-turno.zip), [density](trace/density-runtime.zip), [default](trace/default-therapy.zip).
- Video: [discovery](video/ux-discovery.webm), [turno](video/ux-turno.webm), [density](video/density-runtime.webm), [default](video/default-therapy.webm).
- HTML: [rollup](playwright-report/index.html), [discovery](playwright-report/discovery.html), [density](playwright-report/density-runtime.html).
- Risultati: [11discovery](test-results/discovery-runtime.json), [17turno](test-results/runtime.json), [density/dose finale](test-results/density-runtime.json), [default](test-results/default-therapy.json).

## Nota sui limiti e sugli assert corretti

Il harness supplementare QA ha richiesto correzione del percorso import e inizializzazione di un flag mock. Nel dashboard harness, d4478012 attendeva erroneamente l'autoespansione del dettaglio prescrizione: la dose apre correttamente il pannello calendario07:00.4d18435a cercava il testo visibile Somministra come nome accessibile; il nome è Erogata:.347b4901 passa ID/dose/via/ora, expanded state, contenuto pannello e conteggio azione. Nessuna modifica app tra questi tentativi. Warning build preesistenti: chunk>500kB e Node shell-spawn; nessun errore. Full suite non certificata e nessuna pretesa di assenza di tutti i bug. Backend condiviso Ho capito/count exact rimane indisponibile fino a rilascio server autorizzato separatamente; questa QA non lo certifica. Pubblicazione e verifica live sola lettura riservate al gatekeeper.

**READY FOR CODEX QA**
