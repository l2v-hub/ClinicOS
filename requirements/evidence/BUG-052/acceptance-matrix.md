# BUG-052 (#89) — Acceptance matrix

Issue: "Scatta Foto" apre l'importazione file invece della fotocamera.
Verified on the DEPLOYED app (Vercel prod) via Playwright; camera modes simulated
(fake stream / injected getUserMedia rejections). 100% synthetic — no real data.

| Acceptance criterion | Status | Evidence |
|----------------------|--------|----------|
| `Importa` apre file/galleria (multi, PDF/JPG/PNG) | PASS (unchanged) | `Seleziona file` input untouched (accept .pdf,.doc,.docx,.txt,image/*, multiple) |
| `Scatta Foto` attiva la fotocamera (non il file picker) | PASS | `livePreview:true` — opens CameraCapture (getUserMedia), not the file dialog |
| Fotocamera posteriore preferita | PASS | `facingMode: { ideal: 'environment' }` |
| Handler/input distinti per i due pulsanti | PASS | `Scatta foto` → CameraCapture component; `Importa` → file input (separate) |
| Anteprima dopo lo scatto | PASS | `capturedPreview:true` — `camera-captured-preview.png` |
| Ripeti la foto | PASS | `hasRetake:true` (Ripeti re-opens the stream) |
| Annulla lo scatto | PASS | Annulla closes + stops the stream |
| `Usa foto` aggiunge l'immagine alla lista | PASS | `photoAddedToList:true` — `camera-added-to-list.png` (foto-documento-<ts>.jpg) |
| processingOrder assegnato | PASS | added via the same sendFiles upload path (sortOrder) |
| Più foto consecutive | PASS | re-open `Scatta foto`; list accumulates |
| Riordino / non perse tornando indietro | PASS (existing) | same ordered list (move up/down, retake) |
| Permesso negato → messaggio chiaro + azioni | PASS | `deniedShown:true` — `camera-permission-denied.png` (Riprova/Apri importazione/Annulla) |
| Desktop senza fotocamera → fallback esplicito | PASS | `unavailableFallback:true` — explicit "Fotocamera non disponibile" + Seleziona immagine |
| No file duplicati | PASS | single File per capture |
| Compare in Documenti dopo creazione paziente | DEFERRED | depends on #71 (persistence) — fixed but backend not yet deployed |

## Deploy
- frontend: Vercel `vercel deploy --prod` → https://clinicos-eosin.vercel.app (READY)
- build PASS; commit d716aa8

## Notes
- Real on-device camera (Android Chrome / iOS Safari) still needs a manual pass — Playwright verifies
  the wiring + all UI states with a fake/injected stream, which is the automatable portion.
