# Issue 470 bounded classification author stop

The wrapper now has a separate read-only classification path that runs only after the unchanged storage helper returns `UNCLASSIFIED_DEMO_VOLUMES`. It privately matches the backend database URL to one Postgres service configuration, requires one attached READY volume, and calls the unchanged `verifyDatabaseMount` export. It repeats the private configuration and environment reads and checks the source branch again before marking the classification stable.

The receipt remains blocked with `UNCLASSIFIED_DEMO_VOLUMES` and `bindingVerified: false`. The classified DB volume is the only row with `mountVerified: true`; every other volume is retained with an explicit non-DB role and unverified mount. Database and other snapshot scopes remain unobserved. Cleanup, deletion, redeploy, and source-storage flags remain false.

The synthetic three-volume regression observed one DB-bound and two unverified rows. All existing tests passed through the credential-stripped verification runner: 122 passed, 0 failed, including the original 115 assertions. The pinned helper hashes still match. Of 1,121 frozen prior evidence files, all 1,119 non-source files retained their original hashes and inodes; only the two authorized source files changed. Both source files have link count 1. The six prior author attempts and their proofs remain preserved; the earlier blocked actual read receipt still records 4 CLI, 3 native, and 1 GitHub reads.

The previous actual read was not repeated. This author round made zero live provider, GitHub, database, browser, deployment, or cleanup calls. The code has not been independently reviewed or dispatched. This observation cannot establish volume contents, PHI absence, snapshot completeness, deletion, or issue closure. The unattached and other attached volumes remain unknown.

Source SHA-256 values:

- `scripts/maintenance/demo-storage-inspect.mjs`: `780f214ffc6b73aa8211d058f4c79e43ea0de5ed9db037e9838b9aaec00a00ef`
- `scripts/maintenance/demo-storage-inspect.test.mjs`: `36930825b8516c672143b0a516b3873efefe3d5389fe6cd21022f99485189721`

Author STOP. Continue only with the separately owned review and acceptance gates.
