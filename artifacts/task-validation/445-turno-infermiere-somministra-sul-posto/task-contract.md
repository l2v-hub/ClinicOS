# Task Contract

## Task
- Title: 445 turno infermiere somministra sul posto
- Slug: 445-turno-infermiere-somministra-sul-posto
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

Issue #445. Il Turno dell'infermiere apre con 5 contatori, una nota esplicativa («Non dimessi: …») e «Chiudi tutte le sezioni». La coda «Adesso» mostra una scheda per ogni farmaco, con nome e posto letto ripetuti, ritardo in minuti («In ritardo di 719 min») e solo «Apri terapia», che cambia pagina. Le allergie non sono visibili. Le consegne urgenti non si prendono in carico dal Turno.

## Expected Behaviour

«Da somministrare» raggruppa per orario e poi per paziente: un blocco per paziente e fascia, con i farmaci, le allergie e un solo «Somministra N». Il tocco apre sul posto un pannello di conferma (decisione del responsabile 12/10/2026): ogni farmaco con dose e via è spuntato; «···» permette la mancata somministrazione con lo stesso motivo del giro; le dosi a scala glicemica non sono incluse e rimandano alla terapia. «Conferma» registra con lo stesso endpoint del giro (POST /therapy-slots/confirm | /not-administered, chiave dello slot, confirmed). I ritardi oltre 90 minuti sono in ore o giorni. In alto, al posto di contatori e nota, ci sono solo chip d'azione: urgenze da prendere in carico, parametri critici, farmaci da verificare. Il «Chiudi tutte» non compare sul Turno. Le consegne urgenti hanno «Ho capito» sul posto.

## Acceptance Criteria

- AC1: le dosi dello stesso paziente nella stessa fascia sono un solo blocco con un solo pulsante «Somministra N».
- AC2: «Somministra N» apre sul posto l'elenco delle N dosi; «Conferma» registra le dosi con gli endpoint del giro (/therapy-slots/confirm e /not-administered) senza cambiare pagina; dopo la conferma il blocco sparisce dalla coda. Le dosi a scala glicemica non sono mai registrate da qui.
- AC3: ogni blocco paziente mostra lo stato delle allergie (allergeni in rosso, oppure «Nessuna allergia registrata»).
- AC4: nessun ritardo è mostrato in minuti oltre i 90 minuti (ore, poi giorni).
- AC5: sopra la piega non ci sono testo esplicativo, contatori senza azione né «Chiudi tutte le sezioni»; i segnali in alto sono pulsanti che portano al punto esatto.
- AC6: una consegna urgente presa in carico da un collega si conferma dal Turno con «Ho capito» (stesso endpoint /consegne/:id/ack).
- AC7: tsc, build e test unitari verdi; verifica Playwright a 1180×820 con il seed demo, compresa una somministrazione reale dal Turno persistita nel DB locale.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | raggruppamento, etichette di tempo, corpo delle richieste |
| Integration | no | |
| API | no | |
| Playwright | yes | Turno infermiere 1180×820, somministrazione dal Turno |
| Persistence after refresh | yes | dopo ricarica la dose risulta somministrata (DB locale) |
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

Registrazione multipla di dosi: mitigata dall'elenco visibile e dalla conferma esplicita (decisione del responsabile). Scala glicemica esclusa. «Parziale» non esiste fra i motivi del backend: non viene offerto. OperatorDashboard è condivisa con medico e OSS: «Somministra» solo con capability administration.confirm.

## Gate Status

READY FOR IMPLEMENTATION
