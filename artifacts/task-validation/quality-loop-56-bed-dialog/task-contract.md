# Cycle 56 task contract — consistent bed editing dialog

## Objective

Make bed editing follow the shared keyboard-accessible modal contract and prevent duplicate updates while a save is pending.

## Acceptance criteria

- Bed editing uses `AccessibleDialogSurface` with a labelled title.
- Initial focus enters the dialog; Tab is contained; closing restores the trigger.
- Escape, overlay, close and cancel cannot dismiss while a save is pending.
- The close icon has an accessible name.
- Save is single-flight, exposes a pending label and disables all dismiss/save controls.
- Existing bed payload, validation, data reload and error behavior remain unchanged.
- Focused test, full frontend tests, build and independent reviews pass without new P0/P1 findings.

## Safety envelope

- No backend, room CRUD, assignment, layout or API contract changes.
- Do not stage unrelated local changes.
