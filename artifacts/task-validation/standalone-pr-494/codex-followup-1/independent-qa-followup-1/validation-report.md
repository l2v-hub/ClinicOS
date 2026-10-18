# Independent QA — PR 494 follow-up 1

Verdict: READY FOR CODEX QA (offline scope only).
Final Decision: IMPLEMENTED — NOT VERIFIED for the overall hosted/release outcome.

Subject: 9ec1c16fcb061f14cdab47c699087d504d8f2305; parent publication dfd2f1575ab449507a207a2357da2a63c86e5b4f. This is a fresh QA session after author STOP, bound to reservation ee463fdc-8083-4d0c-8d55-b4649b3d3c5d. No source, candidate tests, frozen metadata, previous proofs, commits, state, GitHub, or provider resources were modified.

| Criterion | Result | Evidence |
| --- | --- | --- |
| F1 strict UTF-8, one leading BOM, narrow SGR formatting, normalized title hash | PASS | 34-test suite and independent plain/colored/gzip equality, exact title digest, fetched raw-byte digest tests |
| F1 hostile controls and limits | PASS | independent NUL, bare ESC, OSC, cursor, interior/duplicate BOM, bare CR, colon and 65-character SGR rejection; exact 64-character parameter/4096-sequence acceptance and 4097 rejection; input/line/decompressed limits and truncated/trailing gzip rejection |
| F2 safe stage/status diagnostics | PASS | independent API/STORAGE HTTPError codes 403/404/410/503; bool/string/out-of-range rejected; private synthetic URL/header/message/body absent from emitted RecoveryError; candidate main stderr tests pass |
| F2 expiry and freshness before mutation | PASS | independent expired artifact prevents archive access; second main mismatch prevents POST |
| F3 foreign marker and canonical bot safety | PASS | independent foreign marker ignored, real bot mismatch/type/malformed author rejects before POST, published rerun is idempotent, accepted-lost POST rerun has one write |
| F4 operational documentation | PASS | workflow explicitly records 2026-10-25T17:39:03Z and dispatch only without target review in flight or renewed review |
| Regression/security | PASS | all 28 prior test names retained; all 34 candidate tests pass; source/test diff inspected, original security boundaries preserved |
| Evidence integrity | PASS | 3 source + 8 frozen metadata + 49 previous proofs hash-identical before/after; reserved HEAD matches |

Security review found no new defect in this scoped diff. The parser removes only bounded numeric/semicolon SGR-m sequences and rejects remaining terminal controls before timestamp parsing; fetched raw bytes retain their independent SHA-256. Untrusted titles/messages/stacks remain excluded from public projection. Strict schema/type/duplicate-key/digest/provenance checks, ZIP boundary/CRC/size validation, fixed repository/run/job/artifact destinations, TLS defaults, no automatic redirects, storage token separation, comment bounds/pagination, canonical bot exact-body checks, and both main freshness checks remain intact. No dependency, frontend, backend, clinical data, auth role, DB, or application route change exists. Fixtures contain synthetic metadata only. Review found no actual secrets or patient data in the evidence.

The trusted process.mjs createRunner executed both suites with envMode verification and an external owned runtimeRoot. Verification excludes controller credentials and proxies; independent code asserts key credential/proxy variable names absent. Python sockets were blocked before candidate execution. Python stdlib was already available; no install or environment draft change was needed. No browser or app/DB surface was appropriate to this stdlib transport task, per explicit task scope; no browser evidence is claimed. No frontend build was run because there is no frontend change and the assigned isolated contract expressly targets the Python suite.

The independent source imports the candidate module only, and does not import author fixture/test code. It constructs all hostile fixtures itself. Its comment-body patch isolates recover orchestration; expiry separately uses real run validation and the raw digest case uses real CI provenance validation. The existing suite independently covers full projected receipts, transport and publication flows.

Initial harness attempts are preserved as *-initial-results.json: the socket stub was installed before SSL imports, producing a Python startup error, and a supposed bare CR at a line boundary was valid CRLF. These were fixture errors, corrected without candidate edits. The final suite results are candidate-suite-results.json (34 passed) and independent-results.json (8 passed); neither contains skipped or expected-failure tests. Integrity's initial assertion incorrectly demanded a completely clean checkout; the stored before/after records correctly disclose the pre-existing untracked frozen packet, while all expected hashes matched throughout. The corrected integrity assertion accepts only that exact unchanged status.

Limits: the original real archive/log bytes were not retrieved or run here. BOM/SGR hosted input remains an observation from actual Claude comment 6253738333, represented by synthetic fixtures, not an original-byte capture. Hosted storage behavior, real fetched-log byte stability across reruns, workflow execution, current-head native CI, a new actual Claude review, final fresh Codex review, and release/merge remain root-owned gates. The three prior CI failures are not fixed or declared passing by this change. No issue closure, merge, push, workflow dispatch or deployment occurred.

STOP after external evidence sealing.
