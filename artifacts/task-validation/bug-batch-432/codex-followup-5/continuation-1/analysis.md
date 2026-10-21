# Author continuation 1

Root static review identified an additional stale-state bypass in confirmTherapyAdministration: the parser does not supply expectedStato when omitted. The first query fix recognized a refused one-off row but still allowed the old generic conditional guard to update it without an explicit observed refusal.

The confirmation stale-state condition now also rejects a recognized singleDayDose refusal unless expectedStato is explicitly non_erogata. Existing expected-state mismatch checks remain. The not-administered endpoint and periodic/multi-dose correction semantics are unchanged. An absent record with omitted expectedStato is still recordable.

Three actual-writer tests exercise omitted state on modern and legacy one-off refusals, keyed rejection without receipt, and positive first-pending/periodic compatibility. The existing prepared HTTP/PG test additionally checks omitted refusal confirmation after valid/repaired clocks, asserting 409 and complete unchanged rows/receipts. Runtime execution remains UNRUN.
