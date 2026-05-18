# Task: Unifica Tabelle con ClinicalTable

## Obiettivo
Creare componente `ClinicalTable` riutilizzabile con filtri per colonna e ordinamento.
Migrare TUTTE le tabelle dell'app a questo componente unico.

## Componente da creare

File: `frontend/src/components/operator/cartella/ClinicalTable.tsx`

### ColumnDef interface
```typescript
export interface ColumnDef<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}
```

### Props
- title: string
- columns: ColumnDef<T>[]
- data: T[]
- count?: number
- countLabel?: string
- defaultOpen?: boolean
- actions?: ReactNode
- emptyMessage?: string
- keyField?: string (default: 'id')

### Comportamento
- Wrap in ClinicalTableSection (blue header, collapsible)
- Sort: click header → asc → desc → reset
- Filtri: pulsante "Filtri" in header actions mostra/nasconde riga filtri sotto intestazioni
- Filtro text: input testuale
- Filtro select: dropdown con options
- Filtro date: input type="date"
- Empty state via <td colSpan>
- Ordinamento: testo (localeCompare it), numeri, date (string compare YYYY-MM-DD)

## CSS da aggiungere in app-additions.css

```css
/* ── ClinicalTable (CDT) ──────────────────────────────────────── */
.cdt__th-inner { display: flex; flex-direction: column; gap: 2px; }
.cdt__sort-btn {
  background: none; border: none; cursor: pointer;
  color: inherit; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em;
  display: flex; align-items: center; gap: 4px;
  padding: 0; white-space: nowrap;
}
.cdt__sort-btn:hover { color: #a8d4f8; }
.cdt__sort-icon { font-size: 10px; opacity: 0.7; }
.cdt__filter { margin-top: 4px; }
.cdt__filter-input, .cdt__filter-select {
  width: 100%; font-size: 11px; padding: 2px 4px; border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.15); color: #fff;
}
.cdt__filter-input::placeholder { color: rgba(255,255,255,0.5); }
.cdt__filter-input:focus, .cdt__filter-select:focus {
  outline: none; border-color: rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.25);
}
.cdt__empty {
  text-align: center; padding: 32px 16px;
  color: var(--text-muted, #8898AA); font-style: italic; font-size: 13px;
}
```

## Tabelle da migrare

1. PatientList.tsx — tabella pazienti desktop
2. TerapiaMedicaTab.tsx — tabella farmaci (mantieni render prop per azioni + stile righe attivo/sospeso)
3. TerapiaFarmacologicaTab.tsx — tabella terapia farmacologica
4. TerapiaScheduleTab.tsx — se ha tabelle
5. DiarioTab.tsx — lista voci diario
6. DocumentiTab.tsx — lista documenti
7. MedicazioniTab.tsx — lista medicazioni/lesioni
8. ScalaBradenTab.tsx — storico scale
9. ContenzioniTab.tsx — lista contenzioni
10. PresaInCaricoTab.tsx — farmaci correnti / allergie
11. DimissioneTab.tsx — se ha tabelle
12. ParametriTab.tsx — SOLO lista storico misurazioni, NON la griglia inline editing
13. OperatorManagement.tsx — lista operatori
14. RoomsManagement.tsx — lista camere/letti
15. ConsegnePage.tsx — lista consegne
16. AdminAgenda.tsx — se ha tabelle

## Vincoli HARD

- NON modificare ParametriTab griglia inline editing (vitale-inline-cell/vitale-inline-input)
- NON toccare file di stampa: ParametriModuloView.tsx, TerapieModuloView.tsx, print-forms.css
- NON toccare backend o Prisma
- NON hardcodare localhost
- Tutti i label/placeholder in italiano
- Mantenere tutti i render/action button esistenti via render prop

## Build

Dopo implementazione: `cd frontend && npx tsc --noEmit` poi `npm run build`

## Commit

Solo se build passa: `unify tables with filters and sorting`
