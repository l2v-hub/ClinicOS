# Independent diff / security review

Reviewed original GitHub issue 419 and all comments (none), then full diff d028e1ee4c5c44d96b5005362b28f54e5c05fee1..fa028c11ffe5dbfe514df8110e6ccf7f6b977602. Six paths only; `git diff --check` passes.

- OperatorAgenda.tsx:154 discards denied pending creation. :283 and :291 use the same helper for primary/grid, with :298 click-time Date recheck. :435 exposes visible requirement via aria-describedby; :446 renders explicit empty-day and reason text. :459/:605 gate daily and weekly role/tabIndex/keyboard and plus affordances. :754 rejects denied creation save callback. Backend remains authoritative; existing App focus refresh and capabilities source unchanged.
- operatorAppointmentCreation.ts:11 rejects capability denial/occupied/invalid clock strings, then preserves the previous primary action's local-day/minute policy. No seconds cutoff introduced. Dates originate in the local calendar, not an added API endpoint; no public input contract added.
- OperatorAgendaHmi.css:31 neutral readable 14px help scoped to operator HMI; medical blue unchanged, no admin calendar temporal/UI rules modified.
- AppointmentForm.tsx:188/189 marks the already-required patient selection as required and adds clear guidance. Existing disabled save / selection / persistence behavior unchanged.
- operatorAppointmentCreation.test.ts and agendaAccessibility.test.ts exercise pure helper and source contract; independent runtime cases supplement these non-render assertions.

No correctness finding in changed scope. Existing week cells group whole hours (00/30), while daily slots are half-hour; that pre-existing representation remains. Existing save form can edit date/time and backend validates final save; this fix concerns consistent entry gates, not new clinical or booking policy. No claims about real assistive technology, ward hardware or final backend save were added.

Security checklist: no added endpoint, backend/Prisma/API/config/capability policy/package change; no raw HTML, SQL, untrusted text interpolation or new logs; React text rendering unchanged. Exact capability-denied runtime validated both calendar views plus focus-driven revocation/restoration. API interceptor installed before page navigation: only synthetic fixture values, all unexpected domain writes/external requests are failure assertions. Auth simulator session and patient search POSTs are intercepted read/auth fixtures, not domain mutations. Final save never clicked; no production mutation or persistence claim. Independent frontend source/build scanner reports zero findings; artifact scan expands every ZIP member and checks configured credential bytes without logging values.

Known unmodified full-suite baseline has 12 failures: all match pinned accepted #418 proof e0682fa598c21752b5f51a39ac5e34be91e69b1a exactly. This is a zero-new-failure scoped gate, not a globally green suite.
