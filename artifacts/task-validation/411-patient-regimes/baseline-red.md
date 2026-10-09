# Baseline RED

Source: 47a4b16c111d9b9bfd0b138991958a8ca8f6c351, before application changes.
Command: node --import tsx --test frontend/src/lib/__tests__/patientRegime411.test.ts
Observed exit 1: ERR_MODULE_NOT_FOUND for frontend/src/lib/patientRegime; 0 pass/1 fail. The new required strict-regime helper does not exist on baseline. Existing broad label/predicate mismatch independently inspected in architecture-review.md. This is a module-boundary RED, not a claim of behavioral assertions executed.
