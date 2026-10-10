# Independent QA — issue #430 PDF multipage preview

Final Decision: READY FOR CODEX QA

Candidate: `30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6`; baseline application: `3f911cbd281d7c93c4796e97d5940258ceb331f0`.
QA checkout: `C:/w-pdf-qa`. Integration and publication remain the root agent's responsibility. No commit, push, deployment, issue mutation, real patient/document access, or application edit performed by this QA session.

## Gate phases

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS — fresh issue #430 and comments read independently; five acceptance criteria match the frozen contract | `issue-snapshot.json`, `contract.log`, `../task-contract.md` |
| 1 Diff review | PASS — six application/config/test files plus contract; only the two PDF initializers and dependency-versioned decoder bundling change | `source-before.json`, `source-after.json`; complete baseline-to-candidate diff reviewed |
| 2 Scoped tests/build | PASS — 13 focused resource/session/upload tests, app types, tsc -b, Vite build, source/dist secret scans | `focused.log`, `types.log`, `build-types.log`, `build-vite.log`, `commands.json`, `secrets-source.log`, `secrets-dist.log` |
| 2 Full regression | NOT globally green: 1299 tests, 1287 pass, exactly 12 previously accepted failures; zero new names | `full-frontend.log`, `baseline-comparison.json`, authoritative baseline commit `057dc6ca6374203d4a1c86d1e5c4b14b73810d48` |
| 3 Browser | PASS — actual compiled ImportDocumentsWorkspace, ImportPagePreview and PdfCanvasPreview; desktop1150x1004/mobile390x844; distinct source thumbnails, full pages2/3/4 and correct original page4 pixels after reorder/reload | `browser-normal/`, `browser-production-csp/`, `browser-legacy-fidelity/`, `browser-v2-fidelity/`, `native-csp/`, `playwright-report/index.html`, `test-results/` |
| 3 Failure paths | PASS — WASM-disabled worker actually requests JavaScript fallback; exact production CSP also chooses fallback without weakening policy; invalid synthetic PDF exposes an explicit error, retry and original download | `browser-js-fallback02/results.json`, `browser-production-csp/results.json`, `invalid-original02/error-result.png`, `invalid-original02/results.json` |
| 4 Security | PASS scoped — checklist below; no authorization/API/schema/runtime-env change; decoder assets are exact existing dependency bytes and license notices included | `resource-binding.json`, `dependency-binding.json`, `compiled-surface-binding.json`, source/dist scanner logs |

## Acceptance criteria

| AC | Result and scope |
|---|---|
| AC1 baseline reproduction | Root's preserved `baseline08/results.json` reviewed: vector page1 has contrast, original CCITT pages2–4 have zero dark pixels. Independently rendered original PDF with Poppler, confirmed four pages and distinct content; additionally created a canonical Pillow-encoded positive CCITT fixture with original raster oracle and TIFF roundtrip. The original fixture is not defective and does not require replacement. |
| AC2 all thumbnails | PASS — all four actual image nodes visible with natural image dimensions and contrast; scanned page2–4 distinct source-marker positions plus full raster/title/bar fidelity, both desktop and emulated mobile. |
| AC3 full preview and resume | PASS — page2/3/4 canvas visible/ready, exact source-page aria label and unique source pixels; after page4 reorder and reload, all four thumbnails remain correct and page4 preview retains source-page4 pixels. Only synthetic manifest sessionStorage is used; this is not a claim of backend persistence. |
| AC4 decoder assets, CSP and privacy | PASS locally — all 11 decoder/license resources in installed dependency, production build, QA build and HTTP responses are byte-identical; wasm MIME application/wasm and fallback MIME text/javascript. Exact committed production CSP is applied to the unchanged real worker and rejects WASM instantiation, but the JavaScript fallback renders correctly. No clinical requests go to a real backend. Root must separately verify deployed bytes/MIME/CSP. |
| AC5 QA and release | Scoped QA PASS with baseline-only regression limitations. Native Playwright HTML report: one real browser-flow test passed, two responsive scenarios under actual committed CSP. Deployment/publication remains NOT performed by QA and must be verified by the integration owner before closure. |

## Quantitative full-content fidelity

`check-fidelity.py` compares 24 raw thumbnail/full-preview images from both CCITT polarities against the original synthetic raster oracle, rather than checking markers alone. Maximum full-page binary mismatch is 0.8958%, maximum title-region mismatch1.8828%, maximum marker-region mismatch0.0028%, maximum five-bar region mismatch3.4792%; differences are sampling/interpolation around edges. Title foreground retention ranges96.697%–120.574%, including low-resolution thumbnails. Original desktop full-page title retention for pages2/3/4 is100.9625%/100.9086%/100.7516%, confirming the complete title pixels are present. Apparent clipped titles in streamed image-tool output were not present in actual PNG/canvas bytes. All checks PASS (`fidelity-measurements.json`).

V2 fixture is a supplementary independent oracle, not an application change. Pillow's supported CCITT PDF encoder specifies BlackIs1=true and TIFF PhotometricInterpretation1; TIFF compression4 roundtrips to exactly the original raster. The original fixture is intentionally negative polarity and continues to be the primary reproduction. Both preserve correct source content after rendering.

## Security checklist

- Secrets: source/config/dist scans returned zero findings; recipes have no keys or credentials. Publication archive/private-value scanning belongs to root's final release gate.
- PHI: synthetic fixture labels and opaque IDs only. No user screenshot/document used as a fixture and no real session touched.
- Logging: no new application logging; QA warnings contain synthetic outcomes only.
- Input bounds/authZ: unchanged cache maximum bytes, authenticated content fetch, abort/retention logic, manifests and role gates; no new API endpoint.
- XSS/path handling: no injected HTML/SQL in application. Version is bounded by numeric-semver regex; static middleware exact-filename allowlist prevents traversal. Worker URL is the trusted Vite-generated asset, not user input.
- Dependencies: no manifest or lockfile edits or installation. Decoder bytes/licenses originate from existing pdfjs-dist6.2.108, independently SHA-bound. Compiler/runtime versions are recorded in `dependency-binding.json`.
- Config: Vercel CSP, SPA rewrites, CORS and production flags unchanged. Test-only surface lives under artifacts and does not enter the production application's input.
- Network: route guard rejects nonlocal or non-GET wire traffic. Font stylesheet is fulfilled offline. Manifest mutation is in-memory only. No production endpoint or database contacted by browser tests.

## Retained attempts and limitations

- `browser-js-fallback/failure.json` records a failed harness precondition: Chromium's flag did not hide WebAssembly. The second attempt explicitly disables WebAssembly only in the QA worker transport and verifies actual fallback fetch. Exact production-CSP evidence uses an untouched worker, not that instrumentation.
- `invalid-original/error-result.png` caught retry in flight; `invalid-original02/` awaits the final settled error and is the accepted result proof. The first artifact is retained, not silently overwritten.
- Poppler reports missing optional Symbol/ArialUnicode display fonts; the document uses a vector cover and embedded CCITT images. This is a rendering-tool warning, not a clinical-data/decoder claim.
- Mobile is emulated Chromium, not hardware/AT certification. OCR extraction, document upload persistence, real user document encoding and production authentication were intentionally not exercised. No statement that all PDF encodings/devices are covered.
- The full frontend suite remains failing with its exact accepted12 baseline failures; no global-green claim. Source and dependency bindings must accompany evidence copied to the integration checkout.
- Browser lane7541 is released on handoff. Integration owner must perform source-bound final QA and verified deployment before a user-facing resolved claim.

Codex must now re-run the QA Gate.
