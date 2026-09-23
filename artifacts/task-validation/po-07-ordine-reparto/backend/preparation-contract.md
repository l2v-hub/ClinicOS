# PO-07 backend: contratto e piano preparatorio

Stato: solo preparazione e artefatti. Il GO applicativo deve arrivare da root dopo il rilascio PO-06.

- Worktree esclusivo: `C:/Workspace/ClinicOSHouse-worktrees/po07-roster-order`.
- Branch: `codex/po07-roster-order`.
- Baseline verificata: `853b40750c25f24ef40db622674612aaf64bf2cb`.
- Claim: `PO-07-backend-preparation`, `agent:codex-po07-backend:coder`.
- Contratto integratore: `C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/artifacts/task-validation/po-07-ordine-reparto/task-contract.md`.
- SHA256 contratto letto: `00d000f13ad6dc19a31d5ba1e71bc4cfec93775c1279a7acfcf656f98b641642`.
- Root possiede integrazione, manifest/dipendenze, browser, performance e pubblicazione. Il worker non avvia server browser, non fa commit/push/deploy.
- `run-claude-queue.ps1` e `start-claude-team.ps1` sono modifiche preesistenti estranee.

## Contratto di ordinamento e scope

```ts
type RosterOrder = {
  criterion: 'name' | 'location';
  direction: 'asc' | 'desc';
};
type RosterContextDto = { id: string; label: string; version: string };
type RosterEpochDto = { roster: string; therapy?: string };
type AppliedRosterOrder = {
  context: RosterContextDto | null;
  order: RosterOrder;
  source: 'personal' | 'department' | 'system' | 'temporary';
  revision: string | null;
  temporary: boolean;
  asOf: string;
  epoch: RosterEpochDto;
};
type RosterPreferenceDto = {
  context: RosterContextDto | null;
  default: RosterOrder | null;
  override: RosterOrder | null;
  effective: RosterOrder;
  source: 'personal' | 'department' | 'system';
  revision: string | null;
  canEdit: boolean;
  canEditDefault: boolean;
  temporary: boolean;
  reason: 'profile_missing' | null;
};
```

La preferenza risolve override personale, poi default del contesto, poi `name/asc`. `Operator.department` del database determina il contesto; il contesto non filtra e non amplia il patientScope. Nessun valore da `App.utente.reparto` o da mockData partecipa ad autorizzazione o configurazione persistita.

Profilo Operator assente: `context:null`, `revision:null`, `canEdit:false`, `temporary:true`, `reason:profile_missing`, ordine sistema. Nessuna creazione implicita del profilo. Profilo presente senza reparto: vero contesto `Senza reparto`; preferenza assente ha revisione stringa `0`. La facolta di modificare default resta distinta, legata a ruolo autenticato admin/manager.

## API concordata con frontend

| Endpoint | Contratto |
| --- | --- |
| `GET /me/roster-order` | `RosterPreferenceDto`, nessuna scrittura implicita |
| `PATCH /me/roster-order` | body `{contextId, override: RosterOrder|null, expectedVersion:string}`; risposta `RosterPreferenceDto` |
| `GET /admin/roster-contexts` | elenco bounded, default 50/max100, cursore; `items` con ID, label, default nullable e version |
| `PATCH /admin/roster-contexts/:id` | body `{default: RosterOrder|null, expectedVersion:string}`; restituisce il contesto aggiornato |
| Pagine Pazienti, Parametri, Terapia | query `sort=name|location`, `direction=asc|desc`, `contextId` facoltativi; aggiunta top-level `roster: AppliedRosterOrder` |

`sort/direction` sono una coppia: se omessa, il server risolve l'ordine effettivo persistito. La coppia esplicita permette un ordine temporaneo anche se il salvataggio personale fallisce. `source:temporary` nella pagina quando diverge da effective o manca il profilo. `contextId` e un controllo di coerenza con il contesto autenticato, non un selettore di pazienti.

Identity page e POST search accettano `asOf` opzionale canonico `YYYY-MM-DD`, default `facilityToday()` Europe/Rome. Il bootstrap Parametri passa il proprio giorno come `asOf`; la pagina Parametri continua a usare `date`, Terapia usa `date`. Le risposte dichiarano sempre il giorno applicato. La ricerca nominativa resta POST.

Envelope esistenti conservati: Pazienti/Parametri `items/hasMore/nextCursor`; Terapia `slots/pageInfo`, compresi completezza, loadedTherapies e riepiloghi esatti. Consegne resta feed cronologico e non viene modificato in PO-07.

Tutte le risposte sono private/no-store. Nessun `operatorId` accettato dal client per preferenze personali. CAS errato restituisce 409; il frontend rilegge prima di riprovare. Cursore ben formato ma superato restituisce `409 {code:'roster_changed', ...}` e richiede prima pagina. Cursori malformati o valori fuori enum sono 400. Anchor fuori scope e anchor eliminata producono lo stesso 409, senza dati della posizione.

Codici concordati direttamente col frontend: CAS personale `409 roster_preference_conflict`, CAS default admin `409 roster_default_conflict`. ContextId obsoleto dopo cambio reparto restituisce `409 roster_changed` con `reason:context` sia nelle pagine sia nel PATCH personale. Il client abortisce, rilegge me e riparte una sola volta per roster_changed, conservando le bozze; un conflitto CAS richiede retry esplicito dopo refetch, senza sovrascrittura automatica.

Admin GET restituisce `{items:[{id,label,default:Order|null,version:string}],hasMore,nextCursor}`. Admin PATCH restituisce il singolo `{id,label,default,version}` aggiornato; PATCH personale restituisce il DTO completo di me.

## Schema minimo previsto dopo GO

| Modello/campo | Struttura |
| --- | --- |
| `RosterContext` | `id`, `departmentKey` unique, `label`, defaultCriterion/defaultDirection nullable, `version BigInt`, timestamp |
| `Operator.rosterContextId` | FK nullable a RosterContext |
| `OperatorRosterPreference` | chiave composta operatorId/contextId, criterion/direction nullable, `revision BigInt`, timestamp |
| `RosterEpoch` | singleton `id=1`, `roster BigInt`, `therapy BigInt` |

Enum controllati per criterio/direzione. Check DB: default e override entrambi null oppure entrambi valorizzati; singleton id=1; revisioni non negative. I contatori viaggiano come stringhe decimali, mai Number JavaScript.

`departmentKey` vale `none:` per reparto assente e `department:` + stringa DB esatta per reparti nominati. Il vero nome `Senza reparto` resta distinto dall'assenza. Nel backfill non applicare casefold, accent folding o trim che fondano reparti distinti. Il trattamento di `null` e stringa vuota e di assenza; whitespace non vuoto resta una stringa distinta. Le scritture amministrative esistenti hanno gia il loro trim: non introdurre una nuova normalizzazione retroattiva.

Trigger contesto BEFORE INSERT/UPDATE di Operator.department: risolve/crea il contesto relativo alla stringa memorizzata e aggiorna il FK nella stessa transazione. Non cambia ownership pazienti. Uno spostamento conserva la preferenza del vecchio contesto, recuperabile tornando al reparto. Nessuna nuova API per assegnare il contesto di un altro operatore.

CAS personale: assenza riga significa revisione `0`; primo inserimento porta a `1` solo con expectedVersion `0`. Aggiornamento incrementa solo con revisione attesa; reset imposta override null e conserva la riga/versione. Conflitto di inserimento concorrente e un 409, non un overwrite. PATCH verifica anche il contesto corrente nella stessa transazione. Default reparto ha versione CAS autonoma.

## Epoch e snapshot

Root ha approvato singleton globale conservativo: l'ownership non dipende dal reparto, quindi epoch per reparto non sarebbe una prova sufficiente. Pazienti/Parametri leggono `roster`; Terapia legge `roster` e `therapy`. Il contatore si aggiorna nella transazione che modifica i dati: rollback non invalida il paging.

| Fonte | Mutazioni pertinenti |
| --- | --- |
| Patient | insert/delete e variazioni identita/ownership, incluso sex/MRN usati dai filtri |
| PatientRoomAssignment | insert/delete e patientId/roomId/bedId/startDate/endDate |
| Room | insert/delete e numero/ID che influenzano la posizione |
| Bed | insert/delete e label/roomId/ID |
| Cartella | insert/delete o cambi di patientId/cameraNumero/lettoNumero; non ogni nota o parametro clinico |
| PatientTherapy | insert/delete e campi che cambiano terapie dovute o dati prescritti della pagina |
| TherapySchedule | insert/delete/update dei campi effettivi |
| MedicationAdministration | esclusa dall'epoch; nessuna invalidazione per ogni somministrazione |

Snapshot `RepeatableRead`: configurazione, epoch, selezione, ricostruzione anchor, enrichment PO-06 e riepiloghi usano lo stesso transaction client. Anche `findTherapyPageAdministrations` va adattato a riceverlo; lasciare quel helper su prisma globale romperebbe la garanzia. Reader senza `FOR UPDATE` sull'epoch: non bloccare le mutazioni cliniche con letture di roster.

Il cursore v3 lega vista, attore/ruolo, fingerprint completo dello scope, contesto/versione, revisione personale, ordine applicato, filtri normalizzati, asOf, epoch e anchor. Le restrizioni patientIds e registeredById sono entrambe incluse nel fingerprint come AND. La versione v2 non e riutilizzabile.

L'anchor contiene ID paziente e, per Terapia, ID terapia. Si ricostruisce la tupla sotto il medesimo scope, filtro di eleggibilita e snapshot; nessuna lettura di label fuori scope. Questa scelta evita label legacy arbitrariamente grandi e dati anagrafici nel token wire. Cambio giorno invalida il cursore anche senza scritture.

## Chiave naturale e pagina terapia

Usare il folding SQL gia presente in `alphabetical-order.ts`. Camera e letto si confrontano come array di token numerici/testuali; numeri normalizzati per lunghezza e cifre senza cast a interi di precisione limitata. Numericita e tipo di token sono deterministici, con collation C. Esempi: 1A, 1B, 2A, 2B, 10A. Nessun sort locale decide l'appartenenza di una pagina.

Tupla location: camera mancante ASC, chiave camera nella direzione scelta, letto mancante ASC, chiave letto nella direzione scelta, cognome ASC, nome ASC, patientId ASC. Tupla name: cognome/nome nella direzione scelta e patientId ASC. Terapia aggiunge therapyId ASC. Il keyset usa la stessa tupla con confronti per componente: un unico confronto di riga invertito non rispetterebbe i flag mancanti sempre ASC.

Terapia: selezione SQL dei candidati ordinati prima di limit+1, poi hydration bounded per ID nella stessa transazione, conservando l'ordine SQL. Un paziente puo continuare nella pagina successiva; il merge frontend per patientId/therapyId esistente resta valido. Riepiloghi esatti separati restano solo sulla prima pagina, nella stessa snapshot.

## File proposti, da reclamare dopo GO

Tutti i percorsi sono relativi al solo worktree assegnato.

- Nuovi: `backend/src/roster/order-contract.ts`, `order-key.ts`, `cursor.ts`, `preferences.ts`, `snapshot.ts`.
- Nuovo router: `backend/src/routes/roster-order.ts`; mount in `backend/src/app.ts`.
- Patient reader: `backend/src/patients/pagination.ts`, `identity-page.ts`, `parameters-page.ts`, `operational-identity.ts`; riuso di `alphabetical-order.ts`.
- Therapy reader: `backend/src/therapies/slot-page-query.ts`, `therapy-slots.ts`, `therapy-administration-page.ts`; nuovo `therapy-candidate-page.ts` per restare sotto 500 righe per file.
- Schema: `prisma/schema.prisma`; migrazione additiva prevista `prisma/migrations/20260923020000_roster_order_contexts/migration.sql` (ordine definitivo confermato al GO rispetto alle migrazioni della baseline).
- Test nuovi: `backend/src/roster/__tests__/cursor.test.ts`, `order-key-db.test.ts`, `preferences-db.test.ts`, `roster-pagination-db.test.ts`.
- Test esistenti pertinenti: patient pagination/alphabetical-pages e therapy slot-page-query/scope, adattati al vincolo v3 per vista. L'attuale test che condivide un cursore Pazienti con Parametri deve cambiare intenzionalmente: v3 lega la vista.

Non modificare package, lockfile o manifest dipendenze. I test HTTP/browser completi e il benchmark sorgente baseline/candidate restano coordinati da root.

## Verifiche necessarie dopo GO

1. Oltre 50 pazienti e piu pagine in quattro combinazioni criterio/direzione, nomi omonimi/accentati, chiavi 1A...10A, zero iniziali, mancanti e incoerenti; nessun salto/duplicato.
2. Scope ordinario/admin, fingerprint con entrambe restrizioni, contextId estraneo e anchor fuori scope senza PHI aggiuntiva.
3. Cambio nome/CF/sex/MRN/ownership, letto, room label, scalare legacy e reparto a meta paging: 409 coerente. Cambio giorno senza scritture: 409.
4. Mutazione durante read snapshot: pagina coerente con il vecchio epoch, successiva invalidata dopo commit; rollback non invalida; somministrazione non invalida.
5. Preferenze di due operatori indipendenti, default reparto, override, reset, persistenza, CAS concorrente, ritorno al vecchio reparto, profilo assente e reparto nullo distinti.
6. Terapie multiple dello stesso paziente attraverso il confine pagina, merge senza duplicati, totali esatti e scope identico a dettaglio/identita.
7. Proiezioni bounded, nessuna cartella intera o N+1; date/enum/cursor canonicali; typecheck e diff controllato; manifest con hash di schema, SQL e helper effettivamente eseguiti.

Frontend gia avvisato: bootstrap Parametri con stesso ordine/context/asOf; bozze e requestId di salvataggio incerto conservati nel parent per patientId durante reset pagina. Le intestazioni legacy CF/ricovero/segnalazioni restano ordinamenti temporanei dell'elenco caricato, con limite esplicito, separati dalla preferenza server condivisa.

## Runtime e generazione privata dopo GO

Verificato: root `node_modules` e junction verso `quality-loop-20260829`; `backend/node_modules/@prisma/client` e `backend/node_modules/.prisma/client` sono directory private; pdf-lib e junction in sola lettura. Nessuno di questi target e stato modificato durante la preparazione.

Prima della generazione, verificare con realpath che output e tutti i parent previsti restino nel worktree e non risolvano alla junction condivisa. Usare una copia schema negli artefatti con output esplicito verso la directory privata `backend/node_modules/.prisma/client`; non eseguire il normale script build che genera nel target implicito condiviso. Controllare l'output effettivo dopo il comando. Root ha autorizzato questa generazione privata soltanto dopo GO. Database dei test nativo loopback nuovo; mai usare DATABASE_URL ereditato o live.

Questa preparazione non afferma implementazione, test, migrazione o generazione completati.
