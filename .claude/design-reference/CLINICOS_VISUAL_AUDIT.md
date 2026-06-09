# ClinicOS — Visual Audit (Design Reference)

> **Scopo**: estrarre struttura layout, gerarchia visiva e pattern UX dalle immagini
> di riferimento. **NON** copiare brand, colori originali (rosso/crimson), logo o asset.
> ClinicOS adotta una palette **medical blue** professionale.
>
> Le immagini reference appartengono a un applicativo MES/industriale (manufacturing,
> asset monitoring, marchio rosso). Si usa **solo** come riferimento di layout/UX.

---

## 1. Immagini analizzate

| File | Schermata reference | Cosa insegna |
|------|--------------------|--------------|
| `image.png` | Home / Dashboard (3D viz) | Shell completa: sidebar + header + L2 tabs + card full-width |
| `SideBar.png` | Sidebar (close-up) | Proporzioni sidebar, active state, icona+label verticale |
| `tabella.png` | Planner / Line Management | Tabella multi-colonna, Column Options + View Filters, paginazione |
| `Card.png` | Asset / Asset monitoring | Topology tree laterale + griglia card con KPI, sub-card annidate |
| `Screenshot 2026-06-08 231514.png` | Execution / Procedure Designer | L2 tabs + L3 (contatori) + tabella + bottone azione primario |
| `Table-layout.png` | Tabella dettaglio (ordinabile) | Header ordinabile, status badge, progress bar, accent riga, footer paginazione |

Tutte e 6 lette e interpretate correttamente. Nessun blocco di lettura.

---

## 2. Pattern visuali ricorrenti

1. **Shell Left-Top-Top costante**: sidebar sinistra fissa → header in alto → barra
   tab orizzontale (L2) sotto l'header. Ricorre in TUTTE le schermate.
2. **Header a fascia singola**: breadcrumb a sinistra, cluster icone (notifiche, settings,
   user) a destra. Il logo vive nella sidebar, non duplicato nell'header.
3. **L2 = tab orizzontali con underline** sul tab attivo (no pill pesante, no bordo box).
4. **L3 = riga più leggera** con contatori/filtri secondari (es. `Published Procedure (63) | Local Draft (0)`).
5. **Azione primaria a destra** della barra L2/L3 (bottone pieno colorato: "Configure",
   "Create Procedure") + secondaria ghost ("View Filters", "Column Options").
6. **Contenuto in container bianchi arrotondati** con bordo sottile e ombra leggera su
   sfondo neutro chiaro. Layout **full-width** sfruttando tutto il desktop.
7. **Tabelle uniformi**: header grigio chiaro, righe alternate/hover, badge di stato,
   azioni allineate a destra, paginazione a piè di tabella.
8. **Densità informativa alta ma respirata**: padding consistenti, molte colonne/KPI
   senza sensazione di affollamento.
9. **KPI/metriche come header di card** (OEE, Performance… → per ClinicOS: parametri vitali, ecc.).
10. **Pannello laterale ad albero** (Topology tree) per navigazione gerarchica accanto
    al contenuto principale (utile per anagrafiche/strutture cliniche).

---

## 3. Regole Sidebar (L1)

Da `SideBar.png` + `image.png`:

- **Larghezza**: ~76–88px (icona + label sotto) — più larga e leggibile dell'attuale.
  Tablet: stessa larghezza, niente collasso aggressivo (resta icona+label).
- **Struttura voce**: icona sopra, label sotto, centrate. Voci impilate verticali.
- **Active state CHIARO**: la voce attiva ha **sfondo bianco "card"** che stacca dallo
  sfondo neutro della sidebar + **icona e label nel colore primario**. (Reference usa
  rosso → ClinicOS usa **blue medical**.)
- **Inactive**: icona/label grigio neutro scuro su sfondo sidebar tenue.
- **Logo in alto**, area dedicata. Icone utility in basso (notifiche / assistente) separate
  da un divisore.
- **Touch target** ≥ 44px verticali per riga.
- Niente sidebar stretta a sole icone senza label (problema attuale #1 da correggere).

---

## 4. Regole Layout generale

- **Pattern Left-Top-Top** obbligatorio: `AppSidebar` (L1) → `AppTopNav` (L2) → `AppSubNav` (L3) → contenuto.
- **Header unico** (`PageHeader`): breadcrumb/titolo a sinistra, azioni a destra. Il
  breadcrumb **non** ripete il titolo della pagina (correzione problema #9).
- **Full-width**: il contenuto occupa tutta la larghezza disponibile, con padding di gutter
  costante (no max-width stretto che spreca desktop — problema #6/#7).
- **PageShell** gestisce: griglia sidebar + colonna contenuto, scroll verticale del solo
  contenuto, gutter responsive.
- **Responsive desktop/tablet**:
  - ≥1366px: layout pieno, sidebar 88px.
  - 1180×820 / 1024×768: sidebar invariata, tabelle scroll-x interno (non overflow globale),
    card che si impilano se < 2 colonne.
  - **Mai overflow orizzontale globale** (correzione #8 / QA).
- Sfondo app: neutro chiaro; superfici contenuto bianche.

---

## 5. Regole Navigazione Livello 2 (`AppTopNav`)

Da `image.png`, `tabella.png`, `Screenshot…png`:

- **Un solo componente** usato ovunque — niente stili custom pagina per pagina (correzione #2).
- Orizzontale, allineato a sinistra, subito sotto l'header.
- Tab attivo: **underline blu** spessa (2–3px) + testo primario; inattivi testo neutro.
- **Niente pill/box/bordo pesante.** Solo testo + underline.
- Spacing orizzontale costante tra tab (es. 24px), altezza barra costante (es. 48px).
- Azione primaria/secondaria della pagina allineata a destra sulla stessa fascia.
- UPPERCASE opzionale come reference, ma preferibile Title Case per leggibilità clinica.

---

## 6. Regole Navigazione Livello 3 (`AppSubNav`)

Da `Screenshot…png` (`Published Procedure (63) | Local Draft (0)`):

- **Stesso linguaggio del L2** ma **gerarchia più leggera** (correzione #3, #4):
  - testo più piccolo, peso normale, underline più sottile o solo colore testo attivo.
  - altezza barra ridotta (es. 36–40px), spacing minore.
- **Un solo componente** condiviso. Stessi token, varianti `level="2"` / `level="3"`.
- Supporta **contatori** inline `(n)` accanto alla label.
- **Il Diario DEVE usare questo stesso componente** — eliminare i tab/chip custom del Diario
  (correzione #4). Nessun bottone custom, nessun chip-filter ad-hoc.

---

## 7. Regole Tabelle (`ClinicalDataTable`)

Da `Table-layout.png`, `tabella.png`, `Screenshot…png`:

- **Un solo componente** `ClinicalDataTable` ovunque — niente tabelle custom per pagina
  (correzione #5).
- **Container**: bianco, arrotondato (radius md), bordo sottile, ombra leggera; la tabella
  scrolla in X **dentro** il container su viewport stretti.
- **Header**: sfondo grigio molto chiaro, testo neutro scuro semibold, allineato al tipo dato.
- **Ordinamento per colonna**: colonna ordinata evidenziata (testo primario) + icona sort.
- **Filtri per colonna**: pattern "View Filters" / "Column Options" come azioni di header tabella.
- **Righe**: hover chiaro, separatori sottili; **accent bar a sinistra** per righe in stato
  particolare (info/selezione) — da `Table-layout.png`.
- **Celle stato**: `StatusBadge` coerente (vedi palette: success/warning/danger/info/neutro).
- **Progress**: barra sottile + label (es. `1/43`).
- **Azioni riga**: allineate a destra, set coerente (info `i`, kebab `⋮`, naviga `→`),
  stesse icone in tutte le tabelle.
- **Footer paginazione**: items-per-page select + range pagine + "X of Y pages (N items)".
- Densità: riga ~48px desktop, comfortable; opzione compatta per liste lunghe.

---

## 8. Regole Card e contenitori (`ClinicalCard`)

Da `Card.png`, `image.png`:

- **Un solo stile** `ClinicalCard`: bianco, radius md, bordo sottile, **ombra leggera**,
  padding interno coerente (es. 16–20px).
- **Header card**: titolo a sinistra, **riga KPI/metriche** a destra (in reference: OEE/Perf/
  Avail/Quality → in ClinicOS: parametri clinici, contatori).
- **Sub-card annidate** per gruppi (es. asset → macchine; per ClinicOS: paziente → episodi/sezioni).
- **Sezioni collassabili** quando utile (rispetta regola UX progetto: card espandibili,
  l'espansa diventa focus centrale; le altre si comprimono).
- **Pulsante modifica coerente** (ghost icon a destra dell'header) in tutte le card editabili.
- Pannello laterale **tree** (`Card.png` Topology) riusabile per gerarchie cliniche
  (struttura/reparti/stanze-posti letto).
- Storia clinica e storia trattamenti = card **centrali e primarie** (regola progetto):
  occupano la colonna principale, le altre card si comprimono.

---

## 9. Palette ClinicOS proposta — Medical Blue

> Sostituisce il rosso/crimson del reference. Rosso **solo** per alert clinici/errori.

| Token | Hex | Uso |
|-------|-----|-----|
| `--c-primary` | `#1A56DB` | Blue medical primario: tab attivo, bottoni primari, icona/label sidebar attiva, link |
| `--c-primary-hover` | `#1748B8` | Hover su elementi primari |
| `--c-primary-active` | `#123A92` | Pressed/active |
| `--c-primary-bg` | `#EBF1FE` | Light blue background: sfondo voce sidebar attiva, hover riga, fill leggeri |
| `--c-primary-border` | `#C7D8FB` | Bordo soft su superfici primarie tenui |
| `--c-bg` | `#F5F7FA` | Sfondo app neutro |
| `--c-surface` | `#FFFFFF` | Card / tabelle / header |
| `--c-sidebar-bg` | `#EEF1F6` | Sfondo sidebar neutro tenue |
| `--c-border` | `#E3E8EF` | Bordi sottili / separatori |
| `--c-text` | `#1F2A37` | Testo primario |
| `--c-text-muted` | `#6B7280` | Testo secondario / label header tabella |
| `--c-text-faint` | `#9AA4B2` | Placeholder / disabilitato |
| `--c-success` | `#0E9F6E` | Success green: esito ok, completato |
| `--c-success-bg` | `#E3F5EE` | Badge success fill |
| `--c-warning` | `#C27803` | Warning amber: attenzione, in attesa |
| `--c-warning-bg` | `#FDF6E3` | Badge warning fill / accent bar riga |
| `--c-danger` | `#E02424` | Danger red: **solo** alert clinici / errori |
| `--c-danger-bg` | `#FCE8E8` | Badge danger fill |
| `--c-info` | `#1A56DB` | Info = primario (es. badge "In corso") |

**Spacing**: scala 4px → `4 / 8 / 12 / 16 / 20 / 24 / 32`.
**Radius**: `--r-sm 6px`, `--r-md 10px`, `--r-lg 14px`.
**Shadow**: `--shadow-sm 0 1px 2px rgba(16,24,40,.06)`, `--shadow-md 0 2px 8px rgba(16,24,40,.08)`.
**Typography**: system/Inter; titoli pagina 20–22px semibold; titoli card 15–16px semibold;
body 14px; header tabella 12–13px uppercase muted; densità tabella 14px.
**Nav heights**: header 56px, L2 48px, L3 38px. **Sidebar width**: 88px.
**Table row**: 48px comfortable / 40px compact.

---

## 10. Cosa NON copiare dalle immagini reference

- ❌ **Logo** (cerchio rosso "O") e qualsiasi marchio (BAT, GD SPA, "demo.it").
- ❌ **Colore brand rosso/crimson** come primario → ClinicOS usa **blue medical**.
- ❌ **Brand identity** e tono industriale/MES.
- ❌ **Asset grafici proprietari** (render 3D macchine, icone brandizzate, robot assistant).
- ❌ Terminologia di dominio manifatturiero (OEE, Maker, Packer, Service Orders…).
- ❌ UPPERCASE aggressivo se nuoce alla leggibilità clinica.

**Cosa SÌ riutilizzare**: struttura layout Left-Top-Top, gerarchia visiva, proporzioni
sidebar, stile navigazione multilivello (underline L2/L3), stile tabelle (header/badge/
azioni/paginazione), uso dello spazio full-width, densità informativa, organizzazione
contenuti (tree laterale + card centrali, KPI in header card).

---

## 11. Mapping correzioni → regole

| # Problema attuale | Regola correttiva |
|---|---|
| 1 Sidebar stretta/poco leggibile | §3 sidebar 88px, icona+label, active card bianca |
| 2 L2 non uniforme | §5 `AppTopNav` unico, underline |
| 3 L3 non uniforme | §6 `AppSubNav` unico, variante leggera |
| 4 Diario stile custom | §6 Diario usa `AppSubNav`, rimuovi chip/tab custom |
| 5 Tabelle eterogenee | §7 `ClinicalDataTable` unico |
| 6 Layout non full-width | §4 `PageShell` full-width + gutter |
| 7 Spazio desktop sprecato | §4 full-width, densità §2 |
| 8 Tablet non ottimizzato | §4 breakpoint 1024/1180, scroll-x interno |
| 9 Breadcrumb/header duplicano info | §4 `PageHeader` no duplicazione |
| 10 Card/sezioni incoerenti | §8 `ClinicalCard` unico |
