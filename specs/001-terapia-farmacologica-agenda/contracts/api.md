# API Contracts: Terapia Farmacologica e Agenda

Base URL: `VITE_API_URL` (es. `http://localhost:3001` in locale, Railway in produzione)

---

## Terapia Farmacologica (CRUD)

### GET /patients/:patientId/therapies

Recupera tutte le terapie di un paziente.

**Response 200**:

```json
[
  {
    "id": "cuid",
    "patientId": "cuid",
    "farmacoNome": "Paracetamolo",
    "dosaggio": "500mg",
    "viaSomministrazione": "orale",
    "tipo": "periodica",
    "stato": "attiva",
    "dataInizio": "2026-01-01",
    "dataFine": null,
    "fasceMattina": true,
    "fascePranzo": false,
    "fascePomeriggio": false,
    "fasceSera": false,
    "fasceNotte": false,
    "orarioSpecifico": null,
    "prescrittore": "Dr. Rossi",
    "operatoreInseritore": "Mario Bianchi",
    "note": null,
    "dataSomministrazione": null,
    "orarioSomministrazione": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

**Response 404**: `{ "error": "Paziente non trovato" }`

---

### POST /patients/:patientId/therapies

Crea una nuova terapia.

**Request body**:

```json
{
  "farmacoNome": "Paracetamolo", // obbligatorio
  "dosaggio": "500mg", // obbligatorio
  "dataInizio": "2026-01-01", // obbligatorio
  "viaSomministrazione": "orale", // default: "orale"
  "tipo": "periodica", // "periodica" | "una_tantum" | "al_bisogno"
  "stato": "attiva", // "attiva" | "sospesa" | "conclusa"
  "dataFine": null,
  "fasceMattina": true,
  "fascePranzo": false,
  "fascePomeriggio": false,
  "fasceSera": false,
  "fasceNotte": false,
  "orarioSpecifico": null,
  "prescrittore": "Dr. Rossi",
  "operatoreInseritore": "Mario Bianchi",
  "note": null,
  "dataSomministrazione": null,
  "orarioSomministrazione": null
}
```

**Response 201**: oggetto PatientTherapy creato
**Response 400**: `{ "error": "Campi obbligatori: farmacoNome, dosaggio, dataInizio" }`
**Response 404**: `{ "error": "Paziente non trovato" }`

---

### PUT /patients/:patientId/therapies/:therapyId

Aggiorna una terapia esistente (qualsiasi campo).

**Request body**: subset dei campi (solo quelli da aggiornare)

```json
{ "stato": "sospesa" }
```

**Response 200**: oggetto PatientTherapy aggiornato
**Response 404**: `{ "error": "Terapia non trovata" }`

---

### DELETE /patients/:patientId/therapies/:therapyId

Elimina una terapia.

**Response 204**: no body
**Response 404**: `{ "error": "Terapia non trovata" }`

> ⚠️ La specifica richiede che le terapie sospese/concluse rimangano in storico.
> DELETE è disponibile ma non deve essere esposto come azione principale in UI
> per terapie sospese o concluse. Usare PUT stato=sospesa invece.

---

## Storico Somministrazioni

### GET /patients/:patientId/medication-administrations

Recupera lo storico somministrazioni di un paziente.

**Query params**:

- `date` (opzionale): filtra per data YYYY-MM-DD
- `limit` (opzionale): default 100

**Response 200**:

```json
[
  {
    "id": "cuid",
    "patientId": "cuid",
    "farmacoNome": "Paracetamolo",
    "farmacoDose": "500mg",
    "farmacoVia": "orale",
    "date": "2026-05-18",
    "fascia": "mattina",
    "ora": "08:00",
    "stato": "erogata",
    "operatoreId": null,
    "operatoreNome": "Mario Bianchi",
    "confirmedAt": "2026-05-18T08:05:00.000Z",
    "motivo": null,
    "note": null,
    "createdAt": "2026-05-18T08:05:00.000Z",
    "updatedAt": "2026-05-18T08:05:00.000Z"
  }
]
```

---

## Agenda Terapia

### GET /therapy-slots?date=YYYY-MM-DD

Recupera gli slot terapia per una data, raggruppati per fascia oraria.
Legge esclusivamente da PatientTherapy (stato=attiva, tipo≠al_bisogno, valida per la data).

**Query params**:

- `date` (opzionale): default oggi

**Response 200**:

```json
[
  {
    "id": "ts-mattina",
    "fascia": "mattina",
    "label": "Terapia Mattina",
    "ora": "08:00",
    "summary": {
      "total": 3,
      "administered": 1,
      "notAdministered": 0,
      "pending": 2
    },
    "patients": [
      {
        "patientId": "cuid",
        "firstName": "Mario",
        "lastName": "Rossi",
        "room": "101",
        "bed": "A",
        "administrations": [
          {
            "administrationId": "cuid-or-null",
            "therapyId": "cuid",
            "drugName": "Paracetamolo",
            "dosage": "500mg",
            "route": "orale",
            "scheduledTime": "08:00",
            "status": "pending",
            "administeredAt": null,
            "administeredBy": null,
            "notAdministeredReason": null
          }
        ]
      }
    ]
  }
]
```

> Solo slot con almeno 1 paziente sono inclusi nella risposta.

---

### POST /therapy-slots/confirm

Registra una somministrazione come "Erogata".

**Request body**:

```json
{
  "patientId": "cuid",
  "farmacoNome": "Paracetamolo",
  "farmacoDose": "500mg",
  "farmacoVia": "orale",
  "date": "2026-05-18",
  "fascia": "mattina",
  "ora": "08:00",
  "operatoreId": "op-id-or-empty",
  "operatoreNome": "Mario Bianchi",
  "therapyId": "cuid"
}
```

**Response 200**: oggetto MedicationAdministration creato/aggiornato
**Response 400**: `{ "error": "Campi obbligatori: patientId, farmacoNome, date, fascia" }`
**Response 409**: `{ "error": "Terapia già erogata", "existingRecord": { ... } }`

---

### POST /therapy-slots/not-administered

Registra una somministrazione come "Non erogata".

**Request body**:

```json
{
  "patientId": "cuid",
  "farmacoNome": "Paracetamolo",
  "farmacoDose": "500mg",
  "farmacoVia": "orale",
  "date": "2026-05-18",
  "fascia": "mattina",
  "ora": "08:00",
  "operatoreId": "op-id-or-empty",
  "operatoreNome": "Mario Bianchi",
  "motivo": "rifiutata_paziente",
  "note": "",
  "therapyId": "cuid"
}
```

**Response 200**: oggetto MedicationAdministration creato/aggiornato
**Response 400**: `{ "error": "Campi obbligatori: patientId, farmacoNome, date, fascia, motivo" }`

---

## Motivi Non Erogazione

Enum valori accettati per il campo `motivo`:

- `rifiutata_paziente`
- `paziente_assente`
- `sospesa_medico`
- `farmaco_non_disponibile`
- `impossibilita_clinica`
- `altro`
