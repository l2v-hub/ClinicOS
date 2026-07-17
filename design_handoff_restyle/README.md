# Handoff: ClinicOS — Restyle 2026 (design refresh)

## Overview
Rinfrescare l'intera UI di ClinicOS (React 19 + Vite + CSS puro) verso una direzione
**più moderna, luminosa e ariosa mantenendo il blu**, ottimizzata per l'uso a bordo letto
di infermieri/OSS (font più grandi, alert clinici sempre in evidenza, inserimento dati rapido).

**Non è un rifacimento.** La app è già ben strutturata con un design system a **variabili CSS**
in `frontend/src/App.css` (`:root`). La strategia è **rimappare i token**, non riscrivere i componenti.

## About the design files
I file in questo bundle sono **riferimenti di design creati in HTML** (prototipo che mostra
look & comportamento previsti), NON codice di produzione da copiare. Il lavoro è **applicare il
nuovo stile nel codebase esistente** riusando i suoi pattern (CSS puro, nessuna libreria UI, nav unificata).

- `clinicos-restyle.css` — **il deliverable principale**: file di override drop-in dei token.
- `ClinicOS RSA.html` — prototipo interattivo di riferimento (dashboard, pazienti, cartella con
  Panoramica/Clinica/Diario/Moduli/Documenti, parametri rapidi, consegne, agenda, wizard ingresso).

## Fidelity
**Hi-fi.** Colori, tipografia, raggi e ombre sono finali. Riprodurre esattamente i valori del CSS di override.

## Strategia di implementazione (per Claude Code)
> Rispetta il Quality Gate del repo (`CLAUDE.md`): task-contract → implementazione → validation-report,
> `npm run build`, nessuna modifica a backend/Prisma/API. Questo è un intervento **solo styling/token**.

1. Copia `clinicos-restyle.css` in `frontend/src/clinicos-restyle.css`.
2. In `frontend/src/App.css`:
   - sostituisci l'`@import` del font (Plus Jakarta Sans) con il `@import` di **Public Sans + JetBrains Mono**
     indicato in testa a `clinicos-restyle.css`;
   - aggiungi come **ultima** riga del file: `@import './clinicos-restyle.css';`
     (deve venire dopo `@import './app-additions.css';` per vincere per ordine-sorgente).
3. `cd frontend && npm run build` deve passare. Verifica visivamente le schermate elencate sotto.
4. **Non** modificare i singoli componenti per lo stile: quasi tutto è guidato dai token `:root`.
   Interviene puntualmente SOLO dove trovi colori/spaziature hard-coded (vedi "Note tecniche").

## Design tokens — mappa (attuale → nuovo)
| Token | Prima | Dopo |
|---|---|---|
| `--blue` (brand) | `#0F5FD7` | `#2F6BED` |
| `--bg` (pagina) | `#E3E9F1` | `#EEF1F6` |
| `--surface` | `#FFFFFF` | `#FFFFFF` |
| `--surface-raised` | `#F4F7FB` | `#F7F9FC` |
| `--border` | `#CDD6E3` | `#E6EBF2` |
| `--divider` | `#E5EBF3` | `#F0F3F8` |
| `--hover` | `#EEF3F9` | `#F7F9FC` |
| `--text` | `#111827` | `#16202E` |
| `--text-muted` | `#404A5C` | `#5A6B80` |
| `--text-xmuted` | `#586173` | `#8595A8` |
| `--emerald` / bg | `#059669` / `#ECFDF5` | `#16A37B` / `#E7F7F0` |
| `--amber` / bg | `#D97706` / `#FFFBEB` | `#C77700` / `#FDF3E2` |
| `--red` / bg / border | `#DC2626` / `#FEF2F2` / `#FECACA` | `#D93A4A` / `#FDECEE` / `#F6C9CE` |
| `--indigo` / bg (chip MRN) | `#4338CA` / `#EEF2FF` | `#2F6BED` / `#EEF3FE` |
| `--purple` (terapie) | `#8B5CF6` | `#6C4BD1` |
| `--radius` / `--radius-sm` | `10px` / `6px` | `12px` / `8px` |
| `--card-radius` | `16px` | `16px` |
| `--font-ui` | Plus Jakarta Sans | **Public Sans** |
| `--font-mono` | IBM Plex Mono | **JetBrains Mono** |
| Ombre | grigie neutre | soft blu-navy (`rgba(16,32,54,…)`) |

Regola invariata dal brand esistente: **il rosso resta riservato ad alert clinici / errori**, mai come brand/attivo.

## Screens da verificare (regressione visiva)
Dashboard operatore · Lista pazienti (`.data-table` / `.pt-list-card`) · Scheda paziente
(`.pt-header-card`, `.allergy-alert-strip`, tab L2 `Panoramica/Clinica/Diario/Moduli/Documenti`) ·
Parametri multi-paziente (griglia input) · Consegne · Agenda operatore · Wizard nuovo paziente ·
Admin (dashboard, operatori, posti letto). Controlla stati hover/focus/active e la banda allergie.

## Note tecniche (dove potrebbe servire un ritocco puntuale)
- Alcune classi usano HEX letterali invece dei token (es. `.teams-sidebar`, `.timeline__dot--*`,
  `.agenda-chip--done`, `.badge--*`, `.severity-pill--*`). Restano coerenti col nuovo blu; se qualche
  verde/ambra stona con i nuovi `--emerald`/`--amber`, allinealo agli HEX della tabella.
- **Sidebar**: il prototipo usa una sidebar **scura** (navy). È OPZIONALE e devia dal navigation
  contract attuale (sidebar grigio chiaro) — nel file di override è un blocco commentato: attivalo
  solo se il cliente approva.
- Componente icona chevron/edit in `ClinicalCard.tsx` e la nav (`TopNav.css`) usano già `var(--c-primary)` → si aggiornano da soli.

## Files in questo bundle
- `clinicos-restyle.css` — override token drop-in (deliverable)
- `ClinicOS RSA.html` — prototipo interattivo di riferimento
- `README.md` — questo documento
