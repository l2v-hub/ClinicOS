# PO-03 — Verifica e decisione di pubblicazione

ALLOW: modifica prevista dal piano approvato; pubblicazione sul backend Railway demo e frontend Vercel esistenti. Nessuna migrazione, modifica alle chiavi, modifica storica delle note o nuova autorizzazione clinica. Root è l'integratore; worker ha operato in worktree isolato e ha rilasciato il claim.

80 test mirati integrati passati, compreso il test PGlite che falliva sulla baseline. Build frontend e backend passate. Il worker ha verificato anche i tipi e i confini del parser. Diff esaminato da root: solo mapper note e riconoscimento dello span degli orari, oltre ai test. La UI di revisione e gli errori di PO-02 restano invariati; test component mantengono il testo originale visibile e distinto.

Il parser riconosce liste contigue esplicite di orari dopo i campi prescrittivi. Prosa clinica, intervalli e alternative restano nelle note e richiedono revisione. I connettori non vengono cancellati indiscriminatamente dal testo residuo. Il mapper non aggiunge origine/classe alle istruzioni operative; entrambe restano nella riga importata e nel documento.

Prova integrata: prescrizione alle 08:00 con controllo PA alle 22:00 → una sola somministrazione alle 08:00; istruzione di controllo conservata nelle note; sorgente originale invariata nella bozza; associazione alla terapia e bytes del documento conservati. Reinvio della conferma senza duplicati. Tutti i dati sono sintetici, database locale selezionato prima dell'import Prisma.

Rilascio: commit/push, export verificato dei blob, backend SUCCESS/health, frontend READY con alias al commit, controllo del sito in lettura. Non è una convalida clinica generale del parser OCR né una riscrittura automatica di prescrizioni pregresse.
