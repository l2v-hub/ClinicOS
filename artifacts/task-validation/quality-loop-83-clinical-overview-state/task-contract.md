# Cycle 83 task contract — Clinical overview failure state

## Problem

The operator dashboard converts a failed clinical-overview request into a visible patient count of zero and removes the clinical KPI band. Missing data can therefore look like a verified absence of clinical risk.

## Acceptance criteria

- Model the overview request as explicit `loading`, `ready`, and `error` states.
- Keep the KPI band geometry stable during loading and failure.
- Display `—`, never `0` or “Nessuna criticità”, for unavailable clinical metrics.
- Expose an accessible error alert with an isolated retry action.
- Abort superseded requests and reject late responses across retries and session changes.
- Retrying the overview must not reload appointments, handovers, or notes.
- Preserve successful KPI values, navigation handlers, and the constant-size backend read model.
