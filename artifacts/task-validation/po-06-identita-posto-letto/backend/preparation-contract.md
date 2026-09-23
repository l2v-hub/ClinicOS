# PO-06 backend: contratto preparatorio

Stato: preparazione autorizzata; nessuna modifica applicativa fino al GO di `/root`.

- Worktree esclusivo: `C:/Workspace/ClinicOSHouse-worktrees/po06-operational-identity`.
- Baseline: `0418463a94801bf2d22bdb3155eb6d4a05e9a2dd`.
- Esecutore: `/root/po01_backend_audit`; claim `PO-06-backend`, `agent:codex-po06-backend:coder`.
- Integratore unico: `/root`. Nessun commit, push, deploy, migrazione, nuova dipendenza o generazione Prisma delegati.
- Le modifiche preesistenti a `run-claude-queue.ps1` e `start-claude-team.ps1` sono estranee e non saranno toccate.

## DTO condiviso e punti di innesto

```ts
type PatientLocationDto = {
  status: 'assigned' | 'unassigned' | 'unavailable';
  source: 'assignment' | 'cartella' | null;
  room: string | null;
  bed: string | null;
  asOf: string;
};
type PatientIdentityDto = {
  id: string;
  firstName: string;
  lastName: string;
  codiceFiscale: string | null;
  dateOfBirth: string | null;
  location: PatientLocationDto;
};
```

`asOf` e la data di nascita del DTO condiviso sono giorni di calendario `YYYY-MM-DD`. Root ha approvato `asOf` come giorno, con `facilityToday()` Europe/Rome per la data corrente. I campi esistenti degli endpoint non cambiano formato; l'identita condivisa serializza la data di nascita senza orario. `loading` appartiene al client. Nome e cognome usano sempre i nomi wire inglesi sopra. Il frontend preferisce CF, altrimenti DOB disponibile, poi stato anagrafico esplicito; non usa MRN opaco come identificatore visivo.

| Reader | Aggiunta |
| --- | --- |
| `identity-page.ts` | `items[].location`; campi esistenti e formato DOB conservati |
| `parameters-page.ts` | `items[].patient.codiceFiscale`, `dateOfBirth`, `location` |
| `therapy-slots.ts` | `SlotPatient.codiceFiscale`, `dateOfBirth`, `location`; conserva `patientId`, nomi, somministrazioni |
| `consegne/read-service.ts` | `identity: PatientIdentityDto \| null` su feed e preview overview |

I vecchi campi camera/letto di Parametri e Terapia restano proiezioni compatibili della medesima posizione autorevole. Non si leggono dati cartella aggiuntivi per ricostruirli. Il frontend interpreta lo stato del DTO invece dei vecchi segnaposto testuali.

## Decisioni sulla posizione

1. `asOf` valido e confronti di intervallo giornalieri inclusivi: `startDate <= asOf` e `endDate == null || endDate >= asOf`.
2. Assegnazione attiva relazionale con Bed e Room coerenti: `assigned`, `source: assignment`, etichette `Room.numero` e `Bed.label`.
3. Verificare esplicitamente `assignment.roomId === bed.roomId`: il primo e uno scalare indipendente, non il FK del letto. Incoerenza attiva significa `unavailable`, senza etichette parziali.
4. Piu record attivi dello stesso letto/camera coerente possono collassare. Root ha approvato questa regola. Piu tuple distinte o record attivi incoerenti significano `unavailable`, senza scelta per data o `take: 1`.
5. Storia relazionale presente e nessun record attivo valido: `unassigned`, `source: assignment`, entrambe le etichette null. Nessun fallback legacy, anche per storia solo futura.
6. Date relazionali non canoniche, giorni impossibili o intervalli invertiti non provano assenza di assegnazione: `unavailable`, `source: assignment`. Non si eseguono cast SQL non protetti su stringhe legacy.
7. Nessuna storia relazionale e `asOf` odierno: fallback ai soli scalari stringa Cartella `cameraNumero` e `lettoNumero`, con trim. Nessuna conversione di oggetti, array, numeri o booleani in etichette.
8. Nessuna storia e riferimento diverso da oggi: `unavailable`, `source: null`; valori legacy non documentano una collocazione storica o futura.
9. Nessuna storia, data corrente e nessuna etichetta legacy: `unassigned`, `source: null`. Valori legacy presenti ma non stringa: `unavailable`, `source: cartella`. Una singola etichetta stringa non vuota puo essere resa come posizione legacy parziale `assigned`, lasciando l'altra null: il frontend deve esplicitare il dato mancante.
10. Errore del database non diventa `unassigned`. Il reader puo fallire secondo il comportamento HTTP esistente; nessuna identita sintetizzata da un errore. Nei feed Consegne un paziente non autorizzato produce `identity: null`.

Il giorno di Parametri e `query.date` validato, altrimenti oggi nella struttura; `month/year` selezionano il contenuto clinico mensile ma non implicano una data di assegnazione. Terapia usa la data richiesta gia validata, con ulteriore verifica al boundary del helper. Patient page e Consegne usano oggi.

## Proiezione SQL e scope

Il nuovo modulo `backend/src/patients/operational-identity.ts` contiene tipi, validazione data, frammento SQL riutilizzabile della posizione e caricatore batch. Il frammento usa alias SQL fissi interni; nessun identificatore o valore fornito dal client diventa SQL raw.

Il caricatore riceve un insieme deduplicato di ID gia limitato dal reader e uno scope esplicito compatibile con `TherapyPatientAccess`: eventuali `patientIds` e `registeredById` si intersecano sempre. Array ID vuoto restituisce subito una mappa vuota. L'assenza di restrizioni e riservata ai chiamanti con scope globale verificato. Si applica il patientScope anche quando gli ID provengono da una Consegna visibile.

Una query batch seleziona solo ID, nome/cognome, CF/DOB e il DTO posizione. La sottoproiezione relazionale aggrega per paziente: presenza di storia, invalidita di data/intervallo, numero di tuple attive coerenti, indicatori di incoerenza attiva, etichette di un'unica tupla. L'output SQL rimane una riga per paziente; non restituisce cronologie integrali al processo Node. Il fallback legge solo due valori JSON tipizzati e soltanto quando e consentito.

La validazione SQL delle date evita dipendenze da `pg_input_is_valid` e cast che lanciano errori: regex completa prima dei cast numerici in un CASE, poi limiti del giorno per mese e anno bisestile. La data di riferimento viene validata in TypeScript come data canonica con round trip. Tutte le stringhe arbitrarie sono parametri Prisma.

Parametri integra lo stesso frammento nella CTE di selezione quando filtra camera/letto, prima di `LIMIT limit+1`. Le colonne della posizione possono attraversare la CTE materializzata per riutilizzarle nella risposta senza una seconda interpretazione. La query finale continua a leggere soltanto la proiezione mensile richiesta e i conteggi giornalieri esatti. `view=entry` continua a restituire `parametriMensili: []`.

Patient page arricchisce solo gli ID visibili dopo limit+1. Terapia arricchisce una volta gli ID unici delle terapie effettivamente visibili, eliminando `roomAssignments.take: 1` e il vecchio fallback indipendente. Feed Consegne arricchisce solo gli ID della pagina; overview unisce gli ID delle due preview e fa un unico batch. Nessun N+1 di chiamate o API amministrativa camere.

Root ha autorizzato un fix stretto aggiuntivo in `therapyAccessSql`: applicare `patientIds AND registeredById` anche all'aggregato esatto, evitando che conteggi, righe e nuove identita divergano nello scope.

## Limiti invariati

- Nessun ordinamento/cursore PO-07, nuova preferenza reparto o inferenza del reparto dall'operatore.
- Ricerca POST pazienti, ordinamento alfabetico, filtri correnti, cursori e pagina limit+1 conservati.
- Feed Consegne cronologico, riepiloghi esatti e preview limitate conservati.
- Sorgenti terapia paged, schedulazione, dosi e risoluzione somministrazioni conservate.
- Nessuna cartella completa nella proiezione identita e nessuna estensione di autorizzazione.
- Non cambiare i conteggi Consegne per paziente o le bozze Parametri del frontend.

## Piano file e verifiche dopo GO

| File | Intervento |
| --- | --- |
| `backend/src/patients/operational-identity.ts` | helper condiviso, tipi DTO, SQL/data/scope batch |
| `backend/src/patients/identity-page.ts` | location su ID visibili |
| `backend/src/patients/parameters-page.ts` | DTO paziente e ricerca posizione autorevole prima del limite |
| `backend/src/therapies/therapy-slots.ts` | batch identita, rimozione lookup posizione divergente, AND scope aggregato |
| `backend/src/consegne/read-service.ts` | enrichment feed/preview con patientScope |
| `backend/src/patients/__tests__/operational-identity.test.ts` | test di boundary, query minima e bounded, data e scope |
| `backend/src/patients/__tests__/operational-identity-db.test.ts` | matrice relazionale/legacy su fixture sintetica |
| `backend/src/patients/__tests__/parameters-page-db.test.ts` | ricerca camera prima del limite, proiezione e contatori invariati |
| `backend/src/patients/__tests__/alphabetical-pages-db.test.ts` | ordine/cursore e nuovo DTO delle pagine |
| `backend/src/routes/__tests__/consegne-bounded-auth.test.ts` | patientScope distinto dalla visibilita feed, no leakage |
| `backend/src/therapies/__tests__/operational-identity.test.ts` | batch e identita negli slot, regressione intersezione scope |

I file test possono essere adattati agli harness gia esistenti senza cambiare fixture condivise o manifest. I nuovi file restano sotto 500 righe. Solo l'integratore puo cambiare dipendenze e lockfile. Nessun test e stato eseguito durante questa preparazione.

| Accettazione | Evidenza richiesta |
| --- | --- |
| Assegnazione corrente prevale su camera/letto legacy obsoleti | test DB con valori distinti |
| Assegnazione terminata o solo futura non ripristina legacy | test DB e source assignment senza etichette |
| Nessuna storia: corrente legacy ammesso, storico no | test con data odierna e precedente |
| Fine intervallo inclusiva, bisestile e cambio giorno Roma | test date reali, 29 febbraio valido/non valido e istante UTC vicino mezzanotte |
| Duplicato stessa tupla vs due tuple o roomId incoerente | test DB su record multipli |
| Date o intervalli corrotti non diventano unassigned | test regex/calendar/ordine intervallo |
| Scalare parziale, bianco, oggetto, array, numero | test senza stringificazione accidentale |
| Ricerca camera/letto autorevole prima del limite | oltre 25/50 pazienti, corrispondenza oltre la prima pagina alfabetica |
| Consegna visibile su paziente fuori patientScope | nome vecchio conservato, identity null, nessun nuovo CF/DOB/location |
| Unione scope terapia rispettata da dettagli/identita/totali | 1 paziente autorizzato e 1 altro ID richiesto; nessun conteggio o dato esterno |
| ID ripetuti nei feed/slot/preview | un batch per reader e input deduplicati |
| Minimizzazione dati | query/proiezione senza cartella intera, note cliniche o DTO amministrativo Room |
| Regressioni pagine | cursori senza duplicati, POST e filtri conservati, contatori esatti invariati |
| Integrita | diff limitato ai file dichiarati, typecheck, hash manifest finale su source state esatto |

Prima di importare Prisma nei test DB, selezionare soltanto il database sintetico loopback tramite fixture approvata dall'integratore. Una junction `node_modules` verso il checkout quality-loop e l'uso del client isolato root sono consentiti in sola lettura, ma non sono ancora stati creati in questo worktree. Non generare client nei target condivisi.

## Handoff preparatorio

La ricevuta in questa directory vincola la preparazione alla baseline e allo scope. Non afferma build, test o implementazione completati. Dopo GO: implementazione e test mirati, controllo diff, manifest con hash dei file cambiati e risultati; root riconcilia frontend/backend e decide integrazione/rilascio.
