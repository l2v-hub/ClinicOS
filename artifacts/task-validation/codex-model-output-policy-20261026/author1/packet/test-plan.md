# Test Plan

All runtime tests use Node 22 and synthetic local subprocesses; no Codex provider is invoked.

- RED/GREEN: fake Codex CLI emits an 80 KiB JSON progress line and writes a separate schema-valid typed result. Baseline fails with `model-execution-failed: output-limit`; patched code returns the typed result.
- Runner bounds: total output over 2 MiB and stderr over 64 KiB fail. Per-stream retained tail is at most 32 KiB and raw/captured byte counters are checked.
- Runner defaults: combined ceiling and prefix capture remain unchanged for callers that omit the new options. Invalid numeric controls reject.
- Process cleanup: a timed-out child spawns a descendant scheduled to write a marker; timeout kills the process group before the marker can be written.
- Failure observability: retained stdout/stderr classify to finite auth, quota, model, schema, rate, network, output-limit, spawn and other categories. Serialized diagnostic records contain only enums and numeric counters.
- Structured results: existing missing, invalid-schema and symlink negatives remain; an oversized result fails the 256 KiB guard.
