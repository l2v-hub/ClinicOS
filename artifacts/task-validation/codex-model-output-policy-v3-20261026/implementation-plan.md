# Implementation Plan and Result

1. Add `limitStdout=true` to the runner API; validate it as boolean and include it in the legacy-capture condition so defaults retain old prefix behavior. **Implemented.**
2. When false, keep counting stdout but apply `maxOutputBytes` only to stderr; retain owned tail capture, stderr-specific cap, timer, and process-group termination. **Implemented; model call sets false and uses 64 KiB fatal stderr ceiling.**
3. Remove the unused 2 MiB model-output constant and anchor numeric provider status detection. **Implemented.**
4. Add real child-process coverage for multi-MiB progress with valid typed output, bounded retained bytes, timeout, option validation, stderr failures, legacy defaults, incidental status numbers, explicit status codes, and model routing/cooldown. **Implemented.**
5. Inventory all production `createRunner`/`maxOutputBytes` callsites from the exact Git baseline and preserve the generic 64 MiB guard unless a tracked regression is found. **Inventory recorded; no tracked value exceeds 48 MiB.**
