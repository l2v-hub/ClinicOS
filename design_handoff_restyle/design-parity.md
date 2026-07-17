# ClinicOS — Design Parity (mockup ↔ classi CSS reali)

Scopo: portare il **trattamento visivo** delle classi CSS esistenti a combaciare col mockup approvato
(`design-mockup.html`). La **struttura JSX e i nomi delle classi esistono già** e sono corretti — NON si
cambia markup, NON si rifà l'IA. Si riscrivono solo le **regole CSS** di queste classi in `App.css` /
`app-additions.css`, sovrascrivendo i valori hard-coded dove necessario.

Token di riferimento (già in `clinicos-restyle.css`, usali via `var(--…)`):
`--blue #2F6BED` · `--bg #EEF1F6` · `--surface #FFF` · `--surface-raised #F7F9FC` · `--border #E6EBF2`
· `--divider #F0F3F8` · `--text #16202E` · `--text-muted #5A6B80` · `--text-xmuted #8595A8`
· `--emerald #16A37B`/`--emerald-bg #E7F7F0` · `--amber #C77700`/`--amber-bg #FDF3E2`
· `--red #D93A4A`/`--red-bg #FDECEE`/`--red-border #F6C9CE` · `--purple #6C4BD1` · `--indigo-bg #EEF3FE`
Font: `--font-ui 'Public Sans'`, `--font-mono 'JetBrains Mono'`. Raggi: card 16px, controlli 12px, pill 999px.
Ombra card: `0 1px 2px rgba(16,32,54,.04)`. Regola invariata: **rosso solo per alert clinici**.

Metodo per ogni classe: apri il mockup, individua l'elemento equivalente, applica i valori target sotto.
Rimuovi/aggiorna gli HEX hard-coded che divergono. Nessun `!important` salvo conflitto irrisolvibile.

---

## 1) Dashboard operatore — `.operator-dashboard`

| Classe reale | Target dal mockup |
|---|---|
| `.kpi-alert-grid` | grid 4 col, `gap:18px`, `margin-bottom:24px` |
| `.kpi-alert-card` | `background:var(--surface)`; `border:1px solid var(--border)`; `border-radius:16px`; `padding:20px 22px`; `box-shadow:var(--shadow-card)`; cursore pointer; hover `translateY(-2px)` + `border-color:#c9d6ea` |
| `.kpi-alert-card__val` | `font-size:38px`; `font-weight:800`; `letter-spacing:-1px` |
| `.kpi-alert-card__lbl` | `font-size:14px`; `font-weight:600`; `color:var(--text-muted)`; icona 38×38 tint pill |
| `.kpi-alert-card--red` | accento `--red` su icona/valore; NON colorare tutto il fondo |
| `.kpi-alert-card--amber` | accento `--amber` |
| `.kpi-alert-card--green` | accento `--teal`, badge "Nessuna criticità" su `--emerald-bg` |
| `.kpi-alert-card--blue` | accento `--blue` |
| `.stats-grid` | grid, `gap:18px` |
| `.stat-card` | come `.kpi-alert-card`; `.stat-card__value` `font-size:38px/800`; `.stat-card__label` `14px/600 muted`; `.stat-card__action` blu 13px con freccia |
| `.progress-card` | card bianca 16px, padding 22px; `.progress-card__count` muted |
| `.progress-bar` | `height:9px`; `background:var(--divider)`; `border-radius:6px` |
| `.progress-bar__fill--emerald` | `linear-gradient(90deg,#16A37B,#34c896)` |
| `.progress-bar__fill--blue` | `linear-gradient(90deg,#2F6BED,#5b8bf5)` |
| `.coverage-alert` | banda `--red-bg`, `border:1px solid var(--red-border)`, `border-left:5px solid var(--red)`, `border-radius:14px`, `padding:16px 20px`; testo `--red` scuro |
| `.next-appt-banner` | pannello navy `linear-gradient(155deg,#123056,#0f1b30)`, testo chiaro, `border-radius:18px`, `padding:22px`; `__time` 30px/800 |
| `.section-header__title` | 18px/800; icona in pastiglia tenue |
| `.agenda-day-slot` | riga con `__time` mono muted 52px, hover `--hover`, bordo inferiore `--divider` |
| `.consegna-card--urgente` | `border-left:5px solid var(--red)`; badge priorità pill |

## 2) Lista pazienti — `.patient-list-view`

| Classe reale | Target dal mockup |
|---|---|
| `.toolbar` | riga con gap 12px, wrap |
| `.search-wrap` | `background:var(--surface-raised)`; `border:1px solid var(--border)`; `border-radius:12px`; `height:46px`; icona muted |
| `.search-input` | `font-size:15px`, senza bordo interno |
| `.filter-chips` | contenitore bianco con `padding:5px`, `border-radius:12px` |
| `.filter-chip` | pill `padding:8px 16px`; attiva → `background:var(--blue)`, testo bianco; inattiva → testo muted |
| `.table-wrap` | card bianca `border-radius:18px`, ombra card; header riga `background:var(--surface-raised)`, label 12px/800 uppercase muted |
| header `<th>` | `background:var(--surface-raised)` (NON header scuro) |
| righe | `padding:14px 24px`, bordo `--divider`, hover `--hover` |
| `.op-avatar-sm` | 44×44, `border-radius:12px`, iniziali 800; fondo `--indigo-bg`/testo `--blue` (rosso solo se critico) |
| `.cell--name` | 15px/700 |
| `.cell--muted` | `--text-xmuted` |
| `.mrn-tag` | mono 12px, `background:var(--indigo-bg)`, `color:var(--indigo)`, `padding:5px 9px`, `border-radius:7px` |
| `.stato-pill--ricovero-ricoverato` | `--emerald-bg`/`--teal` |
| `.stato-pill--ricovero-dimesso` | grigio neutro |
| `.alert-chip--red` | `--red-bg`/`--red`, pill 12px/800 |
| `.alert-chip--amber` | `--amber-bg`/`--amber` |
| `.pt-list-card` (mobile) | card bianca 16px, padding 14px, ombra; stessi avatar/badge |
| `.row-chevron` / `.pt-list-card__chevron` | freccia `#c2ccda` |

## 3) Parametri multi-paziente — `.qe-list`

| Classe reale | Target dal mockup |
|---|---|
| contenitore | card bianca `border-radius:18px`, ombra card, overflow hidden |
| `.qe-row--header` | `background:var(--surface-raised)`, label 12px/800 uppercase muted, `padding:14px 22px` |
| `.qe-row` | grid allineata all'header, `gap:12px`, `padding:12px 22px`, bordo `--divider`; righe alterne `#fcfdff` |
| `.qe-row__avatar` | 40×40, `border-radius:11px`, iniziali 800, `--indigo-bg`/`--blue` |
| `.qe-row__name` | 14px/700; `.qe-row__room` 12px muted |
| `.qe-row__input` | `height:44px` (≥44 per touch), `border:1.5px solid #e1e8f2`, `border-radius:10px`, `font-size:16px/700`, centrato; focus `border-color:var(--blue)` |
| `.qe-row__input--critico` | `border-color:var(--red)`, `color:var(--red)`, `background:var(--red-bg)` (SpO₂ <92) |
| `.qe-row__input--attenzione` | `border-color:var(--amber)`, `color:var(--amber)`, `background:var(--amber-bg)` (TC ≥37,5) |
| `.qe-row__save` | `height:44px`, `background:var(--blue)`, testo bianco 800, `border-radius:10px`; dopo salvataggio → `--emerald-bg`/`--teal` "✓ Salvato" |
| `.qe-row__note-btn` | pill neutra, `--has-note` accento blu |
| `.qe-progress` | contatore + barra: `.qe-progress__fill` `background:var(--emerald)` |

## 4) Consegne / Agenda / Wizard (secondarie)

- **Consegne** (`ConsegnePage`): card `border-left:5px solid` per priorità (`--red`/`--amber`/neutro), badge tipo pill, stato uppercase colorato; header con avatar 40×40.
- **Agenda** (`OperatorAgenda`): blocchi terapia con testata `--purple` tenue (`#f6f2fe`, `border-left:5px solid var(--purple)`), slot con ora mono e pill stato.
- **Wizard ingresso** (`IntakeWorkspace`/`NewPatientModal`/`StepIngresso`): stepper con cerchi 34px (attivo `--blue` pieno, completato `--emerald-bg`/spunta), input 48px `border-radius:11px`, focus blu.

## Verifica finale
`cd frontend && npm run build` verde. Regressione visiva su: dashboard, lista pazienti, scheda paziente
(tab Panoramica/Clinica/Diario/Moduli/Documenti), parametri, consegne, agenda, wizard, admin — controllando
hover/focus/active, banda allergie e le evidenze soglie parametri. Nessuna modifica a backend/API/logica.
