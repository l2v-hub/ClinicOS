Usa SEMPRE Agent Team Mode con tmux swarm.

Agenti richiesti:
1. LEAD / Orchestrator
2. Backend / Prisma Agent
3. Frontend Implementer
4. QA / Build Reviewer

Task:
Implementare nella Scheda Paziente la sezione “Terapia” completa con fasce orarie, periodicità, terapia una tantum e visibilità automatica in Agenda.

## Obiettivo

Dentro la Scheda Paziente deve esserci una vera sezione “Terapia” dove l’operatore può inserire, modificare e consultare le terapie del paziente.

Ogni terapia deve poter essere:

1. Periodica, default
2. Una tantum
3. Associata a una o più fasce orarie
4. Attiva da una data di inizio
5. Visibile automaticamente in Agenda dalla data di inizio in poi

## Requisiti terapia paziente

Per ogni terapia devono essere gestiti almeno questi campi:

- nome farmaco / terapia
- dosaggio
- via di somministrazione
- note
- stato:
  - attiva
  - sospesa
  - conclusa
- tipo terapia:
  - periodica
  - una tantum
- data inizio
- data fine opzionale
- fasce orarie:
  - mattina
  - pranzo
  - pomeriggio
  - sera
  - notte
  - orario specifico
- orari specifici, esempio:
  - 08:00
  - 12:00
  - 16:00
  - 20:00
- prescrittore / medico se disponibile
- operatore che ha inserito la terapia se disponibile

Default:
- una nuova terapia deve essere “periodica”
- una nuova terapia deve avere data inizio = oggi
- se non viene scelta fascia, proporre “mattina” come default ma permettere modifica

## Terapia periodica

Se la terapia è periodica:
- deve comparire in Agenda a partire dalla data inizio
- deve comparire negli slot terapia delle fasce orarie selezionate
- deve continuare a comparire fino alla data fine, se presente
- se non c’è data fine, resta attiva

Esempio:
Ramipril 5 mg, fascia mattina, data inizio 10/05/2026.
Da quella data in poi deve comparire nello slot “Terapia mattina”.

## Terapia una tantum

Se la terapia è una tantum:
- deve comparire solo nel giorno/orario indicato
- dopo quella data non deve più comparire come terapia da erogare
- deve essere chiaramente etichettata come “Una tantum”

Campi specifici:
- data somministrazione prevista
- orario previsto
- note

## Agenda

In Agenda devono comparire slot terapia per fasce orarie.

Esempi:
- Terapia mattina
- Terapia pranzo
- Terapia pomeriggio
- Terapia sera
- Terapia notte

Ogni slot deve mostrare:
- fascia/orario
- totale terapie previste
- numero erogate / totale
- numero ancora da erogare

Esempio:
“Terapia mattina”
“3 / 8 erogate”
“5 da erogare”

Quando clicco lo slot:
- si apre modale/finestra scrollabile
- mostra solo i pazienti con terapie previste per quella fascia e quella data
- mostra nome, cognome, camera/letto, terapia, dosaggio, orario
- permette “Erogata”
- permette “Non erogata” con motivo
- salva lo stato nel backend

## Persistenza backend

Non deve essere solo grafica o local state.

Backend:
- controlla schema Prisma attuale
- se esistono già modelli terapia/somministrazione, usali
- se mancano, crea migration minima

Modelli minimi suggeriti:
- PatientTherapy
- MedicationAdministration oppure TherapyAdministration
- TherapyTimeSlot se necessario

API minime richieste:

GET /patients/:patientId/therapies
POST /patients/:patientId/therapies
PUT /patients/:patientId/therapies/:therapyId
DELETE /patients/:patientId/therapies/:therapyId

GET /therapy-slots?date=YYYY-MM-DD
GET /therapy-slots/:slotId/patients

POST /medication-administrations/:id/confirm
POST /medication-administrations/:id/not-administered

Regole:
- non usare mock
- non usare solo local state
- non usare database locale se il task viene testato online
- non usare migrate reset
- non usare db push --force-reset
- non cancellare dati

## Frontend

Aggiornare la Scheda Paziente:

Sezione “Terapia” deve mostrare una tabella/card coerente con lo stile “Terapia Medica & Farmaci”:

- header blu flat
- tabella uniforme
- comprimibile / espandibile
- pulsante “Aggiungi terapia”
- pulsante modifica
- stato terapia visibile
- fasce orarie visibili
- tipo terapia visibile: periodica / una tantum

Form “Aggiungi terapia”:
- coerente con design system ClinicOS
- tablet-friendly
- nessun tooltip
- input chiari
- select fasce orarie
- toggle o radio:
  - periodica
  - una tantum
- data inizio obbligatoria
- data fine opzionale
- salvataggio reale tramite API

## Dati di test

Per testare, aggiungi terapie fittizie per ogni paziente demo esistente.

Esempi:

Fabio Forlano:
- Ramipril 5 mg, mattina, periodica, da oggi
- Metformina 500 mg, pranzo e sera, periodica, da oggi
- Paracetamolo 1000 mg, al bisogno / una tantum, oggi ore 18:00

Mario Ferrioli:
- Lasix 25 mg, mattina, periodica
- Cardioaspirina 100 mg, pranzo, periodica

Anna Martini:
- Pantoprazolo 40 mg, mattina, periodica
- Tachipirina 1000 mg, una tantum, oggi ore 20:00

Per ogni paziente demo:
- almeno una terapia mattina
- almeno una terapia sera oppure pranzo
- almeno una terapia una tantum su alcuni pazienti

Questi dati devono servire a testare Agenda e slot terapia.

## QA

Verifica:

1. Apri Scheda Paziente.
2. Vai in Terapia.
3. Aggiungi terapia periodica.
4. Aggiungi terapia una tantum.
5. Imposta fasce orarie.
6. Salva.
7. Refresh pagina.
8. La terapia resta visibile.
9. Apri Agenda.
10. La terapia compare nello slot corretto dalla data inizio.
11. Clic slot terapia.
12. Vedi pazienti corretti per quella fascia.
13. Clic Erogata.
14. Refresh.
15. Stato Erogata resta salvato.
16. Non erogata richiede motivo.
17. Conteggio slot erogate/totale si aggiorna.
18. npm run build passa.

## Railway

Se serve test online usa:

.claude/team/railway-win.sh

Non stampare token o DATABASE_URL completo.

## Build

Esegui:

npm run build

## Commit

Solo dopo build riuscita fai commit:

implement patient therapy schedule and agenda slots

## Output finale

Riporta solo:
- modelli/API creati o modificati
- componenti frontend modificati
- come si inserisce una terapia periodica
- come si inserisce una terapia una tantum
- come le fasce orarie alimentano l’Agenda
- dati demo creati per test
- risultato npm run build
- commit hash
