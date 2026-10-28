# Bounded source implementation cycle2/4

Root explicitly authorized this cycle after independent QA1 sealed FAILED VALIDATION. Preserve first candidate25source/3contract manifests, source contracts and entire independent-qa byte-for-byte. Prior author validation-report remains historical, never relabelledPASS.

## Proven finding and cause
QA actual early-buffer probe shows TRANSCRIPT_PARTIAL with live-looking UI after stopAll closes peer/tracks; commit count0. onRealtime treats any commit_empty/buffer_too_small as benign transcribed(empty), but reducer correctly accepts transcribed only from TRANSCRIBING. Removing that reducer restriction would accept uncommitted/stale results and is rejected.

## Exactly two source paths
1. useVoiceChannel.ts: keep a latest audio-session ref; before stopAll resets metadata, classify benign empty only when capture matches, stateTRANSCRIBING and actualcommitmarker>0. Otherwise use existing recoverable stt_provider_error path, stopping capture+transport and providing textfallback. Retain generation/resident guards and no uploadfallback.
2. qa-voice-pr-393-browser.mjs: real production hook/component exercised through existing owned fullstack; inject both empty error codes in LISTENING and TRANSCRIPT_PARTIAL, assert terminalERROR/notice/textfallback, peerclosed/alltracksended, retryenabled, no submission/write; explicitly test postcommit-empty→IDLE/no invented final and a new successful capture/retry. Preserve all33existingchecks and actualpersisted120/80reloadreadback. Correct scroll framing07/12 to show asserted result values, as independentQA found.

## Verification and inheritance
Focused29frontendregressions and newbrowsercases, frontendbuild/type, fullownedDB/browser lifecycle underflock. Python240, backendtypes/fullfront1386 prior broaderproof is inherited only after exactunchanged relevantproduction+tests+config hashes are checked; currentactualwrapper stillrerunsbackend12. No providercalls/activation, no newdependencies, no clinicalpolicychanges, no newnormalbatch, no reviewbudgetreset. Senior owns lifecycle fix; no pointless delegated reducer test because reducer unchanged. Root starts a fresh independentQA session after cycle2STOP.
