# Issue 408 — read-only architecture review

Reviewed baseline: `973d78e5e109032a36cf89cf80fd8eb2a848a649`. Original issue and comments read independently through GitHub CLI; comments were empty. No application changes, server, browser, provider mutation, or clinical write was performed by this reviewer. Ruflo coordination ledger: `swarm-1791529207546-wwytnr`; source-based recall used because AgentDB was previously unavailable/OOM.

## Acceptance boundaries

1. State information must be visible without relying on color or hover. Existing descriptive accessible names alone are insufficient. Visible short text and distinct shapes/symbols satisfy the intended non-color cue; preserve descriptive accessible names and actual loaded data.
2. Show a persistent textual **Oggi** in the actual current-day column header, which is already sticky vertically. Use the existing facility date helper (`Europe/Rome`), not the selected calendar day or host UTC date. A week not containing today has no today marker.
3. Opening the existing cell dialog must still show the selected civil day, exact prescription time, loaded dose count, per-dose status and drug/dose/route details. Preserve the existing server-band key on each item and the existing patient navigation callbacks. Do not replace exact-time totals with server-band totals.
4. Mixed-data automated/browser evidence is achievable locally. The original criterion also explicitly requires **a device in intense light**. Ordinary Chrome, grayscale screenshots, headless tests and simulated contrast cannot establish ambient-light conditions; retain this as an unmet external criterion unless actual suitable-device evidence is supplied. Do not silently reinterpret it as ordinary desktop visual inspection.

Reference checked: [W3C Understanding SC 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) distinguishes visible non-color cues from accessible-only information. This scoped fix is not a full WCAG or outdoor-readability certification.

## Smallest safe implementation

- Add the non-color presentation to the `pendingCount !== undefined` branch of shared `TherapyCalendarGrid`, driven by truthful ward data. Keep one button per day/time and current data test IDs, callbacks, expanded state and focus behavior.
- Clearly caption the existing main number **da erogare**. It is remaining work, not the number administered or omitted. Show meaningful per-state counts/labels separately (or show existing `cell.detail` visibly); a mixed slot cannot be described as entirely administered just because pending is zero.
- Preserve `partial > 0` as a lower bound (`≥N`) and `partial === true, pendingCount === 0` as unknown (`—`), not a zero-complete claim. Include visible partial wording with any loaded state/count summary; even all-loaded-administered does not prove an incomplete slot is complete.
- Prefer distinct small SVG/monochrome symbols with explicit text; symbols can be `aria-hidden` when redundant with labels. Do not force a legend lookup and do not ellipsize the only visible state cue. Retain current colors as supplemental cues and limit CSS selectors to the changed shared calendar surface.
- Add today text/class to shared headers without modifying scheduling/time-zone rules. The same marker may safely benefit the patient calendar.
- Keep the existing **Giro** alternative (`TherapyRoundsPage`) rather than inventing a parallel list or changing navigation.

## Shared patient-calendar trap

`PatientTherapyCalendar` uses the non-count cell branch and computes `tone: 'done'` when all events are registered, including `not_administered`. Therefore a generic shared `done -> Somministrate` label would misstate patient data. Leave that branch's existing title/count/detail semantics intact unless the owner supplies an explicit truthful breakdown. Likewise ward `tone: 'missed'` can represent a mixed administered/omitted slot with zero pending: **0** must never appear as the count of omitted doses. Keep breakdown and pending count distinct.

## Required regression and runtime matrix

- Complete due, future, late-today, prior-day unregistered, all-administered, all-omitted, mixed due/administered/omitted, and zero-pending mixed administered/omitted.
- Incomplete page with loaded pending positive; incomplete loaded pending zero; `hasMore` and `!summaryExact` independently. After loading another page counts merge by exact prescription time without inventing completeness.
- Multiple exact times inside the same server band (e.g. 07:15 and 08:00). Cell open must keep its date/time and each per-dose status/reason, and close returns focus to that same button.
- Grayscale visual screenshot of mixed actual SPA states at the audited desktop width; text remains visible, not just DOM/aria assertions. Supplemental mobile/emulation evidence must be labelled as such.
- Today header persists when vertically scrolling and still appears for a day with no loaded doses. No marker on other-week navigation; Rome-midnight boundary differs from host UTC correctly.
- Loading/error/empty grid states remain truthful, no fabricated state labels; patient non-count branch and authorized create callbacks unchanged.
- Existing `therapyGiro.test.ts`, `patientTherapySlotAndForm.test.ts`, `therapyWeek.test.ts`, `therapyCalendarState.test.ts`, `patientTherapyCalendar.test.ts`, and `therapyIncompleteSummary.test.ts` are relevant regression suites. Add focused actual-render tests for visible text/symbols and count/partial semantics. Runtime browser tests must exercise the actual fetch/merge/dialog flow; SSR markup tests alone cannot certify it.

Recommendation: scoped implementation and independent QA may proceed. Publication/closure remains gated by all four original criteria, including genuine intense-light device evidence. This document is architectural advice, not a QA verdict or release authority.
