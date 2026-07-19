# Research: Ottimizzazione Navigazione Tablet-First

**Date**: 2026-05-24
**Feature**: `specs/002-tablet-navigation/`

## Codebase Analysis

### Current Navigation Architecture

| Livello               | Componente attuale                                        | Problema tablet                          |
| --------------------- | --------------------------------------------------------- | ---------------------------------------- |
| L1 — Macro-aree       | Sidebar in `App.tsx` (`.app-shell__sidebar`)              | OK, già compatta                         |
| L2 — Sezioni paziente | Second sidebar (`.cr-sidebar-nav`) in `PatientDetail.tsx` | Occupa 180-240px su tablet               |
| L2 → Drawer           | Hamburger + drawer su portrait                            | Nasconde navigazione, cattiva UX         |
| L3 — Sotto-sezioni    | Nessun pattern uniforme                                   | Gestito in modo diverso per ogni sezione |

### Componenti esistenti riutilizzabili

- `NavComponents.tsx` → `PageTabs` (barra orizzontale L2) e `SectionTabs` (sotto-tab L3) **già scritti e funzionanti**
- `App.css` ha già variabili `--sidebar-w` e breakpoint tablet
- `app-additions.css` riga 3724-3725: `.patient-record-view .page-tabs, .section-tabs { display: none }` — questi componenti erano attivi in precedenza, poi nascosti quando si è passati alla sidebar. **Va solo riabilitarli e rimuovere la sidebar.**

### Pattern target (già presente nel codice, da riabilitare)

```
App Shell (App.tsx)
  └── Sidebar L1 (app-shell__sidebar) — macro-aree, rimane invariata
      └── Contenuto pagina
          └── PageTabs L2 (horizontal) — gruppi: Panoramica, Clinica, Diario...
              └── SectionTabs L3 (compact) — tab interni: Riepilogo, Profilo...
                  └── Contenuto sezione
```

### Decisioni

**Decisione 1 — Riuso di PageTabs/SectionTabs**

- Chosen: Riutilizzare i componenti già esistenti in `NavComponents.tsx`
- Rationale: YAGNI — i componenti funzionano. Il problema è solo dove sono usati.
- Alternative: Riscrivere nuovi componenti — rigettata (violazione Principio I)

**Decisione 2 — Rimozione cr-sidebar-nav da PatientDetail**

- Chosen: Sostituire `.cr-sidebar-nav` + drawer con `PageTabs` (gruppi) + tab interni per sezione
- Rationale: La second sidebar occupa 180-240px. Su 1024px tablet = 17-23% della larghezza. Con L1 sidebar (60-240px), rimane poco spazio contenuto.
- Alternative: Collassare la sidebar → crea più confusione navigativa su tablet

**Decisione 3 — Nessun routing aggiuntivo**

- Chosen: Mantenere la navigazione a stato locale (`useState`) e hash URL già esistente
- Rationale: Il routing attuale (hash-based, `window.history.pushState`) funziona. Aggiungere React Router per questo cambio sarebbe over-engineering.
- Alternative: React Router — rigettata (vincolo esplicito utente + Principio I)

**Decisione 4 — Scope pagine priority**

- Chosen: Priorità US4 (PatientDetail) → poi Agenda → poi Admin. Ogni pagina testabile indipendentemente.
- Rationale: PatientDetail è la pagina più complessa e più usata. Fix there creates the template for others.

## Conclusione ricerca

Non ci sono NEEDS CLARIFICATION. L'architettura è completamente comprensibile dal codice esistente:

- I componenti necessari esistono
- Il CSS è già scritto (solo nascosto)
- La strategia è rimuovere la second sidebar e riabilitare il pattern orizzontale
