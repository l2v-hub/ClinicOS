# Independent local authentication QA

Not a release approval. Candidate source commit: `f52979d1a1d8c37d2caf6003e057950adafee678`, dedicated QA checkout `C:/w-rv/profiles-no-expiry-qa-20261104`. This is local fixture evidence, not proof of public deployment or of later operations changes.

## Results

- 47/47 tests passed, zero skipped: `security.test.ts`, `no-expiry-http.test.ts`, `phase9-production.test.ts`, `policy-model.test.ts`. Fresh synthetic PostgreSQL 18 cluster, 59 source migrations. No inherited database or cloud credentials.
- Backend TypeScript compilation and asset copy passed. Frontend TypeScript compilation and actual Vite production build passed. Shared QA3 dependency tree was used via junctions; schema SHA256 matched QA3. Prisma generation and full clean npm backend build were not run, to avoid mutating the shared client.
- Real local backend HTTP: status reports simulator on and no expiry despite stale configured date; all five identities receive signed sessions, resolve their expected role and the complete baseline-derived capability map; spoofed headers cannot select administrator; OSS policy access is forbidden; logout revokes each token. Existing suite exercises finite and token expiry/forgery paths.
- Built frontend against that backend: all five profiles on desktop and mobile; checked name and server role in avatar, admin/operator primary navigation, permitted Patients/Agenda/Consegne navigation, empty Patients fixture text, reload to chooser, and UI profile logout. No captured page errors, console errors, or HTTP responses >=400. Visually checked admin empty Agenda and OSS empty Consegne; those two empty-state texts were not independently asserted in script. Synthetic images, recordings and traces are local evidence only.
- No real user data, provider calls, online authentication, public deployment, or production verification involved. No changes to app source or policy.

## Evidence and integrity

All evidence is under this directory. `run.mjs` SHA256 `ED6D58F727B77F6FE87CB1A541FA0985D19FEAE4E3ED6EB063CB9DDD3AECCAAF`; `auth-policy-tests.log` SHA256 `31AA0779ABECB93D568573AECC8E73471D735E70285A26F996B92835D8736161`.

Representative verified screenshots: `desktop-administrator-Agenda-verified.png` SHA256 `31F5877C15CB2B2D5D2A7858D08F36E8F6B25A639C3477B9DA67A85C96630AE7`; `desktop-doctor-Pazienti-verified.png` SHA256 `87E59244DD6F6F261428D17A89EE66A42862D01BD28F010247C34AECE3080D26`; `desktop-oss-Consegne-verified.png` SHA256 `6B0827F8A5967A509DA0E600CF1F7856A073FD361F147BC4F4A7B5762F413A0D`.

Raw traces and videos are PRIVATE, and traces contain ephemeral synthetic fixture session tokens. Do not publish raw traces. Example raw hashes: `desktop-oss-verified-trace.zip` SHA256 `A0D1123F9B842983876D39D50C3D96201E41A2B1BD152F17F2F4468376180006`; `mobile-oss-verified-trace.zip` SHA256 `3BFBE1C987BF61939279BD738693C95255928B2CF12699E32CACAC61AD1CB58A`. No sanitized derivative is supplied.

Preserved harness failures include environment contamination/missing sparse catalogue, an invalid Vite CLI option, a duplicate loading locator and a route transition timing race. These were harness errors, corrected before the successful runs; none is characterized as an application regression. The initial immediate-sidebar screenshots are transient and do not prove loaded feature behavior; prefer `*-verified.png`.
