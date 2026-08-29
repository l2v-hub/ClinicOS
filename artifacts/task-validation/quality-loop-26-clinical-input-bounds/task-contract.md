# Cycle 26 — clinical input bounds

## Baseline risk

Therapy scalar fields and narrative text relied primarily on the global 512 KiB JSON body limit. Wrong runtime types reached Prisma, arbitrary therapy states could persist, and direct service callers such as voice or import could bypass route-only narrative validation.

## Acceptance criteria

- Enforce field-specific length caps for therapy names, dose, route, schedule text, prescriber, note, structured strength metadata, package reference, and weekday input.
- Allow only known therapy types and states.
- Apply therapy validation in the shared create service and before the PUT lookup/write.
- Cap `reviewedText` and `originalText` at 100,000 characters and allow only known review states.
- Apply narrative validation at both the HTTP boundary and shared persistence service so voice and import paths cannot bypass it.
- Return HTTP 400 for invalid route inputs before any clinical write.
- Preserve nullable optional fields and all existing valid values.

## Safety envelope

- No stored clinical rows are rewritten.
- No text is silently truncated; oversized data is rejected explicitly.
- Authentication, patient scope, server-side authorship, and transaction behavior remain unchanged.
