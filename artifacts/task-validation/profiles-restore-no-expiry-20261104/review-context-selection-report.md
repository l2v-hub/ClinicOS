# Context selection repair before any review inference

First evidence head 880651be1f5c412c0320b5fb1c48065d58287cd2 has unchanged codeSource 6872ad02b78a9cfd147a4a9cb78f335e8d9f177f. Local serialized capacity check passed, but the coordinator verified its actual selected whole-text names and caught a packet-selection gap: three complete base-dependency documents lacked the worker's required filename markers. This was NOT a Claude failure/claim/inference and consumes no new implementation or review.

This evidence-only successor appends recognized-name aliases with EXACTLY identical whole bytes. All original documents, actual QA results, signed-source inputs, old review reports, five spent implementations and three spent reviews remain unchanged. The previous Git commit and index bytes are retained, not rewritten or represented as an approved packet. The unadopted generated imported-history index is updated to include the additional files before first native adoption.

Aliases:
- base-frontend-auth-report.md -> base-review-frontend-auth-report.md; SHA256 826a8674ad8f739927f15cc72148cc22753dcdbddab95e0a4fcf4862ab295f39
- base-native-authorization-report.md -> base-review-native-authorization-report.md; SHA256 ef09636e8c0a9b635fe5e7d9e7aac5adb1ca2ff3f08e10615dd55638ddf7cb9e
- base-server-policy-report.md -> base-review-server-policy-report.md; SHA256 38eb961c9c51f407ab36d2134bbb9f54d77f5e12d8f80c63b975f01d9b7cf918
- author-ops-report.md -> author-ops-review-report.md; SHA256 4981b3722071f1dd2814a55a852cabcff37cd0d3adb68b76fa7a12141cbd48b7
- railway-public-schema-report.json -> railway-schema-evidence-report.json; SHA256 72c244a412f6a61a13713c298d97c7ff0e4f5a74e309391cc1435d7400249ec1
- trace-sanitization-report.json -> trace-sanitization-evidence-report.json; SHA256 09043d6ac48f67e0800537eee37de995920f49716ef453682e1e95c3c4cdce9c

The forthcoming native authenticated preflight must verify that all aliases are actually selected with exact digests, that omittedTextEvidence is empty, and that the complete packet fits the actual1M/default128K qualified profile, before the sole remaining Max4 request. No discount, truncated source, API fallback, counter reset or approval transfer.
