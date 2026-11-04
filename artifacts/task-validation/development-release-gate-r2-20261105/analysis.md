## Current revision2

Independent review found that the generic native reader accepted unhandled gh API argument forms. The CLI-generated calls did not demonstrate an actual mutation, but the claimed read-only boundary was broader than its enforcement. Revision2 restricts REST to exact argument forms and fixed repository routes; the sole GraphQL query stays an exact immutable read query. Five negative tests cover --method POST, -f, -F, repeated -X and --input. All original implementation1/evidence remains at its original packet path and commit.

# Analysis

The current app source is reviewed/deployed M b5e79ae7bec869af894f12ed6676547f21172db4, tree131b244c873c521500f732d0615f4edd0f8a5731. The development project is private and contains one non-ephemeral environment and three source-free service shells. There is no online candidate.

The existing exact-demo controller hardcodes the live demo target. Repointing its secret or constants would defeat isolation. This change introduces a separate fixed-target qualification boundary, with workflow source W deliberately different from application source M.

Independent design review identified races in Railway shared staged patches, configuration changes before migration, and non-atomic native deployment reservations. Railway exposes explicit patch commit with skipDeploys without CAS, or IaC apply with configEtag and deployment effects without a documented skipDeploys switch. A read/recheck or local receipt cannot claim provider atomicity. Therefore this candidate FAILS CLOSED for ALL live mutations: requireWriteAuthority and requireAtomicEffect are not connected to real qualifying authorities and throw before reservations/writes. Code below that boundary is a reviewed design candidate tested with fixtures, not a qualified live actuator.

The preflight consumes existing native review proof readers in read-only mode. Missing canonical state cannot initialize a branch because the process adapter forbids all mutation commands. GH_TOKEN cannot select a different principal. Native ledger/merge coherence is not a fresh Max inference claim.

Native human approval of workflow/controller trust roots is required. Live collaborator inventory currently contains only the author account l2v-hub; no independent authorized human approval has been acquired. A model report cannot be substituted for that review, and no account access is expanded by this change.

No clinical data, secrets, old controller budgets, baseline configuration or aliases are modified. Five-role and full functional parity are future acceptance gates, not results of these offline tests.
