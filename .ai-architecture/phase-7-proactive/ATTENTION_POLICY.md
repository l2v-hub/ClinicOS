# Phase 7 — Attention Policy

## 1. Who sees what (deterministic, before any AI)

1. **Identity** from the verified session (simulator token / Entra JWT).
2. **Role** resolved from the ACTIVE policy assignment (`authz.identity.roleId`).
3. **Event-type eligibility** = all `required_capabilities` of the type allowed by the active
   policy (`ROLE_SIGNAL_MATRIX.json`); care types additionally require `diary.list`.
   Disabled types: `PROACTIVE_DISABLED_EVENTS`.
4. **Resident scope** inside the query (`residentScopeWhere`); existing visibility rules for
   handovers, notes and therapy slots. The resident named by a note or a handover is disclosed
   (UI and AI) only if in the reader's scope.
5. **Suppression**: own actions are not news (own readings, administrations, documents); acked
   revisions are hidden from «Da vedere».
6. **Deduplication / grouping**: one signal per (type, resident, day) for bursts (parameters, diary,
   documents, administrations recorded), one per slot for due/overdue administrations, one per
   handover / note / prescription / workflow, one per day for policy versions.
7. **Acknowledgement**: per signal revision (`<latest event second>.<count>.<priority>.<type>`); a
   newer event, an escalation or an upcoming → overdue transition (different signal) is visible
   again; never modifies the source. The entry badge counts only `nuovo`.
8. **Expiry / resolution**: signals are recomputed from current state — a completed handover, a
   read note, a recorded administration or a confirmed/expired workflow disappears by itself.

The LLM never participates in 1–8.

## 2. Priority (never from the LLM)

| Source                                                       | Rule                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Consegna.priorita, PatientDiaryEntry.priority, Nota.priorita | human-set source field (`importante` → `alta`)                                           |
| Administration slot past its time                            | time rule: pending > `PROACTIVE_OVERDUE_GRACE_MIN` (30) min → `OVERDUE_ACTIVITY`, `alta` |
| Administration slot ahead                                    | within `PROACTIVE_DUE_AHEAD_MIN` (60) min → `PENDING_ACTIVITY`, `normale`                |
| Administration not given                                     | `FOLLOW_UP`, `normale`                                                                   |
| Denied operations                                            | ≥ `PROACTIVE_DENIED_THRESHOLD` (10) in the window → `alta`                               |
| Everything else                                              | `normale`                                                                                |

No signal type is called a clinical alert. `ATTENTION_REQUIRED` is used only for a technical
threshold. The AI summary may not change priorities (instruction + facts carry the source priority).

## 3. Role usage (baseline policy)

| Role          | Sees                                                                                                                       | Typical use                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| OSS           | own residents: parameters, diary, handovers, room changes, notes, own pending previews                                     | «Da vedere» at start of shift; open diary/vitals skills; create handover (NORMAL default) |
| Nurse         | own residents + prescriptions, administrations (recorded / due / overdue), documents                                       | overdue slot → «Somministrazioni del giorno»; prescription news; briefing                 |
| Doctor        | own residents (same types as nurse)                                                                                        | changes since last view; new documents / diary from the team                              |
| Supervisor    | whole facility (scope «all») + technical signals                                                                           | aggregated overdue slots and open handovers; denied-access threshold                      |
| Administrator | technical only: policy versions applied, denied operations, notes addressed to «admin», own previews — **never residents** | governance                                                                                |

The matrix follows the active policy: changing a grant in «Ruoli e permessi» changes it with no
deployment.

## 4. Notification vs action

A signal is information plus a pointer. Opening it = server-side re-check + an existing read skill,
a reopened preview (still needing «Conferma»), or a classic screen. No one-tap confirm, no voice
confirm, no automatic write, no escalation by the engine or the AI.
