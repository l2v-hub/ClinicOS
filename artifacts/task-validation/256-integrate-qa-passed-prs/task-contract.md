# Task Contract — Issue #256 (integrazione QA-passed + closure-readiness)

**Scope:** integrare le 6 PR QA-passed (#225/#251, #241/#250, #242/#247, #243/#248, #244/#249, #245/#252) su un branch pulito da `origin/main`, risolvere i conflitti in modo semantico, validare l'insieme (build/test/migration/Playwright integrato), investigare la CI, e per #246 verificare l'esistenza di un'identità server-verificabile. **#246 escluso** se l'identità non è verificabile.

**Non-goal:** chiudere issue, applicare label Codex, merge su main, inventare un IdP finto, indebolire l'auth dei documenti.

## Acceptance criteria (dall'issue) e come sono asseriti
- AC1 head QA-approved integrati da main senza modifiche estranee → merge `--no-ff`, head verificati vs tabella SHA (`logs/source-heads.txt`, `merge-manifest.md`).
- AC2 comportamenti sovrapposti di PatientDetail coesistono e passano i test browser combinati → merge semantico + `tsc -b` pulito + suite Playwright A–E 5/5.
- AC3 migration #241 da DB vuoto e da upgrade senza perdita dati → `logs/migration-241.txt` (empty 19 migration + upgrade fixture, terapia storica preservata NULL=ogni giorno).
- AC4 test/build automatici passano sul candidato integrato → `logs/build.txt` (BE+FE exit 0), `logs/tests.txt` (backend 316 + 42 mirati).
- AC5 scenari Playwright A–E con evidenza canonica → `test-results/` (trace+video+screenshot per scenario) + `playwright-report/`.
- AC6 CI risolta o blocco esterno oggettivo, nessun falso verde → `logs/ci-disposition.md` (billing block GitHub Actions, esterno).
- AC7 #246 escluso senza identità+authz verificabili → escluso; SECURITY ARCHITECTURE BLOCK documentato.
- AC8 nessun secret/PHI negli artifacts → `logs/privacy-secret-scan.txt` (solo dati sintetici).
- AC9 PR integrata aperta e `READY FOR CODEX QA`; nessuna chiusura/merge/label Codex.

## Impatto
Frontend: sì (PatientDetail, App, types, CSS, editor) · Backend: sì (parser #242, therapy PUT #241) · DB: sì (migration additiva #241) · Privacy/security: #246 escluso per auth non verificabile. Dati di test sintetici.

## QA surface
Stack locale integrato unico (Postgres Podman + backend :3001 + frontend :5173), suite Playwright A–E serializzata. Codex esegue la validazione Chrome finale.
