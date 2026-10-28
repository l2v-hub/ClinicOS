# Implementation plan

This packet makes no application change. It copies the already-sanitized 24 independent media files byte-for-byte into their accepted plan paths, writes the exact canonical manifest schema at the required batch root, and supplies source/privacy metadata and issue-by-issue links.

Root review must verify the corrected #486 recording origin and exact hashes, then decide the separate current-main #453 verifier gap. The author-side 32 MiB follow-up is not part of the current source and awaits independent QA. Only after root independently validates this payload can root perform the exact-SHA publication and required native/reviewer gates. This candidate itself does not imply readiness, merge, deployment, or issue closure.
