# Feature Specification: Terapia Farmacologica Unica e Agenda Coerente

**Feature Branch**: `001-terapia-farmacologica-agenda`

**Created**: 2026-05-18

**Status**: Draft

**Input**: Unificazione della sezione Terapia Farmacologica nella Scheda Paziente e allineamento
dell'Agenda Terapia alla sorgente unica di dati reali.

---

## Contesto

ClinicOS è una web app per RSA (Residenza Sanitaria Assistenziale). Attualmente esistono due
sezioni separate nella Scheda Paziente ("Terapia & Farmaci" e "Terapia Programmata") che
creano duplicazione e incoerenza. Questa feature le unifica in un'unica sezione "Terapia
Farmacologica" e garantisce che l'Agenda Terapia legga esclusivamente da questa sorgente.

---

## User Scenarios & Testing _(obbligatorio)_

### User Story 1 — Gestione Terapia Farmacologica del Paziente (Priority: P1)

Il personale sanitario apre la Scheda Paziente e trova un'unica sezione "Terapia
Farmacologica" che sostituisce le precedenti due sezioni separate. Da qui può aggiungere,
modificare e sospendere farmaci con tutti i dettagli clinici rilevanti.

**Perché questa priorità**: È il fondamento di tutte le altre story. Senza dati di terapia
reali e persistiti, l'Agenda non può funzionare.

**Independent Test**: Aprire la Scheda Paziente, aggiungere un farmaco con dose, via di
somministrazione e fascia oraria "Mattina", salvare, ricaricare la pagina — il farmaco
deve essere ancora presente con tutti i dati invariati.

**Acceptance Scenarios**:

1. **Dato** un paziente esistente nel sistema, **quando** il personale apre la Scheda
   Paziente, **allora** vede una sola sezione "Terapia Farmacologica" (non due sezioni separate).

2. **Dato** un paziente senza terapie, **quando** il personale aggiunge un farmaco con
   dose "500mg", via "Orale", fascia "Mattina", data inizio oggi, tipo "Periodica",
   **allora** il farmaco appare nella lista con stato "Attiva" dopo il salvataggio.

3. **Dato** un farmaco attivo, **quando** il personale lo modifica cambiando la dose,
   **allora** la modifica è persistita e visibile dopo refresh della pagina.

4. **Dato** un farmaco attivo, **quando** il personale lo imposta su "Sospesa",
   **allora** il farmaco rimane visibile nella lista con stato "Sospesa" (non viene cancellato).

5. **Dato** una terapia con data fine impostata e data corrente oltre quella data,
   **allora** lo stato risulta automaticamente "Conclusa".

---

### User Story 2 — Agenda Terapia da Sorgente Reale (Priority: P2)

L'infermiere apre l'Agenda e clicca su uno slot (es. "Terapia Mattina"). Vede una popup
con i soli pazienti che hanno effettivamente una terapia farmacologica attiva, valida per
quella data e coerente con la fascia oraria dello slot. Ogni riga mostra farmaci, dose,
via e stato somministrazione.

**Perché questa priorità**: L'Agenda è inutilizzabile se mostra dati fittizi o incoerenti.
Dipende dalla Story 1 (i dati devono esistere prima di poter essere mostrati).

**Independent Test**: Con almeno un paziente avente terapia "Mattina" attiva, aprire
l'Agenda, cliccare "Terapia Mattina" — la popup deve mostrare quel paziente con i suoi
farmaci reali. Un paziente senza terapia "Mattina" non deve apparire.

**Acceptance Scenarios**:

1. **Dato** lo slot "Terapia Mattina", **quando** l'infermiere clicca sullo slot,
   **allora** la popup mostra solo i pazienti con terapia attiva avente fascia "Mattina"
   valida per la data selezionata.

2. **Dato** un paziente con terapia "Sera" soltanto, **quando** l'infermiere clicca
   "Terapia Mattina", **allora** quel paziente non appare nella popup.

3. **Dato** un paziente con terapia scaduta (data fine nel passato), **quando**
   l'infermiere apre qualsiasi slot dell'Agenda, **allora** quel paziente non appare.

4. **Dato** un paziente con terapia attiva ma senza farmaco, dose o via valorizzati,
   **allora** quel paziente non appare nella popup (somministrazioni orfane escluse).

5. **Dato** nessun paziente con terapia valida per lo slot, **quando** l'infermiere
   clicca lo slot, **allora** la popup mostra un messaggio "Nessuna terapia programmata
   per questa fascia".

---

### User Story 3 — Registrazione Erogata / Non Erogata (Priority: P2)

Dall'interno della popup dell'Agenda, l'infermiere registra se ciascun farmaco è stato
somministrato o meno. La scelta viene persistita nel backend e rimane visibile dopo
refresh.

**Perché questa priorità**: Stessa urgenza della Story 2 — senza persistenza le
registrazioni sono inutili clinicamente.

**Independent Test**: Aprire popup Agenda, segnare un farmaco come "Erogata", ricaricare
la pagina, riaprire la stessa popup — il farmaco deve mostrare stato "Erogata".

**Acceptance Scenarios**:

1. **Dato** un paziente in popup Agenda, **quando** l'infermiere clicca "Erogata" su un
   farmaco, **allora** lo stato cambia visivamente e viene salvato nel backend.

2. **Dato** un farmaco non somministrato, **quando** l'infermiere clicca "Non erogata"
   e inserisce il motivo, **allora** lo stato e il motivo vengono salvati nel backend.

3. **Dato** una registrazione "Erogata" salvata, **quando** la pagina viene ricaricata
   e la popup riaperta, **allora** lo stato "Erogata" è ancora visibile.

4. **Dato** una registrazione "Non erogata" con motivo, **quando** la popup viene
   riaperta, **allora** sia lo stato sia il motivo sono ancora visibili.

5. **Dato** uno slot già parzialmente completato, **quando** l'infermiere riapre la
   popup, **allora** i farmaci già registrati mostrano il loro stato corrente e quelli
   non ancora registrati mostrano stato "In attesa".

---

### Edge Cases

- Cosa succede se un paziente viene eliminato mentre ha terapie attive?
  → Le terapie rimangono in storico ma non appaiono nell'Agenda (il paziente non esiste).
- Cosa succede se la data fine è uguale alla data corrente?
  → La terapia è ancora valida per l'intera giornata corrente.
- Terapia "Una tantum": appare nell'Agenda solo nel giorno esatto della data inizio.
- Terapia "Al bisogno": non appare nell'Agenda programmata (slot fissi), ma è visibile
  nella Scheda Paziente.
- Doppia registrazione: se un'erogazione è già marcata "Erogata", il pulsante "Erogata"
  è disabilitato (non si può registrare due volte la stessa somministrazione).

---

## Requirements _(obbligatorio)_

### Functional Requirements

**Terapia Farmacologica — Gestione**

- **FR-001**: Il sistema DEVE esporre un'unica sezione "Terapia Farmacologica" nella
  Scheda Paziente, rimuovendo le precedenti sezioni duplicate.
- **FR-002**: Il sistema DEVE permettere di associare più farmaci a un singolo paziente.
- **FR-003**: Ogni voce di terapia DEVE contenere: nome farmaco, dose, via di
  somministrazione, fasce orarie, data inizio, tipo terapia, stato.
- **FR-004**: La data fine DEVE essere opzionale.
- **FR-005**: Il tipo di terapia DEVE essere uno tra: Periodica, Una tantum, Al bisogno.
- **FR-006**: Lo stato DEVE essere uno tra: Attiva, Sospesa, Conclusa.
- **FR-007**: Lo stato "Conclusa" DEVE essere impostato automaticamente quando la data
  corrente supera la data fine.
- **FR-008**: Il personale DEVE poter aggiungere, modificare e sospendere una terapia.
- **FR-009**: Una terapia sospesa o conclusa NON DEVE essere eliminata dallo storico.
- **FR-010**: Tutti i dati di terapia DEVONO essere persistiti nel backend e accessibili
  via API CRUD.

**Agenda Terapia — Filtro Coerente**

- **FR-011**: L'Agenda DEVE leggere i pazienti e le terapie esclusivamente dal backend
  tramite le API di Terapia Farmacologica.
- **FR-012**: Uno slot dell'Agenda DEVE mostrare solo pazienti con terapia attiva, valida
  per la data selezionata, e con fascia oraria corrispondente allo slot.
- **FR-013**: Il sistema DEVE escludere dalla popup i pazienti con terapia priva di
  farmaco, dose o via valorizzati (somministrazioni orfane).
- **FR-014**: Il sistema DEVE escludere i pazienti inesistenti o eliminati.
- **FR-015**: La popup di uno slot DEVE mostrare per ciascun paziente: nome paziente,
  camera, letto, farmaci previsti, dose, via, orario, stato somministrazione.

**Erogata / Non Erogata**

- **FR-016**: L'infermiere DEVE poter registrare "Erogata" o "Non erogata" per ciascun
  farmaco da somministrare nello slot.
- **FR-017**: La registrazione "Non erogata" DEVE richiedere un motivo obbligatorio.
- **FR-018**: Ogni registrazione di erogazione DEVE essere persistita nel backend con:
  ID terapia, data, fascia oraria, stato, motivo (se non erogata), timestamp operatore.
- **FR-019**: Le registrazioni DEVONO essere visibili dopo refresh della pagina.
- **FR-020**: Un farmaco già registrato come "Erogata" NON DEVE poter essere registrato
  nuovamente per lo stesso slot.

### Key Entities

- **TerapiaFarmacologica**: terapia assegnata a un paziente; attributi: paziente, farmaco,
  dose, via di somministrazione, fasce orarie, data inizio, data fine (opz.), tipo, stato.
- **FasciaOraria**: enum o lista di valori predefiniti (es. Mattina, Mezzogiorno, Sera,
  Notte) che collega terapia a slot Agenda.
- **RegistrazioneErogazione**: record di somministrazione per uno slot specifico;
  attributi: terapia, data, fascia, stato (erogata/non erogata), motivo, operatore,
  timestamp.
- **Paziente**: entità esistente nel backend; attributi rilevanti: nome, camera, letto.

---

## Success Criteria _(obbligatorio)_

### Measurable Outcomes

- **SC-001**: Il personale apre la Scheda Paziente e trova una sola sezione "Terapia
  Farmacologica" (nessuna duplicazione visibile).
- **SC-002**: Un farmaco aggiunto con tutti i campi richiesti è visibile e invariato
  dopo ricaricamento della pagina.
- **SC-003**: Lo slot "Terapia Mattina" mostra esclusivamente i pazienti con terapia
  attiva e fascia "Mattina" valida per la data corrente — zero falsi positivi.
- **SC-004**: Una registrazione "Erogata" o "Non erogata" sopravvive al refresh della
  pagina senza perdita di dati.
- **SC-005**: Nessun dato di terapia fittizio, mock o hardcoded appare nell'interfaccia
  in percorsi di produzione.
- **SC-006**: L'infermiere completa la registrazione di un'erogazione in meno di 30
  secondi per paziente dalla popup dell'Agenda.

---

## Assumptions

- Le fasce orarie disponibili sono: Mattina, Mezzogiorno, Sera, Notte (valori fissi per
  questa iterazione; estensibili in futuro ma non in scope ora).
- La via di somministrazione è un campo testuale libero o un enum breve (es. Orale,
  Endovenosa, Intramuscolare, Sublinguale, Topica).
- L'operatore che registra l'erogazione è identificato dalla sessione attiva (utente
  corrente dell'applicazione).
- Non è richiesta una firma digitale o conferma biometrica per l'erogazione in questa
  iterazione.
- La terapia "Al bisogno" non genera slot fissi nell'Agenda; è visibile solo nella
  Scheda Paziente.
- Il modello dati del paziente (nome, camera, letto) è già presente nel backend e non
  viene modificato da questa feature.
- La rimozione delle sezioni duplicate ("Terapia & Farmaci", "Terapia Programmata") è
  in scope; la migrazione dei dati eventualmente già esistenti in quelle sezioni è in
  scope limitato (i dati vanno mantenuti se già persistiti nel backend, rimossi solo se
  erano mock o hardcoded).
