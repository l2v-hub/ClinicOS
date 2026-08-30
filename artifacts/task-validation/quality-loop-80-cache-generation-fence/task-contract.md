# Quality loop 80 — cache generation fence

## Objective

Prevent a request started by one operator from repopulating the shared in-memory GET cache after
logout or a session switch.

## Acceptance criteria

1. Clearing the cache advances a global session generation.
2. Prefix invalidation advances only the generations of matching in-flight URLs.
3. A response may populate the cache only when its captured session and URL generations are still
   current.
4. An old request's `finally` cannot delete a newer in-flight request for the same URL.
5. URL-prefix invalidation also fences matching in-flight reads so mutations cannot restore stale
   data; unrelated cached values remain available.
6. Existing TTL reuse and operator-header behavior remain unchanged.
7. Deterministic race tests cover old-before-new, old-after-new, mutation invalidation and unrelated
   in-flight reuse.
8. Frontend tests, build, lint and independent security/UX reviews pass.

## Safety envelope

- No network cancellation or API contract change.
- The original caller may still receive its own response; only cross-generation reuse is forbidden.
- Cache remains process-local and is fully cleared on logout.
- No deployment until coordinated backend access is available.
