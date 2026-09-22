# Release policy decision receipt

2026-09-22 — root integration owner — ALLOW exact reviewed source 5470d1f929e1fc068eb64314228531606079701c26204d625961803e51a2a2d5 to be committed and pushed to codex/subtle-dashboard-notifications, then deployed to the existing ClinicOS demo backend and Vercel frontend.

Authority: current request to fix Parametri loading and note indication, with earlier explicit instruction to push completed changes for verification on clinicos-eosin.vercel.app. Backend extension is necessary for an accurate persisted counter without per-patient fetch fan-out. No new schema, environment setting, permission or infrastructure change.

Release gate: 14 frontend tests, 18 isolated DB/backend tests, frontend/backend compilation, production build, 34 browser assertions, independent QA READY FOR CODEX QA. Record exact commit and deployments. Only named source/test files and this task's selected evidence may be staged. Preserve unrelated files.

Railway target: project bddf5d1b-ee83-4362-8238-a79721f795e5, demo environment 8021987e-8eaa-4bc8-a102-20566db5e6b4, service c000f011-0349-4ea9-9b56-13c625b5767b. Export tracked backend/frontend workspace inputs, Prisma and scripts from the commit. Exclude railway.json to preserve the already-working demo service build/start configuration (established release practice; no settings edits). Deploy only to this existing service.

Vercel target: clinicos__, project prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6, existing alias clinicos-eosin.vercel.app. Use a clean commit-derived export. Promote frontend only after backend health and deployment success. No merge, force push, patient write, new infrastructure or worktree deletion. This is a local authority/evidence record, not a distributed Ruflo capability claim.
