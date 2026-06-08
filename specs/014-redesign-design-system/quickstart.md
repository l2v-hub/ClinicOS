# Quickstart: Applying the ClinicOS Design System

## Tokens
Use intent tokens, never raw hex, on priority pages:
`--c-primary`, `--c-primary-hover`, `--c-primary-active`, `--c-primary-bg`,
`--c-success(-bg)`, `--c-warning(-bg)`, `--c-danger(-bg)`, `--c-info`, `--c-neutral(-bg)`.
Red = clinical alert/error only.

## Building a page
```
<PageShell subnav={<AppSubNav .../>}>
  <PageHeader title="Pazienti" actions={<button className="btn-primary">Nuovo</button>} />
  <AppTopNav tabs={l2} activeId={...} onChange={...} />
  <ClinicalCard title="Storia clinica" collapsible focused>...</ClinicalCard>
  <ClinicalTable columns={cols} rows={rows} rowKey={r=>r.id} />
</PageShell>
```

## Rules
- One sidebar (`TeamsLikeSidebar`), one L2 (`MainHorizontalNav`), one L3 (`ContextSubTabs`).
- Diario: author categories → `ContextSubTabs`; filtering → `ClinicalTable` column filters. No chips.
- All list data → `ClinicalTable`. No `<table>` outside it on priority pages.
- All section widgets → `ClinicalCard`. No ad-hoc card divs on priority pages.
- Content full-width; tables scroll inside their container; never the page body.

## QA / Verification
1. `cd frontend && npm run build` → must pass (tsc strict + vite).
2. Resize/emulate 1024×768, 1180×820, 1366px+: no global horizontal scrollbar; content full-width.
3. Visit each of the 9 priority pages: sidebar legible (80px, icon+label), L2 blue underline,
   L3 lighter, Diario L3 identical to others, tables/cards uniform.
4. `/patients` still loads patient data.
5. Red appears only on clinical alerts/errors.
