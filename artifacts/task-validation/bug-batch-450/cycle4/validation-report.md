# Author correction report — PR481, Claude review round2

Status: READY FOR INDEPENDENT QA. Final author attempt4/4 is sealed; no fifth attempt or counter reset. Source subject before correction:111e672faf77b45280d8ef6ebb15268180b58376. Root owns commit/push, fresh independent QA, actual Claude review and release.

## Actual results

| Check | Actual outcome |
|---|---|
| Fresh full frontend unit suite, final formatted application source |1395 PASS,0FAIL,0SKIP (`frozen-frontend-tests.log`) |
| Required `npm --prefix frontend run build` (TypeScript + Vite) |PASS (`frozen-frontend-build.log`) |
| Existing backend import seed/provenance regressions |12PASS,0FAIL (`backend-seed-tests-current.log`); backend source unchanged |
| Actual production build + Vite preview under `/qa-clinicos/`, real isolated API/PostgreSQL, browser/SQL/reload |22PASS, errors[] (`complete-runtime/test-results/fullstack.json`) |
| Original vs minimal candidate CSP, actual self-hosted main.js and network worker.js |Original wasm denied; candidate wasm allowed; JavaScript eval denied in both, both contexts (`csp/policy-comparison.json`) |
| All historical packet paths |502 prior files recomputed unchanged, including old stale historical manifest |
| Diff whitespace/source syntax |PASS before seal |

The final fullstack uses NODE_ENV=production for both build/preview, existing production script/worker policy on HTML and worker responses, and adds only the owned loopback backend origin to connect-src in its test proxy. Backend uses existing demo authorization with synthetic data. Actual HTTP upload, storage, import orchestration, review, source authorization, draft persistence, parser and SQL execute. Only external OCR/extraction is a deterministic synthetic provider fixture; no paid provider or real patient data.

## Claude findings and acceptance

| Finding / AC | Evidence and resulting behavior |
|---|---|
|1 /AC1 close lifecycle |Existing ConfirmDialog has save(only eligible), close without saving, continue. Continue receives initial focus when save disabled; Tab/ShiftTab stay inside; Escape dismisses top dialog. X/footer/Escape tested with unresolved decisions; close creates zero draft rows; session recovers; Continue retains dirty choice; after resolving, exactly one draft persists and is listed after reload. Three-action row wraps; existing two-action callers retain defaults. |
|2 /AC2 manual responsive |Manual missing steps default closed; import defaults open. Real manual820x1180 and390x844 prove no visiblepopover intersection, direct elementFromPoint hit and typing on first field, plus screenshots. Raw hidden details BCR is not treated as painted obstruction; no applicationCSS change remains. |
|3 /AC3 built PDF |Actual nonroot production build renders both real text/JPX thumbnails and selected scanned page with pixels. Antialias-aware integrated ink values79713/71900 pass, same-size actual encoded whiteJPEG controls both0 fail. Actual built worker200 text/javascript and `/qa-clinicos/assets/pdfjs-6.2.108/openjpeg.wasm`200 application/wasm, zero failed assets/console errors. |
|3 /precise diagnosis |Built resource paths already correct; original policy rejects actual OpenJPEG WebAssembly compilation and falls back to JS. Only `wasm-unsafe-eval` added to script-src; every other directive, origin, rewrite, cache/auth unchanged; JS eval remains blocked. Root's real online static receipts confirm same restrictive header and working asset/MIME paths. The exact reported hosted blank-preview failure is NOT reproduced, and no deployed fix is claimed. |
|4 /AC4 bounded roster |Luna implemented bounded summary/helper/focused tests; senior reviewed/integrated. One memoized incomplete list, one count/filter toggle, existing row indicators. Real30synthetic incomplete patients produce exactly one summary button and30 filtered rows. Searching complete-only subset hides zero-count card and still displays complete patient; no empty hidden-filter trap. |
|5 /AC5 provenance |Frontend no longer auto-mutates missing sex before submission. Existing backend is sole derivation authority. Intake reads `_derivedFields` and shows 'Sesso dal codice fiscale, da verificare' until explicit confirm/edit; confirmation persists reviewRequired=false, marker remains absent after actual reload/SQL check. Explicit contradictory sex remains selected and warned in focused unit; backend12existing tests preserve explicit source values. |
|6 /AC6 immutable receipt |`historical-evidence-receipt.json` explicitly classifies old final-manifest as historical and proves empty source diff0eae11061..111e672fa outside artifacts. New source freeze/evidence manifest binds all current proof; no old manifest, PNG, video, trace, log, plan or report rewritten. |

## Additional contextual proof

Issue485 remains separate. The same actual import review at1903x1032 occupies x0,y0,width1903,height1032; PNG and geometry receipt under final runtime. No inference about another unobserved phase, batch membership, closure, or deploy.

## Historical diagnostics and bounds

`author-diagnostic-index.json` preserves failed author checks and their precise causes rather than removing them. These include environment setup, harness CORS/role/visibility oracle corrections, the actual original-CSP wasm rejection, and actual three-action dialog clipping corrected within this ongoing reserved attempt. The final source was not changed during its passing22check runtime. Prior attempts1–3 remain spent; root's reservation/counter is not reset.

No commits, pushes, labels, issue closure, main merge, hosted clinical API, production database, Azure call or deployment performed by this author. The existing Railway release hold remains. Global browser lock released and owned fixture services/container removed; user Vites5304/5311 and existing5432 service untouched.

## Final Decision

IMPLEMENTED — NOT VERIFIED (fresh independent QA, actual external review and release remain root-owned; author local checks above passed).
