Implementa la Fase 1: miglioramento Presa in carico / Registrazione paziente.

Obiettivo:
La registrazione paziente deve rappresentare una vera “presa in carico”.

Non modificare backend o Prisma.
Lavora frontend first.
Mantieni tutto in italiano.
Esegui npm run build e correggi errori.

La presa in carico deve includere:

1. Dati anagrafici paziente

- nome
- cognome
- data di nascita
- sesso
- codice fiscale
- telefono
- email
- indirizzo

2. Contatti parenti / familiari

- referente principale
- rapporto con il paziente
- telefono referente
- contatto emergenza
- note referente

3. Provenienza paziente

- accesso diretto
- ospedale
- centro medico
- altra struttura
- familiare / caregiver
- centro inviante
- modalità di arrivo
- motivo ingresso

4. Camera e assegnazione

- camera
- letto / posto letto
- operatore assegnato
- stato paziente
- priorità / alert iniziali

5. Diagnosi e condizioni di ingresso

- diagnosi di ingresso
- patologie pregresse
- valutazioni funzionali iniziali
- condizioni attuali del paziente
- note iniziali

UX:

- usa tab o sezioni chiare
- i form devono essere ampi e facilmente compilabili
- input e textarea devono essere touch-friendly
- la modale/pagina non deve essere compressa
- le sezioni devono essere evidenziate con card, ombre leggere o sfondo leggermente più scuro
- niente scroll orizzontale
- niente layout rotto su tablet

Dopo creazione paziente:

- aggiungi il paziente alla lista
- apri automaticamente la scheda paziente
- mostra feedback “Paziente creato correttamente”
