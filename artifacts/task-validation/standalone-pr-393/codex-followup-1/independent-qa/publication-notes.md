# Publication boundaries

This is the curated independent PR393 QA packet. All evidence paths in validation-report.md resolve inside this tree except deliberately named original worktree, commands, review/reservation input paths and external-only private/build snapshots. Source paths identify the stopped application under test. No controller state or operational credentials are copied.

The 21 screenshots, one video, raw result, all runtime/server/test logs, custom Playwright report and sanitized two-part trace come from the new exact-final independent run. Author trace inspection is explicitly historical hygiene evidence, never substitute runtime proof. Reconstruct sanitized trace by concatenating trace.zip.part-01 then part-02 and verify the manifest before opening. Every decompressed member was scanned and CRC checked.

Raw trace, generated build outputs and comprehensive source snapshot remain external. Their classification/hashes are recorded in evidence-manifest.json. Publish this directory only; every file <=25MiB. The final seal hashes the evidence manifest; the manifest hashes every publication file except itself and the seal to avoid a circular digest.
