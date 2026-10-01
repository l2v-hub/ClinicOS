# Phase 8 — Role Home Contract

## 1. `GET /skills/copilot/home?residentId=<id>`

```jsonc
{
  "role": { "id": "nurse", "label": "Infermiere", "copilot": "Copilota Infermiere" },
  "profile": {
    "density": "minimal | operational | clinical | aggregated | technical",
    "terminology": { "resident": "ospite", "focus": "Terapia e attività del turno" },
    "primaryGoals": [], "escalation": "…", "confirmationUx": "…",
    "sections": ["shortcuts", "continue", "signals", "starters", "recent"],
    "signals": { "preferredEventTypes": [], "defaultTab": "da-vedere", "maxVisible": 8 },
    "briefingFocus": "…"
  },
  "resident": { "id": "…", "label": "…" } | null,          // describeResident (scope)
  "starters": [{ "skillId", "label", "reasons": ["profilo del ruolo", "ospite attivo", "segnalato per te", "usato di recente"] }],
  "shortcuts": [{ "id", "kind", "label", "phrases", "skillId?", "starter?", "intro?", "steps?", "tab?", "screen?" }],
  "continueWork": [{ "workflowId", "skillId", "skillName", "action", "residentId", "residentLabel", "updatedAt" }],
  "recent": [{ "skillId", "skillName", "at", "residentLabel" }],
  "context": { "skillsAvailable", "skillsTotal", "shortcutsAvailable", "shortcutsConfigured" }
}
```

Audit: `copilot:home` (identity, role, `profile:<role>`, counts). No clinical data written.

## 2. Derivation rules

1. **Starters** = executable skills AVAILABLE now (active policy), minus those offered as shortcuts,
   ranked deterministically (§17): profile order (+100−5·i) → active resident for resident skills
   (+30) → skill proposed by an unacknowledged signal (+20) → used in the last 12 h (+10) → catalog
   order. Limit by density (minimal 4, operational 6, clinical 8, aggregated 6, technical 4).
   `startersFromProfileOnly` (administrator) suggests only profile skills; other allowed skills stay
   reachable by asking. No LLM in the ranking.
2. **Shortcuts**: `skill` if the skill is available; `resident_round` if `patients.list_page` is
   allowed and at least one resident step is available (steps filtered); `classic` if
   `requiresCapability` is allowed; `start_shift` / `briefing` / `proactive_tab` always (the Phase 7
   engine filters their content).
3. **Continue work**: own workflows in `NEEDS_CONFIRMATION` with a preview, skill still available,
   resident still in scope, updated within `COPILOT_RESUME_MAX_MIN` (30 min). Reopening shows the
   preview again — «Conferma» still required.
4. **Recent activity**: own `skill:*:execute` ok in the last 12 h, skill still available, resident
   label only if still in scope.
5. **Signals**: the shared «Per te» panel with the profile's default tab, preferred type order and
   `maxVisible` — priority «alta»/«urgente» is never hidden by the density cap.

## 3. Per-role landing (baseline policy — `ROLE_EXPERIENCE_MATRIX.json`)

| Role          | Shortcuts                                                                     | Default panel                  | Density                |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------ | ---------------------- |
| OSS           | Inizia il turno · Inizia giro parametri · Le consegne                         | Da vedere (5)                  | minimal, 56 px targets |
| Nurse         | Inizia il turno · Inizia giro terapia · Somministrazioni di oggi              | Da vedere (8)                  | operational            |
| Doctor        | Prepara visita · Cosa è cambiato · Appuntamenti di oggi                       | Cosa è cambiato (10)           | clinical               |
| Supervisor    | Briefing struttura · Consegne aperte · Posti letto                            | Da vedere (15)                 | aggregated             |
| Administrator | Controlla configurazione ruoli · Gestione operatori · Ordinamenti dei reparti | Da vedere (10, technical only) | technical              |

## 4. `GET /skills/copilot/round`

`{ residents: [{ id, label, room, bed }], hasMore }` — the Tool Layer `patients.list_page` (policy +
Resident Access Scope, roster order, 50 max). Denied capability → the tool's 403.

## 5. Usability gate (§23) — verified in `scripts/copilot/copilot-browser-e2e.mjs`

Top tasks one click from the home; resident always shown in the resident bar and in the round;
no forbidden actions shown; confirmation UX unchanged (same preview / «Conferma»); classic GUI
reachable («Apri …», classic shortcuts, «Torna all’applicazione»); role and copilot named in the
header and the home.
