# Cycle 23 — patient-scoped therapies and narrative

## Baseline risk

Therapy, medication-administration, and narrative routes required an authenticated operator but did not verify that an ordinary operator could access the selected patient. Substituting a patient id therefore bypassed the ownership policy already enforced by the diary. Narrative HTTP writes also accepted `updatedBy` from the client, and voice narrative writes stored a display name instead of the stable verified operator id.

## Acceptance criteria

- Apply the shared patient-scope policy to every therapy, medication-administration, and narrative route using exact path middleware.
- Allow manager/admin global access only after verifying that the patient exists.
- Return the same 404 response for missing and out-of-scope patients; fail closed with 503 if the scope lookup fails.
- Keep all affected responses `private, no-store`, including authentication and authorization failures.
- Ignore client-supplied therapy authorship and derive it from the verified request actor.
- Remove `updatedBy` from the narrative HTTP payload and persist the verified operator id.
- Attribute voice narrative writes to `operatorId`, not the mutable display name.
- Derive a bounded assistant patient allowlist from the database for ordinary operators; managers/admins retain global scope only in verified Entra mode. Demo headers never grant global AI scope.
- Apply scope before assistant read delegation, preview data loading, idempotent replay, and writer dispatch on both text and voice routes.
- Cover GET/POST/PUT/PATCH/DELETE denial, own-patient access, manager access, uniform 404, no-store, and authorship spoof resistance.

## Safety envelope

- No schema or data migration is required and no existing clinical rows are rewritten.
- The established `Patient.registeredById` policy remains the conservative ownership proxy.
- Exact route prefixes are used so these routers do not intercept unrelated `/patients` routes mounted after them.
- Existing therapy and narrative response shapes are unchanged.
- Ordinary assistant scope is capped at 100 assigned patients. If the scope is larger, the assistant fails closed and directs the operator to patient search instead of silently exposing or partially searching data.
