# Post-Transfer Integrity Report

Transfer: lucalavia/ClinicOS -> l2v-hub/ClinicOS (native GitHub transfer, accepted 2026-06-25)

| Item                                  | Result                | Note                                                               |
| ------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| Repository exists (l2v-hub/ClinicOS)  | PASS                  | private, owner l2v-hub                                             |
| Visibility PRIVATE                    | PASS                  |                                                                    |
| Default branch main                   | PASS                  |                                                                    |
| main SHA matches (72f2c780...)        | PASS                  | identical to source                                                |
| Disk size matches (13916)             | PASS                  |                                                                    |
| Issues preserved                      | PASS                  | 81 (4 open, 77 closed)                                             |
| Pull Requests preserved               | PASS                  | 33                                                                 |
| Branches preserved                    | PASS                  | 3 (main, clinical-record-evolution, fix/req-093-therapy-fractions) |
| Tags preserved                        | PASS                  | 6 (deploy-*)                                                       |
| Releases                              | PASS                  | 0 (none existed)                                                   |
| Old name redirect                     | PASS                  | lucalavia/ClinicOS -> l2v-hub/ClinicOS                             |
| Local origin updated                  | PASS                  | https://github.com/l2v-hub/ClinicOS.git                            |
| Local main == origin main             | PASS                  | 72f2c780...                                                        |
| gh default repo                       | PASS                  | l2v-hub/ClinicOS                                                   |
| Worktrees                             | PASS                  | single clean worktree on main                                      |
| Wiki                                  | NOT APPLICABLE        | wiki disabled on source                                            |
| Git LFS                               | NOT APPLICABLE        | not used                                                           |
| Commit identity (private)             | PASS                  | l2v-hub / 238575217+l2v-hub@users.noreply.github.com               |
| Push as l2v-hub                       | PASS (this commit)    | verification commit pushed by l2v-hub                              |
| Claude command references             | PASS                  | .claude/commands/process-requirements.md -> l2v-hub/ClinicOS       |
| Vercel reconnect                      | MANUAL CHECK REQUIRED | dashboard, browser (Section 16)                                    |
| Railway reconnect                     | MANUAL CHECK REQUIRED | dashboard, browser (Section 17)                                    |
| Branch protection / plan              | MANUAL CHECK REQUIRED | l2v-hub plan capability (Section 19)                               |
| Collaborator audit (remove lucalavia) | PENDING               | checkpoint, after full verification (Section 21)                   |
| Credential revocation                 | PENDING               | checkpoint (Section 12)                                            |

## Update — plan & Railway (2026-06-25)

- l2v-hub plan = FREE: rulesets + branch protection return HTTP 403 "Upgrade to GitHub Pro or make this repository public". Branch protection on main is a LOST feature on the private repo until l2v-hub upgrades to GitHub Pro. Repo security = NOT PASS (documented, decision required).
- Railway: backend prod /health 200 and serves NEW code (schedules key present) after the GitHub reconnect by the user. Functional. Confirm Source=l2v-hub/ClinicOS in the Railway dashboard (Railway API unreachable from dev machine due to Zscaler).
