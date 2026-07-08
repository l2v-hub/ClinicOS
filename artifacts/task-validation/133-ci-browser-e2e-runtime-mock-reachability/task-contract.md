# Task Contract

## Task
- Title: 133 ci browser e2e runtime mock reachability
- Slug: 133-ci-browser-e2e-runtime-mock-reachability
- Type: bugfix
- Date: 2026-07-06
- GitHub Issue: #133 (CI: job browser-e2e req020 fallisce per drift ambientale — runtime mock mai contattato)

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no (solo CI/E2E) |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | yes (CI env) |

## Current Behaviour (root cause)

Il runtime AI (uvicorn) fa bind su `host="0.0.0.0"` (wildcard **IPv4**, NON `::1`). Il backend Node 20
risolve `localhost` a **IPv6 `::1`** per primo, quindi il fetch a `http://localhost:8000` va su `[::1]:8000`
→ ECONNREFUSED → **il runtime mock non viene mai contattato**; il job import fallisce con `retryable_error`.
La health-check via `curl http://localhost:8000` "passa" perché curl ripiega su IPv4, mascherando il difetto.
Inoltre `e2e/import-happy-path.mjs` calcola `created` ma lo **stampa soltanto**: un `created=false` passa in
silenzio (solo le eccezioni incrementano `failures`).

## Expected Behaviour

- Il backend contatta il runtime mock in modo deterministico (endpoint IPv4 non ambiguo).
- Un controllo CI verifica che il runtime abbia ricevuto la chiamata job (oltre alla health).
- L'happy path E2E **asserisce** l'import riuscito (fallisce con diagnostica esplicita altrimenti).
- Il job API-level (`gate`) resta verde. Nessun segreto/PHI nei log.

## Acceptance Criteria

- AC1: workflow browser-e2e usa endpoint runtime non ambiguo e raggiungibile → `http://127.0.0.1:8000`.
- AC2: verifica in CI che il runtime mock riceva la chiamata job (grep access-log `/v1/document-jobs`).
- AC3: `req020-desktop`/`tablet` arrivano alla review o falliscono con errore diagnostico esplicito.
- AC4: l'happy path asserisce la creazione (non solo stampa `created`).
- AC5: il job API-level `gate` resta verde (fix compatibile).
- AC6: nessun log CI espone segreti/PHI (fixture sintetiche, token mock).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Modifica CI/E2E |
| Integration | no | |
| API | no | |
| Playwright | no (locale) | Il browser E2E gira in CI (mode B: no run locale) |
| Persistence after refresh | no | |
| Security/privacy scan | no | |
| CI workflow lint | yes | YAML structural check + `node --check` sullo script E2E |

## Evidence Plan

- validation-report.md con analisi root-cause + diff
- `node --check e2e/import-happy-path.mjs` OK
- YAML structural check del workflow
- Prova runtime = esecuzione del job CI (Codex gate, mode B)

## Risks

- Rischio: cambiare la `gate` job destabilizza il verde. Mitigazione: `localhost`→`127.0.0.1` è strettamente
  più sicuro (il runtime fa bind 0.0.0.0 ⊇ 127.0.0.1); non può rompere un job che già raggiungeva via IPv4.
- Rischio: falso verde se l'assert AC4 è troppo lasco. Mitigazione: fallisce esplicitamente su `created=false`
  con dump dello stato job (step "Dump server logs on failure" già presente).

## Gate Status

READY FOR IMPLEMENTATION
