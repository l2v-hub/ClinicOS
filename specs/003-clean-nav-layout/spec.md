# Feature Specification: Clean Navigation Layout

**Feature Branch**: `007-clean-nav-layout`

**Created**: 2026-05-24

**Status**: Draft

**Input**: Redesign navigazione e layout ClinicOS con stile pulito tipo desktop console, ottimizzato per tablet.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Navigazione a 3 livelli compatta (Priority: P1)

Un operatore sanitario apre la Scheda Paziente su tablet. Vede subito la sidebar compatta a sinistra, la navigazione orizzontale principale (secondo livello) ben visibile sotto l'intestazione paziente, e i sotto-tab contestuali (terzo livello) sotto di essa. Il contenuto clinico è visibile senza scorrere.

**Why this priority**: Ridurre il numero di gesti necessari per raggiungere il contenuto operativo è il beneficio principale. Tutto il resto dipende da questa struttura.

**Independent Test**: Aprire la Scheda Paziente su tablet 1024x768 e verificare che header, L2 nav e L3 nav siano tutti visibili senza scroll, con il contenuto che inizia entro 160px dall'alto.

**Acceptance Scenarios**:

1. **Given** un operatore è sulla lista pazienti, **When** clicca su un paziente, **Then** vede la Scheda Paziente con sidebar L1 (≤64px larghezza), header paziente compatto (≤56px altezza), nav L2 dominante (≥40px altezza), nav L3 leggera (≤32px altezza) e il contenuto che inizia entro 160px totali dal top della content area.
2. **Given** l'operatore è sulla Scheda Paziente, **When** naviga tra le tab L2 (Panoramica, Clinica, Diario, Terapia, Parametri, Documenti), **Then** il cambio di sezione è visibile e il contesto si aggiorna senza ricaricare la pagina.
3. **Given** l'operatore è su una tab L2 che ha sotto-sezioni, **When** clicca una tab L3, **Then** il contenuto cambia e la tab L3 attiva è visivamente distinta dalle altre.

---

### User Story 2 - Sidebar L1 compatta e non invasiva (Priority: P2)

Un operatore usa la sidebar sinistra per navigare tra le macro-aree dell'app (Dashboard, Pazienti, Parametri, Consegne, Agenda, Note) senza perdere spazio orizzontale utile.

**Why this priority**: La sidebar è permanente su tablet; deve consumare il minimo spazio possibile pur restando usabile con il tocco.

**Independent Test**: Verificare che la sidebar occupa ≤64px in larghezza, tutte le 6 voci sono visibili, e il click su ciascuna naviga alla sezione corretta.

**Acceptance Scenarios**:

1. **Given** l'app è aperta su tablet 1024x768, **When** l'operatore guarda la sidebar, **Then** è visibile in forma di rail con icone (e opzionalmente label brevi), larghezza ≤64px, e non copre il contenuto principale.
2. **Given** l'operatore è su "Pazienti", **When** clicca "Agenda" nella sidebar, **Then** naviga all'Agenda e la voce "Agenda" risulta attiva nella sidebar.
3. **Given** l'operatore è su una pagina, **When** la voce sidebar corrispondente è attiva, **Then** mostra uno stato attivo chiaro (evidenziazione colore o indicatore laterale).

---

### User Story 3 - Header paziente compatto (Priority: P3)

L'intestazione della Scheda Paziente mostra le informazioni essenziali (nome, età, reparto, stato) in forma compatta, senza occupare spazio eccessivo.

**Why this priority**: L'header è sempre visibile; ogni pixel risparmiato aggiunge spazio al contenuto clinico.

**Independent Test**: Misurare l'altezza dell'header paziente su tablet: deve essere ≤56px e contenere nome, età/data nascita, reparto.

**Acceptance Scenarios**:

1. **Given** l'operatore apre la Scheda Paziente, **When** guarda l'header, **Then** vede nome completo, età o data di nascita, reparto/unità — tutto in una singola riga o al massimo due righe compatte.
2. **Given** il nome paziente è molto lungo, **When** viene visualizzato nell'header, **Then** viene troncato con ellissi senza rompere il layout.
3. **Given** l'header è visibile, **When** l'operatore scorre il contenuto clinico, **Then** l'header rimane fisso (sticky) in cima alla viewport.

---

### User Story 4 - Ottimizzazione tablet 1024x768 e 1180x820 (Priority: P4)

L'intera interfaccia si adatta senza overflow orizzontale alle risoluzioni tablet target, con elementi touch-friendly (target minimo 44px).

**Why this priority**: Requisito tecnico fondamentale; senza di esso il layout non è utilizzabile sul dispositivo target.

**Independent Test**: Aprire l'app a 1024x768 nel browser dev tools e verificare: nessuna scrollbar orizzontale, nessun elemento fuori schermo, tutti i controlli interattivi ≥44px in altezza.

**Acceptance Scenarios**:

1. **Given** l'app è a 1024x768, **When** si naviga in tutte le sezioni principali, **Then** non appare mai scrollbar orizzontale.
2. **Given** l'app è a 1180x820, **When** si usa la navigazione L1/L2/L3, **Then** tutti gli elementi sono cliccabili senza zoom e i touch target sono ≥44px in altezza.
3. **Given** il build viene eseguito con `npm run build`, **When** il processo termina, **Then** non ci sono errori TypeScript o di compilazione.

---

### Edge Cases

- Cosa succede se il nome paziente supera 40 caratteri nell'header compatto? (troncamento con ellissi)
- Come si comporta la L3 nav quando le tab sono più di 6? (scroll orizzontale interno alla L3 bar)
- Come si comporta il layout se il browser è in modalità portrait su tablet (768x1024)? (fuori scope per questa iterazione)
- Cosa mostra la sidebar se nessuna macro-area è attiva (es. pagina 404)? (nessuna voce evidenziata)

## Requirements _(mandatory)_

### Functional Requirements

**Struttura Layout**

- **FR-001**: Il layout DEVE usare una sidebar fissa a sinistra (L1) con larghezza ≤64px contenente le 6 macro-aree: Dashboard, Pazienti, Parametri, Consegne, Agenda, Note.
- **FR-002**: Il layout DEVE mostrare una barra di navigazione orizzontale principale (L2) nella zona superiore del contenuto, con altezza ≥40px e font visibilmente più grande della L3.
- **FR-003**: Il layout DEVE mostrare una barra di sotto-tab contestuale (L3) sotto la L2, con altezza ≤32px e font più piccolo della L2.
- **FR-004**: L'header paziente DEVE essere compatto (altezza ≤56px) e contenere: nome completo, età o data di nascita, reparto/unità.
- **FR-005**: La somma verticale di header paziente + L2 nav + L3 nav DEVE essere ≤160px su tablet 1024x768, lasciando ≥608px di content area.

**Navigazione L2 — Scheda Paziente**

- **FR-006**: La navigazione L2 della Scheda Paziente DEVE contenere almeno: Panoramica, Clinica, Diario, Terapia, Parametri, Documenti.
- **FR-007**: La tab L2 attiva DEVE essere visivamente distinta (colore di sfondo, bordo inferiore prominente o indicatore) con contrasto chiaramente percepibile rispetto alle tab inattive.

**Navigazione L3 — Scheda Paziente**

- **FR-008**: La navigazione L3 DEVE mostrare sotto-tab contestuali in base alla tab L2 selezionata.
- **FR-009**: I sotto-tab L3 DEVONO includere almeno: Presa in Carico, Anamnesi, Diagnosi (sotto "Clinica"); Terapia Farmacologica (sotto "Terapia"); Parametri Vitali (sotto "Parametri"); Note & Visite (sotto "Diario").
- **FR-010**: La tab L3 attiva DEVE essere distinguibile dalle altre con uno stato visivo chiaro (colore testo, sottolineatura o sfondo leggero).

**Stile Visivo**

- **FR-011**: Il sistema di colori DEVE usare tonalità medicali/professionali: blu medicale come colore primario/accento, grigio chiaro per sfondi neutri, bianco per aree contenuto.
- **FR-012**: I separatori tra sezioni DEVONO essere leggeri (bordi sottili ≤1px o ombra lieve) senza dividere pesantemente lo spazio visivo.
- **FR-013**: Ogni elemento interattivo (tab, voce sidebar, pulsante) DEVE avere un touch target ≥44px in altezza.

**Compatibilità e Build**

- **FR-014**: Il layout NON DEVE produrre overflow orizzontale a 1024px e 1180px di larghezza viewport.
- **FR-015**: Il comando `npm run build` DEVE completarsi senza errori TypeScript o di compilazione.
- **FR-016**: L'integrazione con il backend esistente (`/patients` API) e `VITE_API_URL` NON DEVONO essere modificati.

### Key Entities

- **Sidebar L1**: Rail compatta con icone per macro-aree; stato attivo per area corrente; larghezza fissa ≤64px.
- **PageTabs L2**: Barra di navigazione orizzontale principale per sezioni della pagina; dominante, altezza ≥40px.
- **SectionTabs L3**: Sotto-tab contestuali dipendenti dalla tab L2 attiva; leggeri, altezza ≤32px.
- **PatientHeader**: Intestazione compatta con dati essenziali del paziente; sticky, altezza ≤56px.
- **ContentArea**: Area residua dopo sidebar + header + L2 + L3; contiene il contenuto clinico operativo.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un operatore raggiunge il contenuto clinico operativo entro 2 interazioni dalla lista pazienti, senza scroll verticale iniziale nella Scheda Paziente.
- **SC-002**: L'area di contenuto clinico occupa ≥65% dell'altezza disponibile su tablet 1024x768 (≥496px su 768px totali).
- **SC-003**: Il 100% degli elementi interattivi della navigazione (L1, L2, L3) ha un touch target ≥44px in altezza.
- **SC-004**: Nessun overflow orizzontale su viewport 1024px e 1180px per tutte le pagine principali.
- **SC-005**: Il build (`npm run build`) passa senza errori TypeScript.
- **SC-006**: Il cambio di tab L2 e L3 è percepito come istantaneo (transizione visibile ≤100ms).

## Assumptions

- Gli utenti accedono principalmente su tablet (1024x768, 1180x820); il supporto mobile < 768px è fuori scope per questa iterazione.
- I componenti esistenti `PageTabs` e `SectionTabs` (introdotti in Feature 002) vengono refactored, non riscritti da zero.
- Il backend, Prisma, le API e `VITE_API_URL` non vengono modificati.
- La sidebar L1 rimane sempre visibile (no collapse/hamburger) su tablet nelle risoluzioni target.
- I dati paziente (nome, reparto, data nascita) sono già disponibili nel contesto della Scheda Paziente tramite l'API esistente.
- La navigazione L3 è contestuale alla tab L2 e gestita lato frontend senza chiamate API aggiuntive.
- Il font system e le variabili CSS esistenti nel progetto vengono mantenuti; si aggiusta sizing e spacing.
- Il breadcrumb e il pulsante "back" correnti vengono rimossi o assorbiti nell'header compatto per recuperare spazio.
