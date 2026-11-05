# Native review lifecycle failure analysis

The explicit native review run [41937588247](https://github.com/l2v-hub/ClinicOS/actions/runs/41937588247) used trusted main b5e79ae7bec869af894f12ed6676547f21172db4 and targeted PR528 head 7d42d13d47fb340f463aebb1af880325a4edb7e7. Node22 exited 13 with an unsettled top-level await warning; the uploaded receipt was empty. No application review claim or report was recorded. Whether the earlier subscription probe or synthetic qualification reached a provider remains unknown; an empty receipt does not prove non-execution.

Two independent offline child-process reproductions on the original source produce exit13: pending startup after every referenced handle disappears while the deadline is unref'd; and pending runtime.close after the session deadline has been cleared. A test runner or watchdog inside the tested process can mask this bug by keeping the event loop alive. Node documents exit13 for unfinished top-level await: https://nodejs.org/docs/latest-v22.x/api/process.html#exit-codes . These reproductions establish defects, not the precise failure site in the hosted run.

Independent source review also identified two lifecycle paths to cover: cancellation after the ready barrier while isolation remains pending, and proxy cleanup that hangs before container cleanup is even attempted. All outstanding waits must observe invalidation; cleanup completion and resource removal must never be inferred from a timeout.

The change is a protected trust-root repair. Existing native policy settlement, exact source/body/profile bindings, image/binary pins, response verification, output cap, claim fencing and one-forward behavior remain required. A changed session source changes the native build fingerprint and needs fresh source-bound qualification after the existing protected review path; tests are not a live qualification or a human approving review.

PR528 remains frozen and held. No old issue allowance, failed round, deployment target, workflow, credential, clinical dataset or current demo is changed. No model retry is authorized by this packet.
