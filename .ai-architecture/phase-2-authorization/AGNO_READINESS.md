# Agno Readiness — Phase 2

## Harness

`backend/src/authz/__tests__/agno-readiness.test.ts` (support: `harness-support.ts`) runs the
REAL Express app over HTTP with the Role Simulator as identity source and a real Postgres. It uses
exactly the endpoints an Agno runtime will call; there is no privileged test path (no hook
override, no direct service call, no header identity).

| Step                                       | How                                                                                                                 | Evidence (assertion)                                                                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. select/use a simulated identity         | `POST /auth/simulator/session {identityId}` → `Bearer sim.*`; `GET /auth/me`                                        | `appRole` from server policy (`doctor`, `oss`), `roleSource: assignment`, `identitySource: simulator`                                                                                                                                       |
| 2. enumerate available tools               | `GET /tools` (`X-Tool-Origin: ai`)                                                                                  | Doctor sees `diary.create`, `therapy.create` (`requiresConfirmation: true`), `narrative.save`, `assessments.finalize`; OSS sees `consegne.create`, `diary.create`, `parameters.create_reading`                                              |
| 3. denied tools not available              | same                                                                                                                | OSS never offered `therapy.create`, `administration.confirm`, `documents.upload`, `narrative.list`; Doctor not offered `administration.confirm`; Agnos `GET /ai/actions/catalog`: `create_appointment` disabled for OSS, enabled for Doctor |
| 4. invoke allowed tool, controlled payload | `POST /tools/diary.create/invoke` as Doctor 1                                                                       | 200 envelope                                                                                                                                                                                                                                |
| 5. backend/business logic reached          | Postgres row                                                                                                        | `PatientDiaryEntry.authorType = 'medico'`, `authorName = 'Doctor 1'` (identity reached the business rule)                                                                                                                                   |
| 6. forbidden invocation denied             | `POST /tools/therapy.create/invoke` as OSS 1; direct `POST /patients/:id/therapies`; spoofed `X-Operator-*` headers | 403 `capability_denied` on tool AND route; no `PatientTherapy` written; spoof ignored                                                                                                                                                       |
| 7. audit + attribution                     | `AiAuditEvent`                                                                                                      | `tool:diary.create` SIM-DOCTOR-1 / doctor / channel ai / ok; `tool:therapy.create` SIM-OSS-1 / oss / denied; route `therapy.create` SIM-OSS-1 / oss / denied                                                                                |

Extra: without a simulator session, `GET /tools` with self-declared headers → 401
`simulator_session_required`; a tampered token → 401.

## Policy-driven visibility (in `authz-e2e.test.ts`)

After Administrator Save/Apply revokes `consegne.create` for Nurse: `GET /tools` for the already
open Nurse 1 session no longer lists `consegne.create`; `/ai/actions/catalog` marks
`create_consegna` disabled; `POST /tools/consegne.create/invoke` → 403; after restore it is back.
The impact preview reports `toolsLost: ['consegne.create']` for the nurse before applying.

## What Agno (Python runtime) needs to do in Prompt 3

1. Per end-user request, forward the user's credential (simulator token today, Entra token later)
   to `GET /tools` and build the Agno tool list from `{name, description, inputSchema,
requiresConfirmation}`.
2. Invoke via `POST /tools/:name/invoke` with `X-Tool-Origin: ai`; on `requiresConfirmation`, ask
   the user and resend with `confirmed: true`.
3. Treat 403/428 as normal outcomes to explain to the user; never retry with other identities.
4. Never hold its own permission list: the backend decides every call.

## Results

See `TEST_REPORT.md` (harness 5/5 pass, e2e 4/4 pass).
