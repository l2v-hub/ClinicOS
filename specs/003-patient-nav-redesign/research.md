# Research: Redesign Navigazione Scheda Paziente Tablet-First

**Date**: 2026-05-24
**Feature**: `specs/003-patient-nav-redesign/`

## Codebase Analysis

### Current State — Nav Rail (L1)

| Property | Current value | Problem |
|----------|--------------|---------|
| Width | 96px | Troppo larga — Teams usa 48-64px |
| Item min-height | 64px | OK per touch |
| Active state | rgba(26,86,219,0.22) + left bar 3px | Abbastanza buono, left bar poco visibile su schermi luminosi |
| Label font | 10.5px 600 | OK |
| Icon | 22×22px SVG | OK |

File: `frontend/src/app-additions.css` righe 2489–2687.
Nessun TSX da modificare — pure CSS.

### Current State — PageTabs (L2)

| Property | Current value | Problem |
|----------|--------------|---------|
| Font | 13.5px 600 | Quasi identico a L3 (12px) — gerarchia insufficiente |
| Padding | 8px 18px | Altezza bassa per touch su tablet |
| Active | white bg + box-shadow | Stile pill-card OK, ma troppo simile a L3 |
| Background | var(--bg) + border-radius 14px | Sembra un segmented control, non una nav bar principale |
| Margin | 12px 16px 0 | Gap sufficiente dall'header |

File: `frontend/src/app-additions.css` righe 3739–3800.
Component: `NavComponents.tsx` — `PageTabs` (no JSX change needed).

### Current State — SectionTabs (L3)

| Property | Current value | Problem |
|----------|--------------|---------|
| Font | 12px 500 | Corretto — più leggero di L2 |
| Padding | 4px 12px | Troppo compresso verticalmente |
| Active | rgba blue bg, 600 | OK ma indistinguibile da L2 active visivamente |
| Border-radius | 20px | Pill style — corretto |

File: `frontend/src/app-additions.css` righe 3802–3865.

### Current State — Patient Header

| Element | Current value | Problem |
|---------|--------------|---------|
| `.cr-breadcrumb` | `padding: 12px 20px 0` — riga separata | Duplica il back button del topbar |
| `.cr-header` padding | 20px 24px | Troppo alto — spreca ~40px |
| `.cr-header__name` | 20px font | Troppo grande per header compatto |
| Topbar breadcrumb | "Pazienti › Nome" | Duplica back button in PatientDetail |

File: `frontend/src/app-additions.css` righe 2694–2810.
Component: `PatientDetail.tsx` — back button già presente nell'header.

### Topbar Duplication

`App.tsx` righe 702–724: `topbar` mostra breadcrumb "Pazienti › Nome Paziente" quando `navKey === 'dettaglio-paziente'`. Questo duplica il back button `← Pazienti` dentro `PatientDetail.tsx`. 

Soluzione: nascondere il topbar breadcrumb nome-paziente quando si è in `dettaglio-paziente` (`topbar` può restare per search button, ma breadcrumb testuale è ridondante).

---

## Decisioni

**Decisione 1 — Nav rail width: 64px**
- Chosen: 64px (da 96px)
- Rationale: Microsoft Teams usa ~48px (icon-only) o ~68px (icon+label). 64px è il massimo ragionevole con label breve. Risparmia 32px su 1024px = +3% spazio contenuto.
- Alternative: 80px (meno aggressivo) — rigettato: ancora troppo largo vs Teams.

**Decisione 2 — L2 PageTabs: barra prominente con active card forte**
- Chosen: Font 15px, padding 10px 22px, altezza effettiva ~44px, active state white card con shadow e accent blu visibile
- Rationale: L2 deve dominare visivamente. Delta font 15px vs 12px (L3) + altezza maggiore crea gerarchia chiara.
- Alternative: Underline stile browser tab — rigettato: su tablet touch l'area attiva è troppo piccola.

**Decisione 3 — L3 SectionTabs: pill compatto con active subordinato**
- Chosen: Font 12px, padding 5px 14px, border-radius 20px, active blue tint leggero
- Rationale: Già corretto come direzione, serve solo aumentare leggermente il padding verticale per touch (da 4px a 5px) e assicurare che l'active sia meno vivace del L2.
- Alternative: Tab underline — rigettato: già usato da cr-tab-btn, confonde gerarchia.

**Decisione 4 — Patient header: max 80px, back integrato**
- Chosen: Rimuovere `.cr-breadcrumb` come riga separata. Integrare back button nell'header. Ridurre padding a `10px 16px`. Nome: 16px. Info essenziali inline.
- Rationale: Risparmia ~40px verticali = +40px spazio contenuto su 1024×768.
- Alternative: Header collassabile — rigettato: complessità non giustificata.

**Decisione 5 — Topbar: nascondere nome paziente nel breadcrumb**
- Chosen: Mostrare solo la label "Scheda Paziente" nel topbar quando in `dettaglio-paziente`, rimuovendo "Pazienti › Nome" (già presente nel cr-header con back button).
- Rationale: Elimina duplicazione visiva senza rimuovere funzionalità.
- Alternative: Nascondere intero topbar — rigettato: il search button è utile.

**Decisione 6 — Nessun nuovo componente React**
- Chosen: Solo CSS modificato + minori JSX tweaks in PatientDetail.tsx e App.tsx
- Rationale: I componenti `PageTabs`, `SectionTabs`, `nav-rail` esistono e funzionano. Solo stile insufficiente.
- I nomi di componente "TeamsSidebar", "PatientPrimaryNav" etc. nel brief utente sono riferimenti concettuali, non TSX reali da creare.

## Conclusione

Nessuna NEEDS CLARIFICATION. Architettura completamente comprensibile dal codice. La strategia è CSS-only dove possibile + JSX minimo per topbar e header.
