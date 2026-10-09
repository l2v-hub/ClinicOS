# Independent QA — issue 419

## Impact Classification
Frontend creation entry points and capability-driven UI only. No application writes are permitted in this independent checkout. Backend, policy, schema, dependencies and clinical logic stay unchanged.

## Current Behaviour
The original issue describes an empty nurse agenda with an unexplained disabled primary action while a grid slot opens creation. Its original evidence did not test final saving.

## Expected Behaviour
Primary and grid creation obey the same existing role, local date/minute and occupancy policy. The primary action either opens an explicit context or has visible explanatory text. Patient selection happens inside the form, not before opening it.

## Acceptance Criteria
1. Button and slots respect identical authorization conditions.
2. Primary action is usable or explains the missing requirement in text.
3. Empty day explains a comprehensible creation path.
4. Verify empty day, populated day and missing patient selection.

## Test Plan
Independent six-path diff review; independent frontend/backend type checks, TypeScript/Vite build, focused tests, full frontend regression delta against accepted #418 pinned proof. New browser recipe on the actual SPA/compiler using synthetic intercepted APIs: empty/present/full/past/after-hours, no patient and patient selection, hidden occupied slots, denied role daily/weekly, keyboard opening, minute ticking, click-time stale-clock recheck, capability revocation/restoration, mobile.

## Evidence Plan
Before/after full tracked source/config/Prisma receipt; original issue and comments; exact recipes/runtime setup byte snapshots BEFORE browser execution; per-scenario screenshots/traces/videos/guard logs and truthful assertion receipt HTML. All failed attempts remain distinct and retained. No save is executed: there is no mutation persistence claim or real patient write.

## Gate Status
READY FOR IMPLEMENTATION — QA artifacts only. Root must independently inspect and rerun this gate before promotion. No publication authority delegated.
