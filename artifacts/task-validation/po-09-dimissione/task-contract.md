# PO-09 — Dimissione accanto a Documenti

Preparazione; implementazione soltanto dopo rilascio PO08 verificato. Piano completo e deploy autorizzati. Root unico writer per la piccola modifica, con revisione indipendente in sola lettura se necessaria.

Spostare il tab esistente dimissione fuori dal gruppo Moduli in un gruppo principale autonomo immediatamente dopo Documenti. Conservare lo stesso TabId, componente, dati, stampa e permessi; nessuna scrittura avviene aprendo la destinazione. Tassonomia unica tabGroups.ts, link diretti e Agnos coerenti.

Verifica: navigazione principale e vecchio initialTab dimissione arrivano allo stesso modulo; assenza di doppione nei Moduli; mobile/tablet/tastiera e intestazione paziente visibili. Non rifare il processo clinico o modificare DimissioneTab. Build e regressioni di navigazione pertinenti. Pubblicare frontend da commit immutabile; backend invariato se nessuna dipendenza.
