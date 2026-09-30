# Skill Catalog — Phase 3

> Generated from `SKILL_CATALOG.json` (source of record `backend/src/skills/catalog.ts`) by
> `scripts/ai-architecture/build-skill-catalog.ts` + `render-skill-catalog.mjs`. Do not edit by hand.

Totals: skills 16 · TESTED 14 · DESIGNED 2 · confirmation policy v1

| skill_id | nome | categoria | tipo | conferma | tool richiesti | tool opzionali | ruoli previsti | stato | evidenze |
|---|---|---|---|---|---|---|---|---|---|
| `vitals.record` | Registra parametri vitali | clinical | write | SENSITIVE_WRITE | patients.search, parameters.create_reading | parameters.list_readings | doctor, nurse, oss, supervisor | TESTED | 6 |
| `diary.add_observation` | Aggiungi osservazione al diario | clinical | write | SENSITIVE_WRITE | patients.search, diary.create | diary.list | doctor, nurse, oss, supervisor | TESTED | 2 |
| `handover.create` | Crea consegna | operational | write | LOW_RISK_WRITE | patients.search, consegne.create | — | doctor, nurse, oss, supervisor | TESTED | 2 |
| `therapy.prescribe` | Prescrivi terapia | clinical | write | HIGH_RISK | patients.search, diary.therapy_preview, therapy.create | drugs.search | doctor | DESIGNED | 1 |
| `administration.record` | Registra somministrazione | clinical | action | HIGH_RISK | administration.list_slots, administration.confirm | administration.record_not_administered | nurse | DESIGNED | 0 |
| `vitals.recent` | Parametri recenti | query | read | READ | patients.search, parameters.list_readings | — | doctor, nurse, oss, supervisor | TESTED | 2 |
| `diary.recent` | Diario recente | query | read | READ | patients.search, diary.list | — | doctor, nurse, oss, supervisor | TESTED | 1 |
| `patient.overview` | Informazioni sull’ospite | query | read | READ | patients.search, patients.clinical_summary | parameters.list_readings | doctor, nurse, oss, supervisor | TESTED | 2 |
| `clinical.question` | Domanda sulla cartella | query | read | READ | assistant.query | — | doctor, nurse, oss, supervisor | TESTED | 1 |
| `therapy.due_administrations` | Somministrazioni del giorno | operational | read | READ | administration.list_slots | — | doctor, nurse, supervisor | TESTED | 2 |
| `handover.overview` | Situazione consegne | supervisory | read | READ | consegne.overview | — | doctor, nurse, oss, supervisor | TESTED | 1 |
| `appointments.day` | Appuntamenti del giorno | operational | read | READ | appointments.list | — | doctor, nurse, oss, supervisor | TESTED | 1 |
| `facility.occupancy` | Occupazione posti letto | supervisory | read | READ | rooms.occupancy | — | supervisor, administrator | TESTED | 1 |
| `drug.lookup` | Cerca farmaco | query | read | READ | drugs.search | — | doctor, nurse, oss, supervisor, administrator | TESTED | 1 |
| `patient.find` | Cerca ospite | query | read | READ | patients.search | — | doctor, nurse, oss, supervisor, administrator | TESTED | 1 |
| `admin.roster_contexts` | Ordinamenti dei reparti | administrative | read | READ | roster.list_contexts | — | administrator, supervisor | TESTED | 1 |

## Dettaglio

### `vitals.record` — Registra parametri vitali

Registra una rilevazione di parametri vitali (pressione, SpO2, frequenza cardiaca, temperatura, frequenza respiratoria, glicemia/DTX, ossigeno, coscienza) per un ospite.

- Input/contesto: patient, values · Output: Rilevazione salvata (id, orario) e verificata rileggendo le rilevazioni del giorno.
- Workflow: identify_patient: patients.search | contesto pagina → collect_values: slot values (validazione con parseParameterReading, la stessa del servizio) → preview: ospite, valori, orario, origine AI → confirm: atto esplicito dell’utente → execute: parameters.create_reading (requestId stabile → retry senza duplicati) → verify: parameters.list_readings (se disponibile) → audit: skill:vitals.record:* + tool:parameters.create_reading
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo. Valori mancanti o non validi → NEEDS_CLARIFICATION sui valori.
- Errori: Errore di validazione/servizio → FAILED con il messaggio del backend; retry riusa lo stesso requestId (dedupe del servizio).
- Audit: request, proposal (nomi dei campi), confirmation, execute (outcome) + evento del tool. · Sensibilità: high
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › B + I; backend/src/skills/__tests__/skills-e2e.test.ts › C; backend/src/skills/__tests__/skills-e2e.test.ts › D; backend/src/skills/__tests__/skills-e2e.test.ts › E; backend/src/skills/__tests__/skills-e2e.test.ts › H; backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (doctor)

### `diary.add_observation` — Aggiungi osservazione al diario

Aggiunge un'osservazione (nota di diario clinico-assistenziale) alla cartella di un ospite, attribuita all'operatore corrente.

- Input/contesto: patient, text · Output: Voce di diario creata (id, autore risolto dal server).
- Workflow: identify_patient: patients.search | contesto pagina → collect_text: slot text (testo integrale, mai riscritto) → preview: ospite, testo, categoria, origine AI → confirm → execute: diary.create (una sola esecuzione per workflow: il tool non è idempotente) → audit
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo.
- Errori: diary.create non è idempotente: il workflow blocca una seconda esecuzione; dopo un esito incerto non ritenta da solo.
- Audit: request, proposal, confirmation, execute + tool:diary.create. · Sensibilità: high
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › F; backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (oss)

### `handover.create` — Crea consegna

Crea una consegna (passaggio di informazioni al turno) riferita a un ospite.

- Input/contesto: patient, text · Output: Consegna creata (id, priorità normale).
- Workflow: identify_patient → collect_text → preview: ospite, testo, priorità normale, tipo assistenziale → confirm → execute: consegne.create (requestId stabile) → audit
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo.
- Errori: FAILED con il messaggio del backend; retry idempotente sul requestId.
- Audit: request, proposal, confirmation, execute + tool:consegne.create. · Sensibilità: medium
- **Da validare con il cliente:** Priorità e tipo di default (normale / assistenziale) da validare con il cliente.
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › G; backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (oss)

### `therapy.prescribe` — Prescrivi terapia

Nuova prescrizione farmacologica. Clinicamente critica: il medico la compila e conferma dalla scheda Terapia, l’assistente non la esegue.

- Input/contesto: patient, text · Output: Nessuna scrittura: indirizzamento alla scheda Terapia.
- Workflow: classify HIGH_RISK → handoff: scheda Terapia / Diario → Terapia (conferma umana)
- Ambiguità: Non applicabile: nessuna esecuzione.
- Errori: Non applicabile: nessuna esecuzione.
- Audit: request + denied (human_control_required). · Sensibilità: critical
- **Da validare con il cliente:** Se e come l’assistente possa preparare (mai confermare) una prescrizione va deciso con il cliente e il direttore sanitario.
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › D (hand-off, human_control_required)

### `administration.record` — Registra somministrazione

Conferma o mancata somministrazione di una terapia. Clinicamente critica: si esegue dal giro terapia, l’assistente non la esegue.

- Input/contesto: patient · Output: Nessuna scrittura: indirizzamento al giro terapia.
- Workflow: classify HIGH_RISK → handoff: Terapia → giro somministrazioni
- Ambiguità: Non applicabile: nessuna esecuzione.
- Errori: Non applicabile: nessuna esecuzione.
- Audit: request + denied (human_control_required). · Sensibilità: critical
- **Da validare con il cliente:** Somministrazione assistita da voce/AI da definire con il cliente (doppio controllo, identificazione ospite).
- Evidenze: nessuna (non eseguibile dall’assistente)

### `vitals.recent` — Parametri recenti

Mostra le ultime rilevazioni dei parametri vitali di un ospite.

- Input/contesto: patient · Output: Ultime rilevazioni (orario, valori).
- Workflow: identify_patient → read: parameters.list_readings (limit 5) → answer
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo.
- Errori: Errore di lettura → FAILED con il messaggio del backend.
- Audit: request + tool:parameters.list_readings. · Sensibilità: high
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › A; backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (oss)

### `diary.recent` — Diario recente

Mostra le ultime voci del diario di un ospite.

- Input/contesto: patient · Output: Ultime voci di diario (data, autore, testo breve).
- Workflow: identify_patient → read: diary.list → answer
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo.
- Errori: FAILED con il messaggio del backend.
- Audit: request + tool:diary.list. · Sensibilità: high
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (nurse)

### `patient.overview` — Informazioni sull’ospite

Mostra le informazioni disponibili su un ospite: stato ricovero, allergie, terapie, consegne aperte, ultimi parametri.

- Input/contesto: patient · Output: Sintesi clinica + ultima rilevazione (se consentita).
- Workflow: identify_patient → read: patients.clinical_summary → read (opzionale): parameters.list_readings → answer
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo.
- Errori: FAILED con il messaggio del backend; un tool opzionale negato riduce la risposta.
- Audit: request + tool:* invocati. · Sensibilità: high
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › A; backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (doctor)

### `clinical.question` — Domanda sulla cartella

Risponde a una domanda puntuale sulla cartella (allergie, terapie in corso, documenti) tramite l’assistente di sola lettura esistente.

- Input/contesto: query, patient? · Output: Risposta dell’assistente di sola lettura con le fonti.
- Workflow: read: assistant.query (domanda + ospite corrente) → answer
- Ambiguità: L’assistente di lettura gestisce da sé ospiti ambigui (chiede di specificare).
- Errori: FAILED con il messaggio del backend.
- Audit: request + tool:assistant.query. · Sensibilità: high
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (nurse)

### `therapy.due_administrations` — Somministrazioni del giorno

Elenca le somministrazioni previste in una giornata (giro terapia).

- Input/contesto: date? · Output: Somministrazioni per fascia e stato.
- Workflow: read: administration.list_slots (data, default oggi) → answer
- Ambiguità: Data assente → oggi (fuso Europe/Rome).
- Errori: FAILED con il messaggio del backend.
- Audit: request + tool:administration.list_slots. · Sensibilità: high
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › D (OSS denied); backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (nurse)

### `handover.overview` — Situazione consegne

Riepilogo delle consegne aperte del reparto.

- Input/contesto: — · Output: Conteggi e consegne aperte.
- Workflow: read: consegne.overview → answer
- Ambiguità: Nessuna.
- Errori: FAILED con il messaggio del backend.
- Audit: request + tool:consegne.overview. · Sensibilità: medium
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (oss)

### `appointments.day` — Appuntamenti del giorno

Elenca gli appuntamenti di una giornata.

- Input/contesto: date? · Output: Appuntamenti (ora, ospite, tipologia).
- Workflow: read: appointments.list (data, default oggi) → answer
- Ambiguità: Data assente → oggi.
- Errori: FAILED con il messaggio del backend.
- Audit: request + tool:appointments.list. · Sensibilità: medium
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (doctor)

### `facility.occupancy` — Occupazione posti letto

Mostra l’occupazione di camere e posti letto della struttura.

- Input/contesto: — · Output: Posti letto totali, occupati, liberi.
- Workflow: read: rooms.occupancy → answer
- Ambiguità: Nessuna.
- Errori: FAILED con il messaggio del backend.
- Audit: request + tool:rooms.occupancy. · Sensibilità: low
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (supervisor, administrator)

### `drug.lookup` — Cerca farmaco

Cerca un farmaco nell’anagrafica farmaci.

- Input/contesto: query · Output: Farmaci corrispondenti (nome, principio attivo).
- Workflow: read: drugs.search → answer
- Ambiguità: Nome assente → NEEDS_CLARIFICATION.
- Errori: FAILED con il messaggio del backend.
- Audit: request + tool:drugs.search. · Sensibilità: low
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (administrator)

### `patient.find` — Cerca ospite

Cerca un ospite per nome, cognome o codice fiscale.

- Input/contesto: query · Output: Ospiti trovati (nome, camera/letto).
- Workflow: read: patients.search → answer
- Ambiguità: Testo assente → NEEDS_CLARIFICATION.
- Errori: FAILED con il messaggio del backend.
- Audit: request + tool:patients.search. · Sensibilità: medium
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (nurse)

### `admin.roster_contexts` — Ordinamenti dei reparti

Elenca i contesti di ordinamento degli elenchi ospiti (configurazione).

- Input/contesto: — · Output: Contesti e ordinamento predefinito.
- Workflow: read: roster.list_contexts → answer
- Ambiguità: Nessuna.
- Errori: FAILED con il messaggio del backend.
- Audit: request + tool:roster.list_contexts. · Sensibilità: low
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (administrator)
