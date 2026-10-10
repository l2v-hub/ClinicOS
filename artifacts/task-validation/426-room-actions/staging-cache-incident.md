# Sealed failed-bundle cache retention

The pre-staging gate stopped before any git add because the immutable FAILED QA3 140-file manifest declares21 optimizer cache blobs. An initial diagnostic checked `/runtime-cache/` against relative names and incorrectly showed none; checking the actual prefix `runtime-cache/` exposed all21. The sealed manifest/raw files were not edited or removed.

The staging policy now allows ONLY those exact21 paths/hash values under failed-independent-qa3-922, additionally pinning the original manifestSHA133014ded7ed582f34b38f615551b8ab66ca1509407e6a1a99150d7fbfbf7c58. All other runtime caches remain excluded. Canonical credential/binary checks cover these blobs too. This retains the failed evidence faithfully, not a waiver of a browser finding. No source or browser recipe changed.
