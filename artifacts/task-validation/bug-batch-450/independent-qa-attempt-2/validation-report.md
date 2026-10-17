# Independent QA cycle 2 — READY FOR CODEX QA

Batch bug-batch-450: issues #450, #472, #473, #475, #476. Dedicated independent reviewer intake_450_qa2. Planning baseline `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`; actual final browser checkpoint `0eae11061ada23a60f888c36fd8923a6dbba93d1`. Implementation cycle 2/4, external reviews 0/4; root owns accounting/publication. Final frozen runner SHA256 `c9394ec455e533cef59a2c6a6dd2a948984af16b73ba9002b2275821bb9a0c10`.

| Phase | Result | Independent evidence |
|---|---|---|
| 0 Contract | PASS | `task-contract.md`, `issue-read-receipts.json`; all five live issues/comments read, #450 owner comment6154947896 preserves complete one-page intake |
| 1 Full diff/scope | PASS | `diff-review.md`, `source-review-inventory.json`, `approved-runner-delta.json`; all47 source paths and ten frozen packet documents checked; original eight unchanged |
| 2 Build/tests | PASS | Frontend1390/1390, focused backend69/69, proactive23/23 including historical U; frontend app typecheck/build, backend typecheck, frontend source+bundle scanner pass; `phase2-commands.json`, `phase2-tsc-corrected.json`, `commands.json`, `logs/` |
| 3 Real Playwright | PASS | Fresh final19/19, errors[]; `final-browser/test-results/fullstack.json`, actual source47 before/after/runtime receipts, PNG/trace/WebM, `playwright-report/index.html` |
| 4 Security | PASS | Checklist below, `font-provenance.json`, `final-integrity-audit.json`, runtime source isolation and unknown-source/access negatives; zero raw signed simulator tokens across359 portable files |

## Actual acceptance and result artifacts

| Issue | Actual proof | PNG | Trace | Video |
|---|---|---|---|---|
| #450 | Exactly two responsive document/manual choices and keyboard navigation; full manual form preserved; auto-only admission incomplete; actual created identity survives reload and SQL readback | `final-browser/evidence/issue450.png` | `final-browser/evidence/issue450.zip` | `final-browser/evidence/issue450.webm` |
| #472 | Full viewport import, source alongside editable data, real save/leave/resume and visible owned draft after reload | `final-browser/evidence/issue472.png` | `final-browser/evidence/issue472.zip` | `final-browser/evidence/issue472.webm` |
| #473 | Actual heading-free parser rows persist without administrations; derived absent sex reviewable; original remains visible while editing demographics/therapy at1180×820,820×1180,390×844; actual edited therapy note survives reload | `final-browser/evidence/issue473.png`, `issue473-handoff-{1180,820,390}.png` in same evidence directory | `final-browser/evidence/issue473.zip` | `final-browser/evidence/issue473.webm` |
| #475 | Authenticated real PDF thumbnails and scanned JPX page render actual OpenJPEG decoded pixels; anonymous/foreign operator cannot read original | `final-browser/evidence/issue475.png` | `final-browser/evidence/issue475.zip` | `final-browser/evidence/issue475.webm` |
| #476 | Three-field import creates one incomplete identity without invented birthdate; invalid supplied fields and unsafe prescriptions have actionable blockers; repeat confirm idempotent and actual SQL/admin count verified | `final-browser/evidence/issue476.png` | `final-browser/evidence/issue476.zip` | `final-browser/evidence/issue476.webm` |

The five traces/videos intentionally share the complete actual combined run, with distinct per-issue result screenshots and check names. Twelve final PNGs are valid; representative result states for all five issues, phone/tablet original and corrected/blocked conflict states were visually inspected. The real WebM is69.04 seconds (VP8), not a placeholder. All five ZIPs pass integrity checks. On phone, original text remains actually visible during therapy editing: canvas visible305×79.21875px with276 dark text pixels, shell scrollTop0; see `original-visible-390.json`.

### QA450-1 correction verified end to end

Real footer/header-X/Escape saves while conflicts remain unresolved create zero draft requests or rows, keep the original available, and show the actionable decision message. An unsaved selected decision also cannot create an intent. After the real PUT review selects Corretto, the real draft contains firstName Corretto and address Solo correzione attuale, with exactly one creation. `final-browser/evidence/qa450-1-blocked-close.png` and `qa450-1-corrected-draft.png` show the results. The actual caller/lifecycle unit regressions independently cover definitive409→same-extraction corrected retry and unchanged uncertain network/503 recovery; they are included in frontend1390. The historical class-only QA1 reproducer bypasses this corrected caller and remains an immutable diagnostic, not an application acceptance failure.

### Retained attempts and exact scope

The first independent full-stack run passed18 checks and failed the final card lookup because the test remained on Nuovo ingresso. It never reached that SQL assertion and is preserved at this directory root with fullstack.json/failure PNG/redacted trace. Root independently viewed that state and authorized three runner-only corrections: real sidebar navigation before card+SQL, standard Playwright cached launch with explicit local override, and47-path source hashing from the root-frozen list on clean HEAD. `runtime-first-attempt.md`, `stop-provenance.json`, `approved-runner-delta.json` and `runtime-portability-check/result.json` preserve this sequence. All46 other source files, including application and unit-test bytes, are identical; the passing1390/69/23 and compiler checks therefore cover the final application. Original164 historical files and all original frozen documents remain hash-identical.

The final independent run used a new output directory and fresh owned database. Its receipt records the actual clean tracked checkpoint and all47 hashes, rather than relying on uncommitted Git diff. Source-before/source-after/runtime match. Root's local checkpoint introduced no byte changes. No source edit, commit, push, PR, GitHub mutation, Claude invocation, deployment or closure was performed by this reviewer.

## Security checklist

| Check | Result |
|---|---|
| Secrets | Frontend source/built-bundle scanner0 findings. Every portable text/ZIP scanned for real signed simulator token format:0 findings. Actual ephemeral local signed tokens are redacted in traces while retaining requests/responses/snapshots. No external credentials passed into test child environment. |
| PHI | Synthetic generated names, CF/PDF and test residents only. Original real-patient attachments were not downloaded or used. Raw issue dumps remain private outside repository; only sanitized criteria/URL/hash read receipts are portable. |
| Logging | No new application debug/clinical logging. Existing test output and synthetic provider contract explicit. |
| Input | CF/calendar derivation validates source; explicit conflicting sex preserved, optional import birthdate remains unknown, invalid provided values rejected. Source bytes bounded; canonical source scope rejects noncanonical/duplicate/traversal paths. |
| AuthZ | Existing requireOperator/owned draft/job gates retained, list is actor-scoped/no-store. Actual anonymous and foreign signed operator source reads denied without source text leakage. Proactive23 verifies real policy/role/scope behavior, including U. |
| Injection/XSS | No new application raw SQL/raw HTML rendering. Test SQL only reads/cleans its owned synthetic database; source text stays ordinary React text. |
| Dependencies | No new package/lockfile changes. Seven real pinned WOFF2 fonts match retained package SHA512 and exact tarball bytes; two OFL licenses verified, no blank CSS/fonts. |
| Config | No production auth/CORS/TLS/model/deploy weakening. Single outer global flock covered every complete lifecycle. Only owned loopback55450 PostgreSQL16 containers were created/stopped; development port5432/database was untouched. Both QA containers and application services were removed naturally. |

## Commands and limits

Frontend `npm exec -- tsc --noEmit -p tsconfig.app.json`, `npm run build`, `npm test`; backend TypeScript, six focused integration files in their existing demo-header fixture environment and proactive-e2e.test.ts in its separate signed-simulator environment. Logs show69 and23 passed in their first independent commands, zero skip/fail. The initial frontend typecheck helper mistakenly addressed a nonexistent nonhoisted typescript path; its MODULE_NOT_FOUND log is retained and the correct npm-exec command passed. This was a QA launcher error, with no source change.

Final browser command was one outer `flock /tmp/clinicos-browser-qa.lock` around the real canonical runner and all owned startup→browser→teardown. It used explicit local `/usr/bin/chromium` and the known Playwright cache for ffmpeg. Actual runner-code probes verify the empty-options cached-browser default and overrides; actual hosted GitHub Actions browser installation/native CI execution remains a later root-owned check. No local TLS bypass or font network bootstrap was used.

External OCR/extraction is the declared deterministic synthetic provider fixture. Real application HTTP upload, authenticated storage/source bytes, job hash/attempt lifecycle, parser, review UI, PDF.js/OpenJPEG pixels, drafts, SQL, confirmation and reload are exercised. Actual paid provider inference is not verified. Required CI, exact-SHA external Claude Max review and verified online release remain root-owned gates before closing any issue.

**READY FOR CODEX QA**

Codex must now re-run the QA Gate.
