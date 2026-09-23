# PO09 — Dimissione accanto a Documenti

GO dopo PO08 3582e0bf: backend ae45c28c SUCCESS con migrazione e health200; frontend dpl_CCDpCDBhUrjQi6wkFxbX4XCqCieX READY con sourceCommit alias verificato. Root unico writer nel worktree assegnato.

Dimissione è un'area principale subito dopo Documenti. La destinazione dimissione resta la stessa, rimossa soltanto dall'elenco secondario Moduli. DimissioneTab, dati, stampa e permessi non sono modificati. L'apertura non registra una dimissione.

11/11 test mirati navigazione/Agnos, build e secret scan sorgenti/bundle passati. Browser fixture sintetica: baseline richiede Moduli → Dimissione; candidate richiede un clic. Link precedente initialTab apre lo stesso modulo; nessun duplicato nei Moduli. Mobile390x844 senza overflow pagina, Documenti e Dimissione adiacenti, frecce tastiera in entrambe le direzioni; desktop1262x1032 e contatore scritture rimasto zero. Console finale vuota. Screenshot in qa-evidence.

La prima invocazione npm test ignorava gli argomenti mirati ed eseguiva tutta la suite, incontrando anche la guardia statica preesistente therapyAgendaDateGuard (attende una frase dell'Agenda già rimossa). Guard e OperatorAgenda identici al commit PO08: riprodotta separatamente, non attribuita a PO09. Non si dichiara verde l'intera suite. Le sei guardie roster baseline già documentate in PO08 restano note.

Fixture iniziale senza risposta strutturata intake-review e foglio print-forms: corrette soltanto nel preview prima delle schermate finali. Nessuna scrittura live. Nessuna verifica su dispositivi fisici o zoom nativo200% dichiarata.

Export release con lettura Git batch: hash Git blob e SHA256 verificati; i 483 file PO08 esportati con il nuovo helper coincidono esattamente con l'export precedente. Migliora solo la preparazione locale del deploy su Windows.

ALLOW_RELEASE: pubblicare soltanto frontend da commit immutabile, backend resta PO08. Dopo verifica alias/sourceCommit procedere a PO10.
