# Feature Specification: Redesign Navigazione Scheda Paziente Tablet-First

**Feature Branch**: `003-patient-nav-redesign`

**Created**: 2026-05-24

**Status**: Draft

**Input**: Redesign navigazione Scheda Paziente con gerarchia visiva chiara tra tre livelli. Ottimizzazione per tablet 1024×768 e 1180×820.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Sidebar L1 stile Microsoft Teams (Priority: P1)

L'operatore sanitario usa la sidebar sinistra per navigare tra le macro-aree dell'applicazione (Dashboard, Pazienti, Agenda, Consegne). La sidebar deve essere compatta, iconica e con stato attivo ben riconoscibile — simile alla sidebar di Microsoft Teams.

**Why this priority**: È la base della navigazione globale. Deve essere sempre visibile e non invadente sullo spazio contenuto.

**Independent Test**: Aprire l'app su 1024×768 → verificare che la sidebar sinistra sia compatta (solo icone + label breve), che l'area attiva abbia colore di contrasto forte, e che il contenuto principale occupi il massimo spazio orizzontale disponibile.

**Acceptance Scenarios**:

1. **Given** l'operatore è su qualsiasi pagina, **When** guarda la sidebar, **Then** vede icone chiare con label breve, active state con colore forte e differenziato rispetto agli altri item.
2. **Given** viewport 1024×768, **When** la sidebar è visibile, **Then** non occupa più di 64px di larghezza e non crea overflow orizzontale.

---

### User Story 2 — Navigazione L2 orizzontale forte e prominente (Priority: P1)

L'operatore apre la Scheda Paziente e deve navigare tra le sezioni principali (Panoramica, Clinica, Diario, Moduli, Documenti). Questa è la navigazione principale della scheda e deve essere visivamente dominante: font più grande, sfondo distinto, active state evidente.

**Why this priority**: Il L2 è il menu più usato nella Scheda Paziente. Se l'operatore non lo vede subito, perde tempo. È la navigazione principale.

**Independent Test**: Aprire Scheda Paziente → verificare che la barra L2 abbia dimensioni e peso visivo superiori a L3, che la voce attiva sia immediatamente identificabile, e che la barra non venga confusa con L3.

**Acceptance Scenarios**:

1. **Given** l'operatore apre la Scheda Paziente, **When** vede la navigazione, **Then** la barra L2 è la prima cosa che cattura l'attenzione sopra il contenuto — font size, altezza e contrasto superiori a L3.
2. **Given** l'operatore clicca "Clinica", **When** la sezione cambia, **Then** "Clinica" risulta attivo con indicatore visivo forte (sfondo o bordo inferiore spesso).
3. **Given** viewport 1024×768, **When** la barra L2 è visibile, **Then** tutti i 5 item sono leggibili senza scroll orizzontale.

---

### User Story 3 — Sotto-tab L3 compatti e subordinati (Priority: P2)

Dentro la sezione "Clinica", l'operatore sceglie il sotto-contesto (Presa in Carico, Anamnesi, Diagnosi, Terapia Farmacologica, Parametri Vitali, Note & Visite). Questi sotto-tab devono essere visivamente più leggeri e più piccoli del L2 — pill o segmented tabs — e non invadere lo spazio contenuto.

**Why this priority**: L3 è contestuale e subordinato. Non deve competere visivamente con L2 né occupare troppo spazio verticale.

**Independent Test**: Aprire "Clinica" → verificare che i sotto-tab L3 siano visivamente più piccoli e leggeri di L2, che l'active state sia presente ma meno vistoso, e che il contenuto clinico parta il più in alto possibile.

**Acceptance Scenarios**:

1. **Given** l'operatore è in "Clinica", **When** vede L3, **Then** i sotto-tab hanno font size più piccolo, altezza minore e peso visivo inferiore rispetto a L2.
2. **Given** L3 mostra 6 tab, **When** viewport è 1024px, **Then** i tab sono scrollabili orizzontalmente senza overflow globale.
3. **Given** sezioni con un solo tab (Diario, Documenti), **When** L3 verrebbe mostrato, **Then** L3 non viene renderizzato (nessuna barra vuota).

---

### User Story 4 — Card paziente compatta (Priority: P2)

L'operatore visualizza la Scheda Paziente con la card informazioni (nome, età, reparto, stato). La card deve essere più compatta verticalmente per lasciare più spazio al contenuto clinico.

**Why this priority**: Meno spazio alla card = più spazio al contenuto operativo. Su tablet ogni pixel verticale conta.

**Independent Test**: Aprire Scheda Paziente → misurare altezza card → verificare che sia ≤ 72px e contenga le info essenziali su una sola riga o due righe dense.

**Acceptance Scenarios**:

1. **Given** l'operatore apre la scheda, **When** vede la card paziente, **Then** nome + info essenziali sono su max 2 righe dense, altezza totale header (card + back) ≤ 80px.
2. **Given** la card è compatta, **When** l'operatore guarda la pagina, **Then** il contenuto clinico comincia visibilmente più in alto rispetto al layout precedente.

---

### User Story 5 — Back button senza duplicazione breadcrumb (Priority: P2)

L'operatore vuole tornare alla lista pazienti. Il pulsante "Pazienti" (back) e l'eventuale breadcrumb non devono duplicarsi visivamente né occupare un'intera riga dedicata.

**Why this priority**: Riduce il rumore visivo e recupera spazio verticale prezioso.

**Independent Test**: Aprire Scheda Paziente → verificare che ci sia un solo elemento di navigazione back, integrato nella card paziente o nell'header, senza riga separata dedicata.

**Acceptance Scenarios**:

1. **Given** l'operatore è nella Scheda Paziente, **When** cerca come tornare alla lista, **Then** c'è un solo elemento back visibile (non breadcrumb + back button separati).
2. **Given** l'elemento back è presente, **When** l'operatore lo clicca, **Then** torna alla lista pazienti.

---

### Edge Cases

- Sezioni con un solo sotto-tab (Diario, Documenti): L3 non viene mostrato.
- Nome paziente molto lungo: troncato con ellissi nella card compatta.
- Viewport 1024×768 con molti tab L3 (Clinica: 6 tab): scroll orizzontale solo sul L3, non sulla pagina.
- Badge numerici su L2 (es. "Clinica [3]"): devono restare leggibili con nuovi stili.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La sidebar L1 DEVE avere larghezza ≤ 64px e mostrare icone con label breve; active state con colore di contrasto forte.
- **FR-002**: La barra L2 DEVE avere font size, altezza e peso visivo superiori a L3 — deve essere la gerarchia dominante nella Scheda Paziente.
- **FR-003**: La barra L2 DEVE mostrare tutti i 5 gruppi (Panoramica, Clinica, Diario, Moduli, Documenti) senza scroll orizzontale su 1024px.
- **FR-004**: Il tab attivo L2 DEVE avere un indicatore visivo forte (sfondo solido o bordo inferiore ≥ 3px).
- **FR-005**: La barra L3 DEVE avere font size e altezza inferiori a L2, stile pill o segmented tab, active state presente ma subordinato.
- **FR-006**: La barra L3 DEVE essere scrollabile orizzontalmente senza overflow globale quando i tab non entrano nel viewport.
- **FR-007**: La barra L3 NON DEVE essere renderizzata per sezioni con un solo tab (Diario, Documenti).
- **FR-008**: La card paziente DEVE avere altezza ≤ 80px (incluso back button integrato) e mostrare nome + info essenziali.
- **FR-009**: Il back button "Pazienti" DEVE essere integrato nell'header paziente — non deve esistere come riga separata.
- **FR-010**: I tre livelli di navigazione DEVONO essere visivamente distinguibili: nessun livello deve sembrare uguale a un altro.
- **FR-011**: Il contenuto clinico DEVE iniziare più in alto rispetto al layout attuale, massimizzando lo spazio verticale operativo.
- **FR-012**: Il layout DEVE funzionare senza overflow orizzontale globale su 1024×768 e 1180×820.

### Key Entities

- **Livello 1 (L1)**: Sidebar globale — icone macro-aree (Dashboard, Pazienti, Agenda, Consegne). Larghezza fissa ≤ 64px.
- **Livello 2 (L2)**: Barra navigazione principale Scheda Paziente — 5 gruppi (Panoramica, Clinica, Diario, Moduli, Documenti). Navigazione primaria.
- **Livello 3 (L3)**: Sotto-tab contestuali — visibili solo per gruppi con >1 tab. Stile pill/segmented.
- **Header Paziente**: Card compatta — nome, info essenziali, back button integrato. Max 80px altezza.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Su viewport 1024×768, lo spazio verticale per il contenuto clinico aumenta di almeno 60px rispetto al layout attuale.
- **SC-002**: Un operatore identifica correttamente il livello di navigazione attivo (L1/L2/L3) entro 3 secondi dalla prima apertura della Scheda Paziente.
- **SC-003**: Nessun overflow orizzontale su tutti i viewport target (1024×768, 1180×820).
- **SC-004**: Il back button e il breadcrumb non si duplicano — un solo elemento di navigazione "indietro" visibile.
- **SC-005**: La build dell'applicazione completa senza errori dopo le modifiche.
- **SC-006**: Tutti i tab L2 e L3 rimangono navigabili e mostrano il contenuto corretto dopo il redesign.

## Assumptions

- Frontend-only: nessuna modifica a backend, Prisma, API, VITE_API_URL.
- I componenti `PageTabs` e `SectionTabs` esistenti in `NavComponents.tsx` vengono aggiornati stilisticamente — non riscritti da zero.
- La struttura `TAB_GROUPS` e `TabId` esistente viene preservata — solo CSS/stili modificati.
- La sidebar L1 è in `App.tsx` — modifiche limitate a dimensioni e stile active state.
- I badge numerici su L2 vengono preservati (diagnosi count, farmaci, ecc.).
- UI in italiano — nessuna modifica ai label.
- Viewport target: 1024×768 (minimo), 1180×820 (prioritario).
