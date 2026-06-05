# Feature 013 — Redesign Shell + Multi-Level Navigation (Medical Blue)

## Obiettivo
Allineare shell, nav L1/L2/L3, header e componenti condivisi (cards/tables) a un design system unico, medical blue, enterprise. Ispirazione layout: screenshot enterprise asset monitoring. Brand: ClinicOS, primary blu.

## Vincoli
- No red come primary. Red solo per alert clinici / errori.
- No copia di logo/asset esterni.
- Compat con backend + Prisma esistenti.
- Pure CSS + React 19, no librerie UI esterne.

## Principi Design
- **Sidebar L1**: rail 64px, icon-only + label sottile, navy bg, active = fill blu + indicator
- **Header pagina**: breadcrumb light + title + L2 inline + actions slot dx
- **L2 tabs**: uppercase 12-13px, underline indicator blu
- **L3 tabs**: uppercase 11px, underline più sottile, stesso componente in tutta l'app
- **Cards**: white bg, border sottile, padding generoso, header con title + icon
- **Tables**: header caps grigio, padding row consistente, status badge
- **AI Assistant**: voce L1 sidebar + floating button bottom-right

## Componenti

### Nuovi
- `PageHeader` (shared): breadcrumb + title + L2 tabs slot + actions slot
- `AIAssistantButton` (shared): floating circular bottom-right, opens placeholder panel
- AI Assistant nav entry in `TeamsLikeSidebar`

### Esistenti — verifica conformità
- `TeamsLikeSidebar`: aggiungi AI Assistant item, verifica colori
- `PageTabs` (L2): conferma underline + uppercase
- `SectionTabs` (L3): già unificato (commit cd8f32c)
- `ClinicalCard`: già componente condiviso, verifica usage
- `ClinicalTable`: già componente condiviso, verifica usage

## Design Tokens (conferma esistenti)
```
--primary: var(--blue) = #1A56DB
--navy: #0C1E35 (sidebar bg)
--sidebar-w: 64px
--l2-h: 44px, --l2-font: 14px, underline 2px
--l3-h: 32px, --l3-font: 11.5px, underline 1px
--red: #DC2626 (alert badges only)
```

## Rollout (in questa sessione)
1. Spec ✓
2. AI Assistant entry in sidebar + nav key
3. AIAssistantButton floating
4. PageHeader component
5. Apply PageHeader to: AdminDashboard, OperatorDashboard, PatientList
6. Verify build clean
7. Commit

## Out of Scope (sessioni future)
- Refactor PageHeader su tutte le ~30 pagine
- Implementazione logica AI
- Refactor table/card su ogni consumatore
- Dark mode

## Acceptance
- Sidebar mostra AI Assistant entry
- Floating AI button visibile su tutte le pagine main
- PageHeader applicato su 3+ pagine anchor
- Nessun rosso usato come primary
- `npm run build` pulito
- Visivamente coerente con screenshot riferimento
