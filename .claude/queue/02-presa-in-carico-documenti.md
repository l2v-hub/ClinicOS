Template 2 — Scheda medicazioni / lesioni

Deve somigliare a un modulo clinico a tabella.

Layout:
- intestazione paziente:
  - Cognome
  - Nome
  - Camera
- sezione “Sede della lesione”
- riquadro corpo umano / body map placeholder
- tabella principale con colonne:
  - Data e sigla inizio
  - Tipo di lesione
  - Grado
  - Descrizione
  - Detersione / disinfezione
  - Trattamento
  - Data e sigla fine

Campi tipo lesione:
- Ferita chirurgica
- FLC
- Lesione trofica
- LDP
- PEG

Campi grado:
- 1°
- 2°
- 3°
- 4°
- Escara

Descrizione con checkbox:
- Eritema
- Flittene
- Detersa
- Granuleggiante
- Fibrina
- Necrosi
- Essudato
- Infetta
- Flogosi
- Punti sutura
- Macerata
- Sanguinante
- Deiscenza
- Altro

Detersione/disinfezione:
- Soluzione fisiologica
- Iodopovidone
- Clorexidina
- Altro

Trattamento:
- Mepilex
- Inadine
- Comfeel
- Alginato
- Nu-gel
- Iruxol
- Bionect
- Adaptic garza
- Connettivina garze
- Film poliuretano
- Cerotto TNT
- Garze sterili
- Olio
- Zinco
- Sofargen
- Altro

In basso:
- Esecuzione ogni
- Desutura il
- Sigla

La stampa deve essere simile a una scheda A4 tabellare.

Questa è una evoluzione della cartella clinica già esistente.
Non riscrivere l’app.
Integra i nuovi moduli nella sezione Operatore / Paziente.

1. Presa in carico
L’operatore deve poter creare e modificare una presa in carico del paziente.

Campi:
- provenienza:
  - accesso diretto
  - centro medico
  - altra struttura
  - dimissione ospedaliera
  - familiare/caregiver
- centro inviante
- data presa in carico
- ora presa in carico
- operatore responsabile
- motivo ingresso
- condizioni iniziali
- note iniziali
- camera
- letto/posto letto
- documenti ricevuti
- documenti mancanti
- sigla/firma operatore
- stampa presa in carico

2. Documenti paziente
L’operatore deve poter registrare tutti i documenti consegnati dal paziente, dal familiare, da un centro medico o da altra struttura.

Campi documento:
- tipo documento
- stato:
  - ricevuto
  - mancante
  - da verificare
  - firmato
  - scaduto
- data ricezione
- provenienza
- scadenza
- note
- allegato placeholder
- azioni:
  - aggiungi
  - modifica
  - archivia
  - stampa elenco documenti

Tipi documento:
- documento identità
- tessera sanitaria
- consenso privacy
- consenso trattamento
- invio centro medico
- lettera dimissione
- referto
- prescrizione
- delega
- liberatoria di uscita
- consenso contenzioni
- documentazione medicazioni
- altro

UX:
- evidenzia documenti mancanti
- evidenzia documenti da verificare
- rendi veloce l’inserimento da tablet
- integra la sezione nella Cartella Clinica Paziente
- ogni sezione deve essere editabile e stampabile

Usa stato locale frontend.
Non modificare backend.
Non modificare Prisma.
Esegui npm run build e correggi errori.