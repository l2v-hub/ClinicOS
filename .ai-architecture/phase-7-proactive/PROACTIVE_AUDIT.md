# Phase 7 — Proactive Audit

Table `AiAuditEvent` (append-only since Phase 6), channel `ai_assistant`, identity and role from
the verified session, never clinical free text.

| actionType                | When                                                                            | Fields                                                                               | patientId                            |
| ------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| `proactive:inbox`         | inbox shown (not the badge count, not the automatic 60 s poll of an open panel) | `signals:N`, `to_see:N`, `events:N`, up to 15 × `signal:<id>`                        | —                                    |
| `proactive:ack`           | «Preso visione» (synchronous write — it IS the user state)                      | `ack:<signalId>@<rev>`, `type:<SignalType>`, up to 10 × `event:<sourceEventId>`      | resident of the signal (server-side) |
| `proactive:seen`          | «Segna tutto come visto» (synchronous)                                          | `watermark:<ISO>`                                                                    | —                                    |
| `proactive:action_opened` | action of a signal opened                                                       | `signal:<id>`, `skill:<skillId>` or `action:<kind>`                                  | resident of the signal               |
| `proactive:briefing`      | briefing produced                                                               | `signals:N`, `composed:true/false`, `llm_calls:N`, `context_chars:N`, `ai_skipped:no | same_facts                           | cooldown`, `from:<ISO>`, up to 12 × `signal:<id>` | —   |

The skill started from a signal is audited by the normal Skills audit (`skill:<id>:request …
execute`), so the chain signal → action opened → skill request → (preview → confirmation →
tool → execute) is reconstructable by operator and time.

Guarantees (tested):

- ack only for signals currently visible to the caller (unknown / out-of-scope ids ignored);
- ack row carries identity, role and the server-side resident (`proactive-e2e` K, browser K);
- shown / briefing rows carry role and signal ids (`proactive-e2e` P, browser C);
- the engine writes no clinical row (H, P).
