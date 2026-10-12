# Task Contract

## Task
- Title: 446 turno per ruolo medico oss
- Slug: 446-turno-per-ruolo-medico-oss
- Type: change
- Date: 2026-10-12

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Issue #446. «Il mio turno» è uguale per tutti i ruoli. Il medico vede le dosi in ritardo (in sola lettura dopo la #445), mentre ciò che chiede una sua decisione è in fondo o assente: farmaci da verificare solo nelle chip, urgenza del diario (febbre 39,2 °C) assente. L'OSS legge «Niente in sospeso» mentre il badge Consegne segna 2, c'è un parametro critico e nessun paziente è stato rilevato oggi. Il badge conta le note non lette della coda `/patients/diary-unread` (diario + consegne), la home invece legge `/consegne/overview` (solo la tabella Consegna): contano cose diverse.

## Expected Behaviour

Il Turno sceglie la variante dalle capability, non dal nome del ruolo. Con `administration.confirm` resta quello dell'infermiere (#445). Con `therapy.create` senza somministrazione è il medico: «Serve una tua decisione», con urgenze da prendere in carico («Ho capito»), terapie da verificare («Verifica N») e dosi non registrate come sola informazione. Altrimenti, con `parameters.create_reading`, è l'OSS: urgenze per tutti in cima con «Ho capito», poi «Giro parametri di oggi · X di N» con «Rileva» per paziente (prima chi ha parametri critici). Per tutti «Da leggere» usa la stessa coda del badge: il totale è quello del badge, con un solo gesto per nota («Ho capito» per le urgenze altrui, «Letta» per le altre). «Niente in sospeso» compare solo con zero da leggere, nessun parametro critico e giro completo.

## Acceptance Criteria

- AC1: il Turno del medico non mostra pulsanti di somministrazione e mostra per prime le voci che richiedono una decisione medica (urgenze, poi terapie da verificare, poi dosi non registrate come informazione).
- AC2: il Turno dell'OSS mostra in cima le urgenze non prese in carico, con «Ho capito», e il giro parametri del giorno («X di N», «Rileva» per paziente, prima i critici).
- AC3: «Niente in sospeso» compare solo con zero da leggere, nessun parametro critico e giro parametri completo.
- AC4: badge Consegne e «Da leggere» della home contano le stesse cose: stessa fonte e stesso totale; le voci del badge sono visibili in home.
- AC5: il Turno dell'infermiere resta quello della #445 (nessuna regressione); «Da leggere» usa la coda unica.
- AC6: tsc, build e unit verdi; Playwright per i tre ruoli sullo stesso stato dei dati, con home diverse.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | variante per capability, modello «Niente in sospeso», giro parametri |
| Integration | no | |
| API | no | |
| Playwright | yes | medico, OSS e infermiere sullo stesso seed |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

La coda `/patients/diary-unread` è paginata (20): «Da leggere» mostra le prime voci e il totale del server; le urgenze si contano dalla pagina, con «Almeno N» se ce ne sono altre. Nessuna modifica backend.

## Gate Status

READY FOR IMPLEMENTATION
