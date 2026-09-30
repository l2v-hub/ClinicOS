# Safety & Confirmation Rules (Phase 4) — Confirmation Policy v2

Supersedes Phase 3 v1 (`../phase-3-skills/CONFIRMATION_POLICY.md`) where they differ.

1. **THE ASSISTANT ORCHESTRATES, THE BACKEND DECIDES.** Policy (per turn + per tool call),
   Resident Access Scope (selection + execution), validation (service parsers) are server-side.
2. **Explicit UI confirmation bound to a preview.** `action:"confirm"` + `previewId` of the current
   preview. A payload change (Modifica/edit, correction) issues a new `previewId` and a new write
   requestId; an older confirmation returns `preview_stale` and writes nothing. Typed «sì» never
   confirms. The LLM (Agno) has no way to confirm.
3. **No Conferma when not allowed.** Unavailable skill → DENIED (no preview); non-confirmable
   preview (`confirmable:false`: missing prescription data, fascia conflicts; UI mapper issues) →
   no button, classic screen offered.
4. **High-risk clinical actions (prescription, administration).** The assistant prepares
   (structured draft, same interpreter / same slot data as the classic GUI), the authorised
   professional confirms with the button:
   - prescription: Doctor only (policy `diary.create_with_therapy` ALLOWED_WITH_CONFIRMATION);
     the confirmed therapy is built with the classic Terapia mapper and must match the draft
     (drug, times, start) → `diary.create_with_therapy` (voce «terapia» + terapia, requestId);
   - administration: Nurse (Supervisor with confirmation) → `administration.confirm` after
     choosing one pending administration; warning «conferma solo dopo aver somministrato».
     Never declared executed before the backend confirms.
5. **Handover defaults.** Priority `normale`, type `Assistente AI` (AI_ASSISTED equivalent).
   Urgency keywords only produce a warning; raising priority is an explicit edit → new preview.
6. **Cancellation** writes nothing; a cancelled workflow cannot be confirmed later.
7. **Resident change** (Cambia ospite / Chiudi contesto / different page resident) invalidates an
   open workflow (`resident_changed`), no write.
8. **Results, not claims.** Success only on `COMPLETED` with references; FAILED/DENIED show the
   real reason; retries only for requestId-idempotent writes (no duplicates).
9. **Administrator** is technical: per-resident clinical content (clinical summary, handover texts,
   therapy slots) removed from the baseline; aggregates/metadata kept for the admin dashboard.
10. **Audit origin AI_ASSISTANT** (`channel = ai_assistant`) on skill and tool events: identity,
    role, skill, tool, `preview:<id>`, confirmation (`confirmed`/`ui_event`/`cancelled`/
    `modify`/`edit`/`preview_stale`/`resident_changed`), outcome — field names only (PHI-safe).
