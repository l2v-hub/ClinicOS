# Independent QA3 diff and security review

Reviewed exact HEAD→candidate diff and current actual FastAPI route, and verified the complete source/input hashes against sealed QA2. Full main→candidate source diff is retained in test-results/full-source-diff.patch; prior full QA2 scope/security review remains immutable. Only changed source is clinicos-ai-runtime/tests/test_voice_realtime.py:122–189. No app, workflow, dependency, lockfile, schema or configuration edits.

The replacement request helper drives runtime.app itself (line166), not a fake route handler. Its ASGI3 HTTP scope supplies actual lower-case byte headers, method/path and client/server; receive returns separate http.request body events with correct more_body bits. send records actual response.start and response.body messages. asyncio.wait_for bounds hangs at3seconds. Current route is ordinary non-streaming JSON; returning disconnect after body completion does not truncate that response. ASGI lifespan is not exercised and is not claimed.

Unauthenticated401 and no provider call remain at173–175. InvalidSDP400 remains176–177. Streamed-body case178–183 omits Content-Length deliberately and delivers40001 then40000bytes (the first includes a leading JSON brace), so actual80001bytes cross MAX_SDP_BYTES+4096 in app.py:347–349 before JSON parsing. Cumulative call.assert_not_called at183 covers malformed and oversized cases as well. Valid authenticated response200, exact answerSDP and exactly one awaited offer remain184–189. The no-httpx import barrier confirms compatibility with missing optional HTTP client; no assertion was weakened or skipped.

| Security check | Assessment |
| --- | --- |
| Secrets/PHI/logging | PASS: synthetic bearer/SDP only; no production data, real key or new product logging. Own media/trace undergo independent privacy audit. |
| AuthZ/input limits | PASS: real app auth precedes streamed read, invalid and oversized input rejected before mocked negotiation; current backend capability/rate gates unchanged and12 actual owned-PG cases rerun. |
| Injection/XSS | PASS: test-only bytes and JSON, no productSQL/HTML changes; clinical policy and partial display implementation byte-identical to sealed QA2. |
| Dependencies/config | PASS: standard-library adapter replaces optional client; no package/workflow edits or feature activation; defaultOFF preserved. |
| Provider/network isolation | PASS: negotiation patched as AsyncMock; browser runtime uses labelled synthetic transport and uniquely owned loopbackPostgres, no callerDATABASE_URL. Actual provider/model not called. |

No actionable correctness/security finding. Frontend1386/build/backendtypes and52 browser assertions are inherited only after exact1674 current published frontend/backend/schema/build-input hashes,106 original input hashes,24unchanged frozen source hashes and allQA2/QA1 sealed artifacts were verified. They are not new QA3 execution. Actual Azure positive/real-provider compatibility remains NOT RUN.
