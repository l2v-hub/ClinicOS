---
name: new-clinical-tab
description: Scaffold a new patient-chart (cartella) tab in ClinicOS following the existing ClinicalCard + inline-edit + CSS-token pattern, wired into the shared L3 nav. Use when adding a section/tab to the patient record.
disable-model-invocation: false
allowed-tools: Read Edit Write Grep Glob Bash
---

# New clinical tab (cartella)

Aggiunge un tab alla scheda paziente **riusando** i pattern esistenti — niente nuovi
design system, niente framework UI. Richiede un **Task Contract** valido prima di editare
`frontend/` (Quality Gate).

## Pattern di riferimento (leggili PRIMA)

- Contenitore card: `frontend/src/components/shared/ClinicalCard.tsx`
- Tab esistente semplice: `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx`
- Sezione editabile inline: `frontend/src/components/shared/InlineEditableField.tsx`,
  `frontend/src/components/shared/sections/NarrativeClinicalSection.tsx`
- Registrazione tab + nav L3: cerca dove i tab sono mappati in
  `frontend/src/components/operator/PatientDetail.tsx` e il `TopNav variant="level3"`.

## Passi

1. **Contract**: `node scripts/quality-gate/create-task-contract.js "<titolo tab>"` → compila → valida.
2. **Componente**: crea `frontend/src/components/operator/cartella/<Nome>Tab.tsx`.
   - Renderizza una o più `<ClinicalCard>` (mai una tabella-nella-card).
   - Campi in lettura/scrittura con `InlineEditableField` o pattern equivalente della sezione.
   - Azioni CRUD coerenti (vedi design system: verde=salva/crea, blu=modifica, rosso=elimina
     con conferma). Nessun `!important`, usa i token `var(--…)`.
3. **Registrazione**: aggiungi il tab alla lista in `PatientDetail.tsx` e alla nav L3 condivisa
   (`TopNav`), NON creare tab custom paralleli.
4. **CSS**: solo `App.css`/`app-additions.css` con token esistenti; radius/shadow da
   `var(--clinical-card-radius)`/`var(--card-shadow)`.
5. **Build + evidenza**: `cd frontend && npm run build` verde; Playwright screenshot desktop
   - tablet; scrivi il `validation-report.md` (vedi skill `playwright-evidence`).

## Vincoli

- Non toccare backend/API/Prisma se il tab legge dati già esposti (GET). Se servono nuovi
  endpoint, delega a `clinicos-backend` con contract dedicato.
- Verifica responsive a 360/390/768/1024 (vedi memoria mobile-responsive-gotchas).
