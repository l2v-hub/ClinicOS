# Cycle 84 task contract — Admin clinical overview failure state

## Problem

The admin dashboard still converts a failed clinical-overview request into a patient count of zero and removes the entire clinical KPI section. This can make unavailable data look like a verified absence of risk.

## Acceptance criteria

- Reuse the existing overview `loading`, `ready`, and `error` state and isolated retry.
- Keep the admin clinical section and KPI grid mounted during loading and failure.
- Display `—`, never a fallback zero, for unavailable patient, critical-parameter, high-risk, and discharge metrics.
- Use neutral KPI styling until clinical data is ready.
- Expose the same accessible generic failure alert and retry action as the operator dashboard.
- Keep handover and medication KPI data independent when their own read models are available.
- Preserve successful values, navigation, and all existing admin callbacks.
- Add no new request, backend query, or Entra dependency.
