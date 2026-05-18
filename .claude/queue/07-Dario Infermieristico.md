Implementa la Fase 6: Scale di valutazione e contenzioni.

Obiettivo:
Gestire le scale e le schede di contenzione nella Cartella Clinica.

Non modificare backend o Prisma.
Usa stato locale frontend.
Mantieni tutto in italiano.
Esegui npm run build.

Scale da prevedere:
- Scala Braden
- Tinetti
- NRS
- altre scale future

Ogni scala deve avere:
- data compilazione
- operatore
- punteggi
- totale
- esito/rischio
- note
- stampa

Contenzioni:
La scheda contenzione deve prevedere:
- tipo contenzione/protezione
- motivazione
- data inizio
- data fine
- medico
- consenso
- note
- firma parente/tutore

Firma:
Per ora implementa una soluzione frontend:
- campo “Firma parente/tutore”
- modalità firma placeholder
- eventuale area firma disegnabile se semplice
- bottone “Cancella firma”
- bottone “Conferma firma”

Nota:
La firma è funzionale per il prototipo, non dichiarare valore legale.