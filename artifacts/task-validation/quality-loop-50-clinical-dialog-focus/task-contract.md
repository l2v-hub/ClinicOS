# Cycle 50 task contract — clinical dialog focus safety

## Objective

Give every PatientDetail clinical card dialog one consistent, keyboard-safe interaction contract without changing its clinical data flow.

## Acceptance criteria

- All six local clinical dialogs use one shared surface with `role="dialog"`, `aria-modal`, a unique title and patient description.
- Opening a dialog moves focus to its labelled close control.
- Tab and Shift+Tab remain inside the dialog; Escape and overlay dismissal are supported.
- Closing restores focus to the original trigger when it still exists.
- Parameter and room-assignment dialogs cannot be dismissed while a save is active.
- The separately implemented emergency-department dialog remains separate.
- Tests, build, focused lint and independent reviews pass without new P0/P1 findings.

## Safety envelope

- Preserve every existing clinical editor, callback, permission and patient-switch cleanup path.
- Do not alter layout, styling, API contracts or mutation payloads.
- Do not stage unrelated local changes.
