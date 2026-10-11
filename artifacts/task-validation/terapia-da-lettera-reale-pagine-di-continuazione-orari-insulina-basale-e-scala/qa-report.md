# QA Report — independent session (did not write the code)

Four adversarial rounds on the uncommitted diff in worktree `C:/w-tx2`.

| Round | Verdict           | Main findings                                                                                                                                                                                                                                                                   |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | FAILED VALIDATION | `1.200.000 UI` lost from an 'ok' row; insulin 'ok' with SOSPESA / NON SOMMINISTRARE / SE…; "10-12 UI", "6+6+4 U" → fragment quantity; preamble pulled letter intros, measurements, signatures into therapy; "Controllo" line detached the HUMALOG scale; pen volume as quantity |
| 2     | FAILED VALIDATION | narrowed preamble rule lost drugs silently (blank lines, drug without time, suspended drug, multi-line scale); "10 a 12 UI"; frontend read "1.000" as 1                                                                                                                         |
| 3     | FAILED VALIDATION | frontend thousands conversion turned "0.125 MG" into 125 mg (1000×); trailing bare drug line lost; "max 12 UI", "10 ~ 12 UI"                                                                                                                                                    |
| 4     | READY FOR QA      | no 'ok' row with wrong/missing/altered value, no 'ok' false drug                                                                                                                                                                                                                |

Every finding of rounds 1–3 has a regression test (backend `therapy-real-letter.test.ts`, frontend
`realLetterRows.test.ts`). Round-4 LOW finding 3 (ambiguous quantity without a trace) fixed after
round 4: "Quantità: <raw>" in the note, with test.

## Accepted residual risks (round 4, LOW)

- A drug line with no dose/quantity/route/time AFTER the last prescription on a continuation page
  without a heading is still lost when it is lowercase, longer than 6 words, or in its own
  paragraph. Within a therapy section (the standard single-letter import) it is kept.
- Uppercase footer/name lines in the same paragraph after the list (e.g. "LUNGODEGENZA ESEMPIO")
  can become false rows — always `da_verificare`.
- On all-uppercase printouts, a condition written before "ORE" no longer blocks the times — row
  always `da_verificare` (by design, round 1 F6).

## Real letter (anonymised transcription)

Pages 1+2 → 20 drugs (markdown, plain text, blank lines between lines); page 2 alone → 15 in every
variant; no DIETA/CONTROLLI rows; LANTUS "100 UI /ML" / "10 UI" / [08:00] ok; HUMALOG scale exactly as
written (200-250:4, 250-300:6, 350-450:8), da_verificare, overlap flagged by the review form.
