# PO14 — baseline e ambito

Baseline applicativa 6f8b7ded54084c4a380f94b61f9aa520b698a09c, PO13 MNA. Il codice GDS-15 non è presente nella baseline. Il contratto e il DTO preparatorio concordato guidano l'implementazione.

Writer backend e frontend in worktree distinti, root responsabile dell'integrazione, HTTP/PostgreSQL sintetico, browser e pubblicazione. Il tab paziente `gds` corrisponde al tipo persistente `gds15`; nessuna conversione delle altre scale. I launcher utente sono esclusi dall'integrazione.

Il banco browser root riserva la porta loopback 4195. Nessun test scrive sui pazienti online; l'eventuale verifica del deployment è di sola lettura. La creazione della fixture e dei verificatori non costituisce prova eseguita: gli esiti sono registrati separatamente dopo il GO e l'integrazione.

Prova di baseline eseguita: `node --import tsx --test tests/integration/po14-gds.test.mts`, exit1. Entrambe le prove restituiscono400 perché il tipo GDS15 non è ancora supportato (creazione e current); PostgreSQL sintetico chiuso regolarmente. Il log è in baseline-tests.log. Le stesse prove saranno eseguite sul candidato integrato.
