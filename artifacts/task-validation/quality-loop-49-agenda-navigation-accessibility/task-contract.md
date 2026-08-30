# Cycle 49 task contract — agenda navigation accessibility

## Objective

Make operator and administrator agenda navigation expose the same clear keyboard and screen-reader semantics.

## Acceptance criteria

- Day/week/month controls form a labelled group and expose the selected state.
- Previous, today and next controls have explicit accessible names.
- Every agenda navigation button declares `type="button"`.
- Operator and administrator agendas use the same contract without changing callbacks or layout.
- Focused tests, lint, build, browser inspection and independent reviews pass without P0/P1.

## Safety envelope

- No appointment, therapy, date-range or mutation behavior changes.
- No styling or responsive layout changes.
- Do not stage unrelated local changes.
