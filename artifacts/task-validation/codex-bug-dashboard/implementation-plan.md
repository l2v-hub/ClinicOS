# Implementation plan

1. Extend the GitHub adapter with idempotent additive managed-label publication and completed closure. Expose separate read-only state/queue/setup reads; dashboard reads never initialize state.
2. Reconcile persisted statuses before pipeline terminal skips; claim before triage, mark blocked, persist verification phases. Resolve only from the release recorder after confirmed deployment; suppress workflow wake-ups on lifecycle labels.
3. Build a dependency-free loopback dashboard with a whitelisted snapshot DTO, 15second cache, concurrent-read deduplication, visible failures and strict host/origin/method/assets/CSP controls.
4. Test claim ordering, publication failures, no premature resolution, terminal retry, successful completion and API behavior. Re-run the complete bug/helper suite, then independent QA and browser evidence against real dashboard code using synthetic lifecycle states plus the actual read-only queue.
5. Commit all code and evidence before the bounded final Claude review. Preserve the durable setup review budget and final SHA binding. Do not claim default-branch activation or a resolved real issue before actual gates pass.
6. Follow latest steering: prepare the external subscription cron worker and CAS GitHub handoff,
   stop hosted-token attempts, test the complete report/correction/request round trip with synthetic
   providers, and leave this PR Ready for review. The user's cron and actual Claude review remain external.
