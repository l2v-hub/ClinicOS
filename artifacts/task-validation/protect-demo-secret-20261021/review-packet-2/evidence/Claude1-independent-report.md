# Independent PR499 implementation3 QA

Reservation98b192c7-d114-4f04-844b-cb1fc7ec9d0a; accepted canonical8eb3edc8523cb6d5fd33f0f76eb262537103c951. Reviewer did not author this helper/correction. Source base561428ddab27578eb8b79b9eeb17c5e8fff44c6c plus the4 frozen allowed changes. Author seal f63f8e33b9a14be60b83c4b5ab5e87dc30c0bbef8885175ae630e1b408dede49 was independently checked. No source fixes or Git mutations.

Result: PASS for the actual Claude finding's option(b), with no newly found source defect. The workflow obtains the exact official v2.103.0 Linux AMD64 archive in all3 jobs, checks its fixed SHA256 before extraction or execution, tests the extracted binary version, and writes its derived absolute path to GITHUB_ENV. Those installation steps map neither GH_TOKEN nor the demo value into their environment. The writer separately requires an absolute workflow-provided path, verifies the expected exact release through a credential-free verification child with no stdin, and creates the secret writer child only after that check succeeds. Mismatch, missing path and failed version checks cannot pass secret stdin or start a writer.

The source diff retains the original main/fixed repository/admin/environment identity/main-only policy/freshSHA/inventory/no-overwrite/idempotency/delete-once boundaries unchanged. The previous34 fail-closed tests remain, including the original writer argv/environment/stdin assertions; its synthetic subprocess was extended to handle the new version check. Four additional author cases bring the fresh actual total to38. No old assertion was removed or weakened.

Exact upstream evidence was independently inspected by bytes/hash and code flow at commit7948e8056e45ac3c729b829e0eafe2d0797a95c6:

- secret-set.go selects getEnvPubKey for an environment entity and passes that same pk through setSecret to putEnvSecret.
- secret-http.go67–72 builds the environment public-key GET with safeurl.JoinPath;130–139 builds the PUT with envName as one path component. PubKey.ID decodes key_id, and SecretPayload serializes pk.ID back as key_id.
- safeurl.go renders each component through url.PathEscape before joining separators. Its exact-source test explicitly covers space→%20 and a component slash→%2F. Thus both routes preserve glistening-friendship%20%2F%20demo as one environment component.
- secret-set.go335–353 decodes the returned public key, calls box.SealAnonymous, and Base64-encodes the ciphertext. The same commit's go.mod fixes golang.org/x/crypto v0.58.0. No new crypto implementation/dependency was introduced in ClinicOS.
- The5 source-file hashes match the manifest, and the existing public release metadata identifies the exact commit and asset digest. The official checksum file independently agrees with that digest.

Actual fresh checks through trusted createRunner(envMode=verification), PATH-only parent and this QA's private runtime:

- tests-fresh.json:38/38 PASS.
- adversarial.json:9/9 independent checks PASS. Extended numeric prefix/custom release/missing stdout/stderr-only version and nonzero exit reject before writer construction or stdin. Missing/relative/newline paths reject before any subprocess. Version subprocess exceptions return a content-free fixed code. Exact version permits one fixed writer call with value only on stdin and separate token-free version/token-bearing writer environments.
- real-binary-verification.json: independently rehashed root's NEW public download of the actual15030338-byte release archive. SHA256fdd768eb70f6409f80fcfa9f3a1c0adf0fc98d827ab3ce0bed2ac22762c5d786 matches the workflow pin/checksum/release metadata. The executable bytes exactly match the selected member of that verified archive; binarySHA256011adf6809c50c89a70f2e367f2658a2fd7c2fcf7dfc705bfe8049e6e4c731b2.
- real-gh-version.json: the actual checksum-bound binary ran only --version under the stripped verification runner, exit0, stderr empty, stdout gh version2.103.0 (2026-10-21) plus its fixed release URL. This conforms to the script's expected version. No live secret command was executed.

Evidence precision: the actual archive download was performed newly by root at2026-10-21T22:18:16.711Z under root-gh-binary-check; this QA independently hashed/read it and executed --version. Do not attribute this actual binary run to the author. Earlier upstream-static-verification.json correctly records the then-current UNRUN state before root supplied the new archive; the later real-binary receipts supersede that limitation without removing the earlier outcome. An optional independent public-upstream refetch through the stripped runner failed DNS before receiving a response; upstream-fresh.json preserves that FAIL. This is an environment/network limitation, not a source failure or a reason to weaken the environment boundary. Existing exact upstream bytes/metadata were available for read-only review; the new root archive provides actual binary evidence.

Before/after freezes confirm4 source files,31 original author proof files, the author Git index and160 historic proof files (including80 public packet files) unchanged; historic file inodes also match. The author's source manifest and every sealed artifact hash were verified. The separate newly active root binary-check output is outside original-proof freezes.

Live migration, live gh secret set, secret API reads/writes/deletes and provider operations were NEVER RUN. No real secret/token was read, passed, hashed or emitted; adversarial values were synthetic only. No dependency installation, browser/DB/server, Git status/index/ref write, commit or publication occurred. Source-reference option(b) resolves the finding without claiming a disposable-environment migration or ciphertext-decryption runtime test. Root retains final native/model/publication gates and all operational authority.

STOP before integration/publication.
