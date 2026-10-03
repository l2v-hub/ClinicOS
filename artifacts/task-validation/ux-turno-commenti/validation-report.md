# Verifica UX — Turno e cartella paziente

Data: 3 ottobre 2026. Modifiche locali nel worktree `C:/Workspace/ClinicOSHouse/.worktrees/ux-turno-review`. Base: `c39e2d103539364cb1d981377e578841f6fb33b3`. Identità dei sorgenti e del lockfile: [source-snapshot.json](source-snapshot.json). Nessun commit, push o pubblicazione.

## Risultato implementato

Il turno mostra al massimo cinque consegne, ordinate per urgenza attiva, attenzione e data, al posto delle card paziente che ripetevano le terapie. Adesso separa nome, posizione, dose, orario e ritardo. Le segnalazioni dichiarano la categoria con testo e colore e usano il numero della categoria mostrata.

Intestazione e navigazione mostrano lo stesso aggregato delle consegne critiche. Il contatore cambia dopo la conferma riuscita “Ho capito”; aprire una nota non conferma la presa visione. La conferma è condivisa secondo il protocollo esistente: la prima conferma di un collega disattiva l’urgenza operativa e conserva nome, ruolo e data nello storico. L’autore non può confermare la propria urgenza. La UI non dichiara completata l’attività clinica. Un errore nella conferma lascia nota e pulsante disponibili per riprovare.

Note è rimossa dalla navigazione; i dati e la route della casella messaggi sono conservati. L’assistente si chiama Milo, con descrizione esplicita di assistente clinico AI. Il diario non mostra COMPLETATA, distingue l’urgenza attiva da quella presa in carico e conserva la tracciabilità. Le allergie gravi sono un’attenzione permanente, separata dal resto. I parametri occupano card compatte e hanno un dialogo espandibile con scorrimento, Escape e ritorno del focus.

## Criteri di accettazione

| Criterio | Esito | Evidenza |
|---|---|---|
| AC1 — Consegne ordinate, deduplicate e limitate; stati di disponibilità | PASS | Test handoverPreview; errore/Riprova e anteprima nel runtime |
| AC2 — Adesso; ritardo distinto dall’urgenza; allergie permanenti | PASS | Test SSR; schermata reale con terapia simulata; screenshot a 390/1161/1575 px |
| AC3 — Contatori aggiornati dopo conferma riuscita | PASS | Aggregato 12 con anteprima di 2; fallimento conserva 12, conferma porta entrambi a 11; evento verificato nell’App reale |
| AC4 — Note rimossa; layout responsivo; tastiera e console | PASS | Entrambi i ruoli; 390/768/1161/1575 px senza overflow; menu mobile chiuso fuori schermo; zero errori console inattesi |
| AC5 — Nome dell’assistente e natura AI dichiarata | PASS | Intestazione, sidebar, modalità assistente e pannello Agnos |
| AC6 — Diario tracciabile, parametri espandibili e allergie separate | PASS | Errore e successiva conferma, storico dopo reload; focus/Escape; dialogo a 390×600 e 768×500 px; sei card alte 102 px nel fixture |

## Verifiche

| Verifica | Esito | Resoconto |
|---|---|---|
| Contratto di lavoro | PASS | `node scripts/quality-gate/validate-task-contract.js ux-turno-commenti` |
| Build TypeScript e Vite | PASS | [build.txt](test-results/build.txt), 660 moduli; avviso esistente sulla dimensione dei chunk |
| Test mirati | PASS — 59/59 | [focused.txt](test-results/focused.txt) |
| Suite frontend completa | 1084 PASS, 9 FAIL | [full-frontend.txt](test-results/full-frontend.txt) |
| Confronto con codice originale | Stessi 9 FAIL | [baseline.txt](test-results/baseline.txt), 19 test, 10 PASS |
| Runtime Playwright | PASS | [runtime.json](test-results/runtime.json), [traccia](trace/ux-turno.zip), [video](video/ux-turno.webm) |
| ESLint nuovi componenti e helper | PASS | TurnoHandovers, VitalsOverview, HandoverEntryButton, handoverPreview |
| Whitespace diff | PASS | `git diff --check` |

I nove errori preesistenti riguardano un import del worker PDF nel runner Node, un controllo del wizard paziente, sei controlli della pagina parametri multipaziente e un controllo dell’agenda terapia settimanale/mensile. Nessuna nuova regressione rilevata nella suite completa. Questi problemi restano fuori dall’ambito della revisione.

## Anteprime

- [Turno reale con terapia in ritardo — desktop](screenshots/real-app-overdue-1575.png)
- [Turno reale con terapia in ritardo — larghezza 1161](screenshots/real-app-overdue-1161.png)
- [Turno reale con terapia in ritardo — telefono](screenshots/real-app-overdue-390.png)
- [Cartella: componenti reali con dati sintetici](screenshots/patient-1161.png)
- [Cartella: telefono](screenshots/patient-390.png)

La cartella è verificata in un fixture dei componenti reali; il turno, l’intestazione e il listener dei contatori sono verificati anche nell’App completa. Tutte le chiamate API sono intercettate e servono dati sintetici. Il reload verifica la rappresentazione della risposta persistita simulata; non è una prova di persistenza nel database reale.

Il revisore indipendente ha individuato tre problemi corretti durante il lavoro: conteggio della categoria notifiche, scorrimento del dialogo parametri e nome del pannello assistente. Non ha riesaminato direttamente l’ultimo diff e le ultime screenshot; il suo tentativo indipendente di eseguire i test era limitato dalla sandbox e il successivo comando è stato annullato. I risultati finali sopra riportati sono stati eseguiti e controllati dal coordinatore. Il revisore non ha segnalato ulteriori blocchi sulla base delle verifiche disponibili.

## Limiti e decisione

L’anteprima è una selezione limitata del server, non l’intero elenco. I contatori usano il totale del server, mai la lunghezza dell’anteprima. La conferma è condivisa dal team, non un conteggio personale di messaggi non letti. Backend, schema, autorizzazioni e regole cliniche non sono modificati. Milo è il nome proposto in assenza di una diversa preferenza.

Verificato per i criteri della revisione UX. La suite generale conserva i nove errori preesistenti documentati. Modifiche pronte per revisione locale; il sito Vercel non è aggiornato.

## Ricevuta di decisione

Autorizzazione: osservazioni UX dell’utente e conferma “Alla conferma Ho capito”. Esecuzione: un solo writer in worktree isolato e revisore indipendente in sola lettura. Operazioni consentite: modifiche frontend, test sintetici, build e prove locali. Nessuna autorizzazione di rilascio è stata inferita. Sorgenti identificati dalla base Git e dagli hash della snapshot; dipendenze riutilizzate senza installazioni o modifiche ai manifest. Ruflo non disponibile; coordinamento tramite strumenti Codex, come dichiarato nel contratto.
