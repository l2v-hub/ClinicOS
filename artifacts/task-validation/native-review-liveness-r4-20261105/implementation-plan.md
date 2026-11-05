# Implementation plan

1. Remove entrypoint top-level await while preserving existing runtime fencing and bounded stage/cleanup guards; exercise self-import in a real offline child.
2. Preserve truthful failure and sanitized, evidence-only metadata when cleanup and claim transition are uncertain, without retry or publication.
3. Bind the validated projected report to input, subject, model and the full frozen validated claim using SHA-256 over JSON.stringify of that claim; preserve only verified isolation and single-forward predicates. Validate raw output before projecting four text fields and preserve file paths.
4. Own public certificate artifacts under the runtime directory, remove them only with ownership checks and surface unknown cleanup. Zero key buffers before any awaited cleanup.
5. Run synthetic offline guard, worker, capacity, evidence and recovery tests and preserve both the applicable suite and the separate checkpoint failures. No live provider, Docker, model, credentials or database operation.
