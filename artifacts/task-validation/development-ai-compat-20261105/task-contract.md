# Task Contract

## Task
Align the OpenAI file-transcription adapter with the current documented gpt-transcribe multipart contract while preserving the existing request format for legacy models.

## Impact Classification
Small AI runtime protocol compatibility patch and offline fake unit tests. No application authorization, workflows, deployment, provider keys or model calls.

## Current Behaviour
M sends singular language to every OpenAI transcription model; current OpenAI documentation specifies languages for gpt-transcribe instead. Other models use the existing singular language interface.

## Expected Behaviour
For exactly gpt-transcribe, send the documented languages array encoding in multipart without singular language; preserve model, audio, prompt, response format and legacy singular language for other models. Do not change live provider settings or model budgets.

## Acceptance Criteria
- Fake multipart regression proves exact current fields, separate languages form key and absence of language for gpt-transcribe.
- Legacy whisper and gpt-4o request shapes remain unchanged with their singular language, no languages array.
- No real network, provider call, production data, credentials or model inference. Source M and primary worktree remain untouched.
- No claim of source deployment, provider inference, full audio functionality, native review or human trust-root approval.

## Test Plan
Offline source-owned unit tests with strict fake HTTP boundary, synthetic in-memory audio and credential marker, plus relevant existing audio/provider tests where dependencies are available. Use Python -B and prevent bytecode writes.

## Evidence Plan
Record source base, source/test hashes, actual test results and official API contract citations. Distinguish local fake validation from later authorized bounded live verification.

## Gate Status
READY FOR IMPLEMENTATION
