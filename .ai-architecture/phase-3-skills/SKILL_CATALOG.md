# Skill Catalog — Phase 3

> Generated from `SKILL_CATALOG.json` (source of record `backend/src/skills/catalog.ts`) by
> `scripts/ai-architecture/build-skill-catalog.ts` + `render-skill-catalog.mjs`. Do not edit by hand.

Totals: skills 16 · TESTED 16 · confirmation policy v2

| skill_id | nome | categoria | tipo | conferma | tool richiesti | tool opzionali | ruoli previsti | stato | evidenze |
|---|---|---|---|---|---|---|---|---|---|
| `vitals.record` | Registra parametri vitali | clinical | write | SENSITIVE_WRITE | patients.search, parameters.create_reading | parameters.list_readings | doctor, nurse, oss, supervisor | TESTED | 7 |
| `diary.add_observation` | Aggiungi osservazione al diario | clinical | write | SENSITIVE_WRITE | patients.search, diary.create | diary.list | doctor, nurse, oss, supervisor | TESTED | 3 |
| `handover.create` | Crea consegna | operational | write | LOW_RISK_WRITE | patients.search, consegne.create | — | doctor, nurse, oss, supervisor | TESTED | 3 |
| `therapy.prescribe` | Prepara prescrizione | clinical | write | HIGH_RISK | patients.search, diary.therapy_preview, diary.create_with_therapy | — | doctor | TESTED | 4 |
| `administration.record` | Registra somministrazione | clinical | action | HIGH_RISK | patients.search, administration.list_slots, administration.confirm | — | nurse, supervisor | TESTED | 3 |
| `vitals.recent` | Parametri recenti | query | read | READ | patients.search, parameters.list_readings | — | doctor, nurse, oss, supervisor | TESTED | 3 |
| `diary.recent` | Diario recente | query | read | READ | patients.search, diary.list | — | doctor, nurse, oss, supervisor | TESTED | 1 |
| `patient.overview` | Informazioni sull’ospite | query | read | READ | patients.search, patients.clinical_summary | parameters.list_readings | doctor, nurse, oss, supervisor | TESTED | 2 |
| `clinical.question` | Domanda sulla cartella | query | read | READ | assistant.query | — | doctor, nurse, oss, supervisor | TESTED | 1 |
| `therapy.due_administrations` | Somministrazioni del giorno | operational | read | READ | administration.list_slots | — | doctor, nurse, supervisor | TESTED | 3 |
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
- Workflow: identify_patient: patients.search | contesto pagina + resident access scope → collect_values: slot values (validazione con parseParameterReading, la stessa del servizio) → preview: ospite, valori, orario, autore, origine AI → confirm: evento UI esplicito legato al previewId → execute: parameters.create_reading (requestId stabile → retry senza duplicati) → verify: parameters.list_readings (se disponibile) → audit: skill:vitals.record:* + tool:parameters.create_reading
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo. Valori mancanti o non validi → NEEDS_CLARIFICATION sui valori.
- Errori: Errore di validazione/servizio → FAILED con il messaggio del backend; retry riusa lo stesso requestId (dedupe del servizio).
- Audit: request, proposal (preview id, nomi dei campi), confirmation, execute + evento del tool. · Sensibilità: high
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › B + I; backend/src/skills/__tests__/skills-e2e.test.ts › C; backend/src/skills/__tests__/skills-e2e.test.ts › D; backend/src/skills/__tests__/skills-e2e.test.ts › E; backend/src/skills/__tests__/skills-e2e.test.ts › H; backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (doctor); scripts/skills/agno-live-e2e.mjs (evidence/agno-live-e2e-run*.json)

### `diary.add_observation` — Aggiungi osservazione al diario

Aggiunge un'osservazione (nota di diario clinico-assistenziale) alla cartella di un ospite, attribuita all'operatore corrente.

- Input/contesto: patient, text · Output: Voce di diario creata (id, autore risolto dal server).
- Workflow: identify_patient: patients.search | contesto pagina + resident access scope → collect_text: slot text (testo integrale, mai riscritto) → preview: ospite, testo, data, autore, origine AI → confirm: evento UI esplicito legato al previewId → execute: diary.create (una sola esecuzione per workflow: il tool non è idempotente) → audit
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo.
- Errori: diary.create non è idempotente: il workflow blocca una seconda esecuzione; dopo un esito incerto non ritenta da solo.
- Audit: request, proposal, confirmation, execute + tool:diary.create. · Sensibilità: high
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › F; backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (oss); scripts/skills/agno-live-e2e.mjs (evidence/agno-live-e2e-run*.json)

### `handover.create` — Crea consegna

Crea una consegna (passaggio di informazioni al turno) riferita a un ospite. Priorità normale e tipo «Assistente AI» di default; l’urgenza viene solo segnalata.

- Input/contesto: patient, text · Output: Consegna creata (id, priorità, tipo Assistente AI).
- Workflow: identify_patient + resident access scope → collect_text → preview: ospite, testo, priorità normale, tipo Assistente AI, avviso se il testo sembra urgente → modify (facoltativo): cambio priorità esplicito → nuova anteprima → confirm: evento UI esplicito legato al previewId → execute: consegne.create (requestId stabile) → audit
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo.
- Errori: FAILED con il messaggio del backend; retry idempotente sul requestId.
- Audit: request, proposal, confirmation, execute + tool:consegne.create. · Sensibilità: medium
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › G; backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (oss); scripts/skills/agno-live-e2e.mjs (evidence/agno-live-e2e-run*.json)

### `therapy.prescribe` — Prepara prescrizione

Prepara una nuova prescrizione dal testo dettato (stesso interprete del Diario → Terapia): anteprima strutturata, poi SOLO il medico la conferma con il pulsante Conferma. L’assistente non conferma mai.

- Input/contesto: patient, text · Output: Voce di diario «terapia» + terapia collegata (ids), create dal medico.
- Workflow: identify_patient + resident access scope → prepare: diary.therapy_preview (regole + proposta AI solo sui campi vuoti) → preview: farmaco, dosaggio, via, orari, date, avvisi; Conferma nascosta se mancano dati → confirm: evento UI esplicito legato al previewId, con la terapia mappata dal form Terapia → check: la terapia confermata corrisponde alla bozza (farmaco, orari, inizio) → execute: diary.create_with_therapy (requestId stabile) → audit
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo. Testo che indica sospensione/somministrazione/modifica → non è una prescrizione: rimando alla scheda Terapia.
- Errori: Dati mancanti o conflitti di fascia → nessun pulsante Conferma, rimando alla scheda Terapia; errore del servizio → FAILED.
- Audit: request, proposal (preview id), confirmation (preview id), execute + tool:diary.create_with_therapy. · Sensibilità: critical
- **Da validare con il cliente:** Prescrizione preparata dall’assistente e confermata dal medico: validare con il direttore sanitario prima dell’uso reale.
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › D (OSS denied); backend/src/skills/__tests__/assistant-e2e.test.ts › C (prepare → UI confirm → with-therapy); scripts/assistant/assistant-browser-e2e.mjs (.ai-architecture/phase-4-assistant/evidence) › P4 browser C; scripts/assistant/assistant-browser-e2e.mjs (.ai-architecture/phase-4-assistant/evidence) › P4 browser (Agno)

### `administration.record` — Registra somministrazione

Prepara la registrazione di una somministrazione in attesa dell’ospite (giro terapia del giorno): anteprima, poi SOLO l’operatore autorizzato conferma con il pulsante Conferma dopo aver somministrato.

- Input/contesto: patient, administration, date? · Output: Somministrazione registrata (terapia, fascia, data) dall’operatore autenticato.
- Workflow: identify_patient + resident access scope → read: administration.list_slots (oggi) → somministrazioni in attesa dell’ospite → choose: una sola → selezionata; più → scelta esplicita → preview: farmaco, dose, via, fascia/ora, data, avviso «conferma solo dopo la somministrazione» → confirm: evento UI esplicito legato al previewId → execute: administration.confirm → audit
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo. Più somministrazioni in attesa → scelta esplicita tra i candidati.
- Errori: Nessuna somministrazione in attesa → nessuna scrittura; errore del servizio → FAILED.
- Audit: request, proposal (preview id), confirmation (preview id), execute + tool:administration.confirm. · Sensibilità: critical
- **Da validare con il cliente:** Doppio controllo / identificazione dell’ospite al letto: da definire con il cliente prima dell’uso in reparto.
- Evidenze: backend/src/skills/__tests__/assistant-e2e.test.ts › I (prepare → UI confirm, backend failure, retry); scripts/assistant/assistant-browser-e2e.mjs (.ai-architecture/phase-4-assistant/evidence) › P4 browser I; scripts/assistant/assistant-browser-e2e.mjs (.ai-architecture/phase-4-assistant/evidence) › P4 browser (Agno)

### `vitals.recent` — Parametri recenti

Mostra le ultime rilevazioni dei parametri vitali di un ospite.

- Input/contesto: patient · Output: Ultime rilevazioni (orario, valori).
- Workflow: identify_patient → read: parameters.list_readings (limit 5) → answer
- Ambiguità: Senza un ospite univoco (nome ambiguo, nessun risultato, nessun contesto) il workflow va in NEEDS_CLARIFICATION e propone i candidati; nessuna azione finché il bersaglio non è certo.
- Errori: Errore di lettura → FAILED con il messaggio del backend.
- Audit: request + tool:parameters.list_readings. · Sensibilità: high
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › A; backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (oss); scripts/skills/agno-live-e2e.mjs (evidence/agno-live-e2e-run*.json)

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
- Evidenze: backend/src/skills/__tests__/skills-e2e.test.ts › D (OSS denied); backend/src/skills/__tests__/skills-e2e.test.ts › per-role coverage (nurse); scripts/skills/agno-live-e2e.mjs (evidence/agno-live-e2e-run*.json)

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

- Input/contesto: query · Output: Ospiti trovati (nome).
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
