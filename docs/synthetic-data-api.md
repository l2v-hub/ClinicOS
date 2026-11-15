# API dati sintetici — popolare e svuotare il sistema per le prove

Due chiamate per provare tutta l'applicazione: una crea un dataset inventato che copre ogni
schermata, l'altra cancella tutto e lascia il sistema pulito. Sono attive **solo dove l'ambiente
è dichiarato esplicitamente come di prova** (vedi «Sicurezze»): in ogni altro caso, produzione
reale compresa, rispondono 403.

| Chiamata                          | Cosa fa                                                |
| --------------------------------- | ------------------------------------------------------ |
| `GET  /admin/synthetic-data`      | Stato: abilitata in questo ambiente?, tier, conteggi   |
| `POST /admin/synthetic-data/seed` | Crea/aggiorna il dataset di prova (idempotente)        |
| `POST /admin/synthetic-data/wipe` | Elimina tutti i dati operativi — richiede una conferma |

Codice: `backend/src/routes/admin-synthetic-data.ts`, `backend/src/synthetic/`.

## Come si invocano

Serve un'identità con ruolo **amministratore** (`administrator`) o legacy admin/manager (stessa
autenticazione del resto dell'API: header demo `X-Operator-Id`/`X-Operator-Role`, token del
Simulatore ruoli oppure Bearer Entra). Il ruolo `supervisor` non è abilitato.

```bash
API=http://localhost:3001
AUTH=(-H "X-Operator-Id: SEED-OP-004" -H "X-Operator-Role: admin")
```

Stato e conteggi correnti:

```bash
curl -s "$API/admin/synthetic-data" "${AUTH[@]}"
```

Creare i dati di prova (si può ripetere: non duplica nulla):

```bash
curl -s -X POST "$API/admin/synthetic-data/seed" "${AUTH[@]}"
```

Svuotare il sistema (la frase di conferma è obbligatoria ed esatta):

```bash
curl -s -X POST "$API/admin/synthetic-data/wipe" "${AUTH[@]}" \
  -H "Content-Type: application/json" -d '{"confirm":"CANCELLA TUTTO"}'
```

Con il Simulatore ruoli (demo ospitata) si usa il token al posto degli header:

```bash
TOKEN=$(curl -s -X POST "$API/auth/simulator/session" -H "Content-Type: application/json" \
  -d '{"identityId":"SIM-ADMIN"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s -X POST "$API/admin/synthetic-data/seed" -H "Authorization: Bearer $TOKEN"
```

## Cosa crea il seed

Tutti i dati sono inventati, con chiavi fisse `SEED-…`. Il seed si può ripetere senza creare
duplicati, ma **riporta ai valori iniziali i record del dataset di base**: anagrafiche dei
pazienti `SEED-…`, letti e assegnazioni, stato e dosaggio delle terapie, appuntamenti e l'intera
cartella del paziente demo «Fabio Forlano». Non vengono invece toccati i dati aggiuntivi già
presenti (consegne, diario, note, orari, bozza) né ciò che è stato creato a mano durante le prove.

| Funzione dell'app           | Dati creati                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| Accesso / Operatori / Orari | 4 utenti e operatori (infermiere, OSS, fisioterapista, admin), 3 orari settimanali           |
| Pazienti / Posti letto      | 8 pazienti con CF valido, 4 camere, 8 letti, 8 assegnazioni                                  |
| Cartella clinica            | 8 cartelle e 13 note cliniche + «Fabio Forlano» (`DEMO-FULL-001`) con ogni sezione compilata |
| Terapia / Turno             | 16 terapie con somministrazioni in giornata (comprese dosi in ritardo)                       |
| Agenda                      | 5 appuntamenti nei prossimi giorni                                                           |
| Consegne                    | 5 consegne: urgente, alta, normale; aperta, in corso, completata                             |
| Diario                      | 5 voci (infermiere, OSS, fisioterapista), una urgente                                        |
| Parametri                   | 5 rilevazioni di ieri (anche con NEWS2 alterato); «oggi» resta da registrare                 |
| Note fra operatori          | 2 note (una a tutti, una personale)                                                          |
| Nuovo ingresso              | 1 bozza a mano già avviata, per provare «Riprendi bozza» ed «Elimina bozza»                  |

La risposta riporta i conteggi finali (`counts`) e l'id del paziente demo completo.

## Cosa elimina (e cosa conserva) il wipe

**Elimina** tutti i dati operativi: pazienti e ciò che vi è collegato (cartella, documenti,
valutazioni, terapie, somministrazioni, diario, parametri, assegnazioni letto), agenda, consegne,
note, bozze d'ingresso, sessioni d'import con i loro file temporanei, camere e letti, orari.

**Conserva** ciò che serve per continuare a usare il sistema: identità di accesso (utenti e
operatori con le loro preferenze), policy dei ruoli, anagrafica farmaci AIFA e **audit** (la traccia
di chi ha svuotato il sistema non si cancella).

Dopo il wipe l'applicazione si apre normalmente con elenchi vuoti; un nuovo seed la ripopola.
L'elenco completo delle tabelle è in `backend/src/synthetic/wipe.ts` (`WIPED_TABLES`,
`PRESERVED_TABLES`): un test fallisce se una nuova tabella dello schema non viene dichiarata in una
delle due liste.

## Sicurezze

Tutte lato server, in quest'ordine:

1. **Identità**: senza operatore autenticato → `401`.
2. **Ruolo e capability**: solo admin/manager; le capability `synthetic_data.status|seed|wipe` sono
   catalogate (dominio `dev`) e negate ai ruoli clinici → `403 capability_denied`.
3. **Ambiente** (`syntheticDataAvailability`) → `403 synthetic_data_disabled` quando non ammesso.
   La regola è «chiuso per default»: serve una dichiarazione esplicita e coerente; una variabile
   assente o scritta male non abilita mai nulla.

   | Ambiente               | Disponibile solo se                                                         |
   | ---------------------- | --------------------------------------------------------------------------- |
   | sviluppo / test        | `NODE_ENV` è letteralmente `development` o `test`                           |
   | demo                   | `CLINICOS_ENV=demo` esplicito **e** `DEMO_DATASET_ID=synthetic-v1`          |
   | staging                | `CLINICOS_ENV=staging` esplicito **e** `SYNTHETIC_DATA_API_ENABLED=true`    |
   | produzione, altri casi | **mai** (`NODE_ENV` assente o errato, tier scritto male, demo solo dedotta) |

4. **Conferma** (solo wipe): senza `{"confirm":"CANCELLA TUTTO"}` → `400 confirmation_required`.
5. **Audit**: seed e wipe, anche rifiutati, sono registrati con identità, ruolo ed esito dal
   controllo delle capability (attivo su ogni ambiente ospitato; in locale si può disattivare con
   `AUTHZ_ENFORCEMENT=off`, e in quel caso non c'è traccia).

Il wipe è una sola transazione: se qualcosa fallisce non viene eliminato nulla. Alcune tabelle
cliniche sono protette da trigger «append-only»; il wipe li sospende solo dentro la transazione e
li riattiva prima del commit.

> Nota sulle policy salvate: se nell'ambiente è attiva una policy dei ruoli salvata dalla pagina
> **Ruoli**, le nuove capability nascono negate (default della policy). Abilitale per il ruolo
> amministratore dalla pagina Ruoli, oppure usa un'identità con ruolo legacy admin/manager.

## Test

```bash
# guardie (non scrivono né cancellano): girano con la suite backend
cd backend && npm test

# giro completo seed → wipe → seed. DISTRUTTIVO per il database puntato da DATABASE_URL: opt-in,
# e solo in un ambiente in cui l'API stessa sarebbe ammessa
SYNTHETIC_DATA_DESTRUCTIVE_TESTS=1 AUTH_MODE=demo NODE_ENV=test node --import tsx --test \
  src/synthetic/__tests__/synthetic-data-destructive-db.test.ts
```

Lo script CLI `backend/src/seed.ts` (`npm run db:seed`) resta disponibile e usa lo stesso dataset
di base (`backend/src/synthetic/demo-dataset.ts`).
