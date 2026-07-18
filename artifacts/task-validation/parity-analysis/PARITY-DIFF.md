# ClinicOS — Visual Parity Diff (Mockup vs Running App)

**Viewport:** 1440×900 · **Date:** 2026-07-18
**Mockup (source of truth):** `frontend/design-mockup.html` @ `http://localhost:5173/design-mockup.html`
**App:** `http://localhost:5173/` (Operatore profile)

Screenshots in `artifacts/task-validation/parity-analysis/screenshots/`:
`mockup-*.png` / `app-*.png` for dashboard, pazienti, scheda-panoramica, scheda-clinica, scheda-diario.

Values below are **computed styles** read from the live DOM (not eyeballed) unless noted "(visual)".

---

## 0. GLOBAL — Typography (affects every screen)

| Property | Mockup | App | Sev |
|---|---|---|---|
| Body/root font actually rendering | **Public Sans** applied to body (`"Public Sans", system-ui, sans-serif`) | App shell `#root>*` = `"Public Sans", system-ui, sans-serif` ✅ but `<body>`/`<html>` computed font = **`"Times New Roman"`** (no font-family set on body; only the app container sets it) | Med |
| Public Sans font file loaded | yes | **yes — loaded** (weights 400/500/600 all `loaded`) | — |
| **Headings (h1)** | `font-family: "Public Sans"`, **30px / 800**, letter-spacing −0.5px | `font-family: system-ui, "Segoe UI", Roboto` (NOT Public Sans), **22px / 700**, letter-spacing −0.22px | **High** |

**Verdict on "is Public Sans rendering?":** Public Sans IS loaded and IS applied to body text / cards. **But page headings (h1/h2) explicitly override to `system-ui`, so headings do NOT render in Public Sans**, and they are 8px smaller + one weight lighter than the mockup. On Windows this makes headings render as Segoe UI, visibly different from the mockup's heavy Public Sans. Body element itself falls back to Times New Roman (harmless today because content lives in the app div, but it's a latent bug).

---

## 1. NAVIGATION / APP SHELL  — PRIORITY

Both use a 96px dark navy left rail with a "C" brand dot on top and a user-initials avatar on the bottom, icon-above-label items, vertical stack. Structure matches. The mismatch is in **item sizing, label typography, and active-state treatment**.

| Property | Mockup | App (`.teams-sidebar`) | Sev |
|---|---|---|---|
| Sidebar width | 96px | 96px ✅ | — |
| Sidebar background | **solid** `#0F1B30` (rgb 15,27,48) | **gradient** `#123056 → #0F1B30` (per contract) | Low |
| Nav item box | **72 × 64 px**, radius **14px**, padding 11px 0, icon-label gap **6px** | **79 × 62 px**, radius **10px**, padding 0 4px, gap **5px** | Med |
| **Label font size** | **13.3px**, weight **400** | **11px**, weight **600** | **High** |
| Label effect | normal-weight, larger, roomier | smaller + bolder → cramped, "heavier" look | **High** |
| **Active item** | translucent white pill `rgba(255,255,255,.12)`, radius 14px, **NO left bar, no shadow** (visual: just a soft pill) | translucent white pill `rgba(255,255,255,.12)` **+ 3px solid blue left bar `#2F6BED`**, radius 10px | **High** |
| Nav item count / order | 6: Dashboard, Pazienti, Parametri, Consegne, Agenda, Note | **7**: Dashboard, Pazienti, Parametri, Consegne, Agenda, Note, **+ Assistente** | Med |
| Extra chrome | — | floating blue **AI/Assistente FAB** bottom-right on content (not in mockup) | Med |

**Net nav story:** the app's nav "buttons don't match" because (a) labels are **11px/600 vs mockup 13px/400** (smaller + bolder), (b) the active item has a **3px blue left bar** the mockup does not use (mockup active is a plain translucent pill), and (c) item radius/size differ (10px/79×62 vs 14px/72×64). Fixing those three brings the rail into parity.

### Topbar
| Property | Mockup | App (`.compact-topbar`) | Sev |
|---|---|---|---|
| Height / bg / border | 64px, #FFF, border-bottom #E6EBF2 | 64px, #FFF, border-bottom #E6EBF2 ✅ (padding 0 28px vs 0 20px) | Low |
| Left: search | rounded grey search, placeholder "Cerca paziente, camera, MRN… ( / )" | same, placeholder "Cerca paziente, camera, MRN…" (no `/` hint text) | Low |
| Right cluster | green status pill · **bell icon** · avatar + name/role | green status pill · **NO bell icon** · avatar + name/role | Med |

---

## 2. DASHBOARD

Structurally **different** — not just styling. See `mockup-dashboard.png` vs `app-dashboard.png`.

| Aspect | Mockup | App | Sev |
|---|---|---|---|
| H1 | "Buongiorno, Giulia" 30px/800, eyebrow "ClinicOS · Reparto A" + date/patient line | "Benvenuto, Dr. Marco Ferretti" 22px/700, **breadcrumb** "ClinicOS / Dashboard" above + date line | High (heading size) |
| Alert strip | full-width amber "2 segnalazioni da gestire…" banner with "Apri consegne →" | **absent** on dashboard | Med |
| KPI cards | **4 minimalist number cards**: big dark number + label + sub (Parametri da rilevare / Consegne aperte / Terapie da erogare / Pazienti in carico). No icons, no chevrons. | **4 icon+chevron alert cards**: tinted icon box top-left, chevron top-right, big **red** number (Parametri critici / Rischi alti / Allergie gravi / Ricoverati) — clinically-themed, more decorated | **High** |
| Secondary row | 2-col: **"Da fare adesso"** timeline (left) + **"Terapie del turno"** progress bars & "Prossimo giro visite" (right) | 3 plain link-cards (I Miei Pazienti / Appuntamenti Oggi / Consegne Aperte) **then** a dark navy "Prossimo appuntamento" banner **then** "Agenda di Oggi" list | **High** |
| Card decoration | flat cards, number badge top-right | icon boxes, colored numbers, dark hero banner | Med |

The dashboards diverge in **content model** (mockup = nurse turn/parametri/terapie; app = physician agenda/clinical alerts), so full parity here needs a product decision, not just CSS. The purely-visual gaps: heading size, KPI-card style (icons + red numbers vs plain), missing top alert strip.

---

## 3. PAZIENTI (patient list)

Closest match of all screens. See `mockup-pazienti.png` vs `app-pazienti.png`.

| Aspect | Mockup | App | Sev |
|---|---|---|---|
| Header | "Pazienti" + "18 in carico · Reparto A" + "Importa dimissione" (green dot) + "+ Nuovo paziente" | same layout; breadcrumb above; "Importa dimissione" **disabled/grey dot** | Low |
| Filter pills | Tutti / **Uomini / Donne** | Tutti / **Maschio / Femmina** (label wording) | Low |
| Table wrapper | table starts directly under filter | extra **collapsible "PAZIENTI · N pazienti" grey section-header bar** above the table | Med |
| **Columns** | 5: PAZIENTE · MRN · CAMERA/LETTO · STATO CLINICO · CONSEGNE | 7–8: PAZIENTE · **STATO CLINICO** · MRN · **DATA DI NASCITA** · CAMERA/LETTO · **CONTATTI (email+tel)** · CONSEGNE · **🗑 delete** | **High** |
| Column order | STATO CLINICO after CAMERA | STATO CLINICO moved to 2nd column | Med |
| Under-name text | "90 anni · 13/02/1936" (age + DOB) | "83 anni" (age only; DOB in own column) | Low |
| Status pills | green "Stabile", amber "Da valutare", red "Critico" (colorful) | grey uppercase "RICOVERATO"/"DIMESSO" + red "Critico" + amber "Allergie" (less colorful, uppercase) | Med |
| PHI | none shown | shows **email + phone** per row (extra column, not in mockup) | Med |

**Fix priorities:** drop/trim the extra columns (Contatti, delete, Data di nascita) or restore mockup's 5-column shape; remove the section-header wrapper; recolor status pills.

---

## 4. SCHEDA PAZIENTE

Shared across Panoramica/Clinica/Diario. Patient header banner + Allergie/Rischi banners + L2 tabs match well. The consistent gaps are **L2 tab style**, **L3 control style**, and **added chrome/spacing**.

### 4a. L2 tabs (Panoramica / Clinica / Diario / Moduli / Documenti)
| Property | Mockup | App (`.top-nav`) | Sev |
|---|---|---|---|
| Active tab style | **filled blue pill** — white text on `#2F6BED`, rounded (visual) | **underline** — blue text `#2F6BED` + blue underline, transparent bg, 15px/600 | **High** |
| Count badges | **yes** — "Clinica ⑦ · Diario ⑥ · Documenti ①" pill counters | **none** | Med |

### 4b. L3 segmented control
| Property | Mockup | App | Sev |
|---|---|---|---|
| Active segment | **filled blue pill** (white text on blue) — e.g. "Presa in carico", "Tutti" | white pill, **blue text**, subtle shadow on grey track (13px/600, radius 7px) — much fainter | **High** |
| Inactive segments | white pills w/ dark text | grey-track segments w/ grey text | Med |
| Segment set (Clinica) | Presa in carico · Sezioni cliniche · Diagnosi · Terapia farmacologica · Parametri · Esami & consulenze (6) | Presa in Carico · Sezioni Cliniche **(testo)** · Diagnosi · Terapia Farmacologica · **Parametri Vitali** · **Note & Visite** · Esami & Consulenze (**7**, extra "Note & Visite", relabeled) | Med |
| Segment set (Diario) | Tutti · Medico · Infermiere · OSS · Fisioterapista · Altro (6) | Tutti · Medico · Infermiere · OSS · Fisioterapista · **Operatore** · Altro (**7**) | Low |

### 4c. Panoramica body
| Aspect | Mockup | App | Sev |
|---|---|---|---|
| Extra stat row | **none** — straight to card grid | **adds a 5-card stat strip** (0 Diagnosi / 0 Farmaci / 1 Allergie / 0 Consegne / Camera) above the cards | Med |
| Card grid | clean **3-col × 2-row** (Diagnosi, Farmaci, Ultimi parametri / Allergie, Camera & assistenza, Ultime consegne) | ~**4-col** top row + 2 cards; different proportions | Med |
| Card header | plain heading + **count number** top-right, no icon | **icon** + heading + **edit pencil** top-right | Med |
| Allergie banner label | "Allergie gravi: Penicillina (anafilassi) · FANS · Lattice" (sentence case) | "ALLERGIE GRAVI: Penicillina  Gestisci →" (**UPPERCASE**) | Low |
| Header banner meta | shows "Camera 12 · Letto B · ● Ricoverata" inline | shows only "MRN · 41a · F" (no camera/letto/status inline) | Low |

### 4d. Clinica / Diario body
| Aspect | Mockup | App | Sev |
|---|---|---|---|
| Section wrapper | content sits directly under L3 | wraps in **collapsible "PRESA IN CARICO" / "DIARIO PAZIENTE · N voci" grey header bar** | Med |
| Presa-in-carico layout | flat **2-column key/value** (Dati ingresso ‖ Condizioni iniziali), fits one screen | single column, nested bordered card, ~55px rows, **much taller / requires scroll** (lower density) | Med |
| Diario entry card | compact: left color bar, **role pill + author + time on one line**, single status badge on far right, no per-row action icons | taller cards: role pill + NORMALE + APERTA badges **clustered left**, time + **edit/delete icons** on right, more padding | Med |
| Diario active filter | **blue-filled "Tutti" pill** | faint white "Tutti" segment (see 4b) | High |

---

## PRIORITIZED FIX LIST (visual impact)

**HIGH**
1. **Heading typography** — set h1/h2 to Public Sans and bump to ~30px/800 (currently system-ui 22px/700). Also set `font-family` on `body` so it isn't Times New Roman.
2. **Sidebar labels** — 13px/400 (currently 11px/600); item radius 14px, box ~72×64.
3. **Sidebar active state** — remove the 3px blue left bar; mockup active = translucent pill only.
4. **L2 tabs → filled blue pill** (currently underline) + add count badges.
5. **L3 segmented control → filled blue active pill** (currently faint white segment) — applies to Clinica sub-tabs and Diario filters.
6. **Dashboard KPI cards** — mockup uses flat number+label cards; app uses icon+chevron red-number alert cards. Align card style + heading size.
7. **Pazienti columns** — reduce to mockup's 5 (drop Contatti/PHI, delete icon, Data di nascita) or realign order; recolor status pills.

**MED**
8. Remove collapsible section-header bars ("PAZIENTI", "PRESA IN CARICO", "DIARIO PAZIENTE") that the mockup doesn't have.
9. Remove the extra 5-card stat strip on Panoramica.
10. Card headers: mockup = text + count; app adds icons + edit pencils.
11. Add bell icon to topbar; sentence-case the allergie banner; align filter wording (Uomini/Donne).
12. Densify Presa-in-carico into 2 columns; make Diario entries more compact (status on right, hide per-row action icons for read view).
13. Reconcile nav ("Assistente" item + AI FAB) and L3 segment sets (extra "Note & Visite", "Operatore").

**LOW**
14. Sidebar bg solid vs gradient; topbar padding 28 vs 20; search placeholder `/` hint.
15. Under-name age+DOB vs age-only.
