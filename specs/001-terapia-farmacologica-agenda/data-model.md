# Data Model: Terapia Farmacologica Unica e Agenda Coerente

## Entità Esistenti (nessuna migrazione richiesta)

### PatientTherapy

Terapia farmacologica assegnata a un paziente. Sorgente di verità per tutti gli slot Agenda.

| Campo                  | Tipo    | Obbligatorio | Note                                        |
| ---------------------- | ------- | :----------: | ------------------------------------------- |
| id                     | String  |      ✓       | CUID                                        |
| patientId              | String  |      ✓       | FK → Patient                                |
| farmacoNome            | String  |      ✓       | Nome commerciale o generico                 |
| dosaggio               | String  |      ✓       | es. "500mg", "1 cp"                         |
| viaSomministrazione    | String  |              | default: "orale"                            |
| tipo                   | String  |              | `periodica` \| `una_tantum` \| `al_bisogno` |
| stato                  | String  |              | `attiva` \| `sospesa` \| `conclusa`         |
| dataInizio             | String  |      ✓       | YYYY-MM-DD                                  |
| dataFine               | String  |              | YYYY-MM-DD, opzionale                       |
| fasceMattina           | Boolean |              | slot 08:00                                  |
| fascePranzo            | Boolean |              | slot 12:00                                  |
| fascePomeriggio        | Boolean |              | slot 16:00                                  |
| fasceSera              | Boolean |              | slot 20:00                                  |
| fasceNotte             | Boolean |              | slot 22:00                                  |
| orarioSpecifico        | String  |              | orario puntuale opzionale                   |
| prescrittore           | String  |              | nome medico                                 |
| operatoreInseritore    | String  |              | nome operatore che ha inserito              |
| note                   | String  |              | libero                                      |
| dataSomministrazione   | String  |              | YYYY-MM-DD, solo per `una_tantum`           |
| orarioSomministrazione | String  |              | HH:MM, solo per `una_tantum`                |

**Vincoli logici (non in DB, enforced in backend/frontend):**

- `tipo = 'al_bisogno'` → le fasce orarie vengono ignorate; NON appare in Agenda
- `tipo = 'una_tantum'` → appare solo nel giorno esatto di `dataSomministrazione`
- `tipo = 'periodica'` → attiva da `dataInizio` a `dataFine` (se presente)
- Stato `conclusa` automatico: se `dataFine < oggi`

---

### MedicationAdministration

Registro di ogni somministrazione (erogata o non erogata) per data e fascia.

| Campo         | Tipo     | Obbligatorio | Note                                                       |
| ------------- | -------- | :----------: | ---------------------------------------------------------- |
| id            | String   |      ✓       | CUID                                                       |
| patientId     | String   |      ✓       | FK → Patient                                               |
| farmacoNome   | String   |      ✓       | deve corrispondere a PatientTherapy.farmacoNome            |
| farmacoDose   | String   |              | snapshot del dosaggio al momento dell'erogazione           |
| farmacoVia    | String   |              | snapshot della via al momento dell'erogazione              |
| date          | String   |      ✓       | YYYY-MM-DD                                                 |
| fascia        | String   |      ✓       | `mattina` \| `pranzo` \| `pomeriggio` \| `sera` \| `notte` |
| ora           | String   |              | HH:MM                                                      |
| stato         | String   |              | `da_erogare` \| `erogata` \| `non_erogata`                 |
| operatoreId   | String   |              | ID operatore                                               |
| operatoreNome | String   |              | nome operatore                                             |
| confirmedAt   | DateTime |              | timestamp di conferma erogazione                           |
| motivo        | String   |              | motivo non erogazione (obbligatorio se `non_erogata`)      |
| note          | String   |              | note libere                                                |

**Chiave univoca**: `(patientId, farmacoNome, date, fascia)` — impedisce doppia registrazione per lo stesso farmaco nello stesso slot.

---

## Relazioni

```
Patient (1) ──────── (N) PatientTherapy
Patient (1) ──────── (N) MedicationAdministration
PatientTherapy → Agenda (read-only, filter by stato/date/fascia)
PatientTherapy + MedicationAdministration → TherapySlot API response
```

---

## State Transitions

### PatientTherapy.stato

```
           [inserimento]
                │
                ▼
            ┌────────┐
            │ attiva │ ◄────────────────────────┐
            └────────┘                          │
                │ sospendi()                     │ riattiva()
                ▼                               │
           ┌─────────┐                    ┌─────────┐
           │ sospesa │ ───────────────────►         │
           └─────────┘                    └─────────┘
                │ dataFine < oggi
                ▼
           ┌──────────┐
           │ conclusa │  (anche: modifica stato → conclusa)
           └──────────┘
```

### MedicationAdministration.stato

```
  [therapy slot loaded]
          │
          ▼
    ┌──────────────┐
    │  da_erogare  │ (initial / pending)
    └──────────────┘
          │                      │
    erogata()             non_erogata(motivo)
          │                      │
          ▼                      ▼
    ┌─────────┐           ┌─────────────────┐
    │ erogata │           │  non_erogata    │
    └─────────┘           └─────────────────┘
    (terminal — cannot re-administer same slot)
```

---

## Filtro Agenda (logica del backend therapy.ts)

```
Per ogni terapia PatientTherapy:
  1. stato = 'attiva'                      → include
  2. patient non null                      → include (escludi orfane)
  3. tipo = 'al_bisogno'                   → ESCLUDI sempre dall'Agenda
  4. tipo = 'una_tantum'                   → includi SOLO se dataSomministrazione = date
  5. tipo = 'periodica'
     - dataInizio > date                   → ESCLUDI (non ancora iniziata)
     - dataFine && dataFine < date          → ESCLUDI (conclusa)
     - altrimenti                          → includi
  6. Per ciascun slot (fascia):
     - [fascia_flag] = true               → includi in quel slot
     - farmacoNome vuoto OR dosaggio vuoto → ESCLUDI (orfana)
```
