# Current exact demo release candidate

Independent QA2 PASS on bb196b215cadce3ad0594dc3c06bc6d36e32c26f:187focused,759fullworkflow,95targeted checks;3Windows skips. [Report](independent-qa2/validation-report.md). These are synthetic CLI/native-response/proofreader tests, not actual provider acceptance or a live deployment.

The new manual workflow isolates the fixed demo from the legacy sibling deployment and binds reviewed_sha, workflow, native deployed commit and public readiness identity. Existing deploy-backend.yml is restored byte-for-byte to45033; legacy receipts remain strict. Shared workflow concurrency is not FIFO: root must drain old running/pending writers before dispatch and reread deployed/live identity. No trigger or source-connection mutation, latestCommit or upload fallback is introduced.

Author1/source630bef and independentQA1FAILED remain preserved; the first implementation spent one attempt and failed its release workflow review. Author2 repairs that finding. Actual Claude, fresh final Codex, six native checks and ordinary protected main merge are required before first actual readonly preflight and eventual native deployment. No clinical issue is closed by this PR.
