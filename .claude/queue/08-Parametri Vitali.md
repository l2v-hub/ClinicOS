Implementa la Fase 7: Diario medico con dettatura vocale opzionale.

Obiettivo:
Nel Diario Medico il medico deve poter scrivere manualmente oppure dettare il testo se il browser lo supporta.

Non modificare backend o Prisma.
Mantieni tutto in italiano.
Esegui npm run build.

Requisiti:

1. Diario medico
Campi:
- data
- medico
- nota medica
- prescrizione
- diagnosi/valutazione
- firma
- stampa

2. Dettatura vocale
Aggiungi un pulsante:
“Detta nota”

Se il browser supporta Web Speech API:
- avvia dettatura
- trascrivi il testo nella textarea della nota medica
- mostra stato “Ascolto in corso”
- pulsante “Ferma dettatura”

Se il browser non supporta la funzione:
- mostra messaggio controllato:
  “Dettatura non supportata da questo browser”

Non introdurre nuove librerie.
Non usare servizi esterni.
Non promettere accuratezza clinica della trascrizione.

Esempio uso:
Il medico detta: “Il paziente presenta tosse. Prescritta claritromicina 500 mattina e sera.”
Il testo viene inserito nella nota medica modificabile.