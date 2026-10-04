# Frontend release decision

- Decision: PERMIT scoped push and production frontend publication.
- Authority: user requested push/online visibility and confirmed l2v-hub/ClinicOS as origin; existing authorization persists.
- Candidate: 203bb256d9ba913be84345be2259bd2c7652cafc.
- Independent verdict: READY FOR CODEX QA; all five phases PASS. 135 focused tests, TypeScript/Vite build, 18+12 browser groups, HTTP observer and security checks.
- Input fingerprint: 53c4305f51c7a5da9e2ce50065a4209ed3a8c8a7deab34b6c0af1071f27600b8. Root comparison: 821 inputs match; 14 EOL-only differences aligned to independently verified bytes; no Git application/test diff.
- Destination: https://github.com/l2v-hub/ClinicOS, codex/ux-discovery-loop. Normal push only, no main merge or force push.
- Frontend destination: existing Vercel project clinicos__, prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6; https://clinicos-eosin.vercel.app.
- Envelope: frontend only, no production database/backend/auth/config changes. Existing .vercelignore excludes backend, artifacts, environment files and worktrees. Synthetic local evidence only; no clinical mutations online.
- Backend readiness: existing acknowledgement services passed 20 real HTTP/Postgres tests in a new local synthetic cluster after applying tracked migrations. This is supplementary evidence, not a production backend release decision; no online database was accessed.
- Live verification: separate browser tab, preserve the user's in-progress form; record bundle, computed severity colour, duplicate count and availability states without clinical payloads.
