# Task Contract — #205 Terapie come righe strutturate

- Issue: #205
- Slug: 205-terapie-rilevate-come-righe-strutturate
- Date: 2026-07-07T06:35:54Z
- Mode: Parallel Evidence Remediation (Codex QA gate).

## Objective
Produce objective Playwright evidence of structured discharge-therapy import.

## Blocker
The feature (structured therapy rows / `data.terapiaImport` / `DischargeTherapyReview` / uncertain-field
review) is NOT on the verifiable baseline (`origin/main`) — it lives only on the unmerged PR #158
(`156-therapy-parse-structured`), and the end-to-end extraction requires the `clinicos-ai-runtime` mock
service running. No runtime evidence can be fabricated on a baseline that lacks the feature.

## Unblock (for Codex)
Merge/checkout PR #158 into the QA env + start the clinicos-ai-runtime mock; then a dedicated Playwright
test drives import → extraction → structured therapy rows → uncertain-field review → confirm → PatientTherapy.

## Governance
Claude does NOT close the issue. Decision emitted: BLOCKED. Codex re-runs the QA gate after #158 lands.
