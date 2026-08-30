# Cycle 89 task contract — Atomic legacy intake apply

## Problem

The deprecated discharge-letter apply endpoint updates a document by id alone. An already applied document can therefore be relinked to another patient, and concurrent requests can produce a non-deterministic clinical association.

## Acceptance criteria

- Accept only a strict body containing bounded `documentId` and `patientId` resource identifiers.
- Verify the target patient through an id-only projection.
- Inside one transaction, conditionally update only a document whose status is `extracted` and whose `patientId` is null.
- Return one generic `409` without changing data when the patient or document is unavailable, ineligible, already linked, or loses a relevant race.
- Preserve the deprecated, admin/manager-only, private/no-store route contract.
- Add no schema migration, Entra dependency, deployment change, or new public capability.
- Focused tests, TypeScript build, lint, and independent reviews pass.
