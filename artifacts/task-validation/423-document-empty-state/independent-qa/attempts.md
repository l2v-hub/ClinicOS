# Immutable execution ledger

Application source throughout QA:3f911cbd281d7c93c4796e97d5940258ceb331f0. No application source/manifests/locks/env/config edits or installs. All attempts use actual SPA native controls with guarded synthetic HTTP, not a UI replica.

- commands01: frontend/backend noEmit, frontend tsc-b, actual Vite build, focused44/44, frontend secret scan PASS; full1297/1285/12 exact accepted named failures,0 new. Full regression exit1 is disclosed, not globally green. Recipes retained.
- security01: native scoped baseline/candidate code scan0/0 across exact changed scope; separate source copies, scanner output and recipes retained.
- browser01: FAILED test selector after16 desktop PASS assertions; native edit opened correctly, type disabled, no metadata save. Exact wrapped Notes label selector timed out. Failure screenshot/trace/raw JSON/video and original recipes retained; PID43736 stopped.
- browser02: PASS46/46/30 contexts, metadata-only preservation demonstrated. Repaired native wrapped-label textarea selector, no application edit/injection. PID17768 stopped; recipes retained.
- baseline01: PASS2 reproduction cases on actual accepted baseline3cd; original management-heavy empty archive reproduced, not candidate PASS. PID2960 stopped; recipes retained.
- browser03: final PASS46/46/30 contexts; same46 result assertions, dependency resolution portable through own existing junction, legitimate compiled favicon.svg static GET allowed, native viewport screenshots added. PID25432 stopped. Final candidate browser plan points here.
- baseline02: final accepted-baseline reproduction with byte-identical final guarded transport, separately bound1546 files. Not counted as candidate acceptance. Lane receipt records exact owned PID/stop status.

Earlier source-before/after/bound and port-after-release receipts are interim facts, preserved rather than overwritten. Final source/port receipts explicitly bind all final runs. No failed test or superseded recipe is erased.
