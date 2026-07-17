# Task Contract

## Task
- Title: Restyle CSS dashboard operatore KPI stat progress
- Slug: restyle-css-dashboard-operatore-kpi-stat-progress
- Type: refactor
- Date: 2026-07-17

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Dashboard operatore (`OperatorDashboard`): KPI card `.kpi-alert-card` con bordo sinistro colorato,
percepite alte/vuote; stat card `.stat-card` e progress card con spaziature/pesi non allineati al
mockup `design_handoff_restyle/ClinicOS RSA.html`; griglie con gap/margini non uniformi; agenda/riga
raggi e padding da rifinire.

## Expected Behaviour

Solo regole CSS in `App.css`/`app-additions.css` (token `var(--…)`; rosso solo alert clinici):
- `.kpi-alert-card`: niente `border-left`; bordo neutro + ombra, radius 16, padding 20/22, compatta;
  lo stato colora **icona + numero** (non fondo/bordo); card verde con badge "Nessuna criticità" su `--emerald-bg`.
- `.stat-card`: padding 20/22, numero 38/800, azione `--blue` 13/700, nessuna barra accento superiore.
- `.progress-card`: padding 20/22; label 12/800 uppercase muted; barra h9 `--divider` + fill gradient
  (emerald/blue); conteggio muted.
- Griglie `.kpi-alert-grid` (4 su una riga) e `.stats-grid` (3 su una riga): gap 18, margin-bottom 24, stessa altezza.
- Banda alert clinici `.coverage-alert` (già condizionale) a spec: red-bg, border red-border, border-left 5px red, radius 14, padding 16/20.
- Banner navy e agenda: raggi 18, righe agenda padding 13/20, bordo `--divider`, ora mono muted.

Nota deroga markup (approvata dall'utente che ha ri-chiesto esplicitamente il trattamento): il "quadrato
icona 38×38 + chevron" per le KPI è impossibile in puro CSS (card = val→lbl→ok, icona inline nel label,
nessun chevron). Applicata una **minima modifica presentazionale** a `OperatorDashboard.tsx` sulle 4 KPI:
aggiunto `.kpi-alert-card__top` con `.kpi-alert-card__ico` (icona spostata dal label) + `.kpi-alert-card__chevron`;
nessun cambio di dati/onClick/navigazione/IA. Backend/API/logica invariati.

## Acceptance Criteria

- AC1: `.kpi-alert-card` senza `border-left`; bordo neutro + ombra, radius 16, padding 20/22; stato colora icona+numero; verde con badge su `--emerald-bg`.
- AC2: `.stat-card` padding 20/22, numero 38/800, azione `--blue` 13/700, nessuna barra accento superiore.
- AC3: `.progress-card` padding 20/22, label 12/800 uppercase muted, barra h9 `--divider` + fill gradient, conteggio muted.
- AC4: `.kpi-alert-grid` 4-in-riga e `.operator-dashboard .stats-grid` 3-in-riga; gap 18, margin-bottom 24, altezze uniformi.
- AC5: `.coverage-alert` a spec e solo se criticità; banner navy + agenda con raggi 18 e righe 13/20; rosso solo per alert clinici; niente `!important` ingiustificato.
- AC6: `cd frontend && npm run build` verde; screenshot dashboard di conferma.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo CSS |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot dashboard operatore di conferma |
| Persistence after refresh | no | Nessun dato modificato |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | Nessun dato/secret |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
