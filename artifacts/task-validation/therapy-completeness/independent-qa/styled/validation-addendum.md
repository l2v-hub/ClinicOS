# Styled independent QA evidence correction

Final Decision: FAILED VALIDATION

Candidate remains `14a03038f758cf728e563807752da1642dc35fa8`; base remains `30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6`. No application source changes were made by QA.

## Why the additional run was required

Original QA surface imported App.css but omitted the global index.css, print-forms.css and design-system.css loaded by production main.tsx/App.tsx. Original functional assertions remain valid, but the original screenshots are not complete canonical-styling evidence. This is an evidence-input correction, not an application fix. New `styled-surface.tsx` imports index.css → print-forms.css → App.css → design-system.css in the real global order. The original151 sealed artifacts were preserved byte-for-byte, verified against their original SHA256 manifest. All corrected styling artifacts live under `styled/`; none overwrite the first run.

## Results

| Test | Result | Evidence |
|---|---|---|
| Actual compiled components with canonical global styles |10/10PASS |`logs/styled-playwright.txt`, `playwright-report/index.html`, `test-results/` traces/videos/result PNGs |
| Readable desktop/mobile clips |2/2PASS |`logs/styled-readable.txt`, `readable-report/index.html`, `readable-results/` traces/videos/clips |
| New independent mobile geometry requirement |FAIL |`logs/styled-mobile-geometry.txt`, `geometry-report/index.html`, `geometry-results/geometry-canonical-mobile--8d588-ble-region-without-clipping/geometry.json`, native failed screenshot/trace/video |
| Secret scanner on new QA inputs/build |0 findings |`logs/styled-secret-scan.txt` |

All functional scenarios assert zero page/console errors, zero HTTP4xx/5xx and zero unknown/mutating network calls. Only local static assets and public Google fonts can pass the network allowlist; synthetic clinical GETs are fulfilled locally. Explicit empty capabilities deny all writes.

## New visual finding

At390px viewport width, the canonical PRN control extends20.359375px beyond its available PRN-card boundary: button right349.359375 vs region right329. Its full label is mostly readable in the native viewport screenshot, but the button protrudes beyond the PRN card and slightly beyond its surrounding card. The tightly cropped region screenshot necessarily clips the protruding portion; do not confuse that crop with proof that the entire text is invisible. This is an actual control/card-fit failure under canonical styles. The day control existed before this change, but the candidate also exposes it in week view; it cannot be represented as a fully verified responsive fit.

Relevant source is `PatientTherapyCalendar.tsx` PRN-button rendering plus canonical `.ds-btn` styling; a bounded/wrapping canonical control or shorter non-misleading label requires a separately reviewed application correction by the implementer. QA did not modify styles or weaken the geometry assertion. Dense week cells with108 synthetic prescriptions are also narrow vertically; no unrelated grid fix is certified here.

The correct overall verdict remains FAILED VALIDATION:12 original full-suite failures, unresolved broader import criteria, and now a documented mobile card-fit failure. No deployment, issue closure or full-goal completion follows from the12 successful styled functional/browser tests.

## Ownership and preservation

Root explicitly returned browser lane; QA reacquired only7543, compiled the QA-only styled entry, ran sequentially, and stopped its owned server. Original source receipt/report/manifest and151 artifacts remain immutable. `styled-artifact-manifest.json` binds the original manifest hash, all newly added files and the exact candidate/global CSS inputs.

Codex must now re-run the QA Gate.
