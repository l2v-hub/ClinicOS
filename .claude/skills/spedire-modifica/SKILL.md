---
name: spedire-modifica
description: Usa quando una modifica ClinicOS validata va portata in produzione — commit, PR, check CI, merge, deploy backend/frontend e verifica su prod. Copre anche i casi in cui il push fallisce con 403, git sembra dire il falso, il branch e' indietro rispetto a main, o la build muore per disco pieno. Complementare a agent-loop-quality-gate, che copre contract e validazione; questa copre la spedizione.
---

# Spedire una modifica in produzione

Il Quality Gate (`agent-loop-quality-gate`) dice _se_ una modifica e' pronta. Questa skill dice
_come_ portarla in produzione senza inciampare nelle trappole note di questo repository.

**Prerequisito**: `validation-report.md` compilato. Se la decisione non e' `CLOSED — VERIFIED`, il
merge e' una scelta esplicita dell'utente, non un automatismo: dillo prima di procedere.

## Il percorso

```
verifica stato branch → commit → push → PR → check CI → merge → deploy → verifica su prod
```

## 1. Verifica lo stato del branch PRIMA di committare

Salta questo passo e rischi di spedire una regressione.

```bash
rtk proxy git fetch origin
rtk proxy git rev-list --left-right --count origin/main...HEAD   # <dietro>  <avanti>
```

Un branch **dietro di N commit e avanti di 0** non ha commit propri: tutto il lavoro e' nel working
tree, su una base vecchia. Committare cosi' puo' **regredire** cio' che nel frattempo e' finito su
`main`. In quel caso riparti da `origin/main` e riporta sopra solo il delta reale, dopo aver
verificato per contenuto quali file differiscono davvero.

## 2. `rtk` filtra l'output di git — non fidarti dei silenzi

L'hook riscrive `git <cmd>` in `rtk <cmd>`, che tronca e riassume. Osservato: `git ls-files --others`
che restituisce 0 righe con decine di file untracked; `git diff --name-only` vuoto su alberi
diversi; `git diff --quiet A B && echo uguali` che stampa "uguali" su tree hash diversi.

**Per ogni git di plumbing usa `rtk proxy git ...`.** Un `git diff` vuoto non e' mai prova di
uguaglianza. Se la decisione e' distruttiva (switch forzato, rimozione di file "identici"),
verifica per contenuto:

```bash
git show origin/main:<file> | diff - <file>
rtk proxy git rev-parse HEAD^{tree}   # confronta con origin/main^{tree}
```

Attenzione anche ai fine riga: CRLF locale contro LF su main fa apparire "tutto diverso" un file
identico. Confronta normalizzando `\r\n` prima di concludere.

## 3. Push: se torna 403, e' l'account gh sbagliato

```bash
gh auth status                    # due account nel keyring
gh auth switch --user l2v-hub     # il repo e' l2v-hub/ClinicOS
```

`llavial2v` e' spesso l'account attivo e **non ha permessi** su questo repository.

## 4. PR e check

```bash
gh pr create --base main --head <branch> --title "..." --body "..."
gh pr checks <n>                  # attendi: gate e browser-e2e richiedono ~4-5 minuti
```

Check attesi verdi: `gate`, `browser-e2e`, `real-provider`, `secret-scan`, `Vercel`.

Se compaiono `Build and Deploy Job` / `Close Pull Request Job` (Azure Static Web Apps), qualcuno ha
riattivato `azure-static-web-apps-*.yml.disabled`: era una seconda produzione ridondante che falliva
su ogni PR per quota di ambienti di staging. Va tenuto disattivato.

## 5. Merge e deploy

```bash
gh pr merge <n> --rebase --delete-branch
```

- **Backend → Railway: automatico** sul merge in `main`. Segui con
  `gh run watch <id> --exit-status`. Non tentare deploy manuali: la CLI Railway e' bloccata da
  Zscaler su questa postazione.
- **Frontend → Vercel: MANUALE.** Il push su `main` non deploya il frontend.

```bash
vercel deploy --prod --archive=tgz --yes     # binario globale: `npx vercel` viene riscritto in npm
vercel inspect <url-restituito>              # verifica: target=production, alias clinicos-eosin
```

Un deploy `--prod` promuove l'alias da solo. Fallo quando l'utente dice "deploy", mai d'iniziativa.

## 6. Verifica su produzione

La prod frontend e' dietro Entra/OIDC: `curl` anonimo prende 403, **non puoi verificarla tu**.
Chiedi all'utente una ricarica forzata (`Ctrl+Shift+R`) da autenticato: senza, il browser serve il
bundle vecchio e sembra che non sia cambiato nulla.

## Trappole che costano ore

**Una funzionalita' che "non fa nulla", prima di accusare i dati.** `cachedGetJson`
(`frontend/src/lib/cachedFetch.ts`) esegue `fetch(url)` **senza header**. Nel frontend gli header
operatore sono allegati caso per caso dal singolo componente: non esiste un wrapper globale. Quindi
ogni chiamata a un endpoint protetto da `requireOperator` fatta con quel helper prende 401 — e se il
chiamante ha un `catch` che degrada, **la funzionalita' muore in silenzio**. Verifica lo status code
prima di dare la colpa a un dato mancante.

**Build che fallisce con `ENOSPC`.** Non e' il codice: il disco C: si riempie. `npm cache clean
--force` libera qualche GB ed e' sicuro, e' una cache. Controlla con `df -h /c`.

**Feature che dipende dall'anagrafica farmaci.** Se `GET /farmaci/stato` risponde `caricata: false`,
il comportamento corretto e' _nessun risultato_ — a occhio indistinguibile da una funzionalita'
rotta. Controlla prima di dichiarare un difetto.

## Cosa non fare mai

- Non dichiarare "done"/"completato" senza `CLOSED — VERIFIED`: gli stati ammessi sono
  `IMPLEMENTED — NOT VERIFIED`, `FAILED VALIDATION`, `BLOCKED`, `PARTIAL`.
- Non mescolare file non correlati nello stesso commit (constitution, Development Workflow).
- Non usare `--admin` sul merge per aggirare un check rosso senza aver letto il log e accertato che
  la causa sia infrastrutturale e non il codice.
