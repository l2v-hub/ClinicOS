# Task Contract

## Task
- Title: Frontend responsive tablet e phone
- Slug: frontend-responsive-tablet-e-phone
- Type: feature
- Date: 2026-07-18

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

Su `≤1023px` (`App.css`) la sidebar `.teams-sidebar` è `display:none` **senza navigazione sostitutiva**:
su tablet e phone non è possibile spostarsi tra le sezioni. Alcune schermate hanno già gestioni parziali
(pt-card-list mobile, stats-grid responsive), ma manca una strategia responsive completa per tablet/phone
(nav mobile, overflow orizzontale, densità/contenuti su viewport stretti).

## Expected Behaviour

Frontend usabile su **tablet (768–1024px)** e **phone (~360–430px)**:
1. **Navigazione mobile**: quando la sidebar si nasconde (`≤1023px`), un pulsante hamburger nella topbar apre
   la sidebar come **drawer off-canvas** (con scrim); selezionando una voce il drawer si chiude. Markup minimo
   in `App.tsx` + `TeamsLikeSidebar` (stato `mobileNavOpen`); il resto è CSS.
2. **Nessun overflow orizzontale** globale su qualunque viewport ≥360px.
3. Topbar compatta su phone (già: nasconde placeholder/pill/meta) + hamburger visibile.
4. Griglie/card/tabelle leggibili e non tagliate su tablet/phone (KPI/stat/consegne/parametri/scheda paziente);
   contenuto entro il viewport (no full-bleed che sfora).
Interventi prevalentemente CSS in `App.css`/`app-additions.css`; markup solo per il drawer nav (deroga necessaria).

## Acceptance Criteria

- AC1: su `≤1023px` esiste una navigazione utilizzabile (hamburger → drawer sidebar con scrim); la selezione naviga e chiude il drawer.
- AC2: nessun overflow orizzontale (`document.scrollingElement.scrollWidth <= clientWidth`) su viewport 360, 390, 768, 1024px sulle schermate principali.
- AC3: Dashboard, Lista pazienti, Scheda paziente, Consegne, Parametri leggibili/usabili a tablet (768/1024) e phone (390); topbar compatta con hamburger.
- AC4: nessuna regressione desktop (>1023px): sidebar fissa come prima; nessun cambio a logica/dati/backend/API.
- AC5: `cd frontend && npm run build` verde; screenshot Playwright a phone+tablet delle schermate principali.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Presentazione/markup nav |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot + assert no-overflow a 360/390/768/1024px; drawer nav apre/naviga/chiude |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

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
