---
name: claude-home-cleanup
description: Usa quando la home di Claude Code (`~/.claude`) e' cresciuta di GB, il disco e' pieno o quasi, una build muore per spazio esaurito (ENOSPC), oppure l'utente chiede se puo' fare pulizia in `.claude` / `projects` e quali directory tenere. Copre anche il caso "sto per cancellare la memoria per sbaglio" — distingue la cache rigenerabile dall'unica copia esistente.
---

# Pulizia di `~/.claude` senza perdere memoria e transcript

`~/.claude` cresce di gigabyte da sola. Quasi tutto lo spazio e' **cache di sessione
rigenerabile**, ma sta mescolata a directory che sono l'**unica copia** di dati non recuperabili
(memoria persistente, undo dei file). Cancellare a colpi di `rm -rf ~/.claude/projects` fa perdere
mesi di contesto per liberare spazio che si sarebbe liberato lo stesso.

**Principio:** dentro `projects/` si cancella per _tipo di sottodirectory_, mai per progetto.

## Il colpevole quasi sempre e' lo stesso

`projects/<slug>/<session-id>/tool-results/` — file `hook-*-stdout.txt`, uno per invocazione di
hook, che arrivano a 9-10 MB l'uno e non vengono ripuliti alla chiusura della sessione. Piu' hook
verbosi hai configurati, piu' cresce.

Misurato (2026-07-29): 2,0 GB su 2,8 GB totali di `projects/`, di cui 1,6 GB in **una sola
sessione** (331 file). Dopo la pulizia: `~/.claude` da 3,6 GB a 1,5 GB.

## Tabella decisionale

| Path                                               | Natura                             | Cancellabile                                |
| -------------------------------------------------- | ---------------------------------- | ------------------------------------------- |
| `projects/*/<session>/tool-results/`               | stdout hook + output tool in cache | **si'** — il grosso dello spazio            |
| `projects/*/<session>/subagents/`                  | transcript dei subagent            | **si'** — se la sessione e' chiusa          |
| `projects/<slug>/` di path spariti dal disco       | worktree/tmp eliminati             | **si'** — se non contiene `memory/`         |
| `projects/<slug>/*.jsonl` (root)                   | transcript di sessione             | ⚠️ perdi `--resume` e la ricerca storica    |
| `projects/*/memory/`                               | **memoria persistente**            | ❌ mai — pesa KB, vale mesi di contesto     |
| `file-history/`                                    | backup pre-edit (undo/rewind)      | ❌ mai                                      |
| `plugins/`, `security/agent-sdk-venv`              | centinaia di MB rigenerabili       | ❌ solo reinstallando: offline sei bloccato |
| `settings*.json`, `CLAUDE.md`, `.credentials.json` | configurazione                     | ❌ mai                                      |

## Procedura

### 1. Misura prima di toccare

```bash
du -sh ~/.claude ~/.claude/projects
du -sh ~/.claude/*/ | sort -h | tail -8
cd ~/.claude/projects && du -sh */ | sort -h
cd ~/.claude/projects && find . -type d -name tool-results | wc -l
```

Se `tool-results/` non e' il grosso, **fermati e rimisura**: stai per cancellare la cosa sbagliata.

### 2. Cancella la cache delle sessioni chiuse

Escludi **sempre** la sessione corrente: il suo `session-id` e' il nome della directory scratchpad
citata nel system prompt.

```bash
cd ~/.claude/projects
find . -type d -name tool-results | grep -v "<session-id-corrente>" | xargs -d '\n' rm -rf
find . -type d -name subagents    | grep -v "<session-id-corrente>" | xargs -d '\n' rm -rf
```

### 3. Rimuovi le project dir di percorsi che non esistono piu'

Solo dopo aver **verificato sul filesystem** che il path e' sparito — uno slug tipo
`E--Workspace-DG-SE-DEV-ClinicOS--wt-267` corrisponde a `E:\Workspace\DG_SE_DEV\ClinicOS\..\wt-267`.
Un worktree ancora vivo va lasciato stare.

```bash
cd ~/.claude/projects
for d in <slug-1> <slug-2>; do
  if [ -d "$d/memory" ]; then echo "SKIP (ha memory): $d"; else rm -rf "$d"; fi
done
```

La guardia su `memory/` non e' decorativa: una project dir "morta" puo' contenere l'unica copia
della memoria di un progetto che ha cambiato path (es. spostato da `C:` a `E:`).

### 4. Verifica che non hai rotto niente

```bash
du -sh ~/.claude
du -sh ~/.claude/projects/*/memory        # tutte ancora li'
du -sh ~/.claude/file-history
cd ~/.claude/projects && find . -maxdepth 2 -name "*.jsonl" | wc -l
```

I `.jsonl` a `-maxdepth 2` sono le **sessioni**. Un `find` senza maxdepth conta anche i transcript
dentro `subagents/`, quindi dopo il punto 2 il totale cala di molto: non e' una perdita di sessioni,
e' il calo atteso. Confronta il conteggio a maxdepth 2, non quello globale.

## Trappole

- **`rtk` intercetta `find`.** `find` con `-exec`, `-not` o predicati composti viene rifiutato
  (`rtk find does not support compound predicates`). Usa pipe + `xargs -d '\n'`.
- **Redirect verso file in pipeline con `find`**: osservato produrre 0 righe silenziosamente.
  Conta con `| wc -l` prima di fidarti, e agisci in pipeline diretta senza file intermedi.
- **Un progetto puo' avere piu' slug.** Stesso repo spostato di disco = due directory, e la
  `memory/` vecchia non viene piu' caricata ma resta l'unica copia. Prima di cancellarla, guarda se
  contiene roba ancora valida da travasare.
- **Ricresce.** Non e' un fix definitivo: con hook verbosi vale la pena ripassare ogni mese circa.

## Quando NON usare questa skill

Se il disco e' pieno ma `~/.claude` pesa poche centinaia di MB, il problema e' altrove:
`node_modules`, artefatti di build, worktree git, immagini Docker, cache npm
(vedi `spedire-modifica` per `ENOSPC` in build). Misura, non assumere.
