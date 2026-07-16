# Task Contract — ClinicOS visual refresh (restyle token-only)

## Scope
Refresh visivo **solo styling/token**. NON toccare: backend, Prisma, API, `VITE_API_URL`,
logica dei componenti. Guidato dai token `:root`; interventi puntuali solo su HEX hard-coded
che stonano col nuovo verde/ambra/blu. Rosso riservato agli alert clinici/errori.

Reference visivo: `mockup/ClinicOS RSA - standalone.html` (nuova palette confermata:
2F6BED, 16A37B, C77700, D93A4A, 6C4BD1, 16202E, 5A6B80, EEF1F6; zero hex vecchi).

## Token map (attuale → nuovo)
| Token | Old | New |
|-------|-----|-----|
| --blue | #0F5FD7 | #2F6BED |
| --bg | #E3E9F1 | #EEF1F6 |
| --surface-raised | #F4F7FB | #F7F9FC |
| --border | #CDD6E3 | #E6EBF2 |
| --divider | #E5EBF3 | #F0F3F8 |
| --hover | #EEF3F9 | #F7F9FC |
| --text | #111827 | #16202E |
| --text-muted | #404A5C | #5A6B80 |
| --text-xmuted | #586173 | #8595A8 |
| --emerald / -bg | #059669 / #ECFDF5 | #16A37B / #E7F7F0 |
| --amber / -bg | #D97706 / #FFFBEB | #C77700 / #FDF3E2 |
| --red / -bg / -border | #DC2626 / #FEF2F2 / #FECACA | #D93A4A / #FDECEE / #F6C9CE |
| --indigo / -bg | #4338CA / #EEF2FF | #2F6BED / #EEF3FE |
| --purple | #8B5CF6 | #6C4BD1 |
| --radius / --radius-sm | 10px / 6px | 12px / 8px |
| --font-ui | Plus Jakarta Sans | Public Sans |
| --font-mono | IBM Plex Mono | JetBrains Mono |
| Shadows | rgba(0,0,0,…) | soft navy rgba(16,32,54,…) |
| --c-primary-hover/active/bg (derived, hard-coded old blue) | #0C52BE/#004FC4/#EBF1FE | riallineati al nuovo blu |

## Steps
1. `frontend/src/clinicos-restyle.css` — font import (Public Sans + JetBrains Mono) + `:root` override.
2. `frontend/src/App.css` — sostituire `@import` font Plus Jakarta con Public Sans+JetBrains Mono;
   aggiungere `@import './clinicos-restyle.css';` dopo `@import './app-additions.css';`.
3. Fix puntuale HEX hard-coded che stonano (grep). Rosso solo alert clinici.
4. Sidebar scura: **DISATTIVATA** (blocco commentato) salvo conferma.

## Acceptance criteria
- AC1: `cd frontend && npm run build` verde (tsc -b && vite build), zero errori.
- AC2: nel bundle emesso l'override `:root` vince (nuovo `--blue:#2F6BED` effettivo).
- AC3: nessuna modifica a backend/Prisma/API/VITE_API_URL/logica componenti.
- AC4: regressione visiva su dashboard, pazienti, scheda paziente + tab, parametri, consegne,
  agenda, wizard, admin — hover/focus/active e banda allergie coerenti; rosso solo per alert.
- AC5: sidebar scura non attiva.

## Evidence
`validation-report.md` + `screenshots/` (schermate elencate) + output build.
