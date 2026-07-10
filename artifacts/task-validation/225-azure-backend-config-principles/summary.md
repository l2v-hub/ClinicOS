# #225 — Azure backend config principles (READY FOR CODEX QA)

Deliverable docs-only: `docs/azure-backend-config-principles.md`.
- AC1 env/secret model documentato (variabili per dominio + Key Vault).
- AC2 provider swappable via env (adapter providers/*, nessun cambio codice).
- AC3 nessun deploy di produzione eseguito (solo documentazione).
Nessun cambio di codice/schema/API → nessuna regressione. Non Agnos/UI-facing → Playwright non richiesto.
