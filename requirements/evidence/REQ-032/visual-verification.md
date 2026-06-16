# REQ-032 — Visual verification

**Result: PASS.** Wide two-panel import/review workspace verified via Playwright with real
PDF + SVG document fixtures (job endpoints mocked, model-independent), desktop 1366 + tablet
1024 + mobile 390.

- `wide-upload-modal.png` — wide upload step.
- `review-two-panels.png` — left DocumentPreview (toolbar: file nav, Documento/Testo riconosciuto, page nav, zoom, Adatta, fullscreen) + right ClinicOS data (Anagrafica, Allergie critical "Vai alla fonte", Diagnosi block); layout presets ◧▣◨.
- `wide-image-preview.png` — readable document image, zoom/Ruota/Adatta/fullscreen, "Immagine 2 di 2".
- `image-rotation.png` — 90° rotation (preview only, original unchanged).
- `pdf-zoom-150.png` / `pdf-page-navigation.png` — zoom + "Pag." controls (PDF body blank in headless — renders in real browser).
- `ocr-text-view.png` — Testo riconosciuto: search, Copia, source, newlines + [ILLEGGIBILE] highlighted.
- `allergy-source-preview.png` — allergy "Vai alla fonte" opens the preview panel.
- `tablet-document-tab.png` — tablet single-pane (Documento/Dati tabs).
- `mobile-fullscreen-review.png` — mobile fullscreen single-pane; state persisted after viewport resize (§13).

No fabricated data — synthetic Imola fixtures. Headless PDF-body limitation documented.
