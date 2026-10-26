# Analysis

The bounded reproduction is in `agent-team/src/bug-pipeline/models.mjs`: every Codex model operation passes a 64 KiB combined process output cap to `createRunner`. `agent-team/src/bug-pipeline/process.mjs` counts stdout and stderr together and terminates the process once that cap is crossed. Codex's JSON progress is on stdout; its schema-validated `--output-last-message` file is a separate channel read only after a successful runner result. This makes valid progress volume capable of preventing an otherwise valid typed result from being consumed.

The original clinical run 40249337703 remains an unknown-cause failure. A pre-provider diagnostic failure 40251289323 is preserved as infrastructure evidence and does not establish the cause of that earlier clinical run. The supplied successful qualifier 40251755127 used exact main source 995e2ff6d14a96b5d67e0d14d708f4a95c4c816f, Codex CLI 0.159.2 and gpt-6.1-sol; it exited 0 with a valid typed result, stdout 363 bytes and stderr 0. This confirms no key/quota remediation is required for the candidate. This remains a reproducible candidate bug, not a proven explanation for the original run. The fix preserves total-output, stderr, timeout, process-group, structured-result size/schema/path/symlink defenses and exact native CLI flags. It changes only model invocation limits and finite diagnostics in the allowed three source files. No provider calls, auth/quota changes, clinical decisions, persistence, release policy or controller ownership are involved.

| Surface | Current evidence | Change | Risk |
|---|---|---|---|
| Process output | One 64 KiB stdout+stderr counter, complete captures retained | 2 MiB model total cap; 32 KiB bounded tail per stream; separate 64 KiB stderr fatal cap; count raw bytes | Tail truncates early context; byte counters and terminal tails preserve useful evidence |
| Model failure | Raw stderr/error summarized into thrown message; no categorical callback | finite categories and callback; preserve error code | Ensure no free-form output enters diagnostics |
| Typed output | Separate 256 KiB regular-file/schema/path checks | unchanged | Existing tests remain applicable |


## Execution and release evidence boundary

The synthetic RED/GREEN tests below exercise the isolated internal Node process boundary and make no provider request. The exact-main successful qualifier is separate evidence supplied for context. This author snapshot does not attest a fresh independent QA, real Claude review, or CI. Current-main trust-root review and the six required native CI checks remain pending in the publisher workflow.


The amendment retains the pre-existing bounded-delegate cooldown. A finite internal capacity marker is computed from retained output and drives the already-existing 60-second automatic executor cooldown. Thrown errors stay generic. Provider classification reads only explicit known terminal codes/phrases from stderr or complete terminal stdout JSON events (`error` and `turn.failed`); words inside ordinary progress/source/tool output do not count. Missing custom-runner byte counters remain `null`.
