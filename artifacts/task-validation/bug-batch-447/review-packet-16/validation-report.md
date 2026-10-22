# Validation report

| Validation | Result | Scope |
| --- | --- | --- |
| UI author focused suite | PASS, 28 tests | Four focused frontend files |
| UI author full frontend suite | PASS, 1,550 tests | Author runtime evidence |
| UI author frontend typecheck | PASS | No diagnostics |
| Independent UI focused suite | PASS, 33 tests | Independent reviewer did not rerun full suite |
| Independent UI typecheck | PASS | UI16 exact source |
| UI15 contrast negative controls | PASS as expected failure | Prior accent-on-tinted-background pairings are below 4.5:1 |
| UI16 source contrast | PASS | `--text`: 14.916:1 regular; 14.380:1 severe |
| Browser runtime5 build/migration/fixture/app/component | PASS | Each recorded command exit code 0; tested source `4c85fdf5a97eea10c8efcc6d105cd32de054e030` |
| Browser runtime5 contrast | PASS | 12 groups, minimum 14.380:1; normal/severe and desktop/mobile; hover/focus/normal |
| Browser app confirmation | PASS | HTTP 200; exactly one owned SQL administration; `confirmedAt` and reload persistence verified |
| Browser scoped 503 | PASS | No actions/no writes; load failure only, not a PS-state proof |
| Browser component fixture | PASS | Synthetic production-component rerenders; one allowed callback, zero blocked callbacks, no non-asset HTTP; not clinical E2E |
| Runtime5 finalized media | PASS | Two finalized videos, two sanitized CRC-valid traces; selected bytes match actual-output manifest |
| Real PostgreSQL serialization proof | PASS | Source `f26625a12bba1052da5b9af88bad88c1bf12420c`; real Assistant Tool HTTP 409 correlated with SQLSTATE 40001, unchanged failure snapshot, unlocked 200 control, two atomic import refusals, zero deadlocks |
| Full natural-language / `executeSkill` retry | NOT CLAIMED | Not established by Assistant Tool boundary proof |
| Current publication-head native checks | PENDING | Must bind exact publication head |
| New actual Claude review | PENDING | No new review claimed |
| Final Codex review | PENDING | No final approval claimed |
| Deployment / closure | PENDING | No deployment or issue closure claimed |

Original runtime attempts 1 through 4 remain preserved as failed or partial evidence and were not relabeled. The previous eight `bb12` evidence aliases were not rewritten and were not rerun on the new UI source.
