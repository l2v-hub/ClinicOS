# Task Contract

## Task
- Title: Restyle token-driven da mockup approvato
- Slug: restyle-token-driven-da-mockup-approvato
- Type: change (solo styling / design token)
- Date: 2026-07-17
- Branch: restyle/mockup-tokens (off main @ cf6ac7e)
- Fonte di verità visiva: `mockup/design-mockup.html` (mockup approvato)

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes (solo CSS/token) |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

Vietato toccare: backend, Prisma, API, VITE_API_URL, logica dei componenti (handler/props/JSX logico). Solo valori CSS/colore.

## Current Behaviour

L'app (main @ cf6ac7e, in prod) usa un design system token-driven in `frontend/src/App.css` `:root` (righe 23–87) con font `Plus Jakarta Sans` + `IBM Plex Mono` nelle variabili `--font-ui`/`--font-mono` (mentre l'`@import` a riga 6 carica già Public Sans + JetBrains Mono — disallineamento). Palette e superfici non combaciano coi valori del mockup approvato; presenti HEX hard-coded legacy (blu #1a56db/#2563eb…, verdi #16a34a…, ambra #f59e0b…, viola #7c3aed…) che stonano col nuovo sistema.

## Expected Behaviour

I token `:root` rimappati sui valori esatti del mockup (brand blu, superfici, bordi, testo, semantica clinica verde/ambra/rosso, viola terapie, raggi, ombre, spaziature). Font UI = Public Sans, mono = JetBrains Mono. Sidebar scura come nel mockup. HEX hard-coded legacy ricondotti alle var canoniche. Rosso riservato ad alert/errori clinici (mai brand/attivo). Nessuna modifica strutturale ai componenti: cambia solo lo stile via variabili.

## Acceptance Criteria

- AC1: `design-tokens.md` prodotto PRIMA delle modifiche, con tutti i token del mockup (colori/font/raggi/ombre/spaziature).
- AC2: `:root` di `frontend/src/App.css` rimappato sui valori del mockup (token-driven, nessun ridisegno per-componente); `--font-ui`='Public Sans', `--font-mono`='JetBrains Mono'.
- AC3: Sidebar scura come nel mockup (via var, senza cambiare markup).
- AC4: HEX hard-coded che stonano ricondotti a var canoniche; rosso resta solo alert/errore.
- AC5: `cd frontend && npm run build` passa (tsc -b && vite build).
- AC6: Regressione visiva OK su dashboard, lista pazienti, scheda paziente (Panoramica/Clinica/Diario/Moduli/Documenti), parametri, consegne, agenda, wizard ingresso, admin — inclusi hover/focus/active e banda allergie.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Nessuna logica modificata |
| Integration | no | Nessuna logica modificata |
| API | no | Backend non toccato |
| Playwright | yes | Regressione visiva + screenshot delle schermate |
| Persistence after refresh | no | Nessun dato creato/modificato |
| Agnos action registry | no | Non impattato |
| Voice simulation | no | Non impattato |
| OCR/import test | no | Non impattato |
| Security/privacy scan | no | Solo CSS, nessun dato |

## Evidence Plan

Required evidence:

- validation-report.md (Final Decision basata sui test)
- output `npm run build` (verde)
- screenshots delle schermate elencate in AC6 (light, con hover/focus/active dove rilevante)
- Playwright trace della regressione visiva
- design-tokens.md (spec estratta)

## Risks

- `--text-xmuted` = `#8595A8` (mockup) ha contrasto AA ~3.3:1 su bianco: mockup è source-of-truth, si applica ma si annota per review contrasto (non bloccante).
- Workspace instabile: durante la sessione l'albero di lavoro è stato svuotato una volta (causa esterna). Mitigazione: lavoro su branch dedicato `restyle/mockup-tokens`, verifica stato git prima di ogni fase.
- HEX hard-coded: rischio di toccare rossi-alert per errore → filtro esplicito, i rossi alert NON si toccano.

## Gate Status

READY FOR IMPLEMENTATION
