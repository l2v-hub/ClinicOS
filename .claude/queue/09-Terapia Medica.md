Implementa la Fase 8: Agenda visite e note.

Obiettivo:
L’agenda deve gestire appuntamenti, visite e note operative.

Non modificare backend o Prisma.
Usa stato locale frontend.
Mantieni tutto in italiano.
Esegui npm run build.

Requisiti:

1. Agenda
Deve mostrare:
- appuntamenti
- visite
- note
- paziente
- operatore
- orario
- stato
- tipo visita
- camera/letto se presente

2. Creazione appuntamento
Cliccando su uno slot:
- apri form appuntamento
- seleziona paziente
- seleziona operatore
- tipo visita
- data/ora
- durata
- note
- stato

3. Click paziente
Ovunque appaia un paziente in agenda:
- nome paziente cliccabile
- apre scheda paziente
- browser back deve tornare all’agenda

4. Note
Le note possono essere:
- generali
- legate al paziente
- legate all’appuntamento
- legate all’operatore

UX:
- agenda leggibile
- colori chiari ma non invasivi
- niente overflow orizzontale
- tablet-friendly