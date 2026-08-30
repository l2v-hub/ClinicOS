# Cycle 48 task contract — voice consent and start cancellation

## Objective

Prevent delayed or concurrent microphone starts and give operators truthful, explicit consent for browser-managed speech recognition that may use a remote provider.

## Acceptance criteria

- Dictation is unavailable until the operator grants explicit in-app consent.
- The disclosure states that the browser may use a remote speech service and ClinicOS receives the editable transcript.
- Closing Agnos, pressing stop or revoking consent cancels a pending permission/start sequence.
- Repeated start actions cannot create concurrent recognizers.
- Text input remains available without consent or speech support.
- Focused/full tests, lint, build and independent reviews pass without P0/P1.

## Safety envelope

- No audio is added to ClinicOS backend requests or logs.
- No assistant action, confirmation or transcript-editing behavior changes.
- Do not stage unrelated local changes.
