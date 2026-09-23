# PO13 — addendum snapshot K

Root ha autorizzato esplicitamente questo addendum minimo al DTO 9d24743fafe6b78ce71dc4c119603ccae1bdde6babbe44907b30bf79b8e9eb2a durante l'implementazione. Soltanto items[K] aggiunge subitems, sempre tre voci nell'ordine dairyDaily, eggsOrLegumesWeekly, meatFishOrPoultryDaily. Ogni voce conserva id, label congelata e answer boolean|null. Gli altri item omettono subitems.

K incompleto mantiene score e description null. Il PDF rende le tre domande e risposte dai subitems congelati, senza etichette tratte dalla definizione runtime. Answers, history e tutte le altre forme DTO restano invariate.
