# Independent QA3 contract

Tested candidate: `938ae9c44d60b1d963873762f26677d6856f6d63`; baseline `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`. Implementation cycle 3/4; this QA does not reserve/reset budgets or invoke models. All seven live issue bodies and comments were read. Only URLs, comment IDs, states and response hashes are retained in `issue-sources.json`; raw issue responses remain private in `/tmp`.

The seven frozen contract documents are unchanged and hashed in `contracts-before.json`. The original task contract remains authoritative; no acceptance criterion is removed.

| Issue | Acceptance and independent regression |
|---|---|
| #432 | Complete 106-row inventory including inactive and all pages; PRN day/week and period bounds; missing-feed rows read-only; foreign/short/inconsistent/repeated snapshots fail closed, retry and patient switch safe, complete print. Real HTTP import has five occurrences, three reviewed persisted therapies, two explicitly deferred, omissions rejected, replay one patient, persisted list survives reload. Desktop and phone values asserted. |
| #441 | Explicit one-off date/time works with empty band flags; feed/summary/assistant agree. Server chooses dose and actor, rejects unrelated clock/band/date and contradictory schedule; no duplicate. |
| #442 | Real interpreter-entry barrier controls the race under the entire backend suite; 120/80 and original actor persist, late correction and replay complete, exactly one immutable record. Actual helper copies independently tested for never-settling callback, late rejection, primary/cleanup failure, missing entry and successful release. Original 5-second phase/20-second outer limits remain. |
| #460 | Same actor/request key replays immutable first outcome once; altered payload rejected; current patient ACL checked; pending-only write cannot replace refusal; concurrent retries converge. Browser committed-response loss and pre-write transport loss preserve identity across reload; session changes cannot leak success/write. |
| #463 | Strict unloaded status produces zero automatic searches for 106 prescriptions and applicable roles. Available, malformed and unavailable status preserve real lookup behavior, found/absent labels distinct; public limiter unchanged and no 429. |
| #464 | Europe/Rome midnight, year boundary, winter/summer and both DST transitions independent of host clock; 00:30 future 08:00, due 00:45, overdue 00:46 have exact identities/counts. |
| #467 | Given/refused one-off stays recorded after clock moves across bands; first author/time/dose immutable, no second write. Distinct periodic doses and quantities continue independently after reload. |

Full canonical is mandatory: `node e2e/qa-bug-batch-432.mjs --test`. Its internal flock owns the complete disposable PostgreSQL16/HTTP/mock-runtime/browser lifecycle. No development/remote database, paid model, external deployment or issue mutation is allowed. The local provider runtime is explicitly mocked and does not prove a paid OCR/model service. Source37/contracts7 hashes must match before and after; raw simulator bearer values must be absent from publication artifacts. Successful local QA is separate from root-owned exact-SHA Claude review, required CI, migration ordering and verified release/issue closure.
