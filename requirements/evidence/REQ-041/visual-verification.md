# REQ-041 — Visual Verification

Driver: `e2e/req041-voice-shots.mjs` against the real built frontend (`vite preview`); the
`/ai/voice/*` contract is mocked at the network boundary (no DB writes). Viewports: desktop 1366×768,
tablet 1024×768. Palette: medical blue (`--c-primary #0F5FD7`); red reserved for the recording dot and
blocking ambiguities only (per brand rule). Final run: all assertions PASS (confirm disabled while
ambiguous = true; permission-denied state shown = true).

| State | Screenshot | Reviewer verdict |
|-------|-----------|------------------|
| Registrazione | `voice-recording.png` | PASS — red pulsing dot, "Ferma" control |
| Trascrizione | `voice-transcription.png` | PASS — transcript editable, "Verifica comando" ready |
| Preview parametro | `voice-vital-sign-preview.png` | PASS — Paziente Rossi Mario, 130/80 mmHg, orario 09:00, Conferma/Modifica/Annulla (matches REQ preview spec) |
| Confermato | `voice-vital-sign-confirmed.png` | PASS — "Parametro registrato." success card |
| Preview anagrafica | `voice-demographic-update-preview.png` | PASS — Campo/Valore attuale/Nuovo valore |
| Preview narrativa | `voice-narrative-update-preview.png` | PASS — Testo attuale / Aggiunta / Testo risultante (highlighted) |
| Paziente ambiguo | `voice-patient-ambiguous.png` | PASS — ⛔ "Paziente non identificato con certezza", Conferma **disabled+dimmed** |
| Permesso negato | `voice-permission-denied.png` | PASS — "Microfono non disponibile" + typed-fallback hint |
| Tablet | `voice-vital-sign-preview-tablet.png` | PASS — layout holds at 1024×768 |

No console errors. The drawer reuses the existing assistant drawer shell + medical-blue tokens; the mic
FAB stacks above the assistant FAB. No red used as a brand/active colour.
