# ClinicOS — Batch processing report (2026-06-22)

Session processed all 17 open `BUG-*` issues. **Production deploy was blocked for the whole batch**
(GitHub Actions billing failure → Railway backend; Vercel FE builds stalled/quota; Railway API
unreachable via TLS interception). So fixes were engineered + locally verified + **merged to `main`**,
and issues left **open** for the owner to close after a production deploy + prod re-verification.

| Issue | Type | Title | Outcome | PR | Local verify |
| ----- | ---- | ----- | ------- | -- | ------------ |
| #68  | BUG-046 | Import: repeated anagraphic header | Fix on `main`; prod stale | — | header-filter 15/15; prod E2E reproduces staleness |
| #70  | BUG-048 | Import: source comparison | Fix on `main` (996d41b) | — | markdown-parse 18/18 |
| #71  | BUG-049 | Import: files not persisted | Fix on `main` (996d41b) + migration | — | markdown-parse 18/18 |
| #91  | BUG-053 | Ingresso: dolore not editable | ✅ Fixed + merged | #104 | E2E persistedPresente:true |
| #94  | BUG-056 | Therapy: multiple times | ✅ Fixed + merged | #105 | E2E rowCount:1, 3 times |
| #101 | BUG-063 | Anamnesi: same allergies | ✅ Fixed + merged | #106 | E2E per-patient empty allergie |
| #90  | BUG-052 | Scatta foto camera | ✅ Already fixed (d716aa8) | — | prod evidence committed |
| #92  | BUG-054 | Remove anamnesi familiare/lavoro | ✅ Fixed + merged | #107 | both cards gone |
| #97  | BUG-059 | Contenzioni: remove interval field | ✅ Fixed + merged | #108 | 0 refs, build PASS |
| #100 | BUG-062 | Dimissione: remove giro medicazione | ✅ Fixed + merged | #109 | 0 refs, build PASS |
| #96  | BUG-058 | Medicazioni/contenzioni not saved | 🔎 Not reproducible (persists) | — | E2E save/reload/backend all true |
| #103 | BUG-065 | Consegne: overlapping windows | ✅ Fixed + merged | #110 | E2E inline edit, no overlay |
| #93  | BUG-055 | Therapy not set at admission | ⛔ Blocked (BE deploy + no local OCR) | — | fix plan documented |
| #95  | BUG-057 | Therapy: fractional doses | ⛔ Blocked (Prisma migration + BE deploy) | — | fix plan documented |
| #98  | BUG-060 | Add Tinetti + NRS scales | ✅ Fixed + merged | #111 | build PASS; 17/17 scoring tests |
| #99  | BUG-061 | Separate Esami/RX/Consulenze windows | ✅ Fixed + merged | #112 | build PASS; 7/7 sort tests |
| #102 | BUG-064 | Invio in PS print window | ✅ Fixed + merged | #113 | build PASS; 9/9 tests + preview screenshot |

## Legend
- ✅ Fixed + merged to `main`, locally verified, `status-tested`, **awaiting prod deploy** (open).
- 🔎 Investigated, not reproducible on current `main` (open, awaiting prod re-test).
- ⛔ Blocked by infra (backend deploy) / schema migration — `status-blocked`, fix plan in issue.
- 📋 Implementable FE work, not done this session — plan posted in issue (open).

## Update — 2026-06-22 (later session)
The three remaining FE bugs that were only *planned* are now **implemented + merged to `main`**
(all front-end only — ride the existing cartella JSON / read-only therapy GET, no schema/backend change):
- **#98** Tinetti + NRS scales — PR #111
- **#99** Esami / RX / Consulenze separated sections — PR #112
- **#102** Invio in PS print window — PR #113

All build-PASS + unit-tested, labelled `status-tested`, left **open** pending prod deploy.
Still `status-blocked` (need owner action): **#93** (therapy at admission — BE deploy + OCR) and
**#95** (fractional doses ½/¼ — requires additive Prisma migration + BE deploy; NOT done because
CLAUDE.md forbids schema changes without explicit authorization).

## Blockers to clear (owner action)
1. **GitHub Actions billing** — restore so `deploy-backend.yml` (Railway) runs.
2. **Vercel** — confirm build quota/billing; FE deploys stalled with no logs.
3. After deploy: re-verify #68/#70/#71 (import E2E), #96 (persistence), and the merged FE fixes
   (#91/#94/#101/#92/#97/#100/#103/#98/#99/#102) on prod, then close.
4. Data hygiene: patients edited under the old buggy default may have fabricated clinical data
   persisted (see #101) — reset contaminated cartelle.
5. **#95**: authorize the additive Prisma migration (`dosaggioConfezione` + `quantitaPrescritta`)
   so fractional doses can be implemented properly; **#93**: needs BE deploy + a local OCR path.
