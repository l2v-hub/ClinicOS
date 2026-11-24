# Prove in locale (2026-11-24)

- Server, prove dell'operazione: `backend/src/patients/__tests__/discharge.e2e.test.ts` → 8 superate
  (medico e infermiere dimettono; coordinatore, amministratore e OSS 403; senza conferma 400; letto
  libero da oggi; ripetizione senza effetti; un salvataggio della cartella da copia precedente non
  annulla la dimissione; annullo al regime precedente; registro uscite e storico conservati).
- Suite del server: 7 file falliti, tutti già falliti prima di questa modifica (nessuna rottura nuova).
- Suite del frontend: 1637 superate, 0 fallite. Build di frontend e server: riuscite.
- Giro nel browser (app locale, dati sintetici): infermiere dimette Colombo (Camera 103 · Letto A)
  con una sola scrittura `POST /patients/SEED-PAZ-101/discharge`; stato «dimesso», 0 assegnazioni
  attive; fuori da «Non dimessi» e dentro «Dimessi e archivio» anche in una sessione nuova;
  «Annulla dimissione» lo riporta tra i presenti senza letto; medico dimette un altro paziente;
  coordinatore e OSS ricevono 403; nessuno scorrimento orizzontale a 390 px; nessun errore in console.
  Schermate in `screenshots/local/`.
- Revisione indipendente del codice (secondo agente, sola lettura): trovato che un salvataggio della
  cartella da una copia precedente annullava la dimissione → corretto nel server
  (`preserveDischargeState`) e annullo trasformato in comando; prova aggiunta.
