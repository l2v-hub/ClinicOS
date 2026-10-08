# Independent QA — mobile focus obstruction on 3cb88271

Verdict: FAILED VALIDATION pending focused-field visibility repair.

All twelve desktop/recovery/role/persistence checks pass, including eight repeated Back/remount cycles. The new route-owner focus restoration resolves the earlier race; the updated source guard resolves the new regression failure. Independent types and build pass. Focused suite: 117/117 pass. Full frontend regression: 1156 total, 1144 pass, twelve known baseline failures only.

At viewport390×844, the manual dialog focuses Name, but `scrollIntoView({ block: 'nearest' })` leaves it hidden behind the fixed action footer. Name input bottom is843.64px; safe boundary above fixed actions is761px. The field's minimal viewport intersection made `toBeInViewport()` pass, so the assertion was strengthened to check obstruction explicitly. The screenshot `screenshots/mobile-manual-form.png` shows this state. This is actual full-SPA UI behavior, not a mocked-component surface.

Root should center the focused field within the scrolling body or account for the fixed action footer, then rerun this browser proof. No application code was edited by QA. Latest failure preserved in `test-results/mobile-obstruction-browser-results.json`; executable assertion in `qa-browser.mjs`.
