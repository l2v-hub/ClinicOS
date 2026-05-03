Implementa la Fase 4: moduli clinici avanzati della Cartella Clinica Paziente.
Deve somigliare a una scheda di dimissione con sezioni verticali e checkbox.

Layout:
- titolo: Scheda di dimissione infermieristica
- intestazione:
  - Cognome e nome
  - Nato il
- sezioni:
  - Respirazione
  - Alimentazione
  - Eliminazione
  - Mobilizzazione
  - Igiene e vestizione
  - Lesioni da pressione
  - Disturbi del sonno
  - Uso di farmaci
  - Comunicazione
  - Servizi territoriali

Ogni sezione deve avere checkbox e campi note.

Esempi:
Respirazione:
- autonomo
- O2 terapia
- cannula tracheale
- ultima sostituzione

Alimentazione:
- autonomo
- assistito
- dieta
- SNG
- PEG

Eliminazione:
- continente
- parzialmente incontinente
- incontinenza feci/urine
- data ultima evacuazione
- catetere vescicale
- stomia

Mobilizzazione:
- autonomo
- allettato
- assistito con
- rischio caduta sì/no
- contenzione

In basso:
- data
- firma
Questa è una evoluzione della sezione Operatore già esistente.
Non riscrivere l’app.
Tutto deve essere in italiano.
Usa le immagini delle schede cartacee solo come riferimento funzionale per il template digitale.
Non copiare dati reali.

1. Medicazioni / Lesioni
Campi:
- sede lesione
- mappa corpo placeholder
- data inizio
- sigla operatore
- tipo lesione:
  - ferita chirurgica
  - FLC
  - lesione trofica
  - LDP
  - PEG
- grado:
  - 1
  - 2
  - 3
  - 4
  - escara
- descrizione:
  - eritema
  - flittene
  - detersa
  - granuleggiante
  - fibrina
  - necrosi
  - essudato
  - infetta
  - flogosi
  - punti sutura
  - macerata
  - sanguinante
  - deiscenza
  - altro
- dimensione in cm
- detersione/disinfezione:
  - soluzione fisiologica
  - iodopovidone
  - clorexidina
  - altro
- trattamento:
  - Mepilex
  - Inadine
  - Comfeel
  - alginato
  - Nu-gel
  - Iruxol
  - Bionect
  - Adaptic garza
  - Connettivina garze
  - film poliuretano
  - cerotto TNT
  - garze sterili
  - olio
  - zinco
  - Sofargen
  - altro
- frequenza
- data fine
- data desutura
- note
- stampa scheda medicazione

2. Follow-up medicazione
Collegato alla medicazione.

Campi:
- data
- sigla operatore
- medicazione sostituita per:
  - termine
  - bagnata
  - sporca
- note
- stampa follow-up

3. Dimissione infermieristica
Sezioni:
- respirazione
- alimentazione
- eliminazione
- mobilizzazione
- rischio caduta
- contenzione
- igiene e vestizione
- lesioni da pressione
- giro medicazione
- frequenza
- disturbi del sonno
- uso farmaci
- comunicazione/orientamento
- segnalazione servizio sociale territoriale
- servizio infermieristico domiciliare
- data
- firma
- stampa modulo

4. Liberatoria di uscita
Campi:
- paziente
- referente/familiare
- data nascita referente
- rapporto con paziente
- data uscita
- ora uscita
- firma ospite/referente
- note
- flag: compilare solo in caso di uscita con parenti
- stampa liberatoria

5. Contenzioni / Protezioni
Campi:
- paziente
- camera
- letto
- data inizio
- data fine
- firma medico inizio/fine
- sponde al letto
- cintura carrozzina
- cintura poltrona
- cintura sedia
- cintura letto
- carrozzina con tavolino
- altri presidi
- frequenza:
  - sempre
  - notturna
  - diurna
  - altro
- motivazioni:
  - agitazione psicomotoria
  - stato confusionale
  - cadute ricorrenti/instabilità posturale
  - auto/eterolesionismo
  - inconsapevolezza dei propri limiti
  - altro
- note
- consenso paziente/tutore/amministratore
- firma paziente/referente
- firma parente presa visione
- dichiarazione medico
- firma medico
- stampa consenso

6. Scala Braden
Indicatori con punteggio 1-4:
- percezione sensoriale
- umidità
- attività
- mobilità
- nutrizione
- frizione e scivolamento

Calcolo automatico totale.
Interpretazione automatica:
- totale < 16: grave rischio compromissione integrità cutanea
- totale = 16: rischio compromissione integrità cutanea
- totale 16-18: lieve rischio compromissione integrità cutanea
- totale > 18: nessun rischio evidente

Campi:
- data valutazione
- operatore
- totale
- livello rischio
- note
- stampa scala Braden

Tutti i moduli devono essere:
- editabili
- salvabili
- annullabili
- espandibili
- stampabili
- tablet-first

Usa stato locale frontend.
Non modificare backend.
Non modificare Prisma.
Esegui npm run build e correggi errori.