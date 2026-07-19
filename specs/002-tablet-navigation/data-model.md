# Data Model: Ottimizzazione Navigazione Tablet-First

**Date**: 2026-05-24
**Note**: Feature è frontend-only. Nessuna entità persistita. Nessuna modifica al backend o Prisma.

## Entità di navigazione (solo stato UI — non persistite)

### NavLevel2State

Stato del secondo livello di navigazione (gruppo attivo in PageTabs).

```
activeGroup: TabGroup  — ID del gruppo attivo (es. 'panoramica', 'clinica', 'diario')
```

### NavLevel3State

Stato del terzo livello (tab attivo dentro un gruppo, gestito via sotto-tab).

```
activeTab: TabId  — ID del tab attivo dentro il gruppo corrente
```

### Esistente — TabGroup (già in PatientDetail.tsx)

```typescript
type TabGroup = 'panoramica' | 'clinica' | 'diario' | 'moduli' | 'documenti';
```

### Esistente — TabId (già in PatientDetail.tsx)

```typescript
type TabId =
  | 'riepilogo'
  | 'profilo'
  | 'anamnesi'
  | 'diagnosi'
  | 'terapia-farmacologica'
  | 'note'
  | 'parametri'
  | 'consegne'
  | 'presa-in-carico'
  | 'documenti'
  | 'diario'
  | 'medicazioni'
  | 'contenzioni'
  | 'braden'
  | 'dimissione';
```

### TAB_GROUPS — struttura L2/L3 (già definita, da preservare)

| Gruppo (L2) | Tab (L3)                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------- |
| Panoramica  | Riepilogo, Profilo, Consegne                                                                |
| Clinica     | Presa in Carico, Anamnesi, Diagnosi, Terapia Farmacologica, Parametri Vitali, Note & Visite |
| Diario      | Diario Paziente                                                                             |
| Moduli      | Medicazioni, Contenzioni, Scala Braden, Dimissione                                          |
| Documenti   | Documenti                                                                                   |

## Nessuna migrazione richiesta

- Nessun campo nuovo su Paziente, CartellaPaziente, o qualsiasi entità backend
- Nessuna modifica a Prisma schema
- Nessuna modifica alle API route
