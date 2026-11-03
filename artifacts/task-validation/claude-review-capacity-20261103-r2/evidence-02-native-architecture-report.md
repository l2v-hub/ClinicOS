# Full architecture, streaming policy barrier and pinned output semantics

Original texts follow byte-for-byte. Historical outcomes are not current approvals or qualification.

## p020
Original: C:/w-rv/tmp/review-capacity-20261103/research/guarded-native-max-proxy-architecture-20261103.json
Bytes: 17373; SHA-256: 66027832f1f6287a25462ee015dacc2add64c350dc06917ae4e264425a2325be
BEGIN ORIGINAL
{
  "schemaVersion": 1,
  "status": "architecture-conditionally-viable-not-implemented-qualified-or-approved",
  "scope": "Read-only assessment of an external one-inference reference monitor around unchanged native Claude Code2.1.301, retaining genuine Max OAuth and official upstream endpoints. No provider, credentials, Docker, source, controller or GitHub mutation executed.",
  "mainConclusion": "A genuine sole-egress guard that buffers the entire original native request and atomically allows only one inference forwarding attempt can close the native retry/managed-output-cap holes. This is a different, materially larger trusted computing base than an environment-only profile. Its safety depends on complete mediation, not trusting native max-turns, modelUsage output defaults, a model result, or a proxy environment variable alone.",
  "primaryEvidence": [
    {
      "url": "https://code.claude.com/docs/en/network-config",
      "observedLines": [82, 112, 133, 154, 264, 288],
      "supports": "Claude Code documents standard HTTPS_PROXY and custom CA/TLS inspection. It separately documents provider/gateway rerouting; this design need not set ANTHROPIC_BASE_URL or construct SDK model calls. Keeping native OAuth/default endpoints is technically the same native authentication/provider route, not an API-key fallback.",
      "limit": "Documentation supports network configuration, not an approval of this unbuilt security monitor, proof of its accounting, or a new subscription identity. Real qualifying account/provider metadata must remain native and authentic."
    },
    {
      "url": "https://docs.docker.com/engine/network/drivers/none/",
      "observedLines": [22, 35],
      "supports": "network none leaves the container loopback only; ordinary external TCP/UDP/DNS cannot leave that namespace."
    },
    {
      "url": "https://docs.docker.com/engine/containers/run/",
      "observedLines": [53, 78],
      "supports": "Docker isolates the process/filesystem/network and supports immutable digest references. Actual run flags, mounts and runtime escape tests still require independent qualification."
    },
    {
      "url": "https://nodejs.org/api/http.html",
      "observedLines": [306, 341, 2120, 2192, 2899],
      "supports": "Node exposes CONNECT/raw header fields and Unix socket transport, but normal headers objects lowercase/discard some duplicates. Do not validate or promise raw-byte identity from normalized header objects."
    },
    {
      "url": "https://nodejs.org/api/tls.html",
      "observedLines": [1169, 1215],
      "supports": "Node supports TLS on an existing stream/Unix transport; upstream must retain rejectUnauthorized and actual hostname validation. The interception CA must not become the upstream trust override."
    },
    {
      "url": "https://docs.openssl.org/3.5/man1/openssl-req/",
      "observedLines": [275, 287, 436, 440],
      "supports": "Certificate/key outputs are configurable; new keys can be emitted to stdout. A pinned parent-side FD-pipe construction can keep private keys out of files, but must explicitly avoid configuration default_keyfile and prevent key-bearing stdout/errors reaching logs. No command was executed."
    }
  ],
  "topology": {
    "preferredShape": "Separate fresh health and source containers, each unchanged native CLI+trusted bootstrap/loopback bridge. Source has its own private Unix egress socket and one-inference gate. Parent owns official upstream TLS, canonical controller authority and a separate unmounted management channel.",
    "container": [
      "Linux --network none, --read-only, cap-drop ALL, no-new-privileges, nonroot, no privileged/PID-host/network-host/device/Docker socket mounts.",
      "Digest-pinned base/runtime/CLI, exact verified CLI binary hash, audited trusted launcher/bridge, read-only public CA only; no checkout, credential store, repository, host HOME, source files or controller sockets mounted.",
      "A bounded private tmpfs HOME/config/TMP is necessary because native initialization/policy caches can write. Read-only root without any writable private configuration is likely a functional failure, not proof of isolation.",
      "No shared host IPC/PID namespace. Socket directory permissions and UID/GID must allow only this container bridge and parent guard; the egress socket is not an administration/claim RPC.",
      "Fixed CPU/memory/PID/open-file/tmpfs limits, no image healthcheck/model-capable sidecar, bounded process deadline, log-driver none and captured attachment streams never echoed raw.",
      "OAuth bootstrap arrives through private stdin, not argv/docker environment/inspectable env-file. Only the genuine OAuth token reaches native CLI. No GH/Railway/Vercel/API-key/provider-alternate credentials enter container."
    ],
    "completeMediationTests": [
      "Attempt direct IPv4/IPv6 DNS/TCP/UDP, HTTPS_PROXY removal/NO_PROXY wildcard, alternate proxy settings and direct socket API: all external paths denied by namespace, not merely observed unused.",
      "Attempt arbitrary CONNECT hostname/port, nested CONNECT, absolute URI, WebSocket/Upgrade, HTTP2 alternate stream, metadata path carrying source, model batch/complete/alternate endpoints: no upstream request.",
      "Connect many sockets/requests concurrently: one shared guard budget transitions atomically before any upstream bytes, not one counter per connection or endpoint.",
      "Verify actual Docker inspect runtime flags/mount inventory and pinned image/binary/source digests without dumping secrets; no app claim if qualification differs."
    ]
  },
  "routeAndCredentials": {
    "sameNativeRouteRequirements": [
      "No ANTHROPIC_BASE_URL/custom provider/SDK/API-key call. Native requests target fixed approved official authorities; parent forwards original native request rather than generating a replacement model invocation.",
      "Validate CONNECT authority, TLS SNI, HTTP Host/authority and actual upstream destination agree exactly; reject IP literals, suffix matches, arbitrary ports, userinfo, encoded host/path tricks and redirects.",
      "No open TCP tunnel is ever passed through. Guard terminates local TLS and mediates every inner request. Unknown method/path/content schema fails closed.",
      "Inference budget counts EVERY inference route/model/helper call, including a request that is not recognized as source. A helper before source is not a free additional request; source mode rejects it.",
      "Non-inference startup traffic needs a finite exact host/method/path/query/header/body schema allowlist. Arbitrary POST telemetry/artifact bodies can otherwise exfiltrate source outside the inference gate.",
      "Require genuine expected Bearer OAuth in memory and reject x-api-key/alternative auth; headers are never logged or placed in hashes that mix credential values into published evidence.",
      "Parent upstream uses strict public trust + hostname verification and direct fixed official TLS connection; do not inherit the local interception CA, NO_PROXY or a caller-selected upstream proxy/agent.",
      "Interception key is parent-memory only; public CA is container read-only. No key file, Docker secret env/config, certificate private-key artifact or raw debugging stdout."
    ],
    "byteIdentityCaveat": "A normal Node http.request forwarder reconstructs request framing/header casing/order. That is not literally byte-identical original headers. For the literal requirement, preserve validated original HTTP1 header/body bytes and write them to strict upstream TLS; alternatively explicitly state body bytes and end-to-end header values are unchanged while transport framing differs. Never claim both without proof.",
    "simplestProtocol": "Qualify bounded HTTP1.1 with a complete Content-Length JSON body, no request gzip/transfer-encoding/trailers/upgrades. The documented native gzip-disable setting may select this format without rewriting a native body. If actual pinned CLI does not emit it, reject and revise the protocol explicitly; do not silently loosen parsing."
  },
  "requestAndContextSeal": {
    "admissionStateMachine": [
      "source gate starts CLOSED with immutable expected source packet/schema/model/nonce/build identity and remaining forwards1",
      "fully buffer bounded native POST before opening/sending any upstream model HTTP request",
      "strict parse and verify exact prepared prompt packet bytes/hash, expected nonce, fixed numeric qualified Opus, only native StructuredOutput tool+schema and allowed bounded native fields",
      "compute actual decoded model-visible context bound and selected max_tokens; reject oversized or unknown input with NO claim and NO forward",
      "seal original request bytes plus semantic body digest in memory; signal pending only on a separate trusted host management channel",
      "native controller claim/CAS verifies expected subject/feedback/actor/owner and actual claim transition; failure cancels staged request with no inference",
      "final owned-claim/source/body-hash fence then atomic source budget1→0 before upstream write; forward sealed original once",
      "any second inference request, timeout, uncertain forwarding, response mismatch or native retry permanently poisons the operation; no replay/refund/new allowance"
    ],
    "jsonRequirements": [
      "Fatal UTF8 decoding, integer/max_tokens finite positive validation, bounded object depth/count/string/body size, duplicate JSON keys detected BEFORE JSON.parse loses them, including escaped duplicate property names.",
      "Reject prototype-related ambiguous keys, unpaired surrogates, nontext/binary/media/server tools, unknown context-changing fields, unsupported compression/framing and inconsistent content-length.",
      "Inspect rawHeaders/headersDistinct; Node normalized headers alone may discard duplicate authorization/content-length/host. Reject CL/TE ambiguity, duplicate framing/auth/host headers and trailers.",
      "The nonce and full prompt must match the trusted prepared bytes, not merely be found somewhere in a user-controlled message. Verify all additional system/user/tool context, not just the packet substring.",
      "No source summary, context report trimming, native compaction/context_management edits, broad Read/MCP or replacing actual prior findings. Whole selected source/evidence stays required."
    ],
    "tokenAccounting": {
      "notAnExactTokenCounter": true,
      "policy": "Conservative decoded UTF8 byte upper bound for all model-visible system/message text plus full serialized tool/schema/nontext structures and bounded per-block framing, PLUS unchanged native65536 margin PLUS actual selected native body.max_tokens, must fit actual qualified1M clamped context.",
      "decodeExactlyOnce": "The outer HTTP JSON string escaping is transport encoding; decode that once. The user text still contains JSON.stringify(packet) source/evidence escapes and those are model-visible bytes: do not decode embedded packet source strings again or undercount them.",
      "allFields": "Count every allowed text block, system prompt, tool description/input_schema, previous message/tool-result/thinking block if allowed, and native wrappers. Prefer a fresh source container so health history is absent. Enforce small fixed block/message counts so token framing cannot grow independently of byte accounting.",
      "observedDefaultUnchanged": 128000,
      "enforcedCandidateCaps": [65536, 49152, 32768],
      "actualCap": "max_tokens from the sealed native body, not an env intention or doctored modelUsage. Reject actual body values above selected fixed cap; use actual value in admission receipt.",
      "knownProspectivePacketBytes": 843365,
      "futureCiFeedbackStillUnknown": true,
      "whyThisClosesRetries": "Only one admitted inference body can reach upstream, so internal output-limit/schema/refusal/helper retries cannot add another retained generation. This must be enforced across every connection, including after a network error or concurrent request.",
      "qualificationChecks": "Use complete synthetic source/evidence of current843365 plus explicitly bounded real-CI headroom, assert full request content hashes, actual server usage/model metadata and unmodified CLI structured output. Do not call this exact native token counting or promise future final-head fit before observing its actual body."
    }
  },
  "nativePolicyNotBypassed": {
    "mustRemainEnabled": true,
    "initialSettlementStillRequired": "A sealed body matching model/max_tokens does not prove late managed policy is absent or respected. Keep genuine native positive-empty settlement before any source forward, exact source settings snapshots, and fail closed on pending/timeout/error/nonempty managed policy; do not replace this with fake Max metadata.",
    "whyBodyMonitorIsNotEnoughForPolicy": "A delayed policy could forbid source processing or restrict provider/model despite an already-constructed body fitting budget. Forwarding before policy settlement would evade that control even though no cap was exceeded.",
    "previousPinnedEvidence": "native-streaming-policy-barrier-20261103.json SHA256 d61bb170b7494b6506b748b2c977d0579aee7cc44864a1bc2b3fe1d36c55d007",
    "temporaryOverrides": "Actual body mismatch always rejects; the guard does not change or ignore policy to make the request fit."
  },
  "responseAndNativeReview": {
    "requirements": [
      "Forward upstream response bytes without creating a fake provider response; stream bounded copy in memory only, validate status/model/request identity, strict SSE ordering/size/count and one native StructuredOutput call.",
      "Reconstruct the actual upstream StructuredOutput tool input and require semantic equality with the CLI structured_output and exact frozen SHA; reject retraction/duplicate/missing/malformed/schema-invalid outputs.",
      "Require native exit0, no hidden second inference attempt, no compaction/tool/helper/fallback request, expected OAuth provider/model/default profile metadata and output-token usage within the sealed cap.",
      "A blocked retry means the claimed source round failed even if one earlier partial response looked acceptable. Preserve actual attempt/failure and spend; never select a convenient earlier answer.",
      "No raw response/debug/settings/OAuth body in artifacts; publish schema-validated sanitized review, fixed metadata enums, source/body-context hashes excluding credentials, actual request/response provenance and reviewed source/build identity."
    ]
  },
  "integrationWithExistingController": {
    "trustedBase": "C:/w-rv/auth-release-main20261102 at D2",
    "actualPath": "agent-team/src/bug-pipeline/cloud-review-worker.mjs processCloudReview",
    "existingSequence": "retrieve source/feedback → probe → prepareCloudInference → controller.claim(expectedSubject,expectedFeedbackFingerprint,expectedActor) → assertClaimTransition → run native → validate → submit/reconcile; failOwnedClaim only after owned claim",
    "requiredSeam": "An explicit stageNativeRequest(prepared) before controller.claim and releaseExactStagedRequest(handle,actualOwnedClaim) after the actual transition. Preserve full source/feedback/owner fences. Do not insert an unrelated proxy-approved boolean as new canonical authority.",
    "failureAccounting": "Stage/size-policy failure before claim consumes no source review, but is retained as a real planning/qualification failure. Any uncertainty or blocked retry after claim is owned source failure; no reset, refund or hidden rerun. Existing publication-uncertain reconciliation remains distinct from provider retry.",
    "releaseGate": "Technical candidate itself must get old trusted worker Max review and separate final Codex before protected merge. Only trusted approved main can run new authentic qualification. No demo525 app claim from an unapproved candidate implementation, no parent history/budget edits and no production deployment."
  },
  "specificRemainingProofGaps": [
    "No actual Linux Docker/Unix bridge/runtime isolation test yet; Docker availability/image digest/readonly+tmpfs native startup are not proven by this report.",
    "No implemented complete-mediation router/parser/duplicate-key/raw-framing proof; arbitrary CONNECT or metadata exfiltration would invalidate the architecture.",
    "No actual native Max TLS-inspection qualification with this exact pinned binary/account/model/protocol; official support does not prove this construction works.",
    "No observed full native body with final actual CI/feedback; current843365 is prospective packet JSON, not final native HTTP body or exact token count.",
    "No proven response equality/failure/claim race implementation. Need offline mocks and independent security review before any protected deployment.",
    "No scope/counter allowance is inferred from this architecture report; root retains actual user-session authorization and all original auth/technical history."
  ],
  "performed": {
    "primaryDocumentationRead": true,
    "trustedWorkerReadOnlyInspection": true,
    "newPrivateResearchReportOnly": true,
    "providerCalls": 0,
    "dockerExecutions": 0,
    "credentialReads": 0,
    "controllerOrGithubWrites": 0,
    "sourceEdits": 0,
    "approvalOrQualificationCreated": false
  }
}

END ORIGINAL

## p021
Original: C:/w-rv/tmp/review-capacity-20261103/research/native-streaming-policy-barrier-20261103.json
Bytes: 11151; SHA-256: d61bb170b7494b6506b748b2c977d0579aee7cc44864a1bc2b3fe1d36c55d007
BEGIN ORIGINAL
{
  "schemaVersion": 1,
  "status": "read-only-pinned-source-design-evidence-not-qualified-or-approved",
  "source": {
    "cliVersion": "2.1.301",
    "linuxPackage": "@anthropic-ai/claude-code-linux-x64@2.1.301",
    "lockVerifiedTarballSha256": "a7ffd61e7784e6dda864a31e934cececc050f106015201cb3db4abb59c781c57",
    "passivelyInspectedBinarySha256": "bc1aad9982c7b59c7d889ff92595d61cf46e0a6eae074cb551d932a989bcd222",
    "offsetUnit": "byte offset into passive package/claude bytes, not executed source",
    "cliExecuted": false,
    "providerOrAuthenticationCalled": false
  },
  "stderrRouting": {
    "actualFlag": "--debug-to-stderr",
    "alias": "-d2e",
    "deprecatedButRegistered": true,
    "flagRegistrationOffset": 235667937,
    "launchParserOffset": 216576043,
    "loggerEmitOffset": 216577800,
    "loggerBehavior": "emit formats one timestamp/level line; if toStderr it invokes deps.writeToStderr and RETURNS before write/getWriter/file rotation/latest-symlink machinery",
    "actualBackendOffset": 216586872,
    "actualBackend": "writeToStderr => NW(message,{mayDrop:true})",
    "recommendation": "Use actual stderr-only flag with bounded child stderr PIPE parsed only in memory. Do not use --debug-file /dev/stderr: that chooses the filesystem append/rotation/latest machinery unnecessarily.",
    "limits": [
      "Missing/dropped/truncated marker must fail closed; NW mayDrop is real.",
      "This proves debug logger routing only, not an absence of ordinary native policy/auth cache files.",
      "Unrelated stderr diagnostics can contain sensitive configuration or provider errors. Never inherit child stderr to GitHub logs, persist it, include it in thrown errors, or artifact raw bytes.",
      "Parse exact complete timestamp/level/literal lines and retain only an enum, monotonic sequence and binary hash. Initial certificate must precede ANY source/model/user content."
    ]
  },
  "initialPolicySettlement": {
    "strongestActualEmptyMarker": "Remote settings: Saved empty sentinel (404 response)",
    "offset": 234447419,
    "actualMeaning": "Reached the empty-settings branch after Uyt(empty,{verified:true}), awaited environment reapplication when needed, consent handling, reset-epoch checks and awaited Ie cache save. The wording also covers HTTP204 or a validated HTTP200 with empty settings.",
    "requiredPriorState": "Fresh private config, no old remote cache/policy, genuine firstParty injected OAuth, only fixed flag layer, no other config filesystem actors; reject all preceding failure/timeout/retry/override/cache/parse/salvage/save-error markers.",
    "tooEarlyMarkers": [
      {"literal": "Remote settings: No settings found (204)", "offset": 234433959, "why": "HTTP transport outcome before application"},
      {"literal": "Remote settings: No settings found (404)", "offset": 234433959, "why": "HTTP transport outcome before application"},
      {"literal": "Remote settings: Fetched successfully", "offset": 234434545, "why": "Validated transport body before application/consent"}
    ],
    "cacheRejected": [
      "Remote settings: Using cached settings (304)",
      "Remote settings: Cache still valid (304 Not Modified)",
      "Remote settings: 304 to an unconditional request"
    ],
    "noIneligibleCertificate": "No explicit positive unsupported_subscription debug marker was found. Native init/account omits subscriptionType for CLAUDE_CODE_OAUTH_TOKEN by design. Do not synthesize a Max subscription field or infer unsupported_subscription from absent policy output.",
    "saveCaveat": "Ie catches a cache write failure and returns; caller can still print the late empty marker. Therefore any earlier native Failed to save marker must poison the certificate; the marker alone is not proof of durable cache write.",
    "barrierHole": {
      "normalStartup": "Lqt is launched asynchronously in ordinary startup at235666143",
      "watchdogOffset": 234422149,
      "watchdogMilliseconds": 30000,
      "literal": "Remote settings: Loading promise timed out, resolving anyway (load and fetch barriers)",
      "whyHealthAloneFails": "The watchdog releases both promise barriers without canceling the fetch. A completed health answer and empty settings snapshots do not imply the initial fetch has finished."
    }
  },
  "laterPolicyChanges": {
    "normalPollIntervalMilliseconds": 3600000,
    "intervalConstantOffset": 234421265,
    "pollRegistrationOffset": 234456239,
    "otherTriggers": [
      "Auth-change refresh aAn at234450563 stops poller, resets settings eligibility/cache and starts another fetch.",
      "Remote storage/cache change observers exist at217361287-217365390.",
      "Settings source watchers can invalidate merged settings and reapply environment."
    ],
    "boundedProcessNecessaryNotSufficient": "Age below1h excludes the normal first periodic poll, not startup fetch tails/auth-change/other file writers. Reject subsequent policy/auth/config changes; guarantee no source writer, no host callback/token-rotation/control routes and private config before relying on a temporal proof.",
    "environmentPriority": {
      "orderOffset": 216980375,
      "order": ["userSettings", "projectSettings", "localSettings", "flagSettings", "policySettings"],
      "envApplicationOffset": 220435901,
      "consequence": "Managed environment overwrites fixed --settings.env. Flag layer is not an organization-policy override; presence of any nonempty policy/source/error must reject rather than ignore it."
    }
  },
  "nativeControlShapes": {
    "getSettingsHandlerOffset": 243343154,
    "settingsBuilderOffset": 217873019,
    "response": {
      "effective": "Merged settings, including env; inspect only in memory",
      "sources": "Nonempty {source,settings} entries; only exact code-owned flagSettings expected",
      "applied": ["model", "effort", "advisor", "ultracode", "ultracodeRequested", "ultracodeAvailable"],
      "errors": "Non-warning parse/validation errors; do not treat this as full machine-source absence proof"
    },
    "noAppliedMaxOutputField": true,
    "setModelHandlerOffset": 243284953,
    "setModelOrder": "Enqueues native jVo; on ok refreshes engine state and awaits fi before matching successful control response. Still verify resolved applied.model after acknowledgement; do not trust an alias request alone.",
    "initializeAccountOffset": 243379300,
    "accountProjectionOriginOffset": 219785253,
    "accountFields": ["subscriptionType", "tokenSource", "apiKeySource", "apiProvider"],
    "injectedTokenPlanGap": "MOe uses if(tokenSource===CLAUDE_CODE_OAUTH_TOKEN or FD) set tokenSource; else-if stored login set subscription. Thus injected-token initialize account has no actual subscriptionType even after health.",
    "getStatusNotPositiveSettlement": "K4o at245175265 reports remote policy only through fds; fds(ok)=false at226065031. Absence of error row cannot distinguish successful-empty from pending."
  },
  "twoSequentialMessages": {
    "submitGeneratorOffset": 243021051,
    "behavior": "submitMessage vr rejects overlapping turn; finally clears mr. Next serial user message invokes fresh Ys while preserving conversation in the same native process.",
    "schemaCounterSnapshotOffset": 243032982,
    "schemaLimitCheckOffset": 243043496,
    "schemaAttemptFormula": "Duo(conversation,StructuredOutput)+retractions-Ju; Ju snapshots pre-query attempts, so health schema attempt is not charged again to next review query",
    "correctEnvironmentVariable": "MAX_STRUCTURED_OUTPUT_RETRIES",
    "terminalToolOffset": 223652719,
    "terminalToolBehavior": "AJV-valid native StructuredOutput returns structured_output with endsTurn:true",
    "completionBranchOffset": 234178480,
    "completionBeforeNormalNextTurnGate": true,
    "terminalPostprocessingOffset": 234109370,
    "terminalPostprocessing": "Bm explicitly discards PostToolBatch continuation blocks with no model re-invoke; hooks/stop processing still exist and require proof of absence",
    "numTurnsCaveat": "Some wrapper paths increment wo on user/tool-result rows. num_turns===1 is not a universal provider-request counter. Qualification must correlate actual assistant/stream request IDs and reject duplicate/model-fallback/compaction/helper calls."
  },
  "hardRemainingOutputBound": {
    "status": "CURRENT_SINGLE_32768_RESERVE_NOT_PROVEN",
    "maxOutputRecoveryLimit": 3,
    "limitOffset": 234099422,
    "recoveryTransitionOffset": 234170819,
    "truncatedRecoveryOffset": 234171296,
    "whyMaxTurnsOneIsInsufficient": "Output-limit/truncation recovery returns next-round transition carrying F+X+nudge without checking maxTurns or increasing ordinary turnCount. Up to3 recovery generations can follow the initial32k generation within the same agentic turn; missing/broken StructuredOutput need not consume schema attempt first.",
    "additionalStateInteraction": "Malformed-tool retry at234171482 resets output-recovery guards via xr and retains previous F while retracting current X. A valid aggregate upper bound must account for this interaction rather than assume exactly4 total requests.",
    "unsafeShortcut": "A host kill after receiving max_tokens/output event is asynchronous; without a proven synchronous pre-request fence it may race the next request. A successful synthetic qualification alone does not prove unreachable failure-path retries.",
    "noNativeFlagFound": "Passive env/CLI scan found no exposed max-api-attempts flag or disable-output-limit-recovery environment switch. Internal apiAttemptsLeft exists but is not exposed on the standard main headless control path.",
    "toolSummaryGate": "Optional native helper at234176832 invokes tool_use_summary_generation when CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES is true; md at234098670 reads only that env gate. Ensure absent/false in sanitized env and reject any settings override; maxTurns does not govern that helper."
  },
  "nextFalsifiableTests": [
    "Mock exact stderr line protocol: no marker, watchdog, failures,304, save failure then apparent late-success, partial line, dropped marker, duplicated settlement and post-certificate change all reject with no source payload/claim.",
    "Mock managed env overwriting flag cap: effective snapshot rejects; unknown layer/error rejected; no raw settings/debug in receipts/errors.",
    "Real later authorized qualification on trusted approved main: initialize, positive native empty settlement before any model, settings snapshot, health, numeric model pin+snapshot, serial second synthetic schema query, exact output/counter/stream IDs, post-query snapshot.",
    "Test automatic max_tokens/truncation/malformed response paths against pinned native protocol before using a reduced aggregate output reserve. No capacity approval merely because two normal responses succeeded."
  ],
  "authorityAndPreservation": {
    "researchOnly": true,
    "noSourceControllerClaimOrGitHubWrites": true,
    "noRawNativeSettingsDebugCredentialsRead": true,
    "noProviderOrCliExecution": true,
    "originalBudgetAndHistoryUnchanged": true,
    "noApprovalAllowanceOrReleaseCreated": true
  }
}

END ORIGINAL

## p022
Original: C:/w-rv/tmp/review-capacity-20261103/research/pinned-claude-output-semantics-20261103.json
Bytes: 7476; SHA-256: fc99fd237e14b159dfc65515a899e18c0c49f43a64fe0ed0d264256da9eb232c
BEGIN ORIGINAL
{
  "schemaVersion": 1,
  "status": "environment-output-cap-does-not-requalify-modelUsage-default-no-supported-shortcut",
  "researchOnly": true,
  "question": "Can explicit CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000 both enforce request output64k and make pinned CLI2.1.301 genuinely report modelUsage.maxOutputTokens64k instead of the historically observed128000, without changing qualification/accounting?",
  "answer": "No. Published pinned code separates the effective request override from the model default recorded in modelUsage. Setting this variable alone does not change the reported model default. A request cap cannot be substituted for the actual observed profile in the current qualified-capacity gate.",
  "primaryDocumentation": [
    {
      "url": "https://code.claude.com/docs/en/env-vars#variables",
      "relevantLinesAtObservation": [356, 358, 552],
      "summary": "The output environment variable controls most requests and is bounded by model-specific defaults/caps; increasing it consumes input context. This does not document a change to modelUsage metadata. The context-window override is documented for gateway/custom IDs, not permission to enlarge the trusted native clamp."
    },
    {
      "url": "https://code.claude.com/docs/en/agent-sdk/python#resultmessage",
      "relevantLinesAtObservation": [2095, 2097, 2107, 2108],
      "summary": "The SDK passes CLI per-model metadata through unchanged, describing contextWindow and maxOutputTokens as model limits, not proof of a per-request override."
    },
    {
      "url": "https://code.claude.com/docs/en/settings",
      "summary": "Current docs distinguish settings and environment precedence. No documented equivalent that safely changes this observed metadata under the current strict no-settings worker was established. Undocumented catalog/managed overrides are not a qualified route."
    }
  ],
  "pinnedPackageIntegrity": {
    "lockfile": "scripts/automation/claude-cloud-tools/package-lock.json",
    "sourceCheckout": "C:/w-rv/auth-release-main20261102",
    "sourceSha": "d2a08b4850dd954bb790e35f2ed350d5eeacd1c4",
    "wrapper": {
      "name": "@anthropic-ai/claude-code",
      "version": "2.1.301",
      "publicTarball": "https://registry.npmjs.org/@anthropic-ai/claude-code/-/claude-code-2.1.301.tgz",
      "sha512Integrity": "sha512-sEqs0D9IIc6GwbdMvss5GHOjLjhaoqbrZWdickLRlG6v4kT946t4pq3zFAmQdUpRgdv1CvtSLyRrrdp+hDS9ww==",
      "matchesActualLockfile": true,
      "tarballSha256": "a6c33587bc5cab060f7eb6a9aa1dab1030f9fe5dd1bd73ffdfac4a6c71987e67",
      "structure": "Seven files; executable wrapper/installer, package metadata/docs and SDK tool declarations. Native implementation resides in the pinned optional platform package. Neither wrapper nor installer executed."
    },
    "cloudLinuxX64": {
      "name": "@anthropic-ai/claude-code-linux-x64",
      "version": "2.1.301",
      "publicTarball": "https://registry.npmjs.org/@anthropic-ai/claude-code-linux-x64/-/claude-code-linux-x64-2.1.301.tgz",
      "sha512Integrity": "sha512-JNe0VzIuXdaBrtlh+fY2SX5AQLDf8BDfIKrylOWK528AZ/aAq2bJt4SBkPikZ0CvecUbL0YN22Xe7eltAWCJGg==",
      "matchesActualLockfile": true,
      "compressedBytes": 119872477,
      "tarballSha256": "a7ffd61e7784e6dda864a31e934cececc050f106015201cb3db4abb59c781c57",
      "binaryEntry": "package/claude",
      "binaryBytes": 267955384,
      "binarySha256": "bc1aad9982c7b59c7d889ff92595d61cf46e0a6eae074cb551d932a989bcd222",
      "method": "Public registry fetch, bounded in-memory gzip/tar parsing, exact SHA512 lockfile verification and passive embedded JavaScript text inspection. No npm install/postinstall, CLI launch, binary execution, model/probe, auth or provider call. Public package bytes were not saved as executable files."
    }
  },
  "passivePinnedCodeEvidence": [
    {
      "byteOffset": 219697858,
      "role": "Model output defaults/cap resolver",
      "summary": "Resolver derives default and upper limit from recognized model/catalog and existing model configuration; its own body does not read CLAUDE_CODE_MAX_OUTPUT_TOKENS."
    },
    {
      "byteOffset": 219698291,
      "role": "Effective output environment override",
      "summary": "Separate effective-output function resolves that model default/cap, then validates the environment override against them. This is the request-facing override, not the reported model default."
    },
    {
      "byteOffset": 226074296,
      "role": "Resolved request model configuration",
      "shortCode": "maxOutputTokens:agt(e)",
      "summary": "Request-facing configuration uses the effective override path. Documentation says most requests; no stronger universal per-request guarantee was inferred or tested."
    },
    {
      "byteOffset": 226081134,
      "role": "Per-model usage accumulator",
      "shortCode": "s.maxOutputTokens=Uae(r).default",
      "summary": "The reported usage field takes the model default resolver, not the effective environment override."
    },
    {
      "byteOffset": 226076487,
      "role": "Session usage serialization",
      "shortCode": "maxOutputTokens:Uae(s).default",
      "summary": "Persistence also records model default, independently corroborating that the field is not the selected request cap."
    }
  ],
  "existingClinicOSConstraints": {
    "reviewChildEnvironment": "Trusted process.mjs review mode is credential-stripped and does not forward CLAUDE_CODE_MAX_OUTPUT_TOKENS. Setting it in the outer workflow currently has no effect on that child.",
    "profileQualification": "qualifiedModelProfile requires one genuine resolved Opus entry, explicit context and actual maxOutputTokens; context remains clamped to1000000. It cannot be made64k by rewriting probe metadata.",
    "capacityGate": "prepareCloudInference uses actual observed output allowance. With historical128000, exact current prompt/schema leave802924 packet bytes. The source31 planned selection lower bound830937 still does not fit.",
    "modelContextOverrides": "No env/settings-based enlargement of contextWindow may replace genuine qualification or the existing1M clamp. Gateway/API/model selection changes are outside this task.",
    "metadataCaveat": "Actual model defaults may independently change in a future genuine qualification. No fresh call was made; setting an output cap is not evidence that such a change occurred."
  },
  "decision": {
    "safeExistingRouteForRequestedAndObserved64k": false,
    "reason": "The proposed env-only method cannot meet its own requirement that actual pinned modelUsage report64k. Forwarding the variable would additionally require an explicitly reviewed environment-policy change and would still not fix the metadata distinction.",
    "notAuthorizedByResearch": "No changes to527, private auth generator, provider settings, safety envelope, output accounting, model/API route, source/context selection, auth counters or review budgets.",
    "nextBoundary": "Keep current observed-profile gate honest. Any different admission design requires explicit technical scope/authority and real independent review; do not implement a metadata rewrite or output discount as a workaround."
  },
  "preservation": {
    "authHistoricalImplementationRecords": 4,
    "authImplementationLimit": 5,
    "authReviewsSpent": 2,
    "authReviewLimit": 4,
    "sourceOrCanonicalWrites": false,
    "credentialReads": false,
    "providerCalls": false,
    "newPrivateResearchReportOnly": true
  }
}

END ORIGINAL
