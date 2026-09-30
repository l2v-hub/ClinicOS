# AI Assistant — UX Architecture (Phase 4)

## Flow

```
User (tablet) ─► Assistant UI (full screen) ─► POST /skills/converse
                                                 │ identity (requireOperator) + role (active policy)
                                                 │ Resident Access Scope (canAccessResident)
                                                 ├─► Agno skill router (runtime) → skill + slots
                                                 ├─► workflow engine → clarification / preview
                                                 └─► Tool Layer (policy re-check per call) → services → Postgres
             ◄── status, reply, preview (previewId), result, error, classicScreen ──┘
```

No parallel path: the UI never calls domain routes to act; it only talks to `/skills/*`, which
composes the Phase 1 tools under the Phase 2 policy and the Phase 3 skills/workflows.

## Entry point

- Topbar button «Assistente AI» (`data-testid="assistant-entry"`, icon + label ≥1100px) in
  `frontend/src/App.tsx`, visible for every logged-in identity. Opens `AssistantMode` (lazy).
- The existing «Assistente» sidebar item keeps opening the legacy Agnos panel (unchanged GUI).
- The resident of the current classic page (patient chart) is passed as `pageResident`; the
  server verifies it (`GET /skills/session?residentId=`) before it becomes the active resident.

## Screen (tablet-first, `components/assistant/AssistantMode.tsx` + `.css`)

| zone          | content                                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| header        | «← Torna all’applicazione», title, identity name + role label (from `/skills/session`)                                                                                                   |
| resident bar  | «Ospite attivo: …» always visible, «Cambia ospite» (scoped search), «Chiudi contesto»                                                                                                    |
| notice        | resident changes, transport errors (role=alert)                                                                                                                                          |
| conversation  | user / assistant turns with the workflow status chip                                                                                                                                     |
| workflow card | candidates (choice buttons) · edit form after «Modifica» · structured preview with «Conferma / Modifica / Annulla» · «Riprova» when safe · verified result · «Apri <schermata classica>» |
| starters      | from `/skills/session.starters` (available skills × resident context)                                                                                                                    |
| composer      | textarea + «Invia» (Enter), pinned to the bottom (virtual keyboard), disabled while busy                                                                                                 |

Touch targets ≥ 48 px (design-system controls), no horizontal scroll at 390 px, portrait and
landscape verified (evidence/screens-*). Design-system classes only (`ds-btn`, `ds-badge`); the
assistant CSS never restyles canonical controls (design-system guard test).

## Role-specific experience (same app, different content)

All driven by the server per identity: skills (`available`), starters, previews (actor/role),
write capabilities, alerts. Verified with the Role Simulator: OSS (no prescription/administration,
denials), Medico (read + prescription prepared/confirmed), Infermiere (vitals, handover, diary,
administration, scope), Supervisore (occupancy, global scope, revocation), Amministratore (no
clinical content skills).

## Fallback to the classic GUI

`classicScreen` (per skill: `screen`, `label`, `needsResident`) is returned for DENIED/FAILED and
non-confirmable previews; the UI shows «Apri <label>» and navigates (resident chart when needed).
Unknown requests list the available skills and suggest the classic screens.

## Voice (Prompt 5) integration point

`submitText(text, source)` in `AssistantMode` is the single text-to-command entry
(`source: 'keyboard' | 'starter' | 'voice'`). A voice layer must call it with the final transcript;
it must NOT confirm (confirmation stays the «Conferma» button bound to `previewId`).
