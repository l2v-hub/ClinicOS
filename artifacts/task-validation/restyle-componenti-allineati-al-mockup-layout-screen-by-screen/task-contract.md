# Task Contract

## Task
- Title: Restyle componenti allineati al mockup (layout screen-by-screen)
- Slug: restyle-componenti-allineati-al-mockup-layout-screen-by-screen
- Type: change (solo frontend/styling)
- Date: 2026-07-17
- Branch: restyle/mockup-components (off main)

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes (layout/CSS/markup presentazionale) |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

Vincoli: nessuna modifica a backend/API/logica. Rosso solo per alert clinici. Sidebar navy mantenuta. Token in App.css :root gia corretti (non si ridisegna il sistema token).

## Current Behaviour

I componenti usano i token corretti (colori) ma layout/spaziature/tipografia/card/badge non sono ancora allineati al trattamento visivo target. Riferimento visivo originario (mockup/design-mockup.html) perso (untracked, distrutto da wipe precedente): si procede sulla specifica testuale dettagliata dell'utente + design-tokens.md + screenshot stato attuale.

## Expected Behaviour

Ogni schermata avvicinata al target descritto:
- Dashboard: KPI card piu grandi/cliccabili, banda alert clinici in cima, lista "da fare adesso", barre avanzamento terapie.
- Lista pazienti: righe piu ariose, avatar iniziali, badge stato clinico + allergie, chip MRN mono.
- Scheda paziente: header con banda allergie/rischi sempre visibile, card Panoramica, card diario colore-ruolo + bordo sinistro.
- Parametri: griglia celle >=44px, evidenza fuori soglia (SpO2<92 rosso, TC>=37,5 ambra), contatore avanzamento.
- Consegne/Agenda/Wizard: card, priorita, stepper allineati.

## Acceptance Criteria

- AC1: ogni schermata mostra diff prima/dopo e `cd frontend && npm run build` verde prima di dichiararla fatta.
- AC2: rosso riservato ad alert clinici (SpO2<92, allergie/rischi, errori) - mai brand/attivo.
- AC3: sidebar navy invariata; nessuna modifica a backend/API/logica.
- AC4: soglie parametri automatiche corrette (SpO2<92 rosso, TC>=37,5 ambra).
- AC5: regressione visiva finale su tutte le schermate (build verde + screenshot).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Solo presentazione |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Screenshot regressione per schermata |
| Persistence after refresh | no | Nessun dato applicativo modificato |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | Solo CSS/markup presentazionale |

## Evidence Plan

Required evidence:

- validation-report.md
- output `npm run build` verde per ogni schermata
- screenshot prima/dopo per schermata
- diff riepilogativo

## Risks

- Mockup di riferimento perso -> fedelta pixel-exact non verificabile; mitigazione: specifica testuale utente + token + screenshot. Se il file viene ricaricato, rifinitura.
- Modifiche a markup presentazionale: rischio di toccare logica -> edit chirurgici, solo struttura/stile, tsc --noEmit dopo ogni componente.
- Workspace ha gia mostrato instabilita (wipe): commit frequenti per schermata.

## Gate Status

READY FOR IMPLEMENTATION
