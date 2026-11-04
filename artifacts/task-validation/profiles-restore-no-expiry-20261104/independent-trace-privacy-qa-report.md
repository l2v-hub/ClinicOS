# Independent sanitized trace privacy check

Bounded independent verification of the ten synthetic local-browser trace derivatives in `C:/w-rv/tmp/profiles-restore-20261104/sanitization/derivatives`, not a claim that arbitrary secrets or all visual content can be detected. No online trace, provider credential or public data was used. Raw originals remain private and contain ephemeral fixture sessions; derivatives are privacy-modified evidence, not raw archives.

Independent checker `check-derivatives.mjs` SHA256 `f74fbe6e1b650761ab24d70568ddac5b2fb5181ad123bd23f186799abfd92c9a`; original/derivative per-entry manifest SHA256 `22deb5abfd9045bee831029c0712aa48d7ad4d381e9cd4d0d6501aed60af20f6`. The checker independently opens both archives with yauzl, validates exact required archive names, entry order/names/counts and each entry's before/after SHA256 against the manifest. All 1,750 entries matched; 1,118 detected binary media entries were byte-identical. Trace event count/type sequence: 4,164; network event count/type sequence: 3,086, unchanged. Resource paths remain opaque stable IDs; altered nonmedia content is not claimed byte-identical or content-addressed by those IDs.

Scanned every derivative entry for exact simulator tokens found in its original, simulator-token patterns, Bearer/JWT patterns and the fixture signing secret; checked structured trace/network sensitive fields and headers for the redaction placeholder. No matches were found. The sanitizer's five adversarial tests separately passed, zero skipped. Standalone video files outside the archives were not checked by this script. These checks do not prove absence of all possible secrets or visually inspect every frame.

Derivative SHA256 values:

| Trace | SHA256 |
|---|---|
| desktop administrator | `88fa3e04ba408c6818d1cfe48e3a93a78a0d7bf9cad649088fde36d0abea52ea` |
| desktop doctor | `724761e5c5fdcd22d3e878a459add08c4222a7406049506c60d6fc29ebcc2c00` |
| desktop nurse | `680637fc088b98f241a0e6ffc7de6f2457ff2701532177f1f9033cc2153378fe` |
| desktop OSS | `8bea95e2f23708fcd470ba52326ad4a105a834eebf06980b852c65e6af5774c7` |
| desktop supervisor | `6288ddbbc96722c02e40c7702064152a54580880ec419a40fcf1cbeb1ae7814f` |
| mobile administrator | `7ca672b2412c847c470bcba0f5048169c3e0c3c20e4b99d353a1f6333a109ef4` |
| mobile doctor | `1989f5071ba3a92cd5d16f05f4563f886add9364946dd9312c5ccc3b82187f11` |
| mobile nurse | `1a0d648a2933e1067c7c9bb0b28fe8d692ee10d56c0b54fc21453ab3187a0cd3` |
| mobile OSS | `61aa9c6ed6b142975fc61564f03e30f89318937585ad8c8d0f3559959f459380` |
| mobile supervisor | `7687b6ac874bae1655bfdf2ed71195198f2b621408872e53cad9570206631bd9` |
