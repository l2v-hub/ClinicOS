# PO16 backend MNA PDF completato

Worktree C:\Workspace\ClinicOSHouse-worktrees\po16-mna-backend; branch codex/po16-mna-presentation; baseline 53e57d694850775b85ad1d22904e7bb1e6e84618.

MNA PDF: 1 punto, decimali con virgola e IMC leggibile (64/160 → 25), conservando precisione vicino alle soglie. Solo nuovi documenti mna-a4-v2; scoring, snapshot e PDF storici invariati.

15 test verdi su 5 file: 12 del run precedente, con input pertinenti identici, e 3 finali dal cwd backend. I due alberi sono esplicitati in consolidated-tests.json. 48 migrazioni esistenti, DB sintetici chiusi; typecheck e diff PASS. Due fallimenti di fixture preservati; nessuna modifica applicativa dovuta a tali correzioni.

V1 reale PO15 ripristinato tramite transazione UTC con trigger attivi: 3 retry, renderer 0, record/metadati/27707 byte/SHA/manifest/snapshot invariati. La discrepanza temporale già presente nel dump è preservata. Il nuovo v2 archivia 27,5 e IMC 25 mantenendo i valori raw.

4 PDF v2 e tutte le 16 pagine ispezionate; nessuna sovrapposizione o taglio. Le 28 prove PDF correnti e le 8 prove legacy sono incluse. I 16 file PDF/snapshot dei due tentativi falliti sono preservati e non fanno parte della QA visiva finale.

Source manifest SHA256 633af929a87194280f2e79e9cb10f2cc6b44f9baad2593ad38da7e25ea8d14e5; changed tree b88e834e03dd050bfdfbd3a281584a1164c41edeca24b3f3e80750d99d829fbf; input tree 66e3ef8b667d50d8668c8e27b597a46ba4430b7505fca64de8de3d1f196417c7, 4 sorgenti e 1104 input. Review sorgenti indipendente PASS senza P1/P2; binding artefatti da confermare.

Root copia sourcePaths e artifactCopyAllowlist. Includere legacy-v1/state.json e legacy-v1/mna-ready-v1.pdf: sono fixture obbligatorie dei test. Tutte le claim worker rilasciate. Root completa build/HTTP/browser e decide il rilascio; nessun commit/push/deploy dal worker.
