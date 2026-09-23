# PO-07 — ordine condiviso del giro reparto

Baseline applicativa 853b4075; integratore 292ddc1a. Autorizzazione: piano completo, push e deploy confermati dall'utente. Backend e frontend integrati da worktree isolati dopo rilascio dei claim e controllo SHA dei 56 file. Manifest finale include le due fixture root e la rifinitura del requestKey.

## Risultato

Preferenza Cognome / Camera e letto con direzione, personale per contesto reparto e default amministrativo, usata da Pazienti, Parametri e Terapia. Ordine naturale SQL prima del limite, non assegnati ultimi, spareggi stabili. Contesto da Operator.department senza cambiamento del patientScope; profilo assente esplicito e nessuna creazione implicita. Migrazione additiva 20260923020000_roster_order_contexts. Cursori legati a scope, ordine, contesto, revisioni, data ed epoch; snapshot coerente. Consegne riceve il roster in PO-08.

La prima pagina non aspetta la preferenza personale. Le bozze Parametri vivono in memoria per patientId, compresa la richiesta incerta per un reinvio idempotente. CF/ricovero/segnalazioni conservano gli ordinamenti legacy sulle sole righe caricate, con limite esplicito.

## Verifiche

- Backend worker: 58/58 test in 13 file, PostgreSQL nativo isolato; typecheck, Prisma validate e diffcheck verdi.
- Frontend worker: 102/102 test e build. Lint comparato: nessuna nuova diagnostica; 8 diagnostiche preesistenti App.tsx restano aperte.
- Root: 6/6 prove HTTP/PostgreSQL su 72 pazienti, quattro ordini, date, paginazione terapie, scope, preferenze/CAS, contesto, epoch e profilo assente. Typecheck backend e build frontend finale dopo patch requestKey passati. Secret scan di sorgenti e bundle: zero findings.
- Rifinitura root: completare PATCH preferenza rinnova il requestKey con revision/contextVersion soltanto per scelta esplicita. Regressione browser riprodotta e corretta: cambio direzione, preferenza salvata, caricamento delle 72 righe senza 409. Bootstrap parallelo preservato.
- Browser sintetico: bozza FC/nota resta sul paziente dopo riordino e conflitto camera intenzionale; due POST con stessa key dopo risposta persa producono una sola rilevazione. Due rilevazioni intenzionali in totale sulla fixture, nessun dato live modificato.
- Preferenza rallentata 8 secondi: 50 pazienti già visibili. Mobile 390x844: bozza/campi leggibili e nessun overflow pagina. Default amministrativo salva e resetta correttamente; profili distinti non condividono l'override.
- Terapia: 100 dettagli poi 176, 66 gruppi, conteggi esatti e ordine camera. Reflow 640x720, focus/Escape con ritorno al comando di apertura. Console senza errori/warning. Nessuna somministrazione firmata.

## Misure e limiti

208 pazienti autorizzati, 516 terapie, PostgreSQL loopback, dieci letture calde dopo una fredda. Candidate finale eseguito da solo: Pazienti50 mediana 6,15→15,54ms (p90 17,49); Parametri25 4,37→13,31ms (p90 15,00); Terapia100 23,96→62,20ms (p90 69,88). Bytes rispettivamente 15526→16122, 10696→11327, 38102→38886. Il costo additivo di ordinamento/preferenze/snapshot è dichiarato; nessun miglioramento percentuale promesso. Niente cartelle intere o N+1 nei nuovi reader.

Il benchmark concorrente iniziale è conservato come diagnostico. Le richieste farmaci della fixture non verificano il catalogo (non montato nel preview). Reflow non equivale a zoom nativo 200%; prove con operatori e dispositivi fisici restano PO-16. Warning dimensione bundle e lint baseline dichiarati. Server sintetico arrestato, tab di collaudo chiusa.

## Decisione

ALLOW_RELEASE: verifiche pertinenti passate, integrazione e sorgenti tracciate. Pubblicare backend demo con migrazione additiva e frontend dallo stesso commit immutabile; runtime AI invariato. Task board e launcher PowerShell esclusi. Dopo verifica deploy procedere a PO-08 senza fermare il piano.
