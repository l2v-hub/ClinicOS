# Quickstart — 015 Agnos AI unificato

## Ambiente

```bash
cd "C:/Workspace/DG_SE_DEV/ClinicOS"
podman start clinicos-postgres
npm run dev:backend    # :3001 (background)
npm run dev:frontend   # :5173 (background)
node .claude/skills/run-clinicos/driver.mjs smoke   # atteso: OK, ~11 rows
```

## Percorsi chiave

| Cosa | Dove |
|---|---|
| Planner deterministico voce (da generalizzare) | `backend/src/ai/voice/plan.ts` |
| Executor + guardie | `backend/src/ai/voice/execute.ts` |
| Write services (4 azioni) | `backend/src/ai/voice/write-services.ts` |
| Assistant read (intent → query) | `backend/src/ai/assistant/plan.ts`, `service.ts` |
| Pannello chat attuale (read-only) | `frontend/src/components/shared/AIAssistantButton.tsx` |
| FAB voce attuale | `frontend/src/components/shared/VoiceAssistant.tsx` |
| Mock appuntamenti da eliminare | `frontend/src/App.tsx:98` |
| Test backend AI | `backend/src/ai/__tests__/` (`npm --prefix backend test`) |
| Harness E2E | `e2e/req041-voice-shots.mjs` (pattern), `.claude/skills/run-clinicos/driver.mjs` |

## Verifica rapida orchestratore (dopo incremento A)

```bash
curl -s -X POST localhost:3001/ai/actions/plan -H 'content-type: application/json' \
  -H 'X-Operator-Id: op1' -H 'X-Operator-Role: operatore' \
  -d '{"text":"cancella l ultima nota","channel":"testo"}'
# atteso: actionType refused_delete, nessuna scrittura

curl -s localhost:3001/ai/actions/catalog -H 'X-Operator-Id: op1' -H 'X-Operator-Role: operatore' \
  | grep -ci delete
# atteso: 0
```

## Gate per ogni incremento

```bash
cd frontend && npx tsc -b --noEmit; cd ..
NODE_OPTIONS=--max-old-space-size=4096 npm run build   # frontend+backend
npm --prefix backend test                              # suite AI 158+ test
node e2e/agnos-cru.mjs                                 # incremento F
```
