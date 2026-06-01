# Data Model: Redesign Navigazione Scheda Paziente Tablet-First

**Date**: 2026-05-24
**Note**: Feature è CSS + JSX minimo. Nessuna entità persistita. Nessuna modifica a backend o Prisma.

## Entità di navigazione (solo stato UI — non persistite)

Identiche a feature 002 — nessuna modifica alla struttura dati.

### NavLevel2State (esistente, invariato)
```
activeGroup: TabGroup  — ID del gruppo attivo ('panoramica' | 'clinica' | 'diario' | 'moduli' | 'documenti')
```

### NavLevel3State (esistente, invariato)
```
activeTab: TabId  — ID del tab attivo dentro il gruppo corrente
```

## Entità visive (CSS layout state)

### NavRailLayout
```
width: 64px          — ridotto da 96px
item-height: 64px    — invariato (touch target)
active-indicator: left bar 3px + bg highlight
```

### PatientHeaderLayout
```
height: ≤ 80px       — ridotto da ~120px (padding 20px 24px + breadcrumb)
back-button: integrato nella prima riga dell'header
allergie: inline nella seconda riga, non riga separata
```

### PageTabsLayout (L2)
```
button-height: ~44px  — aumentato da ~36px
font-size: 15px        — aumentato da 13.5px
active-style: white card + shadow + blue accent
```

### SectionTabsLayout (L3)
```
button-height: ~30px  — aumentato da ~28px (4px→5px padding)
font-size: 12px        — invariato
active-style: blue tint leggero, subordinato a L2
```

## Nessuna migrazione richiesta

- Nessun campo nuovo su Paziente, CartellaPaziente, o qualsiasi entità backend
- Nessuna modifica a Prisma schema o API routes
- TAB_GROUPS, TabId, TabGroup: invariati
