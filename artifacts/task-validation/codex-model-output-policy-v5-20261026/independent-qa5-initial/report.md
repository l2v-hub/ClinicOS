Independent mechanical QA for source candidate c3711b74a71b60923e5ac75cc57d80fa3d2958e8

Verdict: **BLOCKED**

Verified the candidate commit directly from immutable local Git objects. It changes exactly the two intended test files. The restored large test file byte-matches trusted main (111,379 bytes; SHA-256 279f60503ef3fc60aaf647b37ecc9e77fbb9ae14091b02a621858d344bd81605), the moved file contains the exact 6,099-byte suffix appended on the parent Source 4 test file, and all production source blobs are identical to the parent. All 15 source snapshot files match their candidate Git blobs.

The focused Node 22 test file passed 2/2; TAP output is in focused-tests.tap.

**Blocking metadata mismatch:** agent-team/tests/bug-pipeline/standalone-review-semantic-history.test.mjs is declared as a3df7a28502c20d63c26dd1bd0e1a359eb3e576e / a70c4f325c1f2f0d43e514b591768c6b3161f8e131e4791d7cc513e0cef566dd, but candidate c3711b74a71b60923e5ac75cc57d80fa3d2958e8 contains 7971cafe61f3d02fc4d1da4abc5e30c1c5d732c8 / b60a158014bfb7ce273ff30eeea3b1b81fa22d3c7598126e1700e071869902e2. This is the failed initial UTF-8 offset candidate hash; the source-candidate projection is not bound to the corrected commit contents.

The author-supplied native reader proof is an offline synthetic-transport test against immutable Git objects, not a live GitHub result. This mechanical QA did not make provider calls or source changes.
