# Validation report — Issue #225 (Preparazione futuro backend Azure)

**Final Decision: READY FOR CODEX QA**

Tipo: **docs-only** (PR #251). Nessun codice runtime, schema, API, frontend o migration toccati. Deliverable: `docs/azure-backend-config-principles.md` (85 righe).

## Esito acceptance criteria

| AC | Esito | Evidenza |
|----|-------|----------|
| AC1 — modello env/secret documentato | ✅ § "1. Env / secret model (AC1)" (vars per dominio: AGNOS_LLM_*, AZURE_OPENAI_*, AI_OCR_*, AI_EXTRACTION_*; custodia segreti Railway→Key Vault) |
| AC2 — dipendenze provider swappabili | ✅ § "2. Provider dependencies remain swappable (AC2)" (adapter env-driven) |
| AC3 — nessun deploy in produzione | ✅ § "4. Future Azure migration checklist (no action now — AC3)"; **nessun deploy eseguito** |
| Coerenza / no regressione | ✅ docs-only → build/type/lint invariati (nessun file di codice modificato) |

## Evidenza
- `screenshots/azure-principles-doc.png` — render del documento con le sezioni AC1/AC2/AC3 visibili.
- Playwright non richiesto (issue esplicita: no UI/Agnos). L'evidenza applicabile per una issue docs-only è: documento presente e coerente + nessuna regressione (nulla di runtime cambiato) + nessun deploy.

## Artefatti
`screenshots/azure-principles-doc.png` · `trace/trace.zip` · doc: `docs/azure-backend-config-principles.md`. Test render: `e2e/issue-225-shot.mjs`.

Claude non chiude, non mergia, non deploya. Codex resta l'unico QA Gatekeeper.
