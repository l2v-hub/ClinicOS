# Independent security review

Static source review found no additional certain security defect. Runtime evidence is partial: full first-run unit/API suites and two real browser workflows executed, later contexts did not complete. No runtime pass is claimed for unexecuted scenarios.

| Check | Source result | Evidence / reason |
| --- | --- | --- |
| Secrets | PASS static | No added external secret literals or dependencies; child process launch explicit environment-name allowlist in launch-provenance.json excludes GitHub/model/deploy credentials. Synthetic runtime service token local-only. Signed simulator values redacted from trace ZIP text resources. Historical scan: zero findings, values never printed. |
| PHI | PASS static | All new patient fixtures synthetic under invocation-owned loopback PostgreSQL. Existing development DB and live services excluded. |
| Logging | PASS static | No new clinical payload production logging. Runtime logs below belong to synthetic QA only. |
| Inputs | PASS static | requestId bounded 8..128 conservative ASCII; expectedStato only da_erogare; clinical keys/date/time/reason/note validated; dose/actor server authoritative. Page totals/counts/state/patient/duplicates bounded and fail closed. |
| AuthZ | PASS static | Existing route/tool action permissions preserved; receipt replay rechecks current resident scope; changing request body cannot disclose prior clinical receipt; role changes cannot complete stale frontend intent. |
| SQL / XSS | PASS static | Parameterized Prisma SQL only; no unsafe string-interpolated clinical SQL. Authorized schema migration explicitly required by #460. QA internal report uses textContent, not patient HTML. |
| Dependencies | PASS | No package or lockfile changes. Portable real font files hash-checked from pinned @fontsource distributions and OFL licenses. |
| Config | PASS static | No application production configuration/CORS/public rate-limit change. Loopback/owned database assertion before fixture cleanup; owned container identity checked before teardown; full stack serialized by canonical internal flock. |

No actual patient or deployed data is touched by this QA. Actual partial tests and new trace/media inspection are recorded in validation-report.md; no production release, external Claude approval or issue resolution is claimed.
