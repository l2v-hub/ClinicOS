# Cycle 66 task contract — bounded Agnos history rendering

## Objective

Keep the assistant responsive during long text/voice sessions by bounding initial conversation DOM and making speech output processing incremental without breaking write previews.

## Acceptance criteria

- A 200-turn conversation initially renders only the latest 80 turns.
- Hidden history is disclosed explicitly and can be revealed in blocks of 80.
- Original absolute indexes are retained so the newest pending preview remains confirmable/editable/cancellable.
- A new command, confirmation or cancellation collapses the rendered window back to the latest 80 turns.
- TTS examines only the newest turn and never replays older clinical answers when enabled later.
- Existing brief, navigation sources, text/voice send and confirmation flows remain unchanged.
- Focused/full frontend tests, production build, cycle-scoped lint and independent UX/security reviews pass.

## Safety envelope

- No assistant API, action catalog, stored conversation or backend change.
- No removal of conversation turns from in-memory state in this cycle.
- Do not stage unrelated local changes.
