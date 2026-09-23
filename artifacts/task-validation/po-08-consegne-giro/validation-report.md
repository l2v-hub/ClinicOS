# PO08 — consegne dal giro pazienti

Baseline applicativa c52af623; root 370a3071. Piano, push e deploy autorizzati. Backend e frontend da worktree distinti, integrati solo dopo rilascio claim e verifica SHA. Una sola attività applicativa alla volta.

## Risultato

Ingresso generale Consegne sul giro, con ordine condiviso PO07, filtro camera server e compositore collegato al paziente. Il Feed resta la destinazione esplicita di dashboard e Agnos. Bozze per paziente in memoria di sessione, esito nominativo, Salva e prossimo protetto da cambio selezione, ordine, sessione e nuova bozza.

Creazione REST/testo/voce con ricevuta attore/requestId e hash iniziale immutabile. Replay dopo modifica restituisce il record corrente; dopo eliminazione restituisce 410 senza ricrearlo. Scope verificato nella transazione. Riepiloghi batch nel doppio perimetro paziente/consegna, zero distinto da errore. Migrazione additiva 20260923030000_consegna_creation_receipts.

## Verifiche

- Backend worker: 126/126 test in 12 file, incluse 22 nuove prove PostgreSQL/HTTP. Typecheck, schema e diff verificati.
- Frontend worker: 116 prove passate; sei guardie statiche patientRosterGuard falliscono allo stesso modo sulla baseline c52af623. Lint comparato: 18 diagnostiche baseline, 18 candidate, nessuna aggiunta.
- Root: 5/5 prove HTTP/PostgreSQL su summary/privacy, camera/paginazione, quattro POST concorrenti, replay/edit/delete, giro su cinque pazienti e revoca scope. La stessa suite sulla baseline falliva tutti e cinque i casi perché mancavano i nuovi contratti.
- Revisione indipendente: due race frontend individuate e corrette (quick-add dopo cambio paziente e avanzamento tardivo dopo nuova bozza); ricontrollate dal revisore. Backend senza finding residui.
- Browser sintetico: cinque consegne consecutive senza digitare nomi, tutte aperte e associate ai cinque ID corretti. Bozze A/B conservate dopo cambio paziente e Feed. Risposta persa dopo commit e retry dopo cambio ordine producono un solo record. POST rallentato e selezione manuale B preservano B e la sua bozza.
- Bordo pagina: Salva e prossimo sulla riga 50 seleziona il primo paziente della pagina successiva. Camera 99 viene trovata server anche oltre la prima pagina. Cambio camera concorrente produce 409, ricarica l'elenco e conserva selezione/testo. Errore summary mostra "Riepilogo non disponibile" e retry, mai zero fittizio.
- Profilo outsider mostra solo il proprio paziente e nessuna bozza precedente. Ingresso dashboard apre Feed/attive. Mobile 390x844 senza overflow orizzontale, focus Salva visibile.

## Rifiniture e limiti

Eliminati breadcrumb/titolo duplicati nel Feed incorporato. Il test mobile ha evidenziato che l'identità poteva uscire dallo schermo durante la scrittura: intestazione del compositore resa persistente nel proprio modulo, con controlli finali dedicati.

Le prove browser e DB usano esclusivamente fixture sintetiche. Non certificano dispositivi fisici, osservazione di operatori reali o zoom nativo 200%. Warning dimensione bundle e lint baseline restano dichiarati. La guardia degli avanzamenti durante continuazione lenta è coperta dai test differiti; non è stata simulata una rete mobile fisica.

Build frontend finale e secret scan sorgenti/bundle verdi. Cinque prove mirate aggiuntive dopo rifinitura, typecheck e lint senza nuove diagnostiche. Mobile finale: identità top0/bottom156, nota top485/bottom619 e Salva visibile con focus; nessun overflow. Feed ha un solo h1 Consegne. Console finale senza errori/warning. Preview chiusa tramite endpoint di cleanup deterministico.

ALLOW_RELEASE: sorgenti worker finali verificati byte per byte, controlli pertinenti passati. Pubblicare backend con migrazione additiva e frontend dallo stesso commit immutabile. Le ricevute successive riportano deploy e smoke online in lettura. Il runtime AI è invariato. Continuare con PO09 dopo verifica del rilascio.
