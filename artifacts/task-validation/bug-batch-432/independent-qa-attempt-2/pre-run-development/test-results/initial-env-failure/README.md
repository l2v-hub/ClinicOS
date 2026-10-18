# Initial harness failure, implementation round1

Historical logs only. The first setup omitted the environment's official proxy/CA and Prisma download failed; preserving those official variables fixed it. The next full backend run inherited ROLE_SIMULATOR_ENABLED=true, contradicting existing legacy-header tests. It was interrupted after these reproducible failures; no complete backend pass is claimed. The corrected harness sets simulator mode only on its real browser backend service and uses the standard CI environment for unit suites. Original clinical assertions and security checks remain unchanged. Frontend1387/1387 and targeted28/28 were observed; final current-source results are in the parent directory.

Playwright FFmpeg downloads were denied by the network domain policy. No bypass attempted. The existing native FFmpeg with VP8/VP9 encoders is used through a dedicated per-batch cache, with provenance logs. Chromium is the already installed system executable.
