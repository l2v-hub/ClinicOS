Implementa la Fase 2: Terapia medica e somministrazione farmaci.

Obiettivo:
La terapia deve essere uno dei moduli centrali della Cartella Clinica.

Non modificare backend o Prisma.
Usa stato locale frontend se mancano API.
Mantieni tutto in italiano.
Esegui npm run build.

Requisiti:

1. Scheda terapia paziente
Ogni paziente deve poter avere:
- farmaco
- dosaggio
- via di somministrazione
- orari della giornata
- note
- medico prescrittore
- data inizio
- data fine
- stato terapia:
  - attiva
  - sospesa
  - conclusa

2. Allergie
Nella terapia deve essere sempre visibile:
- allergie note
- alert allergie
- note allergiche

3. Schema orario terapia
Deve essere possibile inserire la terapia nello schema delle ore della giornata:
- mattina
- pranzo
- pomeriggio
- sera
- notte
oppure orari specifici:
- 08:00
- 12:00
- 16:00
- 18:00
- 20:00
- altro

4. Vista “Terapia del mattino di tutti gli ospiti”
Crea una vista operativa in cui l’operatore vede tutti i pazienti in elenco con le terapie previste per una fascia oraria, ad esempio mattina.

La vista deve mostrare:
- paziente
- camera / letto
- farmaco
- dosaggio
- orario
- stato somministrazione

Azioni:
- clic su spunta = somministrato
- clic su terapia/paziente = dettaglio
- se non somministrato, apri un piccolo form per indicare il motivo

Motivi mancata somministrazione:
- rifiutata dal paziente
- paziente assente
- vomito / impossibilità
- sospesa dal medico
- farmaco non disponibile
- altro

5. Registrazione somministrazione
Ogni somministrazione deve poter avere:
- stato:
  - da somministrare
  - somministrata
  - non somministrata
- ora registrazione
- operatore
- motivo mancata somministrazione
- note

UX:
- deve essere molto veloce da usare su tablet
- la vista somministrazione deve funzionare come checklist operativa
- i colori devono distinguere chiaramente:
  - da fare
  - fatto
  - non fatto
  - urgente