# Cycle 57 task contract — stack-safe shared confirmations

## Objective

Give every reusable destructive confirmation the same focus containment, stack ownership and trigger restoration as the other shared dialogs.

## Acceptance criteria

- `AccessibleDialogSurface` supports `alertdialog` while retaining `dialog` as its default role.
- `ConfirmDialog` uses the shared surface and keeps its `alertdialog` semantics.
- Each confirmation instance has unique title and description identifiers.
- Initial focus enters the confirmation, Tab stays contained and closing restores its trigger.
- Escape and overlay dismissal remain unavailable while `busy` is true.
- Existing confirm/cancel callbacks, tone, labels and disabled buttons remain unchanged.
- Tests, build, lint and independent reviews pass without new P0/P1 findings.

## Safety envelope

- No consumer CRUD logic, payload, layout token or API changes.
- Do not stage unrelated local changes.
