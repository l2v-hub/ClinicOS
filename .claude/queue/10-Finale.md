Ora applica questi requisiti visivi ai moduli clinici della Cartella Clinica Operatore.

Non generare immagini.
Non mostrare le immagini originali.
Crea template digitali che somiglino ai moduli cartacei:

- griglie
- tabelle
- checkbox
- intestazioni paziente
- campi firma
- layout stampabile A4

Ogni modulo deve avere:

- vista web tablet-friendly
- vista modulo simile al cartaceo
- modalità editabile
- salva
- annulla
- stampa
- espandi/focalizza

Integra i template nella Cartella Clinica Paziente già esistente.
Non riscrivere l’app.
Non modificare backend.
Non modificare Prisma.
Non rompere VITE_API_URL.
Esegui npm run build e correggi errori.

Esegui una fase di stabilizzazione e correzione errori su ClinicOS.

## Problema

Quando utilizzo l’app e clicco sui pulsanti, apro card, uso moduli clinici, navigazione, stampa, espandi/modifica/salva/annulla o cambio schermata, compaiono errori runtime.

## Obiettivo

Correggere tutti gli errori causati dall’interazione utente, senza introdurre nuove funzionalità e senza riscrivere l’app.

## Scope

- Frontend first.
- Non modificare backend salvo errore bloccante chiaramente legato alle API.
- Non modificare Prisma schema salvo errore bloccante chiaramente legato alle API.
- Non cambiare la UI in modo sostanziale salvo errore bloccante chiaramente legato alle API.
- Non rimuovere funzionalità esistenti salvo errore bloccante chiaramente legato alle API.
- Non rompere VITE_API_URL.
- Mantieni l’app in italiano.

## 1. Analisi

Ispeziona:

- frontend/src/App.tsx
- frontend/src/App.css
- eventuali componenti in frontend/src/components

Cerca tutti gli handler dei pulsanti:

- onClick
- onSubmit
- onChange
- onSave
- onCancel
- onPrint
- onExpand
- onEdit
- onDelete
- onNavigate

Cerca errori potenziali su:

- selectedPatient undefined/null
- selectedOperator undefined/null
- selectedRoom undefined/null
- array undefined
- map/filter/find su undefined
- state non inizializzato
- id mancanti
- form state non coerente
- bottoni che chiamano funzioni non definite
- modali che leggono dati non presenti
- stampa modulo senza modulo selezionato
- espansione card senza card id
- navigazione browser/back non coerente

## 2. Correzioni richieste

- Aggiungi guard clause dove necessario.
- Inizializza correttamente tutti gli stati.
- Evita accessi diretti a proprietà di oggetti null/undefined.
- Usa fallback sicuri.
- Se un record non è selezionato, mostra messaggio chiaro invece di generare errore.
- Ogni bottone deve avere un comportamento valido.
- I bottoni non ancora implementati devono mostrare un messaggio/placeholder controllato, non generare errore.
- Le card editabili devono gestire correttamente:
  - modifica
  - salva
  - annulla
  - espandi
  - comprimi
  - stampa
- La creazione/modifica locale deve aggiornare lo stato senza rompere la UI.
- La stampa deve funzionare anche se il modulo è selezionato dinamicamente.
- La navigazione e il back browser devono continuare a funzionare.

## 3. Stabilità dei moduli clinici

Verifica in particolare questi moduli:

- Presa in carico
- Documenti paziente
- Diario infermieristico
- Diario medico
- Parametri vitali
- Terapia medica
- Medicazioni
- Follow-up medicazioni
- Dimissione infermieristica
- Liberatoria di uscita
- Contenzioni / protezioni
- Scala Braden
- Agenda operatore
- Agenda admin
- Camere / posti letto
- Operatori
- Note / consegne

## 4. UX degli errori

Se manca un dato, non mostrare errore tecnico.

Mostra messaggi tipo:

- “Seleziona un paziente”
- “Nessun modulo selezionato”
- “Nessun dato disponibile”
- “Funzione disponibile nella prossima fase”
- “Compila i campi obbligatori”

## 5. Build

Esegui:

npm run build

Correggi tutti gli errori TypeScript/Vite.

## 6. Verifica statica

Cerca ancora:

- funzioni richiamate ma non definite
- componenti importati ma non esistenti
- props mancanti
- variabili non usate se bloccano build
- tipi incoerenti
- errori JSX

## 7. Output finale

Alla fine riportami:

- errori trovati
- file modificati
- pulsanti/azioni stabilizzati
- build result
- eventuali casi ancora da testare manualmente

## Importante

Non aggiungere nuove funzionalità.

Questa è solo una fase di bug fixing e stabilizzazione dell’interazione.
