Usa SEMPRE Agent Team Mode con tmux swarm.

Agenti:
1. LEAD / Orchestrator
2. Backend / Prisma / Railway Agent
3. Frontend Implementer
4. QA / Regression Tester

Task:
Correggere regressione Agenda: la popup “Terapia mattina/pranzo/pomeriggio/sera/notte” non mostra più pazienti anche se i pazienti hanno terapie schedulate nelle fasce orarie.

## Problema

Dopo le ultime modifiche, cliccando sugli slot terapia in Agenda la popup si apre ma la lista pazienti è vuota.

Questo è una regressione.

I pazienti che hanno terapie programmate per mattina o altre fasce devono comparire nella popup dello slot corrispondente.

## Obiettivo

Ripristinare il collegamento corretto:

Terapia paziente schedulata → fascia oraria → slot Agenda → popup con lista pazienti/terapie.

## Regole

- Non lavorare su OCR o import documenti.
- Non modificare funzionalità non collegate alla terapia/agenda.
- Non usare mock.
- Non usare local state come sorgente principale.
- Non usare database locale.
- Usare backend/API reali.
- Non usare Podman.
- Non usare migrate reset.
- Non usare db push --force-reset.
- Non cancellare dati.
- Non rompere VITE_API_URL.

## Ambiente online

Railway project:
glistening-friendship

Service:
clinicos-backend

Backend:
https://clinicos-backend-production-df88.up.railway.app

Wrapper Railway:
.claude/team/railway-win.sh

## Cose da controllare

### 1. Terapie paziente

Verifica che le terapie salvate abbiano campi coerenti:

- patientId
- drugName / nome farmaco
- dosage / dosaggio
- therapyType: periodica oppure una tantum
- status: attiva
- startDate
- endDate opzionale
- timeSlot / fasciaOraria
- scheduledTime / orario previsto

Controlla se il bug deriva da mismatch nomi campo, esempio:
- timeSlot vs timeSlots
- fascia vs fasciaOraria
- mattina vs morning
- active vs attiva
- scheduledAt vs scheduledTime
- startDate salvata come stringa ma confrontata male

### 2. Endpoint therapy slots

Verifica/correggi:

GET /therapy-slots?date=YYYY-MM-DD

Deve restituire slot con conteggi corretti:
- Terapia mattina
- Terapia pranzo
- Terapia pomeriggio
- Terapia sera
- Terapia notte

Per ogni slot:
- total
- administeredCount
- notAdministeredCount
- pendingCount

### 3. Endpoint pazienti slot

Verifica/correggi:

GET /therapy-slots/:slotId/patients

Deve restituire solo pazienti con terapie previste per quello slot.

Ogni riga deve contenere:
- patientId
- patientFirstName
- patientLastName
- room
- bed
- therapyId
- administrationId se presente
- drugName
- dosage
- timeSlot
- scheduledTime
- status
- administeredAt
- notAdministeredReason

### 4. Matching fascia oraria

Correggere il mapping tra terapia e slot.

Mapping obbligatorio:

- mattina → Terapia mattina
- pranzo → Terapia pranzo
- pomeriggio → Terapia pomeriggio
- sera → Terapia sera
- notte → Terapia notte

Accettare anche alias se presenti:
- morning → mattina
- lunch → pranzo
- afternoon → pomeriggio
- evening → sera
- night → notte
- 08:00 → mattina
- 12:00 → pranzo
- 16:00 → pomeriggio
- 20:00 → sera
- 22:00 → notte

### 5. Date

Verifica che una terapia periodica compaia se:

startDate <= data agenda

e:

endDate assente oppure endDate >= data agenda

Una terapia una tantum deve comparire solo nel giorno previsto.

Attenzione a timezone e confronto date.

Usare normalizzazione YYYY-MM-DD.

## Frontend

Verifica Agenda:

- la popup deve chiamare davvero GET /therapy-slots/:slotId/patients
- non deve filtrare ulteriormente in modo sbagliato
- non deve aspettarsi campi diversi da quelli restituiti dal backend
- se la risposta contiene pazienti, la UI deve mostrarli
- se la risposta è vuota, mostra empty state solo reale

La popup deve:
- mostrare lista pazienti
- essere scrollabile internamente
- mostrare nome, cognome, camera/letto, terapia, dosaggio
- mantenere pulsanti Erogata / Non erogata

## Debug richiesto

QA deve verificare con curl:

1. Lista pazienti:
curl -s https://clinicos-backend-production-df88.up.railway.app/patients

2. Slot terapia:
curl -s "https://clinicos-backend-production-df88.up.railway.app/therapy-slots?date=YYYY-MM-DD"

3. Pazienti slot mattina:
curl -s "https://clinicos-backend-production-df88.up.railway.app/therapy-slots/mattina/patients?date=YYYY-MM-DD"

Adatta slotId se il backend usa un id diverso.

Se gli endpoint non esistono o rispondono vuoto:
- correggere backend.

Se gli endpoint rispondono dati ma la popup resta vuota:
- correggere frontend mapping/rendering.

## Dati test

Assicurarsi che almeno 5 pazienti abbiano terapia schedulata oggi:

- almeno 2 mattina
- almeno 1 pranzo
- almeno 1 pomeriggio
- almeno 1 sera

Usare API reali, non mock.

## Acceptance criteria

Il task è completato solo se:

1. una terapia schedulata mattina compare nello slot Terapia mattina
2. una terapia schedulata pranzo compare nello slot Terapia pranzo
3. una terapia schedulata sera compare nello slot Terapia sera
4. la popup mostra pazienti e terapie
5. la popup scrolla se ci sono molti pazienti
6. i conteggi slot sono corretti
7. Erogata / Non erogata restano funzionanti
8. refresh pagina non perde gli stati
9. npm run build passa

## Build

Esegui:

npm run build

## Commit

Solo dopo build riuscita fai commit:

fix therapy slot patient list regression

## Output finale

Riporta solo:
- causa della regressione
- file modificati
- endpoint corretti
- mapping fascia oraria corretto
- test API eseguiti
- risultato npm run build
- commit hash