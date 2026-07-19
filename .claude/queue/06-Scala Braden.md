Implementa la Fase 5: riorganizzazione della Cartella Clinica in aree operative.

Obiettivo:
La scheda paziente deve essere organizzata in aree cliniche chiare.

Non modificare backend o Prisma.
Mantieni tutto in italiano.
Esegui npm run build.

Crea o migliora la navigazione interna della scheda paziente con queste aree:

1. Presa in carico
   Contiene:

- anagrafica
- contatti familiari
- provenienza
- camera/letto
- diagnosi ingresso
- patologie pregresse
- condizioni attuali

2. Terapia
   Contiene:

- farmaci
- allergie
- terapia giornaliera
- somministrazioni
- mancata somministrazione
- schema insulinico

3. Area infermieristica
   Contiene sottosezioni:

- diario consegne
- medicazioni
- scale di valutazione
- contenzioni

4. Area fisioterapica
   Contiene:

- diario fisioterapico
- consegne fisioterapiche
- valutazioni funzionali
- piano trattamento fisioterapico
- note evolutive

5. Area medica
   Contiene:

- diario medico
- dimissione medica
- prescrizioni
- note cliniche

6. Documenti
   Contiene:

- tessera sanitaria
- carta identità
- privacy
- referti
- prescrizioni
- dimissioni ospedaliere
- altri allegati

7. Invio in PS
   Contiene:

- motivo invio
- parametri recenti
- terapia attuale
- allergie
- documenti/dimissioni ospedaliere già caricate
- note operatore
- stampa riepilogo invio

UX:

- menu interno ordinato, non troppo ricco
- usa macro-aree e sottosezioni
- stile tab pulito
- ogni sezione deve essere cliccabile e raggiungibile
- ogni card riepilogativa deve portare alla sezione corretta
