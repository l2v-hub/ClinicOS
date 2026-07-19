# Feature Specification: Ottimizzazione Navigazione Tablet-First

**Feature Branch**: `002-tablet-navigation`

**Created**: 2026-05-23

**Status**: Draft

**Input**: User description: "Ottimizzazione navigazione tablet-first di ClinicOS. Rivedere la navigazione grafica perché l'attuale struttura non è ottimale per tablet. Sidebar principale resta primo livello. Secondo livello diventa navigazione orizzontale. Terzo livello in sotto-tab compatti."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Navigazione macro-aree da sidebar (Priority: P1)

Come operatore su tablet, voglio accedere alle macro-aree dell'applicazione tramite la sidebar sinistra senza perdere spazio utile sul contenuto.

**Why this priority**: La sidebar è il punto di ingresso principale. Se non funziona su tablet, tutto il resto è inaccessibile.

**Independent Test**: Aprire l'app su tablet (o finestra ~768-1024px). La sidebar deve essere visibile, compatta, e permettere di cambiare macro-area con un tocco. Il contenuto principale deve occupare la maggior parte dello schermo.

**Acceptance Scenarios**:

1. **Given** l'operatore apre l'app su tablet, **When** guarda la sidebar, **Then** la sidebar è compatta, occupa poco spazio orizzontale, e mostra le macro-aree con icone o label brevi
2. **Given** l'operatore è in una qualsiasi sezione, **When** tocca una voce della sidebar, **Then** naviga nella macro-area corrispondente senza scroll orizzontale né layout schiacciato

---

### User Story 2 - Secondo livello orizzontale (Priority: P1)

Come operatore, quando entro in una macro-area (es. Scheda Paziente), voglio vedere il secondo livello di navigazione come tab orizzontali chiari sopra il contenuto, non come una seconda sidebar laterale.

**Why this priority**: Il secondo livello attuale occupa spazio laterale prezioso. Su tablet questo comprime il contenuto operativo.

**Independent Test**: Aprire Scheda Paziente su tablet. Sotto l'header deve comparire una barra orizzontale con tab (Clinica, Dimissione, Documenti, ecc.). Nessuna seconda colonna sidebar a sinistra. Il contenuto occupa tutta la larghezza disponibile dopo la sidebar principale.

**Acceptance Scenarios**:

1. **Given** l'operatore entra in Scheda Paziente, **When** guarda l'interfaccia, **Then** vede tab orizzontali sopra il contenuto, non una seconda sidebar
2. **Given** l'operatore tocca un tab orizzontale (es. "Clinica"), **Then** il contenuto cambia e il tab selezionato è visivamente distinto
3. **Given** ci sono molti tab e lo schermo è stretto, **When** i tab non entrano tutti, **Then** sono scrollabili orizzontalmente senza wrap su più righe

---

### User Story 3 - Sotto-tab compatti per terzo livello (Priority: P2)

Come operatore dentro una sezione complessa (es. tab "Clinica" → sotto-sezione "Terapia Farmacologica"), voglio navigare tra sotto-sezioni con controlli compatti (sotto-tab, segmented control) senza aprire nuove sidebar.

**Why this priority**: Sezioni come Clinica hanno molte sotto-sezioni. Senza sotto-tab compatti si crea una navigazione confusa o si perde spazio.

**Independent Test**: Aprire Scheda Paziente → tab Clinica → verificare che le sotto-sezioni (Diario, Terapia, Parametri, ecc.) siano navigabili con controlli orizzontali compatti dentro la sezione, non con una terza sidebar.

**Acceptance Scenarios**:

1. **Given** l'operatore è nel tab "Clinica", **When** guarda i controlli di navigazione interni, **Then** vede sotto-tab o segmented control orizzontali, non una sidebar aggiuntiva
2. **Given** l'operatore seleziona una sotto-sezione, **Then** il contenuto cambia inline senza cambiare il layout globale

---

### User Story 4 - Scheda Paziente più leggibile (Priority: P2)

Come operatore, voglio che la Scheda Paziente usi più spazio per card, tabelle e form, eliminando spazio sprecato dalla navigazione.

**Why this priority**: È la schermata più usata. Più spazio al contenuto = meno scroll, meno fatica operativa.

**Independent Test**: Aprire Scheda Paziente → selezionare un tab → misurare visivamente che la larghezza del contenuto principale sia almeno 70% della viewport su tablet.

**Acceptance Scenarios**:

1. **Given** l'operatore apre Scheda Paziente su tablet (768px+), **When** guarda la sezione contenuto, **Then** il contenuto occupa almeno il 70% della larghezza disponibile
2. **Given** l'operatore compila un form (es. nuova terapia), **Then** i campi non sono compressi e sono facilmente toccabili

---

### User Story 5 - Modello di navigazione unificato (Priority: P2)

Come operatore, voglio che Agenda, Terapia, Parametri, Diario e Documenti usino lo stesso modello di navigazione (sidebar + tab orizzontali + sotto-tab) per non dover imparare pattern diversi per ogni sezione.

**Why this priority**: Consistenza riduce l'errore operativo e l'apprendimento.

**Independent Test**: Navigare in Agenda, poi in Terapia, poi in Parametri. Il pattern di navigazione deve essere identico: sidebar a sinistra, tab orizzontali sopra, controlli interni per sotto-sezioni.

**Acceptance Scenarios**:

1. **Given** l'operatore naviga tra macro-aree diverse, **When** entra in ognuna, **Then** trova sempre sidebar + tab orizzontali + sotto-tab (mai una seconda sidebar laterale)
2. **Given** una nuova sezione viene aggiunta in futuro, **Then** può adottare il pattern unificato senza eccezioni

---

### Edge Cases

- Cosa succede se il tablet è in portrait (larghezza ~768px) e i tab orizzontali sono troppi? → scroll orizzontale, niente wrap
- Cosa succede se la sidebar è collassata? → i tab orizzontali si espandono a tutta larghezza
- Cosa succede su desktop (>1280px)? → il layout funziona anche su desktop senza regressioni

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Il sistema DEVE presentare la sidebar principale come unico primo livello di navigazione
- **FR-002**: Il sistema DEVE presentare il secondo livello di navigazione come barra di tab orizzontali posizionata sopra il contenuto, non lateralmente
- **FR-003**: Il sistema NON DEVE usare una seconda sidebar laterale per il secondo livello di navigazione in nessuna sezione
- **FR-004**: Il sistema DEVE gestire il terzo livello (e successivi) con sotto-tab, segmented control o dropdown interni alla sezione corrente
- **FR-005**: La barra dei tab orizzontali DEVE essere scrollabile orizzontalmente quando i tab non entrano nello spazio disponibile
- **FR-006**: Il sistema DEVE applicare il modello sidebar + tab orizzontali + sotto-tab a tutte le sezioni principali: Scheda Paziente, Agenda, Terapia, Parametri, Diario, Documenti
- **FR-007**: L'header e la navigazione complessiva NON DEVONO occupare più del 20% dell'altezza della viewport su tablet
- **FR-008**: Il contenuto operativo principale DEVE occupare almeno il 70% della larghezza disponibile (dopo la sidebar) su tablet
- **FR-009**: Il sistema DEVE compilare senza errori TypeScript dopo le modifiche (`npm run build` passa)

### Key Entities

- **Sidebar (livello 1)**: Navigazione macro-aree — Dashboard, Pazienti, Agenda, Impostazioni
- **Tab Bar orizzontale (livello 2)**: Navigazione sezioni dentro una macro-area — es. in Paziente: Anagrafica, Clinica, Dimissione, Documenti
- **Sotto-tab / Segmented Control (livello 3)**: Navigazione sotto-sezioni interne — es. in Clinica: Diario, Terapia, Parametri, Medicazioni

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Su tablet (768–1024px), il contenuto principale occupa almeno il 70% della larghezza disponibile dopo la sidebar in ogni sezione
- **SC-002**: Nessuna sezione dell'app mostra una seconda colonna sidebar laterale dopo le modifiche
- **SC-003**: Un operatore può navigare dall'apertura dell'app fino a una sotto-sezione specifica (es. Clinica → Terapia Farmacologica) in 3 tocchi o meno
- **SC-004**: Il modello sidebar + tab orizzontali + sotto-tab è applicato in modo identico a tutte le 5 sezioni principali (Scheda Paziente, Agenda, Terapia, Parametri, Diario)
- **SC-005**: La build TypeScript completa senza errori dopo ogni modifica
- **SC-006**: Nessuna regressione funzionale nelle sezioni modificate (le funzionalità esistenti continuano a funzionare)

## Assumptions

- La sidebar esistente (primo livello) non viene ridisegnata — solo il secondo e terzo livello cambiano pattern
- Il breakpoint tablet di riferimento è 768px–1024px; desktop (>1024px) deve continuare a funzionare senza regressioni
- Non si richiedono animazioni complesse — transizioni semplici (fade, slide) vanno bene
- Il pattern "tab orizzontali" va applicato anche dove attualmente esistono tab verticali o secondary nav hidden inside components
- La palette colori, i font e il design system esistente rimangono invariati

## Out of Scope

Le seguenti aree sono esplicitamente escluse da questa feature:

- **Backend**: nessuna modifica a file sotto `backend/`
- **Prisma**: nessuna modifica a schema, migration, o seed
- **Configurazione API**: nessuna modifica a `VITE_API_URL` o variabili d'ambiente
- **Logica dati**: nessuna modifica a fetch, state management, API calls, o trasformazioni dati
- **Nuove funzionalità cliniche**: nessuna aggiunta di campi clinici, nuovi tab di contenuto, o nuovi flussi operativi
