# Independent QA handoff — PR393 follow-up

Final Decision: READY FOR CODEX QA

Fresh dedicated independent QA passed against stopped source digest `0e239c1633a11c33397d28a1263935e7278f1ec204858246056141acf3cb38af`, HEAD `d6bb325b1e767c9554e64da433c3f91b0217ee8a` with the uncommitted approved follow-up. Full main→working PR diff and follow-up delta reviewed. No source correctness/security finding identified.

Fresh results: runtime242/242, frontend voice32/32, owned-DB backend16/16, full real-browser51/51; independent runtime boundary3/3 and cache assertions3/3; frontend app/node TypeScript+Vite, backend compiler+external assets PASS. Zero unexpected browser console/HTTP errors; exact120/80 SQL write only after explicit confirmation, reload readback verified. All7 findings mapped in validation-report.md.

F2 passes only the explicitly accepted fail-closed contract: Azure remains unavailable and negotiation refuses before provider HTTP. Real provider protocol/transcription/authoritative termination/live-session ownership and activation remain unverified and BLOCKED. No live-session cap is certified; grantTTL is not media duration.

The entire DB/backend/browser lifecycle held the shared lock. Owned container removed, baseline untouched, ports free and lock released; root+483 author notified. All13,207 snapshotted source/history/follow-up files unchanged, all423 frozen proofs unchanged. Source digest independently recomputed. No source/test edits, GH/state writes, commit/push/provider/production calls.

Fresh trace704 members scanned+CRC+embeddedJPEG decode; author publication737 members independently reconstructed/hash-verified/scanned+CRC+decode. All44 PNG/WebM files decoded. Public fresh trace has98 synthetic demo-session redactions and two<=16MiB parts, reconstruct SHA256 `781d544110d334aef3abecbe8e7a8fb1f5f6a74c7776fbafe1ea2aa03435a74c`. Root must not publish private/ raw ZIP, build/ compiler outputs or compiler cache files. Publish only evidence-manifest.json listed files (each<=25MiB), report/handoff/source manifest and seal. Preserve historical proofs.

Read validation-report.md, source-manifest.json, integrity-after.json, runtime-1/test-results/integrated-result.json, runtime-1/trace/trace-manifest.json, privacy-scan.json and final-seal.json. Root alone owns publication/controller/review progression. QA writes stop after final seal.
