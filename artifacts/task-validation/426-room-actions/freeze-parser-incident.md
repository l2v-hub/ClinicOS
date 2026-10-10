# Root freeze parser: UTF-8 BOM

First final local freeze attempt correctly stopped before staging/committing because Windows PowerShell5 emitted a UTF-8 BOM on owned server-stop receipts. Root corrected only artifact receipt decoding to strip the encoding marker, not evidence bytes, values, assertions or application source. No server or QA worktree started in that failed chained attempt. All source/test/browser evidence retained; fresh independent QA still mandatory. Root source remains frozen only after all invariant checks pass.
