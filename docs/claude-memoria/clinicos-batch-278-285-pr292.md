---
name: clinicos-batch-278-285-pr292
description: 'CHIUSO 2026-07-20: batch #278–285 (PR #292), #263 (PR #293), #294 CF-chiave-univoca (PR #295), #296 parser terapie (PR #297) — tutti mergiati+deployati via gate QA interno; pattern seedManualDraft'
metadata:
  node_type: memory
  type: project
  originSessionId: 9596d500-cf88-42bd-9b41-bc6902f52753
  modified: 2026-07-20T21:43:29.240Z
---

**Stato finale (2026-07-20, tutto CHIUSO e in produzione)** — via gate QA interno indipendente (vedi [[clinicos-evidence-workflow]]):

- Batch UX **#278–#285**: PR #292 mergiata `3f1ff2ff`, issue chiuse. PHI reale trovato nel body della #279 e redatto (la cronologia edit resta visibile — rimozione definitiva solo via GitHub Support).
- **#263** agent-team: fix QA-263-016 (doctor fresh-checkout) → PR #293 `ec7fafc7`, issue chiusa.
- **#294 CF chiave univoca paziente**: PR #295 `209ba948` — `Patient.codiceFiscale` UNIQUE (nullable legacy) + migration/backfill; CF obbligatorio (o calcolato) su POST /patients e su entrambe le confirm intake/import (dup CF NON forzabile, 400 sulle confirm = deviazione accettata); UI Calcola con `codice-fiscale-js` (dipendenza approvata dal PO, frontend-only; backend validator dependency-free in `backend/src/lib/codice-fiscale.ts`). Il primo audit QA era FAILED (Avanti step-1 hard-disabled = feedback irraggiungibile) → remediation: Avanti sempre cliccabile, il click mostra gli errori.
- **#296** import terapie: righe vuote = delimitatore di fine terapia (paragrafi; primo paragrafo non-farmacologico dopo farmaci → break). PR #297 `e19d7318`.
- Deploy: backend Railway auto (migration CF applicata all'avvio), frontend Vercel manuale eseguito.

**How to apply (pattern riusabili):**

- Evidenze flusso intake con dati clinici seedati: helper `seedManualDraft(page, data)` in `qa-evidence/helpers.ts`; CF sintetici unici per run: helper `syntheticCF(seed)` (stesso file) — il CF è UNIQUE a DB, ogni run di spec che crea pazienti deve usarne uno nuovo.
- Item seedati in liste (allergie, diagnosi) devono avere `id` univoco o il warning key React fa fallire la guardia no-console-error; il 400 atteso su una confirm logga sempre "Failed to load resource" in console — va tollerato esplicitamente.
- AnamnesisEditor (#278): tab L2 "Clinica" → L3 "Sezioni Cliniche (testo)".
- Dashboard operatore conta solo le consegne assegnate all'utente loggato.
- Heredoc/bash multiriga (case `;;`) vengono storpiati dall'hook rtk: scrivere script su file nello scratchpad ed eseguirli; output piped condensato → `rtk proxy <cmd>`.
- Windows MAX_PATH rompe la creazione worktree con artifacts a path lunghi → `git config --global core.longpaths true` (già impostato).
