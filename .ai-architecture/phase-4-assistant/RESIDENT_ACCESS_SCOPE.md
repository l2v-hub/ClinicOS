# Resident Access Scope (Phase 4, Prompt 4 §1.4 and §10)

Code: `backend/src/access-scope/resident-access-scope.ts` (tests `__tests__/resident-access-scope.test.ts`).

`can_access_resident(identity, resident_id, operation_context)` =
`canAccessResident(operator, residentId, { operation: 'select'|'read'|'skill'|'write'|'tool', skillId?, tool? })`
→ `{ allowed, mode, reason? }`. `describeResident()` returns the server label of a reachable resident.

WHICH residents (scope) is separate from WHAT may be done (capability policy).

## Modes

| mode                                                               | status      | rule                                                                                                                                             |
| ------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `all`                                                              | implemented | every resident (today: legacy roles `admin`, `manager` → Administrator, Supervisor, legacy admin)                                                |
| `registered_by_me`                                                 | implemented | `Patient.registeredById = operator.id` (today: everyone else)                                                                                    |
| `assigned_to_me`, `ward`, `team`, `facility`, `patient_assignment` | declared    | need data (assignments, ward/team membership) — a config naming them is ignored (current rule stays), so visibility is never widened by accident |

Config (optional): `RESIDENT_SCOPE_CONFIG='{"byLegacyRole":{"manager":"registered_by_me"},"fallback":"registered_by_me"}'`
— only implemented modes take effect; malformed JSON keeps the default.

## Enforcement (backend)

| point                                  | how                                                                                                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| every existing service (18 call sites) | `patients/patient-scope.ts` (`patientScopeWhere`, `hasGlobalPatientScope`, `patientIsInOperatorScope`) now delegates to the scope service — one rule                       |
| Tool Layer                             | `patientScoped` tools call `canAccessResident(…, {operation:'tool'})`                                                                                                      |
| resident selection                     | `POST /skills/context` (403 `resident_out_of_scope`), `GET /skills/session?residentId=` (`residentDenied`)                                                                 |
| resident picker                        | `GET /skills/residents?q=` = `patients.search` tool (scoped)                                                                                                               |
| skills                                 | selection (context resident, named resident, candidate) → DENIED `resident_out_of_scope`; before execution → FAILED `resident_unavailable` (resident gone / scope changed) |

The frontend only filters for convenience; every decision above is server-side (tests F, J, browser F).

Behaviour preserved: no identity sees more residents than before Phase 4.
