# Feature Specification: Navigazione Full-Width Adattiva con Tab Underline e Transizione Scorrevole

**Feature Branch**: `008-fullwidth-nav-tabs`

**Created**: 2026-05-24

**Status**: Draft

**Input**: User description: "Navigazione full-width adattiva con tab underline e transizione scorrevole. Il layout non sfrutta tutto lo schermo orizzontalmente, su tablet e PC deve adattarsi meglio alla larghezza disponibile, il menu di secondo livello ha ancora troppo bordo attorno alle voci."

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Layout Full-Width Adattivo (Priority: P1)

Un operatore apre ClinicOS su un tablet da 1024px o su un PC desktop da 1366px+. Attualmente il contenuto principale non sfrutta tutta la larghezza disponibile: ci sono margini laterali inutili e il layout sembra "stretto" anche su schermi più grandi. L'operatore deve poter vedere il massimo contenuto clinico possibile senza scorrere orizzontalmente.

**Why this priority**: Impatto diretto sull'usabilità quotidiana su tutti i dispositivi target. Più spazio orizzontale = più dati clinici visibili simultaneamente.

**Independent Test**: Aprire qualsiasi pagina (lista pazienti, scheda paziente, agenda) su viewport 1024px e 1366px. Il contenuto deve occupare tutta la larghezza disponibile oltre la sidebar, senza margini laterali superiori a 16px. Nessun overflow orizzontale.

**Acceptance Scenarios**:

1. **Given** un operatore su tablet 1024×768, **When** visualizza la lista pazienti, **Then** la tabella pazienti occupa tutta la larghezza disponibile (larghezza schermo meno sidebar 64px), con padding interno massimo 16px per lato.
2. **Given** un operatore su desktop 1366×1024, **When** visualizza la scheda paziente, **Then** il contenuto clinico si estende su tutta la larghezza disponibile senza aree vuote ai lati.
3. **Given** un operatore su qualsiasi viewport, **When** ridimensiona la finestra da 1024px a 1440px, **Then** il layout si adatta fluidamente senza salti visivi o overflow.

---

### User Story 2 — Secondo Livello con Solo Underline (Priority: P2)

Un operatore naviga tra le sezioni di una scheda paziente (es. Panoramica, Clinica, Terapia). I tab di secondo livello mostrano attualmente un bordo/sfondo intorno alla voce attiva, rendendo l'interfaccia visivamente pesante. L'operatore deve percepire il secondo livello come un menu principale pulito, con sola sottolineatura blu come indicatore di stato attivo.

**Why this priority**: L'eliminazione del box/bordo attorno ai tab è il cambiamento visivo più richiesto e migliora immediatamente la leggibilità del menu operativo principale.

**Independent Test**: Aprire la scheda paziente e navigare tra i tab di secondo livello. La voce attiva deve mostrare solo testo + underline blu, senza sfondo colorato, bordo, o pill attorno al testo. Le voci inattive devono avere hover leggero senza sfondo permanente.

**Acceptance Scenarios**:

1. **Given** un operatore sulla scheda paziente, **When** guarda i tab di secondo livello, **Then** nessun tab mostra un rettangolo, box o pill intorno al testo — solo testo con underline sotto la voce attiva.
2. **Given** un operatore sulla scheda paziente, **When** tocca un tab di secondo livello inattivo, **Then** appare un hover leggero (cambio colore testo o sfondo sottile) senza bordi.
3. **Given** un operatore che passa da un tab all'altro, **When** il tab attivo cambia, **Then** l'underline si sposta sulla nuova voce in modo immediatamente visibile.

---

### User Story 3 — Transizione Fluida al Cambio Tab (Priority: P3)

Un operatore passa rapidamente tra le sezioni della scheda paziente (es. da Clinica a Terapia, o da un sotto-tab all'altro). Attualmente il cambio di contenuto è secco e immediato, senza feedback visivo. L'operatore deve percepire un passaggio fluido che conferma visivamente il cambio di contesto, senza rallentare il flusso di lavoro.

**Why this priority**: Migliora la percezione di qualità e professionalità dell'app senza impatto funzionale. Dipende dal completamento di US1 e US2.

**Independent Test**: Cliccare rapidamente tra 3 tab di secondo livello sulla scheda paziente. Ogni cambio deve mostrare una breve transizione visiva (fade o slide leggero) sul pannello contenuto. Con `prefers-reduced-motion` attivo nel sistema operativo, nessuna animazione deve essere visibile.

**Acceptance Scenarios**:

1. **Given** un operatore sulla scheda paziente con motion abilitato, **When** clicca su un tab di secondo livello, **Then** il pannello contenuto appare con una transizione visiva sobria (durata ≤200ms, senza rimbalzi o effetti pesanti).
2. **Given** un operatore sulla scheda paziente con `prefers-reduced-motion` attivo nel SO, **When** clicca su un tab, **Then** il cambio è immediato, senza animazioni.
3. **Given** un operatore che naviga rapidamente (più click in sequenza rapida), **When** la transizione non ha completato il ciclo precedente, **Then** l'interfaccia non blocca, non mostra stati intermedi visibili, e mostra il tab corretto.

---

### User Story 4 — Terzo Livello Visivamente Subordinato (Priority: P4)

Un operatore usa i sotto-tab del terzo livello (es. Anamnesi, Diagnosi, Terapia Farmacologica). Questi devono restare chiaramente subordinati al secondo livello — più piccoli, più leggeri — senza competere visivamente con i tab principali.

**Why this priority**: Consolidamento della gerarchia visiva stabilita in 003. Dipende da US2.

**Independent Test**: Con US2 implementato, confrontare visivamente L2 e L3. L3 deve essere percepito chiaramente come secondario rispetto a L2 per dimensione testo, peso visivo e altezza del controllo.

**Acceptance Scenarios**:

1. **Given** una pagina con sia L2 che L3 visibili, **When** un osservatore la guarda per la prima volta, **Then** L2 è immediatamente percepito come menu principale e L3 come menu contestuale secondario.
2. **Given** un operatore su L3, **When** passa tra i sotto-tab, **Then** la transizione fluida (US3) si applica anche a L3, con la stessa coerenza.

---

### Edge Cases

- Cosa succede se un tab L2 ha un'etichetta molto lunga (es. "Terapia Farmacologica Complessa") su tablet 1024px? L'etichetta deve troncarsi con ellipsis o lo scroll orizzontale del nav deve attivarsi.
- Cosa succede se l'operatore disabilita le animazioni nel sistema operativo? La transizione deve essere assente (prefers-reduced-motion respected).
- Cosa succede se il viewport è inferiore a 1024px? Il layout deve restare usabile (sidebar nascosta su mobile, già gestito da 003).
- Cosa succede se la transizione è ancora in corso quando l'utente clicca su un altro tab? L'interfaccia deve rispondere immediatamente al nuovo click senza freeze o doppio stato.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Il layout principale DEVE occupare tutta la larghezza disponibile oltre la sidebar (64px), con padding laterale interno massimo di 16px per lato, su viewport ≥1024px.
- **FR-002**: Il secondo livello di navigazione DEVE mostrare la voce attiva solo con underline (sottolineatura), senza bordo, pill, rettangolo o sfondo colorato attorno al testo.
- **FR-003**: Il secondo livello DEVE avere uno stato hover sulle voci inattive che sia leggero e non permanente (solo al passaggio del puntatore/dito).
- **FR-004**: Il cambio di contenuto al click su un tab di secondo livello DEVE produrre una transizione visiva fluida di durata massima 200ms.
- **FR-005**: Il cambio di contenuto al click su un tab di terzo livello DEVE produrre la stessa transizione visiva fluida di FR-004, con coerenza visiva tra i due livelli.
- **FR-006**: Tutte le transizioni animate DEVONO essere soppresse se il sistema operativo dell'utente ha `prefers-reduced-motion` attivo.
- **FR-007**: Il terzo livello di navigazione DEVE restare visivamente subordinato al secondo livello: testo più piccolo, peso visivo minore, altezza controllo inferiore.
- **FR-008**: Il layout DEVE adattarsi fluidamente tra viewport 1024px e 1440px+ senza overflow orizzontale globale.
- **FR-009**: La navigazione sidebar, il secondo e terzo livello DEVONO restare funzionali su touch (tap area minima 44×44px per le voci L2; L3 può restare a 32px altezza con contenitore ≥44px).
- **FR-010**: Il build dell'applicazione (`npm run build`) DEVE completare senza errori dopo le modifiche.

### Non-Functional Requirements

- Nessuna modifica al backend, Prisma, API o VITE_API_URL.
- Nessuna nuova dipendenza npm.
- Le etichette di navigazione devono restare in italiano.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Su viewport 1024×768, l'area contenuto occupa ≥90% della larghezza disponibile oltre la sidebar (ovvero ≥864px su 960px disponibili).
- **SC-002**: I tab di secondo livello non mostrano alcun elemento grafico (bordo, box, pill, sfondo) attorno alla voce attiva — verificabile visivamente a colpo d'occhio.
- **SC-003**: La transizione al cambio tab completa in ≤200ms, percepibile come fluida e non bloccante.
- **SC-004**: Con `prefers-reduced-motion` attivo, zero animazioni visibili al cambio tab.
- **SC-005**: Nessun overflow orizzontale su viewport da 1024px a 1440px (scrollbar orizzontale assente).
- **SC-006**: Il secondo livello appare visivamente più prominente del terzo livello: differenza di almeno 2px nel font-size e differenza visiva nell'altezza dei controlli.

---

## Assumptions

- La sidebar (64px) è già fissa e non è oggetto di questa specifica (implementata in 003).
- Il layout attuale ha padding/max-width che limitano la larghezza del contenuto — questa specifica rimuove quel vincolo.
- La transizione si applica al pannello contenuto principale, non all'intera pagina (no full-page transition).
- L3 può mantenere lo stile pill attuale ma con coerenza nella transizione.
- Il viewport minimo target resta 1024px (tablet); sotto 1024px la sidebar è già nascosta (gestito da 003).
- Le etichette dei tab L2/L3 esistenti non cambiano (solo stile, non contenuto).
- Il motion "sobrio e professionale" significa: fade-in/slide leggero, senza bounce, senza scale, senza blur.
