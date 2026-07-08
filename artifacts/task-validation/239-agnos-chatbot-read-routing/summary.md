# #239 (frontend) — La chatbot rispondeva sempre "Comando non riconosciuto" (READY FOR CODEX QA)

## Sintomo
Nell'app, qualsiasi domanda digitata nella chatbot Agnos → "⛔ Comando non riconosciuto".

## Causa radice (riprodotta sul backend deployato)
Il frontend chiama `POST /ai/actions/plan` (orchestratore CRU unificato), NON `/ai/assistant/query`.
L'orchestratore delegava all'assistente Azure **solo** quando `plan.actionType === 'read'`. Ma il
planner deterministico `voice/plan.ts` classifica come 'read' solo con un `READ_VERB` stretto
(`mostra|cerca|quali|chi|…`) o testo che termina con `?`. Domande naturali come "che terapie assume
il paziente" o "quante camere sono occupate" → `unknown` → preview "Comando non riconosciuto",
`read=null`. La domanda non raggiungeva mai l'assistente (che invece funziona con Azure — vedi
verifica end-to-end su #239).

## Fix (backend, chirurgico)
1. `voice/plan.ts`: `READ_VERB` ampliato agli interrogativi italiani comuni (che, cosa, quant*,
   quando, dove, come, perché, c'è, ci sono, dimmi…). Controllato SOLO quando non c'è verbo di
   scrittura → non dirotta mai un comando di scrittura.
2. `actions/orchestrate.ts` `planCommand`: qualsiasi testo NON riconosciuto come comando
   (`actionType === 'unknown'`) viene delegato all'assistente read-only (come i 'read'), invece di
   finire in "Comando non riconosciuto". L'assistente gestisce da sé not-found / rifiuto clinico.

Comandi di scrittura ("registra pressione 120 80" → create_vital_sign) e rifiuti delete restano
invariati (classificati prima).

## Verifica
- `voice/plan.ts`: "che terapie…"/"quante camere…"/"quali allergie…" → `read`; "registra pressione…"
  → `create_vital_sign` (write intatto).
- Backend `tsc`: OK. Suite orchestratore `actions.test.ts`: **45/45** (2 nuovi test #239).
- End-to-end Azure già provato su #239 (`/ai/assistant/query` → mode=llm, 11 terapie reali).

## AC
- La chatbot risponde alle domande nell'app (non più "Comando non riconosciuto"): PASS (dopo deploy).
- Provider Azure usato per l'interpretazione: PASS (l'assistente usa il planner Azure).
