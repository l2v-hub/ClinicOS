# Implementation plan

1. Bind the validated contract and actual review to the durable round2 reservation; preserve all49 prior proof hashes and publication bytes.
2. Decode UTF8 strictly, strip exactly one leading BOM, remove only bounded numeric/semicolon SGR-m sequences, and reject remaining terminal/control sequences. Keep raw size, line and fetched-hash semantics.
3. Emit only constant API/STORAGE stage codes and validated integer HTTP status, plus explicit expiry/main-moved diagnostics; preserve TLS, host and token boundaries.
4. Ignore well-formed foreign author markers, retain canonical bot/body/type and malformed/duplicate conflict checks, and prove rerun idempotency after accepted-lost POST.
5. Add exact expiry and target-review timing documentation. Run socket-blocked full candidate tests, syntax and scope checks, verify prior proofs, freeze new evidence and stop for fresh independent QA.
