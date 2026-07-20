# Task Contract — QA Gate PR #292 (batch issues #278–#285)

- **PR**: #292 `fix/issues-278-285-ux-batch` @ commit `778a2f8a30afbe91397e32a1946bf2dc41ea7038`
- **Session**: independent QA gate (did not write the code; review/build/test/evidence only)
- **Evidence root**: `artifacts/task-validation/292-batch-qa-gate/`
- **Note**: every issue carries a dev-attached "READY FOR CODEX QA" evidence comment at 778a2f8.
  That evidence is noted but NOT accepted as QA evidence — all Playwright specs are re-run
  independently by this session against a locally started stack.

## Issue #278 — ANAMNESI (editabile)

Testo: "Rendi la sezione ANAMNESI modificabile non è solo in lettura."

- AC278.1: nella scheda paziente la sezione Anamnesi è modificabile (non più read-only).
- AC278.2: la modifica viene salvata e persiste dopo reload completo.
- AC278.3: nessun errore console / HTTP 4xx-5xx rilevante durante il flusso.

## Issue #279 — Header va eliminato (import documenti)

Testo: header istituzionale ripetuto su ogni pagina (formato tabella markdown, es. "Codice
fiscale" come cella, "Numero Nosografico") va rimosso dall'import.

- AC279.1: header in formato tabella ripetuto su più pagine → rimosso (tenuto una sola volta).
- AC279.2: contenuto clinico (incl. tabelle di contenuto, es. terapia) resta intatto.
- AC279.3: banner istituzionale sopra la tabella header assorbito nella rimozione.

## Issue #280 — Import Terapia (form reale + testo originale)

Testo: la schermata di review terapie importate deve mostrare anche la parte originale del
documento e usare LO STESSO form della creazione manuale della terapia, precompilato.

- AC280.1: ogni riga rilevata è editata nel form reale della creazione terapia, precompilato.
- AC280.2: il testo originale estratto dal documento è visibile accanto per confronto.
- AC280.3: una modifica nel form sopravvive alla conferma (la terapia creata la riflette).
- AC280.4: righe incomplete restano segnalate "da verificare" (mai perse).

## Issue #281 — Ultima schermata Import (recap leggibile)

Testo: l'ultima schermata del processo d'importazione è senza stile e illeggibile; serve un
recap leggibile delle informazioni che si aggiungeranno.

- AC281.1: il recap mostra i VALORI reali (terapie con orari, allergie con gravità,
  anamnesi/diagnosi, anagrafica estesa), non solo i nomi delle sezioni.
- AC281.2: la schermata è stilata (card/sezioni con bordo, layout leggibile).
- AC281.3: nessun errore console / HTTP rilevante.

## Issue #282 — Creazione Paziente (bottone finale inerte)

Testo: l'ultimo step della creazione paziente non funziona: il pulsante viene premuto ma non
succede nulla.

- AC282.1: allo step finale il gate che blocca "Crea paziente" è visibile e sbloccabile lì
  (checkbox conferma terapia presente nello step Verifica).
- AC282.2: spuntate le conferme, il bottone si abilita e crea davvero il paziente (confirm 201).
- AC282.3: il paziente creato persiste dopo reload.

## Issue #283 — Dashboard Consegne aperte (navigazione mirata)

Testo: la card "Consegne aperte" deve portare direttamente alla consegna aperta se è una sola;
se sono più di una, mostrare le consegne filtrate sulle aperte.

- AC283.1: click sulla card → pagina Consegne già filtrata sulle aperte.
- AC283.2: con UNA sola consegna aperta, la card corrispondente è evidenziata e scrollata in vista.
- AC283.3: la navigazione generica (sidebar) apre la vista non filtrata (reset filtro/focus).

## Issue #284 — Agenda (compattare)

Testo: l'agenda occupa troppo spazio; va collassata mantenendo la leggibilità.

- AC284.1: slot agenda operatore più compatti (hour ≤48px, half ≤32px; prima 64/44).
- AC284.2: più fasce orarie visibili a parità di viewport (≥13 slot a 1280x800).
- AC284.3: agenda admin multi-operatore compattata (cella hour ≤42px) senza perdere interazioni.

## Issue #285 — Persistenza dei dati (CRUD → DB)

Testo: ogni CRUD in qualsiasi pagina deve salvare nel DB; alcuni dati spariscono a fine
sessione (sia Operatore che Amministratore).

- AC285.1: gli orari operatori (admin "Orari") sono persistiti su DB
  (PUT /operators/:id/schedule 200 + GET /operators/schedules li restituisce).
- AC285.2: gli orari salvati persistono dopo reload completo della pagina.
- AC285.3: il widget agenda della dashboard deriva da appuntamenti reali (MOCK_AGENDA rimosso).
- Nota gate: modifiche a backend/Prisma sono ESPLICITAMENTE richieste da questo issue
  (persistenza su DB) e da #279 (filtro header nell'import backend) → ammesse.
