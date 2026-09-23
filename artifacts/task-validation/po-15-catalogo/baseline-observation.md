# PO15 — baseline e contratto finale

Baseline applicativa f445260a, PO14 pubblicata e verificata con Railway SUCCESS, Vercel READY/alias e smoke corrente/storico in sola lettura. Ricevuta committata in 258f6104. GO applicativo PO15 ai writer isolati; root possiede fixture, integrazione e porta4196.

Il test HTTP/PG preparato ha verificato la mancanza del catalogo (404) e la perdita del ramo NRS omesso dal PUT Cartella. La verifica della rettifica dipendeva dal catalogo assente e non è considerata una misura autonoma della baseline. Database soltanto sintetico locale, chiuso a fine test.

Contratto intake-review definitivo: successo HTTP200 con `legacyPainDrafts: array` e `legacyPainError: null`; oltre100draft o2MiBUTF-8 del ramo dolore, HTTP200 con `legacyPainDrafts: null` e `legacyPainError: "intake_review_legacy_pain_too_large"`. I dati originali non sono tagliati/modificati. Le terapie differite rimangono leggibili anche fuori budget: la loro proiezione esclude dolore prima del controllo. Solo la coppia di proprietà completamente assente è compatibile con il server precedente. Campo presente malformato è un errore.

Ogni riferimento dolore contiene draftId, confirmedAt ISO/null e pain JSON originale; provenienza soltanto dai draft confermati per il paziente autorizzato. Non attribuisce finalizzazione clinica, non inventa data o autore, non converte NRS in PAINAD. Lo storico Cartella resta indipendente e disponibile.

Il primo passaggio sul candidato ha superato i tre casi catalogo/NRS ma il nuovo caso intake ha rilevato401 nel banco: il router intake era montato due volte, di cui una prima del middleware di autenticazione. Il banco è stato corretto per usare la composizione reale `patientsRouter`, che include già intake-review dopo requireOperator. Nessuna modifica al codice applicativo per quel401; log diagnostico conservato, suite ripetuta sul banco corretto.
