# ClinicOS — Design System Canonico (v0.1)

Sorgente di verita' per i pattern UI condivisi. Ogni nuovo componente o modifica visiva **deve**
riusare un pattern qui definito prima di inventarne uno nuovo. Se un pattern qui descritto non
corrisponde piu' al codice reale, il codice va corretto per allinearsi (o questo file aggiornato
con un motivo esplicito) — non lasciarli divergere.

Nato dall'iniziativa "design system globale" (2026-08-08): il percorso Operatore
Dashboard → Pazienti → Cartella paziente e' stato il primo flusso analizzato (vedi
`artifacts/task-validation/` dei cicli 12+ per l'evidenza). Le entry sotto canonicalizzano il
MIGLIOR pattern gia' esistente nel codice (non un'invenzione da zero), scartando le varianti
duplicate/morte trovate durante l'analisi.

Ogni pattern definisce: **stile visivo**, **comportamento**, **interazione**, **stati**,
**comportamento responsive**, **quando usarlo**.

---

## Bottoni

**Classe base**: sempre una combinazione `{ruolo} {dimensione}`, mai una dimensione da sola.

| Ruolo                        | Classe                                              | Uso                                                   |
| ---------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| Azione primaria (crea/salva) | `.btn-success`                                      | Salvataggio, creazione, conferma positiva             |
| Azione primaria (neutra)     | `.btn-primary`                                      | Azione principale non di salvataggio (es. "Invio PS") |
| Azione secondaria/annulla    | `.btn-secondary`                                    | Annulla, chiudi, azione non distruttiva alternativa   |
| Azione distruttiva           | `.btn-danger`                                       | Elimina, azioni irreversibili                         |
| Link testuale                | `.link-btn`                                         | Navigazione inline, "Vedi tutto"                      |
| Solo icona                   | `.icon-btn` + `--sm`/`--edit`/`--danger`/`--inline` | Azioni compatte in righe di tabella/liste             |

- **Stato**: `.btn-{ruolo} .btn-sm` per varianti compatte (header di sezione). **`.btn-sm` da solo,
  senza un ruolo, e' VIETATO** — `.btn-sm` in CSS imposta solo dimensione/padding, non
  colore/bordo: usato da solo produce un bottone non stilizzato (bug, non pattern). Se un bottone
  header deve essere "neutro" (non colorato), usa `.btn-secondary btn-sm`, mai `.btn-sm` nudo.
- **Icona-only**: usa sempre `icon-btn icon-btn--sm` + un modificatore semantico
  (`--edit`/`--danger`). **`.btn-icon`/`.btn-icon--danger` sono classi FANTASMA — non esistono in
  nessun CSS del progetto e vanno sostituite ovunque compaiano.**
- **Stati**: `disabled` sempre visivamente distinto (opacita' ridotta, cursore not-allowed);
  `:hover` scurisce leggermente il colore di base; focus da tastiera visibile (outline).
- **Responsive**: target di tocco minimo 44px su viewport ≤1024px.

## Badge / pillole di stato

**Pattern canonico: `badge badge--{semantica}`** (`App.css`, gia' il piu' diffuso e con la
semantica piu' chiara). Semantica colore (coerente in tutto il repo):

- `--red` — allarme clinico reale/gravita' alta/irreversibile (MAI per decorazione)
- `--amber` — attenzione/verifica necessaria, non un allarme clinico
- `--green`/`--emerald` — ok/nessuna criticita'/completato
- `--blue` — informativo/neutro
- `--gray` — inattivo/archiviato

**Deprecati, da migrare verso `badge--*` quando si tocca quel codice**: `stato-pill`,
`consegna-priorita-badge`, `agenda-stato-pill`, `status-badge` — 5 implementazioni CSS separate
dello stesso concetto, ciascuna con font-size/padding/radius propri. Non introdurre nuovi usi di
queste 4; nuovo codice usa sempre `badge badge--*`.

- **Stile**: tutte le varianti colore devono usare i token esistenti (`var(--red)`, `var(--blue)`,
  ecc.), mai esadecimale hardcoded — `badge--blue/green/amber` oggi violano questa regola e vanno
  corrette (vedi Ciclo 12).
- **Quando usarlo**: qualunque indicatore di stato/gravita' a singola parola o numero breve. Per
  liste con dettaglio (piu' righe di testo), preferire un banner (`.coverage-alert`) con un badge
  dentro, non un badge esteso a contenere frasi.

## Card

**Pattern canonico**: `--card-radius` (16px) per le card "riassuntive/dashboard"
(`stat-card`, `kpi-alert-card`), `--clinical-card-radius` (8px) per le card dentro i tab clinici
della cartella (`clinical-card`). Sono due contesti visivi legittimamente diversi (dashboard vs.
scheda clinica densa), non un errore — non consolidare in un unico raggio, ma non introdurne un
terzo: `--radius` (12px), oggi usato solo da `pt-header-card`, va migrato verso uno dei due sopra
la prossima volta che si tocca quel componente.

- **Stile**: `box-shadow: var(--shadow-card)`, bordo 1px `var(--border)`, padding 20-22px (card
  riassuntive) o 16px (card cliniche dense).
- **Interazione**: se cliccabile, `cursor: pointer` + `role="button"` + `tabIndex={0}` + `onKeyDown`
  (Invio/Spazio) — pattern gia' stabilito nel Ciclo 11, obbligatorio per OGNI card interattiva
  futura, non solo per `kpi-alert-card`.

## Header di pagina

**Pattern canonico: `PageHeader`** (`components/shared/PageHeader.tsx`) — breadcrumb +
`<h1>` + azioni. Gia' usato da Dashboard e Lista pazienti.

`PatientCompactHeader` (cartella paziente) oggi rompe questo pattern (nessun breadcrumb, nessun
`<h1>`, tipografia diversa) — e' il gap piu' visibile del percorso Operatore. **Non ancora
migrato in questo ciclo** (richiede una scelta di design piu' ampia, dato che porta gia' avatar +
azioni fisse specifiche del paziente): prossimo passo del design system, non incluso nel Ciclo 12.

## Stati vuoti / caricamento

**Pattern canonico**: componente `EmptyState`/`LoadingState` (`components/operator/cartella/shared.tsx`),
classe `.cr-empty`. Non scrivere `<p className="cr-empty">...</p>` inline — riusare il componente,
cosi' un cambio di stile si propaga ovunque invece di richiedere una modifica per occorrenza (oggi
27 occorrenze inline in `PatientDetail.tsx`, migrazione progressiva quando si tocca ogni sezione).

`.empty-state-card` era definita 2 volte in modo contraddittorio. `App.css` fa
`@import './app-additions.css'` alla riga 7 — quindi le regole di `app-additions.css` (bordo
tratteggiato, layout flex, slot icona `__ico`, usata da 5 componenti) vengono inserite PRIMA e
la definizione piu' semplice scritta direttamente in `App.css:3728` (bordo solido, nessun flex,
nessuno slot icona) vince a parita' di specificita' per ordine di sorgente — **silenziosamente
disattivando la versione piu' completa in ogni schermata che la usa**. Corretto nel Ciclo 12:
rimossa la definizione duplicata in `App.css`, mantenuta quella di `app-additions.css` come unica
canonica (era gia' la versione pensata per supportare un'icona, semplicemente non renderizzava
mai).

---

## Ciclo 12 — primi difetti oggettivi corretti (non preferenze estetiche)

Vedi `artifacts/task-validation/loop-ux-ciclo-12-design-system-bugfix/` per contract, evidenza ed
esito. Corretti perche' sono BUG (comportamento non intenzionale), non scelte di design discutibili:

1. `.empty-state-card` — doppia definizione contraddittoria, risultato dipendente dall'ordine di
   cascata CSS, non dall'intento.
2. `.btn-icon`/`.btn-icon--danger` — classi usate in `EsamiConsulenzeTab.tsx` ma mai definite in
   nessun CSS: bottoni Modifica/Elimina renderizzati senza stile in produzione.
3. `badge--blue/green/amber` — colori esadecimale hardcoded invece dei token esistenti
   (`--blue`/`--emerald`/`--amber`), unica famiglia di badge a violare la regola sopra.
4. `PatientList.tsx` — `var(--red-50, #fef2f2)`/`var(--red-700, #b91c1c)` mai definite in nessun
   CSS: il fallback hex hardcoded viene sempre usato, disallineato dal token `--red`/`--red-bg`
   reale usato per lo stesso significato ("errore") ovunque altro nell'app.

## Ciclo 13 — sicurezza clinica: reset stato form/modale al cambio paziente

Vedi `artifacts/task-validation/loop-ux-ciclo-13-patient-switch-safety/` per contract, evidenza ed
esito. `PatientDetail.tsx` non ha `key={paziente.id}` in `App.tsx`: cambiare paziente mentre la
cartella e' gia' aperta (ricerca globale, Agnos, `goToPazienteByNome`) riusa la stessa istanza. Un
`useEffect` esistente resettava gia' la navigazione (`tab`/`activeGroup`/`diarioFilter`) ma non i
22 stati di form/modale per-sezione — corretto aggiungendo i 22 reset mancanti allo stesso effect.

Scoperta collaterale non corretta in questo ciclo (categoria diversa — z-index/focus dei modali,
non reset di stato): i modali full-overlay (`.modal-overlay`, z-index 1000) bloccano fisicamente i
click sullo sfondo inclusa la ricerca globale, ma la scorciatoia `Ctrl+K` resta attiva e apre
`.search-overlay` (z-index 300) VISIVAMENTE SOTTO il modale gia' aperto — incliccabile, comportamento
confuso ma non pericoloso per i dati.

## Ciclo 14 — Ctrl+K ignorato quando un modale clinico e' gia' aperto

Vedi `artifacts/task-validation/loop-ux-ciclo-14-ricerca-globale-ignorata-quando-un-modale-clinico-e-gia-aperto/`
per contract, evidenza ed esito. Scoperta collaterale del Ciclo 13 (sopra) corretta: guard
`document.querySelector('.modal-overlay, .therapy-modal-overlay')` in cima all'handler `onKey` di
`Ctrl+K` in `App.tsx` — se un modale e' gia' presente nel DOM, la scorciatoia non fa nulla, coerente
col click col mouse (gia' bloccato dallo stesso modale).

## Ciclo 15 — il bottone indietro della cartella mostra dove va davvero

Vedi `artifacts/task-validation/loop-ux-ciclo-15-il-bottone-indietro-della-cartella-mostra-dove-va-davvero/`
per contract, evidenza ed esito. `App.tsx` gia' calcolava l'etichetta corretta
(`backLabel={NAV_LABELS[prevNavKeyRef.current ?? 'pazienti']}`) ma `PatientDetail`/
`PatientCompactHeader` la scartavano silenziosamente — il tooltip diceva sempre "Torna alla lista"
anche quando il click reale (`window.history.back()`) torna al paziente precedente (scenario del
Ciclo 13) o a un'altra schermata. Propagato `backLabel` end-to-end; colto anche un gap di
accessibilita' collaterale nello stesso elemento (`<div onClick>` -> `<button type="button">`).

## Ciclo 16 — rimossa la coppia Salva/Annulla duplicata in Profilo

Vedi `artifacts/task-validation/loop-ux-ciclo-16-rimuovi-la-coppia-salva-annulla-duplicata-in-profilo/`
per contract, evidenza ed esito. In modifica, `renderProfilo()` mostrava due coppie Salva/Annulla
funzionalmente identiche: una nell'header sezione (bare `btn-sm`, violazione della regola bottoni),
l'altra nel footer `InlineForm` (gia' corretta). L'header ora e' `undefined` in modifica — resta
solo la coppia del footer.

## Backlog aperto — differito a cicli successivi (deliberatamente)

Trovati dall'analisi ma NON corretti qui perche' richiedono un cambio di comportamento (non solo
CSS) o una scelta di design piu' ampia:

- `PatientList` perde ricerca/filtro/scroll ad ogni riapertura cartella (stato non sollevato).
- `PatientCompactHeader` non allineato al pattern `PageHeader`.
- 4 implementazioni parallele di tab bar (2 morte in CSS, mai importate) con indicatori "attivo"
  visivamente diversi (pillola piena vs sottolineatura) nello stesso percorso di navigazione.
- 5 sistemi di badge/pillola di stato paralleli, da consolidare su `badge--*`.
- `btn-sm` isolato (24 occorrenze, incluso il bottone "Modifica" di Profilo) — ognuna richiede una
  scelta editoriale (quale ruolo/colore assegnare), non un fix meccanico.
