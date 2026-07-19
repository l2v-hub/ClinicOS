---
name: deploy-frontend
description: Deploy the ClinicOS frontend to Vercel production (manual, on the user's explicit "deploy"). Encapsulates the build gate, the exact Vercel command, and the auth-wall verification caveat.
disable-model-invocation: true
allowed-tools: Bash Read
---

# Deploy frontend (Vercel prod)

Il deploy frontend è **manuale** e va eseguito **solo** quando l'utente dice esplicitamente
"deploy"/"deploia" dopo un fix verificato. Non lanciarlo automaticamente. Il push su `main`
NON deploia il frontend.

## Precondizioni (bloccanti)

1. La modifica ha un `validation-report.md` con `Final Decision: CLOSED — VERIFIED`
   (Quality Gate). Se manca, fermati: non deployare lavoro non verificato.
2. Build verde:
   ```
   cd frontend && npm run build      # tsc -b && vite build, exit 0
   ```
3. Git pulito o commit già fatto (`git status`). Se sei su `main`, ok; se su branch, chiedi.

## Deploy

Dalla **root del repo** (non da `frontend/`), chiama il binario globale `vercel`
(NON `npx vercel`: il shell hook lo riscrive in `npm`):

```
vercel deploy --prod --archive=tgz --yes
```

Progetto `clinicos__`, alias `clinicos-eosin.vercel.app`. Un deploy `--prod` promuove
automaticamente l'alias.

## Verifica post-deploy

- La prod è dietro **Entra/OIDC**: un `curl` anonimo all'URL Vercel restituisce **403**.
  Non puoi verificare le pagine prod via curl.
- Verifica localmente con Playwright (già fatto nel Quality Gate) e **chiedi all'utente**
  di fare hard-reload autenticato (Ctrl+Shift+R).
- Ricorda: `frontend/vercel.json` deve mantenere il rewrite `"/((?!assets/).*)"`
  (esclude `/assets/`) — un catch-all rompe i chunk hashati con errori MIME.

## Output

Riporta: URL di produzione stampato da Vercel, commit SHA, esito build, e il reminder
all'utente di hard-reload.
