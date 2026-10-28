# Triage labels — integration deferred

**Status: not activated.** The user requested installation now and explicitly
left GitHub label integration and its explanation for a later step.

Installing the `triage` skill does not map its five canonical roles to labels
and does not create, rename, remove or apply labels. Do not assume upstream
`ready-for-agent` is interchangeable with ClinicOS `codex-run`: the latter
is an explicit execution authorization in the existing controller.

Until a mapping is agreed, `/triage` may analyze and propose role decisions in
read-only mode. Before changing labels, document the five mappings and confirm
how each interacts with existing authorization, ownership and review handoffs.
Preserve all current labels and queue state during this installation.
