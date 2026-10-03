# Phase 10 — Functional baseline (what the code says the app must do)

Reconstructed from code, policy and tests (code-first loop), not from the prompt alone. Base:
`feat/phase9-hardening` @ 12da5c98. Stack used: local synthetic (backend :3099 `AUTH_MODE=demo` +
Role Simulator, Vite :5199, embedded Postgres, deterministic Skills interpreter, AI runtime off).

## Identities and scope

| Profile (simulator)              | Role          | Shell    | Notes                                                                  |
| -------------------------------- | ------------- | -------- | ---------------------------------------------------------------------- |
| Amministratore (SIM-ADMIN)       | administrator | admin    | no clinical writes; most clinical reads DENIED; every `agnos.*` DENIED |
| Supervisore 1 (SIM-SUPERVISOR-1) | supervisor    | admin    | full clinical reads, no prescription                                   |
| Medico 1 (SIM-DOCTOR-1)          | doctor        | operator | prescriptions with confirmation                                        |
| Infermiere 1 (SIM-NURSE-1)       | nurse         | operator | administrations, parameters, diary, no prescription                    |
| OSS 1 (SIM-OSS-1)                | oss           | operator | parameters, diary, handovers; `therapy.list` / `documents.list` DENIED |

Resident scope: operators see the residents assigned to them (seed: Nanni Miriam, Galli Nora, Conti
Nino → nurse; Neri Dario → doctor; Verdi Olga → OSS). A chart outside scope answers 404 (by design).

## Demo data

`scripts/assistant/seed-assistant-demo.mts` + `scripts/e2e/seed-phase10-demo.mts` → synthetic
**Nanni Miriam** (DEMO-P10-Miriam-Nanni) with Ramipril 08:00, Metformina 08:00 + 20:00,
Pantoprazolo 12:00 (periodic, today).

## Core flows (expected behaviour)

- **Navigation**: L1 sidebar (ward pages) + patient chart single rail (Panoramica, Dati di ingresso,
  Clinica, Terapia, Parametri, Moduli, Documenti, Dimissione). Prompt 10 §2: from inside a chart the
  ward entries Terapia / Parametri / Consegne open that patient's section.
- **Parametri**: automatic clock (`ParameterEntryClock`), patient from context, NEWS2 live, impossible
  values rejected (Phase 6 invariant), field-level message.
- **Terapia**: prescription (`therapy.create`, doctor), calendar per day, administration through the
  existing `/therapy-slots/confirm` and `/not-administered` (nurse: `administration.confirm` +
  `administration.record_not_administered`), server refuses non-due slots.
- **Diario**: entry time = server time when not sent; priority NORMAL / URGENT in core UX; urgent
  entries/handovers become proactive Signals with **per-operator** «Preso visione» stored in the
  append-only audit (`proactive/engine.ts` acknowledge / viewState).
- **Consegne**: task lifecycle aperta → in corso → completata with due date and assignee (used by
  dashboard, signals, assistant) — kept; see the open question in RELEASE_GATE.
- **Nuovo ingresso**: single page; draft autosave versioned; imported therapy rows from documents;
  rows with an unresolved document conflict are server-deferred (`conflictDeferred` +
  `excludedFromConfirm`) and can never be prescribed from the draft (`draft-mutations.ts:86`), but
  never block patient creation.
- **Import**: page session → intake draft → `POST /intake/drafts/:id/confirm`; manual `POST /patients`.
