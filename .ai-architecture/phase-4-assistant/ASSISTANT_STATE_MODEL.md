# Assistant State Model (Phase 4, Prompt 4 §6)

Two layers; the server is authoritative, the client mirrors it. Chat history decides nothing.

## Server (per request / per workflow)

| element                     | source                                                                | where                                                |
| --------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| session identity            | `requireOperator` (Role Simulator token / Entra)                      | `/skills/session.identity`                           |
| role                        | active policy (`requireAuthorizationContext`)                         | `/skills/session.role {id,label}`                    |
| effective capabilities      | `evaluateTools()` (same hook as `GET /tools`) per turn                | `/skills/session.skills[].available/missingRequired` |
| available skills            | catalog × capabilities                                                | `/skills/session.skills`, `starters`                 |
| resident context            | `context.currentPatientId` + `canAccessResident` + `describeResident` | `resident` (server label)                            |
| access scope                | Resident Access Scope mode                                            | `/skills/session.residentScope`                      |
| active skill                | workflow                                                              | `ConverseResponse.skillId`                           |
| workflow state              | `WorkflowState` (versioned, owner-bound, TTL)                         | `status`, `GET /skills/workflows/:id`                |
| pending clarification       | `pending` + `candidates`                                              | response                                             |
| pending preview             | `preview` (with `previewId`, `confirmable`, `editable`)               | response                                             |
| confirmation state          | audit `confirmation` events bound to `preview:<id>`                   | AiAuditEvent                                         |
| last verified action result | `result` only when `status === COMPLETED`                             | response                                             |

Workflow invalidation: a request whose `context.currentPatientId` differs from the resident the
workflow started with → `CANCELLED (resident_changed)`, no write (also on «Chiudi contesto»).

## Client (`frontend/src/components/assistant/assistantState.ts`, pure reducer)

```ts
interface AssistantState {
  session: AssistantSession | null; // identity, role, skills, starters, scope
  sessionError: string | null;
  resident: AssistantResident | null; // always displayed; server-verified only
  workflow: ConverseResponse | null; // last server answer of the current workflow
  busy: boolean; // request in flight → all actions disabled
  confirming: string | null; // previewId being confirmed (in flight)
  lastVerified: { skillId; reply; result } | null; // COMPLETED only (results, not claims)
  transcript: TranscriptItem[]; // display only
  notice: { tone; text } | null;
}
```

Rules encoded as functions and unit-tested (`__tests__/assistantState.test.ts`):
`canConfirm` (confirmable preview + NEEDS_CONFIRMATION + not busy), `canRetry`,
`isActive`, `prescriptionPayload` (classic Terapia mapper; issues → no «Conferma»).
Session refresh after COMPLETED/DENIED re-reads capabilities (revocation hides starters).
