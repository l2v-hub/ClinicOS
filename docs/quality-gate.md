# Quality Gate / Agent Loop — ClinicOS

Infrastruttura obbligatoria: nessun task di sviluppo (frontend, backend, Agnos AI, voice, OCR,
database, API, provider LLM, Railway/Azure/env, privacy/security, bug, feature, refactoring) parte
senza **Task Contract**, e nessun task è "done" senza **Validation Report** con
`Final Decision: CLOSED — VERIFIED`.

## Loop

```
Task request → Task Contract → Impact Classification → Acceptance Criteria → Test Plan
→ Implementation → Runtime Validation → Evidence → Validation Report → Final Decision
```

## Artefatti per task

```
artifacts/task-validation/<slug>/
├── task-contract.md         # prima di implementare
├── validation-report.md     # prima di dichiarare completato
├── screenshots/  video/  trace/  logs/  test-results/
```

## Comandi

```bash
# 1. crea il contract (crea cartelle + template)
node scripts/quality-gate/create-task-contract.js "<titolo>" [--type feature|bugfix|refactor|config] [--force]
npm run quality-gate:start -- "<titolo>"

# 2. valida il contract (sezioni obbligatorie presenti + Gate Status READY)
node scripts/quality-gate/validate-task-contract.js <slug>
npm run quality-gate:validate -- <slug>

# 3. verifica la chiusura (solo CLOSED — VERIFIED consente "done")
node scripts/quality-gate/check-closure.js <slug>
npm run quality-gate:check-closure -- <slug>
```

## Sezioni obbligatorie del Task Contract

`Impact Classification`, `Current Behaviour`, `Expected Behaviour`, `Acceptance Criteria`,
`Test Plan`, `Evidence Plan`, `Gate Status` (= `READY FOR IMPLEMENTATION`).
`validate-task-contract.js` fallisce se ne manca una.

## Decisioni finali ammesse (Validation Report)

Esattamente una:

- `CLOSED — VERIFIED` — unica che consente di dichiarare il task completato.
- `IMPLEMENTED — NOT VERIFIED`
- `FAILED VALIDATION`
- `BLOCKED`
- `PARTIAL`

## Hook di enforcement

- `.claude/hooks/quality-gate-preflight.js` (PreToolUse su Write/Edit/MultiEdit/NotebookEdit):
  blocca (exit 2) le modifiche a **codice applicativo** (`frontend/`, `backend/`,
  `clinicos-ai-runtime/`, `prisma/`, `*.env`, `railway.json`, `vercel.json`) quando non esiste
  alcun `task-contract.md` valido. Consente sempre: task contract, infrastruttura quality gate,
  `docs/quality-gate.md`, `CLAUDE.md`, e tutti gli strumenti di sola lettura/ricerca.
- `.claude/hooks/quality-gate-closure.js` (Stop / filtro CLI): se il testo contiene parole di
  chiusura (done/fatto/completato/completed/fixed/resolved/risolto/chiuso/closed) e non esiste un
  `validation-report.md` con `CLOSED — VERIFIED`, blocca (exit 2) e forza lo stato a
  `IMPLEMENTED — NOT VERIFIED`.

Wiring in `.claude/settings.json` → `hooks.PreToolUse` e `hooks.Stop`.

## Limiti noti (enforcement)

Gli hook di Claude Code hanno enforcement parziale; l'infrastruttura è implementata comunque e i
limiti sono documentati qui:

1. **Associazione per-task**: il preflight è stateless e non sa a quale task appartiene una modifica.
   Applica una regola grossolana: se si modifica codice protetto e **non esiste alcun** contract
   valido → blocca. Con più task aperti non verifica che il contract sia _quello giusto_: la
   corrispondenza task→contract resta responsabilità dell'operatore/skill.
2. **Testo finale dell'assistant**: gli hook non ricevono in modo affidabile il messaggio finale
   dell'assistant e non possono riscriverlo. `quality-gate-closure.js` funziona come Stop hook
   best-effort (scanna transcript/campi disponibili) e come filtro CLI
   (`echo "<testo>" | node .claude/hooks/quality-gate-closure.js`); non può garantire l'intercetto
   di ogni frase.
3. **Fail-open**: entrambi gli hook, su qualunque errore interno, **consentono** (exit 0) per non
   bloccare la sessione. La sicurezza del gate è quindi una difesa in profondità (skill + hook +
   script + revisione), non un blocco crittografico.
4. **Bypass**: strumenti esterni a Claude Code (editor, git da shell) non passano dagli hook. Il gate
   vincola il flusso agentico, non l'accesso diretto al filesystem.

## Rapporto con validation-method

`docs/validation-method.md` definisce i **tipi di evidenza** (Frontend/Backend/Agnos/Sicurezza) e la
tabella `Area | Test | Esito | Evidenza`. Il Quality Gate ne è l'**enforcement**: Task Contract a
monte, Validation Report + Final Decision a valle.
