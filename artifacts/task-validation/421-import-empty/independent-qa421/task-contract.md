# Independent QA contract — original issue #421
Application: 80b313227a9a2b9fefc0441c718b259d0d901cae; accepted baseline c00bff678dfc9845c31742bc5d0d750fbbb9603e; baseline proof dcb78dcc2cb4b333ca9553cace6ea13c87460467.

## Impact Classification
Frontend UX/import acquisition yes; backend/provider/OCR/database/configuration/dependencies/auth-policy no. Privacy/security validation required.

## Current Behaviour
Original issue requests reducing blank import hierarchy, not changing upload/extraction semantics. Fresh issue and zero comments: nonbrowser-01/original-issue.json. Root valid task-contract fully reviewed before initial QA runs. This independent summary written after initial18/PDF runs, before supplemental persistence; not retroactively claimed pre-run.

## Expected Behaviour
Two clear first-document actions and understandable authoritative limits; management revealed only after global content; preserve multiletter/multipage acquisition.

## Acceptance Criteria
AC1 Original: explicit primary and understandable alternative. Assert Carica documento primary, Scansiona secondary, keyboard activation, desktop1150x1004/mobile390x844 no overflow; camera denied fallback only.
AC2 Original: objectless commands absent from first hierarchy. Assert no tabs/rename/reorder/letterdelete/process/usage counters; empty groups not content; pending/error recovery exposed; global documents OR pages retain management despite currentemptyletter.
AC3 Original: ordinary limits/formats before choice. Assert actual PDF/JPEG/PNG server values, custom session limits/MIME exact, no progressive-transmission jargon in guided state.
AC4 Original: multipage/multiletter after upload. Assert multiple files, real synthetic2pagePDF rendering, reorder/newletter/rename/move/remove/preview/replacement/close-reload identities. Intercepted transport is not DB/OCR/provider evidence.

## Test Plan
Independent diff/typechecks/frontend app+config/backend; actual repo Vite config/compiler production build with evidenceoutDir; focused37/full1243 exact12 baseline comparison. Browser18 + realPDF1 + strengthened persistence1. Single browser lane own7507. Strict pageerror/console/HTTP/external/domainwrite guards. Expected503 firstupload exactlyoneHTTP503+matchingconsole; lostreply exactlyoneERR_FAILED+zeroHTTP; othercases zeroerrors. No wildcardignoredfaults.

## Evidence Plan
Immutable prerun recipes+physical/canonicalLF source receipts; every screenshot/trace/video/rawoutcome includingfailures; build/test logs; ownPID/listener/start-stopreceipt; recursive seal excluding runtimecache only; secretscan expandedtraceZIP entries/configuredvalues withoutsecretlogging.

## Safety Envelope
Readonlyapplication; onlyown evidencewrites. Preserveinheritedlaunchermodifications. No installs/commit/push/GitHubwrites/deploy; clinicalcalls interceptedbeforewire. No backend/DB/provider/hardwareclaims. Ruflo unavailable/priorOOMunchanged sourcefallback noretry.

## Gate Status
READY FOR IMPLEMENTATION — evidence-only scope; application modifications forbidden.
