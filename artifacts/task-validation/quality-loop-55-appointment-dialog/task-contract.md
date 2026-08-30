# Cycle 55 task contract — consistent appointment dialog

## Objective

Give the shared operator/admin appointment form the same keyboard-safe modal behavior as the clinical dialogs.

## Acceptance criteria

- Appointment creation and editing use `AccessibleDialogSurface` with a labelled title.
- Initial focus enters the dialog and closing restores the agenda trigger.
- Tab/Shift+Tab remain inside; Escape and overlay close only while not saving.
- The close icon has an accessible name and is disabled during saving.
- Existing save, cancel, patient search and error-alert data flow remains unchanged.
- Opening patient intake above the appointment gives keyboard ownership only to the topmost dialog and preserves the appointment draft.
- Patient intake uses the same focus/Escape/restore contract and cannot close during submission.
- Tests, build and independent reviews pass without new P0/P1 findings.

## Safety envelope

- No appointment/intake payload, validation, API, layout or agenda callback changes.
- Do not stage unrelated local changes.
