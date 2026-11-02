# Actual live format finding after implementation3 QA

Candidate528c7ece retained implementation3 sourceae9995f5 and its genuine passing independent QA. Before native adoption or review2, a real read-only public metadata check found expiresAt2026-10-31T23:59:59.000Z, not the strict request spelling2026-10-31T23:59:59Z. The same instant was rejected by raw equality, so no stage or deployment was attempted. The exact public receipt is history/expiry-format-evidence-report.json.

Implementation4 preserves that entire candidate, its43frozen packet files, historical implementation3 validation bytes and existing review1. It retains red87dc69d3 (root0dddbafc) then fix74712e59 (roota5be73fa0d6d75abe216b67f99dbc754449f6315); their actual generated logs/receipts accompany this packet. Public metadata accepts only the literal strict seconds spelling or its exact canonical .000Z equivalent; offsets, wrong fractions/instants, whitespace, junk and nonstrings are still rejected. Strict request date validation, ownership, finite deadline and mutation gates are unchanged.

Default implementation limit4 is now fully consumed. Claude review1 remains changes-requested; review2 has not been consumed by this source publication. No PR520 allowance was reused and no future implementation5 is authorized implicitly.
