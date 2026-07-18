# ClinicOS — Restyle: prompt master (loop fino a parità visiva)

**Riferimento visivo unico:** `frontend/design-mockup.html` (apribile nel browser, contiene TUTTE le
schermate navigabili: Dashboard, Pazienti, Scheda paziente [Panoramica/Clinica/Diario/Moduli/Documenti],
Parametri, Consegne, Agenda, Wizard). È la **fonte di verità**: colori, layout, tipografia, spaziature,
badge e stati devono combaciare con esso.

**Regola d'oro:** intervento **solo CSS/stile**. NON modificare markup JSX, logica, backend, Prisma, API,
`VITE_API_URL`. Gli errori dati (es. "Errore nel caricamento del diario") NON sono difetti di stile: ignorali.
Il **rosso** resta riservato agli alert clinici/errori. Usa i token di `frontend/src/clinicos-restyle.css`
via `var(--…)`; sovrascrivi gli HEX hard-coded in `App.css`/`app-additions.css` dove divergono.

---

## Istruzione per Claude Code (loop)

> Obiettivo: rendere l'app **visivamente identica** a `frontend/design-mockup.html`, schermata per schermata,
> iterando finché non combacia su **colori, layout e impaginazione**.
>
> Procedi in **cicli**. Per ogni ciclo:
> 1. Apri `frontend/design-mockup.html` e la schermata corrispondente dell'app (avvia `npm run dev`).
> 2. Cattura uno **screenshot** di entrambe alla stessa larghezza (1440px) e confrontale.
> 3. Elenca le differenze concrete (colore, dimensione, spaziatura, raggio, ombra, badge, stato, allineamento).
> 4. Applica le correzioni **solo nelle regole CSS** (`App.css` / `app-additions.css`), usando i `var(--…)`.
> 5. Ricostruisci (`cd frontend && npm run build`) e **ri-screenshotta**: se restano differenze, ripeti il ciclo.
> 6. Passa alla schermata successiva solo quando quella corrente **combacia**.
>
> Ordine schermate: **Dashboard → Pazienti → Scheda paziente → Consegne → Agenda → Parametri → Wizard**.
> Al termine di ogni schermata allega gli screenshot prima/dopo + mockup come evidenza.
> Rispetta il Quality Gate (`CLAUDE.md`): task-contract → implementazione → validation-report.
> Non dichiarare "done" su una schermata senza build verde e screenshot che dimostri la parità.

---

## Checklist dei difetti già individuati (usala come punto di partenza di ogni ciclo)

### Dashboard
- KPI card: NIENTE bordo-sinistro colorato → icona in **pastiglia tinta** 38×38 + chevron; card compatte
  (`padding:20px 22px`, `border-radius:16px`); numero 38px/800; lo stato colora icona+numero, non il fondo.
- Stat card e progress card: ridurre il vuoto verticale; barre `height:9px` con gradient (`--emerald`/`--blue`).
- Aggiungere **banda alert clinici** in cima (`--red-bg`, `border-left:5px solid var(--red)`), se criticità.
- Banner "Prossimo appuntamento" navy + "Agenda di oggi": raggi 18px, ora mono muted.

### Pazienti
- **Header tabella NON navy** → `background:var(--surface-raised)`, label 12px/800 uppercase muted.
- Avatar iniziali quadrato 44×44 `border-radius:12px` (`--indigo-bg`/`--blue`).
- Badge stato: Ricoverato `--emerald-bg`/`--teal`, Ambulatoriale neutro, Critico `--red`; chip allergie `--amber`/⚠.
- `.mrn-tag` mono su `--indigo-bg`; card contenitore `border-radius:18px` + ombra.

### Scheda paziente
- **Manca header card**: avatar 56×56, nome 24px/800, badge stato, meta muted, bottoni Stampa / Invio in PS.
- **Manca banda sicurezza**: Allergie (`--red`) + Rischi (`--amber`) affiancati, sempre in cima a Panoramica.
- **Header tabelle scure (Diario)** → chiari come Pazienti.
- Diario → **card** con `border-left:4px` colore-ruolo (Medico `--blue`, Infermiere `--purple`, OSS `--emerald`,
  Fisio `--amber`), badge ruolo pill, non tabella.
- Tab L2 come pill (attivo `--blue`); righe "Dati ingresso" più compatte; mini-card riepilogo in grid uniforme.

### Consegne
- Card: `border-left:5px solid` per priorità (Urgente `--red`, Alta `--amber`, Normale `--emerald`), ombra, raggi 16px.
- Aggiungere avatar 40×40; badge priorità colorati (non grigi); assegnatario su riga con `border-top`.
- Contenuto entro il max-width di pagina.

### Agenda
- Racchiudere ogni blocco terapia in **card** (`border-radius:16px`, overflow hidden); testata viola con
  `border-left:5px solid var(--purple)` + pill `X/Y erogate` a destra.
- Slot più compatti; ora mono muted; pill stato colorate; rimuovere i "+" fantasma tra le righe.

### Parametri
- Contenitore card `border-radius:18px`; header riga `--surface-raised`; input `height:44px` `1.5px` bordo,
  focus blu; `--critico` (SpO₂<92) `--red`, `--attenzione` (TC≥37,5) `--amber`; bottone Salva → "✓ Salvato"
  `--emerald-bg`/`--teal`; barra avanzamento `--emerald`.

### Wizard ingresso
- Stepper: cerchi 34px (attivo `--blue` pieno, completato `--emerald-bg`/spunta); input 48px raggio 11px, focus blu.
- Bottoni: primario `--blue`, secondari neutri.

### Ricorrente su TUTTE le schermate
- **Nessun header-tabella scuro** (retaggio vecchio stile): sempre chiaro.
- Contenuti entro il max-width di pagina, non a tutta larghezza.
- Font `Public Sans` (mono `JetBrains Mono`); rosso solo per alert clinici.
