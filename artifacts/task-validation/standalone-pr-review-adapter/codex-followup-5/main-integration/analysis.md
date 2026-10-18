# Exact-main conflict resolution

Root began a normal merge of45033a3949742218b1c9d23a37a0c94776cd5bd5 into authored checkpointc64364023cc5fff1db7c01f794165c539f68c815 after actual496-first and495 merges. No ref or index mutation was performed by this author.

All14 conflict blocks were resolved in the three reserved files. The resolved files are byte-identical to authored checkpoint stage2. This is the semantic result of comparing the overlapping changes:492 already contained496's strict metadata/encoding/size/base64/UTF8/pinned-Git-blob-digest loader and no-promotion/CAS regressions, and added capacity reservations, bounded disjoint CAS rebases, safe operation diagnostics, backoff and merge timing. Main's overlapping4MiB state/8MiB output constants would lower492's required8MiB/16MiB capacity. The resolved source retains one serialized-state capacity constant, one shared pinned loader used by controller/dashboard, and compact serialization.

All35 main GitHub test titles and12 main handoff test titles remain present, alongside492's additional tests. Handoff fixtures retain exact Git-blob CAS metadata, explicit positive409 classification and the wrapped large-blob path. No tests were weakened or dropped during resolution. Every nonconflicting imported main path remains byte-for-byte at its before-author value; those files are inherited main provenance rather than author-created work. Every one of the previous27 authored source hashes remains identical.

This completes the requested local integration resolution, not publication or final independent QA. Root must stage/commit the merge and run the fresh review/native/protected-merge gates on that resulting commit.
