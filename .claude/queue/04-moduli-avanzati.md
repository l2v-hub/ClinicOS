Implementa la Fase 3: Schema terapia insulinica.

Obiettivo:
Per i pazienti diabetici deve essere possibile inserire uno schema insulinico basato sui valori glicemici.

Non modificare backend o Prisma.
Usa stato locale frontend.
Mantieni tutto in italiano.
Esegui npm run build.

Requisiti:

1. Sezione schema insulinico
Nella terapia del paziente aggiungi una sottosezione:
“Schema insulinico”.

Campi:
- nome insulina
- tipo insulina
- orario rilevazione
- note
- medico prescrittore

2. Fasce glicemiche
Deve essere possibile inserire righe tipo:

- da valore glicemia
- a valore glicemia
- unità insulina da somministrare
- note

Esempi:
- 100–150 → 3 unità
- 151–200 → 5 unità
- 201–250 → 7 unità
- oltre 250 → avvisare medico / altra indicazione

3. Uso operativo
Quando l’operatore registra glicemia/DTX:
- deve poter vedere lo schema insulinico
- il sistema deve suggerire le unità in base al valore inserito
- l’operatore deve poter confermare o inserire nota

UX:
- tabella chiara
- righe facilmente modificabili
- pulsante “Aggiungi fascia”
- pulsante “Rimuovi fascia”
- alert se manca schema insulinico per paziente diabetico