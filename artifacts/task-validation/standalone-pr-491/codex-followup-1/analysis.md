# PR #491 follow-up analysis

Base: `c7ccc7b5a88ca4c6cb1276319f084293f780e5c6`.

The review found two independent defects. The inspection workflow shared `railway-backend` with production deploy automation, so its dispatches could compete for the single pending run in that group. The inventory receipt called an access aggregate `visiblePaginationComplete`, even though every successful traversal already requires pagination to finish and inaccessible visible environments are represented by `canAccess: false`.

The contract now makes the intended receipt observable: successful results state `paginationComplete: true`; `allVisibleEnvironmentsAccessible` is the conjunction of the returned environments' `canAccess` values and can be false. Project-wide visibility remains unproven. No service connection or provider mutation is introduced.

The workflow has its own `demo-source-topology` concurrency group. Tests compare that exact group to the group extracted from `deploy-backend.yml`, verify successful pagination and both accessible/inaccessible cases, and reject the obsolete field name. All previous source and proof hashes remain unchanged.
