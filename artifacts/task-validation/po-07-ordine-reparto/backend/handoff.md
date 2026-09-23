# PO-07 backend — consegna all'integratore

Implementazione completata e sorgenti congelati nel worktree `C:/Workspace/ClinicOSHouse-worktrees/po07-roster-order`, branch `codex/po07-roster-order`, baseline `853b40750c25f24ef40db622674612aaf64bf2cb`.

- 28 file sorgente applicativi/test/schema/migrazione da integrare: elenco e SHA256 in `source-manifest.json`.
- SHA256 manifest: `dc68b03f90c4be301f2674da03de3c826d844374ff09e06ef62b6717a6e52fd2`.
- Tree SHA256 dei sorgenti modificati: `444525230458481446a25ec128601817bc25db0b67d6f8b37be024ba5558dc86`.
- Tree SHA256 di tutti gli input backend: `148981313b29a3a2e39a2f1e9364e29d26198857dc66f5048c52b76bfefca55f`; dettagli in `input-manifest.json`.
- 58/58 test, 13 file, PostgreSQL nativo loopback nuovo con tutte le migrazioni applicate; runner terminato e cluster chiuso.
- Typecheck noEmit, Prisma validate e diff check backend/Prisma verdi. Nuovi file sotto 500 righe; therapy-slots.ts 467.
- Entrambi i claim PO-07 backend rilasciati; ricevute in `claims-release.json`.

Il contratto API resta quello concordato. Query esplicita uguale all'ordine persistito restituisce `temporary:false`; un ordine diverso o un profilo assente restituisce `temporary:true`. La firma a tre argomenti di buildTherapySlotPage resta compatibile: actor facoltativo derivato da registeredById.

Il cursore v3 invalida intenzionalmente token v2 e cursori di altre viste. Le regressioni precedenti sono state adeguate. Il nuovo order-key-db.test.ts verifica camere/letti mancanti, incoerenza assegnazione, zeri iniziali, numeri di 28+ cifre e bootstrap storico asOf.

Non integrare cartelle `postgres-*`, output generati in node_modules o schema privato dagli artefatti. Gli artefatti sono evidenza locale: generare il client privato nel checkout integratore usando lo schema applicativo. I due PowerShell preesistenti restano esclusi e intatti. Nessun package/lockfile, commit, push, deploy o server browser effettuato dal worker.

Root conserva integrazione, manifest combinato, QA browser, benchmark baseline/candidate e autorizzazione alla pubblicazione. Questa ricevuta non sostituisce tali gate.
