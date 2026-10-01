# Phase 7 — Shift Briefing & Change-Since-Last-View Contracts

## 1. Shift briefing — `GET /skills/proactive/briefing`

«Cosa devo sapere all'inizio del turno?»

Pipeline: `authorized events → deterministic signals (inbox engine, since = previous shift start)
→ grouping by resident → ONE AI synthesis call (optional) → links/actions`.

Response:

```jsonc
{
  "period": { "from": "<ISO previous shift start>", "to": "<ISO now>", "shift": "mattina", "previousShift": "notte" },
  "facts": [Signal…],                     // same objects as the inbox (sources, action, priority, reason)
  "byResident": [{ "residentId", "residentLabel", "signalIds": [] }],
  "summary": { "text": "…", "composed": true|false, "citedSignalIds": [] },
  "fallback": "• Galli Nora: 3 nuove rilevazioni di parametri\n…",
  "metrics": { "eventsProcessed", "signals", "llmCalls", "contextChars", "latencyMs", "aiLatencyMs", "eventTypesFiltered" }
}
```

Rules:

- Shifts: `PROACTIVE_SHIFTS` (default `mattina=07:00,pomeriggio=14:00,notte=21:00`, Europe/Rome,
  DST-aware). Period = start of the PREVIOUS shift → now (covers the handover period).
- Only residents in scope (filter before the AI). Pending items (open handovers, unread notes,
  due/overdue slots, own previews) are included whatever their age.
- **Facts are separated from the synthesis**: the UI shows «Sintesi AI — verifica sui fatti qui
  sotto» (or «Sintesi AI non disponibile: elenco dei fatti») and the fact list grouped by resident,
  each with drill-down («Apri»).
- **Minimum necessary context** to the LLM: `{id, tipo, ospite, quando, fatto, conteggio,
priorita_dalla_fonte}` — max 30 facts; `fatto` is a FIXED phrase per event type (`AI_FACT`): no
  free text written by users (diary titles, note / handover bodies, typed drug names) is sent.
- **Cost guard**: facts are always recomputed; the AI summary is reused only for an identical AI context (sha256 of the exact
  facts sent, residents included; expiry `PROACTIVE_BRIEFING_REUSE_S`, 600 s)
  (`metrics.aiSkipped: same_facts`); different facts inside `PROACTIVE_BRIEFING_COOLDOWN_S` (60 s)
  → deterministic fallback (`cooldown`). At most one LLM call per briefing.
- Instruction: max 5 sentences, group by resident, no diagnosis, no clinical advice, no priorities
  other than the given ones, no «I did», cite ids. The composer post-check discards uncited or
  action-claiming prose.
- AI failure / disabled / filtered → `composed:false`, `summary.text = fallback`; facts unchanged;
  nothing is acknowledged or resolved.
- AI timeout for the briefing: `PROACTIVE_BRIEFING_TIMEOUT_MS` (default 25 s; the interactive
  Assistant keeps `AI_ASSISTANT_TIMEOUT_MS`, 8 s). Found on demo: ~8 s syntheses hit the 8 s limit.
- AI enabled with the existing flags `AI_ASSISTANT_LLM_ENABLED` + `AI_ASSISTANT_COMPOSE_ENABLED` +
  `AI_ASSISTANT_COMPOSE_MODEL` (production: `azure:gpt-6.1-sol`).

## 2. Change since last view

- Watermark = time of the operator's last `proactive:seen` fact (`POST /skills/proactive/seen`,
  button «Segna tutto come visto»). No LLM memory.
- A signal is `changedSinceLastView` when its latest event is newer than the watermark; never
  marked seen → everything counts as changed.
- Inbox field `watermark`; UI tab «Cosa è cambiato».

## 3. Status of a signal

`nuovo` (changed since last view, not acknowledged) · `visto` (older than the watermark) ·
`preso_visione` (acknowledged revision). Acknowledgement and watermark never alter the source rows.
