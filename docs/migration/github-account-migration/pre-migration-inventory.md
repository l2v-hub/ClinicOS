# Pre-Migration Inventory — lucalavia/ClinicOS → l2v-hub/ClinicOS

Date: 2026-06-25

## Source repository

- Full name: lucalavia/ClinicOS
- Visibility: PRIVATE
- Default branch: main (SHA 72f2c78)
- Issues enabled: yes · Wiki: no · LFS: not used
- Disk usage: ~13.9 MB
- Admin access (lucalavia): yes

## Inventory counts

- Issues: 81 total (4 open, 77 closed)
- Pull Requests: 33
- Branches: 3 (main, clinical-record-evolution, fix/req-093-therapy-fractions)
- Tags: 6 (deploy-20260613-* / deploy-20260614-*)
- Releases: 0
- References to old repo in tracked/untracked files: 14 lines across 7 files

## Accounts

- gh authenticated: lucalavia (source admin) + l2v-hub (target owner) — both in keyring
- Active for transfer call: lucalavia (source-side admin required)
- Local commit identity set to: l2v-hub / 238575217+l2v-hub@users.noreply.github.com (corporate email avoided)

## Target repository handling (Section 5)

- l2v-hub/ClinicOS existed but was EMPTY (0 branches/commits/issues/tags/releases)
- Renamed (reversible) -> l2v-hub/ClinicOS-empty-backup-20260625-004036 (verified exists)
- Name "ClinicOS" now free on l2v-hub for native transfer

## Backup / rollback

- Full git bundle (verified, complete history): ../ClinicOS-before-account-transfer-20260625-003011.bundle
- Inventory JSONs in this directory (issues.json, pull-requests.json, branches.txt, tags.txt, repository-settings.json)

## Pending checkpoints

1. [DONE] Rename empty target — confirmed "OK RINOMINA"
2. [AWAITING] Transfer ownership — requires "AUTORIZZO IL TRASFERIMENTO..." + email acceptance by l2v-hub
3. Vercel/Railway reconnect (browser, post-transfer)
4. Collaborator audit / remove lucalavia (post-verify)
