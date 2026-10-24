# Cycle3/4 — native core test harness correction

Actual CI39047709835 on49e65822 ran240tests and failed exactly the new real ASGI route test because httpx is absent from the deliberately minimal core dependencies. Production requirements also do not declare httpx. Local development had an extra installed client, so localPASS did not establish minimal-CI compatibility.

Scope: only clinicos-ai-runtime/tests/test_voice_realtime.py. Preserve every existing authorization, malformedSDP, actual streamed-body-limit, response and awaited-provider-call assertion. Replace only the external HTTP client adapter with a small direct ASGI request driver using standard-library asyncio/JSON and the actual FastAPI app, headers, request-body frames, response status/body collection. No fake route requests, skips, removed assertions, added production dependencies, workflow changes or API/provider calls.

Reserve3/4 before source edits, delegate this bounded test-only step to Luna, seniorreviews exactdiff and runs240tests with httpx import deliberately denied to reproduce minimalCI. Verify24other frozen sourcefiles and all3contracts remain identical; inherit applicationbrowser52cases only through those exacthashes. Fresh independent QA checks newtestdriver and actual oldfailureprobe before publication. AllpriorQA/nativefailureevidence immutable, no counter reset.
