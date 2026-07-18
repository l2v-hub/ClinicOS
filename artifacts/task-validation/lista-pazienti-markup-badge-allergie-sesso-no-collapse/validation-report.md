# Task Validation Report

## Task
- Title: Lista pazienti markup badge allergie sesso no collapse
- Slug: lista-pazienti-markup-badge-allergie-sesso-no-collapse
- Commit: (push in corso)
- Date: 2026-07-18

## Implementation Summary

Modifiche a `PatientList.tsx` (solo questo componente) + CSS. Nessun cambio a logica dati/fetch/API/altri componenti.

1. Rimosso il wrapper `ClinicalTableSection` (e il suo import): la tabella `.table-wrap--desktop` e la
   `.pt-card-list` sono renderizzate direttamente in un fragment, sempre aperte (niente barra collassabile "▾ PAZIENTI").
2. Chip "⚠ Allergie" spostato accanto al nome — in `.cell--name` (desktop) e `.pt-list-card__name` (mobile),
   derivato da `statoClinicoBadges(cartellaMap.get(p.id))`; rimosso dalla colonna Stato clinico (resta stato-pill + "Critico").
3. Badge sesso accanto al nome: `.sex-badge--m` (M, azzurro #e7edfb/#2f6bed) / `.sex-badge--f` (F, rosa #fbe7f1/#c2418a).
4. `.btn-primary`: `box-shadow: 0 6px 16px rgba(47,107,237,.28)` + hover `--c-primary-hover` / ombra più profonda;
   "Importa dimissione" resta outline/piatto.
5. `.cell--name` e `.pt-list-card__name` resi flex (align + gap) per allineare i chip.

## Files Changed

- `frontend/src/components/operator/PatientList.tsx` (markup del solo componente)
- `frontend/src/App.css` (`.sex-badge`, `.cell--name`/`.pt-list-card__name` flex, `.btn-primary` ombra)

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 — niente sezione collassabile; tabella/card sempre visibili | PASS | screenshot: nessuna barra "▾ PAZIENTI"; nessun import ClinicalTableSection |
| AC2 — chip Allergie accanto al nome (desktop+mobile), assente da Stato clinico | PASS | Mancini/Moretti: "⚠ Allergie" nel nome; colonna Stato = solo ricovero + Critico |
| AC3 — badge sesso M azzurro / F rosa; `.btn-primary` ombrato, Importa piatto | PASS | tutte le righe M/F; Nuovo paziente ombrato; Importa outline |
| AC4 — nessun cambio logica/dati/API; build verde; screenshot @1440 | PASS | solo markup/CSS presentazione; build exit 0; `app-pazienti.png` |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Playwright screenshot @1440 | PASS | `screenshots/app-pazienti.png` |
| Build (tsc + vite) | PASS | `logs/qa-build.txt` exit 0 |
| Console/network | PASS | 0 errori sulla lista pazienti |
| Security/privacy | PASS | markup/CSS; nessun secret/endpoint |

## Runtime Evidence

- `screenshots/app-pazienti.png`
- `logs/qa-report.md`, `qa-build.txt`

## Logs

Solo log sanitizzati (dati seed sintetici).

## Residual Risks

- Nessuno noto. `statoClinicoBadges` è già usato altrove nel componente (nessuna nuova dipendenza dati).
- Pre-esistente (fuori scope): colonne Contatti (email/telefono), Camera/Letto e cestino elimina restano
  come nell'app reale (funzionalità), non nel mockup statico.

## Final Decision

CLOSED — VERIFIED

(QA indipendente: 5/5 item PASS via screenshot @1440, build verde, 0 errori console. Verdetto READY FOR CODEX QA.)
