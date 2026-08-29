# Riprendere ClinicOS su un'altra postazione

Cosa viaggia col repository, cosa no, e cosa va rifatto a mano. Serve a ripartire da un PC diverso
senza ricostruire il contesto a memoria.

## Cosa è già nel repository (non devi fare nulla)

| Elemento                    | Percorso                                               |
| --------------------------- | ------------------------------------------------------ |
| Istruzioni di progetto      | `CLAUDE.md`                                            |
| Constitution (il manifesto) | `.specify/memory/constitution.md`                      |
| Skill di progetto           | `.claude/skills/`                                      |
| Hook del Quality Gate       | `.claude/hooks/`                                       |
| Definizioni agent           | `.claude/agents/`                                      |
| Impostazioni di progetto    | `.claude/settings.json`, `.claude/settings.local.json` |
| Server MCP di progetto      | `.mcp.json`, `.claude/mcp.json`                        |
| Memoria di Claude (copia)   | `docs/claude-memoria/`                                 |
| Metodo e gate               | `docs/quality-gate.md`, `docs/validation-method.md`    |
| Evidenze dei task           | `artifacts/task-validation/`                           |

## Cosa NON viaggia col repository

### Memoria di Claude — va ripristinata a mano

La memoria vive fuori dal repo, in una cartella il cui nome dipende dal **percorso del progetto**:

```
~/.claude/projects/<percorso-progetto-sanificato>/memory/
```

Su questa postazione è `E--Workspace-DG-SE-DEV-ClinicOS`. Su un'altra macchina, se il repo sta in un
percorso diverso, **il nome cartella cambia**: non copiarla nella vecchia posizione o Claude non la
troverà.

Per ripristinarla, dalla root del repo:

```bash
# 1. apri Claude una volta nel progetto, cosi' la cartella viene creata
# 2. individua il nome esatto
ls ~/.claude/projects/ | grep -i clinicos
# 3. copiaci dentro la memoria versionata
cp docs/claude-memoria/*.md ~/.claude/projects/<nome-trovato>/memory/
```

`MEMORY.md` è l'indice caricato a ogni sessione: senza quello, gli altri file non vengono richiamati.

### Impostazioni utente di Claude

`~/.claude/settings.json` non è nel repo. Contiene plugin abilitati, hook globali e la modalità
permessi. Verificato: **non contiene segreti**, quindi si può copiare tra macchine così com'è.

Valori impostati su questa postazione, se preferisci rifarli a mano:

- `permissions.defaultMode: "auto"`
- 17 plugin disattivati (mai usati) e 4 skill utente in `skillOverrides: "off"`
- Hook ancorati a `$CLAUDE_PROJECT_DIR` — **non** a percorsi relativi: con path relativi gli hook
  falliscono con `MODULE_NOT_FOUND` appena la cwd della shell cambia, e il Quality Gate smette di
  girare pur sembrando attivo.

### Autenticazioni — da rifare su ogni macchina

| Strumento | Comando                                              | Nota                                                                                 |
| --------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| GitHub    | `gh auth login`, poi `gh auth switch --user l2v-hub` | Il repo è `l2v-hub/ClinicOS`: l'altro account prende **403**                         |
| Vercel    | `vercel login`                                       | Deploy frontend manuale                                                              |
| Azure     | `az login`                                           | La SWA sta nella sottoscrizione **"Azure subscription 1"**, non in quella di default |
| Railway   | —                                                    | CLI bloccata da Zscaler: si deploya via GitHub Actions                               |

### Codex

`~/.codex/` contiene solo stato locale della macchina (`.sandbox-secrets/`, `cache/`, `log/`): **non
va versionato e non è portabile**. Va riconfigurato sulla nuova postazione. Nel repository non
esiste configurazione Codex (`AGENTS.md` e `.codex/` non sono presenti).

## Avvio del progetto

```bash
npm install                     # workspace npm: dalla ROOT, non dalle sottocartelle
npm --prefix backend run prisma:generate
npm run dev                     # frontend :5173 + backend :3001
```

Per lo sviluppo sintetico impostare esplicitamente nel runtime backend
`NODE_ENV=development` e `AUTH_MODE=demo`. Senza `AUTH_MODE`, oppure con un valore non valido,
gli endpoint protetti restano fail-closed (503). In produzione è ammesso solo `AUTH_MODE=entra`.

Database locale, container Podman su `localhost:5433/clinicos_test`:

```bash
podman machine start
podman start clinicos-e2e-265
podman exec clinicos-e2e-265 pg_isready -U postgres
```

Senza database, 28 test del backend falliscono per connessione rifiutata — non per un difetto del
codice.

## Segreti — da configurare, mai committare

| Variabile                      | Serve a                                |
| ------------------------------ | -------------------------------------- |
| `STITCH_API_KEY`               | Server MCP Stitch (`.claude/mcp.json`) |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Server MCP GitHub (`.mcp.json`)        |

> ⚠️ **Debito di sicurezza aperto.** Fino al 2026-07-28 `.claude/mcp.json` conteneva la chiave
> Stitch come **valore letterale**, quindi la chiave è **nella storia di git**. È stata sostituita
> con `${STITCH_API_KEY}`, ma sostituirla non la rimuove dai commit passati: **quella chiave va
> revocata e rigenerata** su Google Cloud. Finché non lo si fa, chiunque abbia una copia del repo ce
> l'ha.

## Prima di fidarti dell'ambiente

- **Spazio su disco.** La build muore con `ENOSPC` se C: si riempie. `df -h /c`;
  `npm cache clean --force` libera qualche GB ed è sicuro.
- **`rtk` filtra l'output di git.** Un `git diff` vuoto non è prova di uguaglianza. Per il git di
  plumbing usa `rtk proxy git ...`. Dettagli nella skill `spedire-modifica`.

## Da dove ripartire

1. Leggi `CLAUDE.md` e `.specify/memory/constitution.md`.
2. Ripristina `docs/claude-memoria/` come sopra.
3. Skill: `agent-loop-quality-gate` (contract e validazione) e `spedire-modifica` (commit → PR →
   merge → deploy, con le trappole note).
4. Lo stato aperto dei task sta in `artifacts/task-validation/<slug>/validation-report.md`: cerca
   quelli che **non** riportano `CLOSED — VERIFIED`.
