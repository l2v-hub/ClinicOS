# Deployment manifest — batch bug 2026-07-04 (#127/#128/#129/#130)

**Stato**: DEPLOYED — tutte le PR mergiate su `main` e distribuite (Vercel Production + Railway production).

## REQ/BUG inclusi

| Issue | PR | Commit merge | Deploy |
|---|---|---|---|
| BUG #127 — creazione paziente (manuale + import) | #132 | `bdd797f` | Vercel+Railway success |
| BUG #128 — camera assegnata non occupata | #134 | `1132dcd` | Vercel+Railway success |
| BUG #129 — ordinamento alfabetico pazienti (4 viste) | #135 | `b443ce3` | Vercel+Railway success |
| BUG #130 — consegne via Agnos (voce+chat) | #136 | `43b2cc1` | Vercel+Railway success |

Base della catena: **SPEC-015** (Agnos AI unificato CRU no-Delete), PR #131 → `74cc916`
(manifest `DEPLOY-20260704-spec015-pending.md`, ora deployato con questo batch).

## Verifica di produzione (backend Railway)

- `GET /health` → 200.
- `GET /ai/actions/catalog` → **8 azioni, 0 delete**, include `create_consegna` (#130).
- `POST /ai/actions/plan {"text":"cancella la consegna"}` → `refuse_forbidden` / `refusalKind:delete`
  (divieto Delete via AI confermato in prod).
- `GET /ai/extraction/status` → `available:true, provider:google, 0 errors`.

Frontend Vercel: deployment Production `success` per ciascun merge commit (GitHub Deployments API).
Verifica visiva del dominio pubblico non eseguibile da questa postazione (proxy Zscaler);
evidenze E2E locali per ogni issue in `docs/qa/issues/<n>/`.

## Migrazioni

- `20260703225843_ai_audit_event` (additiva, da SPEC-015) applicata da Railway allo start
  (`prisma migrate deploy` nello startCommand). Nessuna migrazione aggiuntiva in questo batch.

## Issue lasciate aperte

- **#133** — CI `browser-e2e`/req020 drift ambientale runner (advisory; fix suggerito
  `AI_RUNTIME_URL=http://127.0.0.1:8000`). Non blocca i deploy.
- **#137** — `status-blocked`/`needs-info`: premessa non riproducibile (config LLM prod OK).
