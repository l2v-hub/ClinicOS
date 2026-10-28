# Scope amendment 11 — operator agenda date regression

Exactly one existing test `frontend/src/lib/__tests__/therapyAgendaDateGuard.test.ts` is added (91 total). Its operator source-shape assertion requires an imperative openDay load, which omitted initial mount. Update that assertion for the single mounted-day current-refDate effect, retaining all actual date, modal mutation, transition cleanup, admin and weekly/monthly exclusions. Actual browser date/agenda assertions remain mandatory. No production file or policy added. Same implementation2/4 and review0/4, baseD unchanged.
