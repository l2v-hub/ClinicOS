# REQ-040 — Frontend Panel Visual Verification

Issue #53. Branch `req-040-assistant-panel`. Date 2026-06-18.

The global "Assistente ClinicOS" FAB + slide-in drawer already existed (`AIAssistantButton.tsx`,
mounted app-shell-global in `App.tsx` — available on every section per the unified-nav rule). This
change fills the drawer with the working SOURCE_ONLY chat and adds the public operator endpoint.

Captured live (local backend :3001 + frontend :5173, Playwright Chromium). Demo patient
"Forlano Fabio" (`POST /patients/demo-setup`). 0 console errors.

| File | Shows | Verdict |
|------|-------|---------|
| `ai-assistant-global-panel.png` | drawer open: header "Assistente ClinicOS", scope "Paziente corrente: Forlano Fabio", input + Invia | PASS |
| `ai-allergy-answer-with-source.png` | "Quali allergie sono documentate?" → 1 risultato, source card (allergie:Penicillina · Fonte: PATIENT_FIELD), "Apri paziente" action | PASS |
| `ai-diagnosis-refused.png` | "Che diagnosi ha questo paziente?" → amber refusal ("non fornisce diagnosi, terapie o valutazioni cliniche") | PASS |
| `ai-no-result.png` | nonsense question → "Informazione non trovata" (nothing invented) | PASS |
| `ai-tablet-panel.png` | 1024×768 — panel + sourced answer render on tablet | PASS |

## Reviewer notes
- Every answer shows its source (SOURCE_ONLY); not-found is explicit; clinical advice refused.
- Current-patient default scope on the patient page (scope banner). Navigation action ("Apri paziente")
  uses the real patientId → `selectPaziente`.
- Brand blue, no red except the count/refusal semantics; selectable text; desktop + tablet.
- Security: the browser calls `POST /ai/assistant/query` with only operator headers — it never holds
  the runtime service token; the gateway runs in-process behind `requireOperator`.

## Backend
- `routes/ai-assistant-public.ts` — operator-auth public route → `assistantQuery` in-process.
- 401 without operator auth; sourced answer with operator headers (verified by curl).
- backend 137/137, `tsc` 0; frontend `tsc -b` + `vite build` ✓.
