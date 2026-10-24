# P2 — early empty-buffer provider error leaves a microphone-open UI with no capture

**Reproduced on frozen candidate1. Final Decision: FAILED VALIDATION.**

Production code: `frontend/src/components/assistant/voice/useVoiceChannel.ts:270` special-cases error codes matching `commit_empty|buffer_too_small`, calls stopAll and dispatches `transcribed(empty)`. `audioSession.ts` accepts transcribed only from TRANSCRIBING. A matching provider error in LISTENING/TRANSCRIPT_PARTIAL therefore closes the mic/peer but leaves the reducer in the old microphone-open state; the partial remains and Fine calls capture.finish on a null capture. Explicit cancel is the recovery.

Actual independent browser probe, no product edits:

```bash
flock /tmp/clinicos-browser-qa.lock node \
  artifacts/task-validation/voice-pr-393/independent-qa/early-buffer-runner.mjs \
  --out artifacts/task-validation/voice-pr-393/independent-qa/early-buffer-probe
```

Real ClinicOS frontend/hook/component/backend/identity plus actual fake-device microphone/VAD and isolated owned PostgreSQL16. Only the WebRTC provider is a labelled script. During the first live partial, the QA peer dispatches `error.code=input_audio_buffer_commit_empty` before local commit, then waits for actual tracks to stop and inspects DOM. Exact machine result in `early-buffer-probe/test-results/early-buffer-observed.json`:

- state TRANSCRIPT_PARTIAL;
- peerClosed true;
- allTracksStopped true;
- commits0;
- partial still `Testo provvisorio (non viene inviato): Registra pressione`;
- no voice submit control and zero Assistant requests.

The screenshot `early-buffer-probe/screenshots/independent-early-empty-buffer-error.png` visibly retains “Ti sto ascoltando… (testo provvisorio)” and Fine after the track/peer checks prove shutdown. The mandatory terminal-state assertion fails. `browser-failure.json` records three preceding PASS checks and the exact FAIL; wrapper `integrated-result.json` has zero returned checks because the browser function threw before returning its list—this is not a zero-execution or successful test. The wrapper exits1 and still verifies random DB marker and owned container cleanup, removed=true. Full video/trace and sanitized log retained.

Contract impact: AC4 provider failure/cancellation lifecycle and safe text fallback. This is not a clinical write or secret leakage: no Assistant request was issued. It is actionable even though normal providers usually report empty buffer after commit; the live channel must not strand a mic-open UI on a valid parsed provider error.

Requested bounded correction for implementer: make this error terminal coherently from every accepted live state while retaining intended post-commit silence behavior, closed/stale-session rejection and no implicit dispatch. Add meaningful early-error regression covering both matching code families and normal post-commit empty case. The QA agent does not patch source or prescribe a broad refactor. Root must reserve a next implementation cycle and request a fresh independent gate after author STOP.
