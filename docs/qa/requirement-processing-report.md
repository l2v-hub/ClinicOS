# ClinicOS — Requirement/Bug processing report (2026-06-23)

Batch run via `/process-requirements` over all open `REQ-`/`BUG-` issues in `lucalavia/ClinicOS`.

## Key discovery this run
Contrary to the prior "dual deploy blocked" assumption, **both production services are live**:
- **Frontend (Vercel `clinicos-eosin`)** — HTTP 200, but was serving a **stale bundle** (Vercel deploy is *manual*, not Git-auto). Ran `vercel deploy --prod --archive=tgz --yes` → new bundle `index-CQEFE1oX.js` now contains the merged features (verified by bundle-string scan).
- **Backend (Railway `clinicos-backend-production-df88`)** — `/health` 200, `/patients` serving. BUT the Railway **management API** (`backboard.railway.com`) is unreachable from this network (corp TLS interception: `invalid peer certificate: UnknownIssuer`), so backend **deploy/verify is not possible from this environment**.

## Results

| Issue | Type | Title | Iter | Outcome | PR | Verify | Deploy |
| ----- | ---- | ----- | ---: | ------- | -- | ------ | ------ |
| #98  | BUG-060 | Scala Tinetti + NRS | 1 | ✅ CLOSED | #111 | build, 17/17 scoring, synthetic shots | FE Vercel prod (bundle has `Tinetti`×11) |
| #99  | BUG-061 | Esami/RX/Consulenze separated | 1 | ✅ CLOSED | #112 | build, 7/7 sort, synthetic shot | FE Vercel prod (`Esami & Consulenze`×2) |
| #102 | BUG-064 | Invio in PS print window | 1 | ✅ CLOSED | #113 | build, 9/9, preview shot | FE Vercel prod (`Invio in Pronto Soccorso`×4) |
| #90  | BUG-052 | Scatta Foto camera | 1 | ✅ CLOSED | (d716aa8) | bundle has `getUserMedia`/`facingMode`; flow shots | FE Vercel prod |
| #96  | BUG-058 | Medicazioni/contenzioni not saved | 1 | ✅ CLOSED | — | **prod API round-trip PASS** (save/reload/idempotent) | BE Railway live + FE prod |
| #68  | BUG-046 | Parser: repeated anagraphic header | — | ⛔ BLOCKED | (on main) | header-filter 15/15 (unit) | ✗ backend deploy/verify unreachable |
| #70  | BUG-048 | Import source comparison | — | ⛔ BLOCKED | (996d41b) | markdown-parse 18/18 (unit) | ✗ backend deploy/verify unreachable |
| #71  | BUG-049 | Import files persisted to Documents | — | ⛔ BLOCKED | (996d41b) | markdown-parse 18/18 (unit) | ✗ backend deploy/verify unreachable |
| #93  | BUG-055 | Therapy set at admission | — | ⛔ BLOCKED | — | fix plan documented | ✗ needs BE change+deploy+OCR |
| #95  | BUG-057 | Fractional doses ½/¼ | — | ⛔ BLOCKED | — | fix plan documented | ✗ needs Prisma migration (owner OK) + BE deploy |

**Closed: 5 · Blocked (open): 5.**

## Blockers (owner action)
1. **Railway management API unreachable from this network** (corp TLS interception) → cannot deploy or verify the backend here. The 5 blocked issues all need a backend deploy and/or the live OCR import stack. Run the backend deploy from the Railway dashboard or a non-intercepting network, then verify #68/#70/#71 with a synthetic import.
2. **#95** additionally needs explicit authorization for an additive Prisma migration (`PatientTherapy.dosaggioConfezione` + `quantitaPrescritta`) — CLAUDE.md forbids schema changes without owner OK.
3. **#93** needs a backend change (`persistTherapiesFromCartella`) + the OCR runtime to verify.

## Notes
- All verification used synthetic data only (no PHI). The #96 prod API round-trip created/used the synthetic demo patient (`DEMO-FULL-001`) and cleaned up its QA records.
- Evidence committed under `requirements/evidence/BUG-060|061|064|052|058/`. Repo is **private**, so screenshots are linked via GitHub blob URLs (inline raw embedding is not possible for private repos) — owner-authenticated viewing.
