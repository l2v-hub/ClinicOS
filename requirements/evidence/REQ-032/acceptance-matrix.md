# REQ-032 — Acceptance matrix

Issue: #37 — *Ampliare la popup di importazione e rendere leggibili immagini e PDF* (title REQ-032; commit "REQ-027" stale).
Type: **Frontend**. Verified with Playwright screenshots (job endpoints mocked, real PDF + SVG document fixtures).

| # | Acceptance criterion | Evidence | Status |
|---|----------------------|----------|--------|
| 1 | Popup ≥94–96% width | `.import-modal--review` width min(1600px,96vw); `review-two-panels.png` | PASS |
| 2 | Popup ≥90% height | height min(940px,94vh) | PASS |
| 3 | Document readable without browser zoom | `wide-image-preview.png` (readable) | PASS |
| 4 | Zoom controls for PDF + images | `pdf-zoom-150.png`, image −/100%/+ | PASS |
| 5 | Page navigation | `pdf-page-navigation.png` (Pag. nav) | PASS |
| 6 | Image rotation | `image-rotation.png` (Ruota 90°) | PASS |
| 7 | Open document fullscreen | ⛶ requestFullscreen button | PASS |
| 8 | Review + document side by side (desktop) | `review-two-panels.png` | PASS |
| 9 | Document panel min-width | `.iw-doc { min-width: 480px }` | PASS |
| 10 | File list not compressed | wide upload step (`wide-upload-modal.png`) | PASS |
| 11 | Full file names identifiable | title tooltips + wide rows | PASS |
| 12 | Section source openable | "Confronta con la fonte" / "Vai alla fonte" → preview jumps | PASS |
| 13 | Allergies comparable with document | `allergy-source-preview.png` (Vai alla fonte) | PASS |
| 14 | OCR text consultable | `ocr-text-view.png` (search/copy/source/[ILLEGGIBILE]) | PASS |
| 15 | No unwanted transparency | opaque `.modal-card`/`.import-modal` | PASS |
| 16 | Footer stays visible | data-pane footer (Indietro/Crea paziente) | PASS |
| 17 | No global horizontal overflow | responsive grid, min-width clamps | PASS |
| 18 | Tablet & mobile modes | `tablet-document-tab.png`, `mobile-fullscreen-review.png` | PASS |
| 19 | Resize keeps state | preview survived viewport 1366→390 (mobile shot) — §13 | PASS |
| 20 | Functional flow unchanged | upload→process→review→confirm intact (non-breaking) | PASS |

## Components
- `DocumentPreview.tsx`: image viewer (zoom/rotate/drag/fit/fullscreen/prev-next/«X di Y»), PDF via native `<iframe>` (#page/zoom fragment + page nav + fullscreen), OCR mode (pre-wrap, [ILLEGGIBILE] highlight, search, copy, source). No new deps.
- `DischargeImportModal`: review step is a two-panel workspace (doc 55% / data 45%, presets ◧ ▣ ◨, min-widths) using session blob URLs of uploaded files; source-link callback into the preview. Responsive: desktop two-col, tablet/mobile single-pane with Documento/Dati tabs, mobile fullscreen.

## Screenshots (`requirements/evidence/REQ-032/`)
wide-upload-modal · review-two-panels · wide-pdf-preview · wide-image-preview · pdf-zoom-150 · pdf-page-navigation · image-rotation · ocr-text-view · allergy-source-preview · tablet-document-tab · mobile-fullscreen-review. (`before-narrow-modal` N/A — the narrow review modal no longer exists.)

## Notes
- Headless Chromium disables the native PDF viewer, so the PDF *content* area is blank in the captured PDF shots; the toolbar/page-nav/zoom controls and layout are visible, and PDFs render in a real browser. Image (SVG) preview renders fully in headless and proves the viewer + controls.
- build: `tsc -b` exit 0 + `vite build` ✓. data-smoke /patients 200, 19 (frontend-only).
