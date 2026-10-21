# Author analysis — follow-up 5

The former writer queried modern therapyId only. The reader recognizes a civil-day outcome for the exact patient/date and either the modern therapyId or a null therapyId with the exact drug name, across bands. Repairing an untimed prescription to 11:30 therefore made an existing legacy 00:15 outcome writable as a second row.

The correction adds one scoped query only for singleDayDose, after authoritative access/prescription validation, and calls the existing recordedOneTimeOutcome helper. Only erogata/non_erogata candidates participate. Given wins, then modern identity, then stable id. There is no second implementation of clinical priority. Existing single-band and exact-hour paths remain byte-identical.

Both endpoints receive the selected real historical record. Their existing guards reject already-given and stale pending requests. Explicit observed-refusal confirmation updates that selected id, preserving therapyId (including null), date, band and creation provenance; existing authoritative clinical values and actor attribution are retained. No history merge, batch rewrite or second row is introduced. Atomic receipts, current-access replay checks, measured-dose checks and clock validation are unchanged. The not-administered endpoint continues rejecting expectedStato=non_erogata at input validation as before.

No additional file, dependency, API, schema, authorization, UI or runtime change was needed.
