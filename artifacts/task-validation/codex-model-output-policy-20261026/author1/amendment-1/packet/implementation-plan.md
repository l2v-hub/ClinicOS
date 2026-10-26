# Implementation Plan

1. Add real-child regression tests in `agent-team/tests/bug-pipeline/process-output.test.mjs` and model progress fixture in `models.test.mjs`; capture the baseline RED output before changing source.
2. Extend `createRunner` with validated optional numeric controls for per-stream tail bytes and stderr bytes. Keep current behavior for callers that omit them. Count raw stream bytes, retain only bounded tails, enforce total and stderr limits independently, and return finite counts with sanitized text.
3. Configure model calls for the existing 2 MiB total ceiling, 32 KiB per-stream retained tails and fatal 64 KiB stderr ceiling. Classify stderr/stdout/error using finite allowlists, preserve `model-execution-failed`, and call an optional diagnostic callback with only bounded numeric and enum fields.
4. Add a 64-entry CLI collector and emit/store only finite model diagnostics in stdout and `diagnostic.json` success/failure summaries. Never serialize arbitrary error objects or messages.
5. Run targeted Node 22 tests; preserve RED/GREEN logs, record hashes and a manifest. Report `IMPLEMENTED — NOT VERIFIED` pending independent QA/Claude/CI.

Recovery: revert only the minimal allowed source/test files in this private snapshot if limits or guards fail; the clinical checkout and preexisting staging remain untouched.
