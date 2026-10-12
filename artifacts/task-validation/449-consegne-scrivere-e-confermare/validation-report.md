# Task Validation Report

## Task
- Title: 449 consegne scrivere e confermare
- Slug: 449-consegne-scrivere-e-confermare
- Issue: #449 (epic #455)
- Commit: branch `ux3/449-consegne` (hash nel commit che contiene questo report)
- Date: 2026-10-13

## Implementation Summary

- **«Scrivi una consegna» in cima alla pagina Consegne** (`ConsegnaQuickWrite`):
  - paziente da un menu (ricerca per nome solo se il reparto ha più pazienti di una pagina), testo,
    «Invia», senza cambiare vista;
  - il paziente è preimpostato quando la pagina si apre su un paziente (vista filtrata aperta dalla
    dashboard o dall'assistente con `patientId`); se non si trova, il modulo lo dice. Nessun link
    dalla cartella porta oggi a questa pagina con un paziente: la preselezione dalla cartella non è
    dimostrata;
  - riusa `ConsegnaComposer` e `submitConsegna`, con le stesse bozze, gli stessi esiti incerti e la
    terapia dal diario.
- **Un solo gesto per nota**, nella pagina Consegne e nel diario del paziente (`DiarioPazienteTab`,
  condiviso con la cartella):
  - su un'urgenza attiva c'è solo «Ho capito», che il server registra anche come lettura
    (`diary-ack-service`: `mergedDiaryReads`);
  - sulle altre note c'è «Letta»; sulle proprie nessun pulsante;
  - le voci senza ricevuta di lettura (formato precedente) restano al modello di prima;
  - la spiegazione sotto «Ho capito» è stata tolta.
- **Un solo nome, «consegna»**:
  - titolo del modulo «Scrivi una consegna», campo «Consegna», pulsante «Invia»;
  - «Invia e prossimo paziente» solo nel giro per paziente;
  - scheda «Scrivi consegna» senza il doppione nel diario;
  - «Scrivi una consegna» anche nella vista filtrata;
  - il tipo predefinito delle consegne nuove è «Generale» (prima «Segnalazione»).
- **Identità del paziente in una riga** (nome e posto letto) nelle schede della coda e nell'elenco
  pazienti; il dato anagrafico mancante non si ripete più qui.
- **Niente guida** «Come funziona la conferma di lettura» (componente rimosso) e niente paragrafo
  esplicativo.
- **Storico e filtri per data** (Dal/Al/Filtra storico, «Pagina N») dietro «Storico e filtri per
  data», aperti da soli se un filtro è attivo.

## Correzioni dopo il QA indipendente (FAILED VALIDATION su 6dc1dff19)

1. **Bloccante.** Una consegna inviata dal modulo in cima non compariva nel diario aperto sotto, in
   «Per paziente», fino a un cambio di vista. Ora `ConsegneWorkspace` passa `onSaved`, e un
   contatore entra nella chiave del diario di `ConsegneRounds`: il diario si rilegge subito. E2E
   AC1c: 47 → 48 schede, nuova consegna visibile.
2. Nomi residui: «Segnalazioni precedenti →» → «Consegne precedenti →», «modificare la
   segnalazione» → «la consegna», «Segnalata da» → «Scritta da», `aria-label` «Diario e scrivi
   consegna».
3. Nella vista filtrata integrata non c'è più il secondo modulo «Scrivi una consegna»: si scrive dal
   modulo in cima.
4. La frase sulla preselezione «dalla cartella» è corretta qui sopra; un paziente richiesto e non
   trovato ora è segnalato.
5. Voci precedenti al gesto unico con lettura già confermata e urgenza ancora aperta: la traccia
   «Lettura confermata da X» resta visibile; la ricevuta si nasconde solo quando è ancora da leggere
   e c'è «Ho capito» (unit `#449 one gesture per entry`).
6. Il modulo in cima mostra «Elenco in caricamento…» e «Riprova» se l'elenco pazienti non arriva.

### Secondo passaggio QA (READY FOR QA su d46574811) — due punti chiusi prima del merge

7. Il diario sotto si ricostruiva a ogni invio, anche per un altro paziente, perdendo filtri,
   storico e pagine. Ora `ConsegneRounds` riceve `sentFrom` e il diario si rilegge solo quando
   l'invio è del paziente mostrato (E2E AC1d: diario di Verdi aperto e filtrato dal 01/10, invio per
   Nanni → storico aperto e filtro conservati).
8. AC1c non dipende più dal totale delle schede: la pagina del diario è fissa a 50 voci. Ora la
   scheda nuova è assente prima dell'invio e presente dopo.

## Files Changed

- `frontend/src/components/operator/ConsegnaQuickWrite.tsx` — nuovo
- `frontend/src/components/operator/ConsegneWorkspace.tsx`, `ConsegneRounds.tsx`, `ConsegneRounds.css`, `ConsegnaComposer.tsx`, `ClinicalNoteEditor.tsx`, `ConsegnePage.tsx`, `ConsegnaCreateForm.tsx`, `ConsegneUnreadQueue.tsx`
- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx`, `DiaryThreadReceipt.tsx`
- `frontend/src/components/shared/UrgencyNotice.tsx`
- `frontend/src/lib/consegnaDrafts.ts` — tipo predefinito
- Test: `diaryReading`, `consegneGiroUi`, `consegneUnreadQueue`, `clinicalNoteEditor`
- `scripts/e2e/issue-449-consegne.mjs`

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | AC1c: con il diario di Nanni aperto in «Per paziente», l'invio dal modulo in cima compare subito (47 → 48 schede, `screenshots/06-diario-aggiornato.png`). Infermiere 1: selectOption paziente → fill testo → «Invia» = 3 interazioni; 1 POST `/consegne`; riga nel DB; «Consegna inviata per…» (`screenshots/02-consegna-inviata.png`). Medico 1 la trova nella coda con «Letta» (`04-medico-non-confermate.png`) |
| AC2 | PASS | pagina Consegne: pulsanti di conferma per scheda `[1,1,1,1,0,0,0,1]`; diario della cartella: tutte le voci ≤ 1 (`05-diario-cartella.png`) |
| AC3 | PASS | nessun «Nuova nota», «Segnalazione», «Nuova consegna» nelle etichette dell'interfaccia, né nella coda né nella vista per paziente; un solo «Scrivi consegna» |
| AC4 | PASS | nessuna modifica backend; «Ho capito» usa lo stesso `/ack` |
| AC5 | PASS | identità in una riga in tutte le schede, nessun «Nato/a il / CF da completare» nelle schede, nessuna guida; filtri chiusi dietro «Storico e filtri per data» (`03-per-paziente.png`) |
| AC6 | PASS | tsc + build verdi, unit 1377/1377; E2E #446 rieseguito: PASS |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | `logs/unit-tests.log` (1377/1377) |
| Integration | NA | |
| API | NA | nessuna modifica backend |
| Playwright | PASS | `scripts/e2e/issue-449-consegne.mjs` 10/10, `logs/playwright-after.log`, `trace/*.zip`, `screenshots/` |
| Persistence | PASS | consegna nel DB (`Consegna`) e nella coda del collega dopo la navigazione |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | |
| Security/privacy | PASS | solo endpoint esistenti, testo clinico inviato invariato |

## Runtime Evidence

Stack locale sintetico (DB `uxaudit`, backend demo :3111, vite :5211, 1180×820). Il controllo delle
etichette guarda solo pulsanti, titoli, label, riepiloghi, schede e opzioni fuori dalle note: le
consegne vecchie conservano il loro tipo salvato («Consegna · Segnalazione»), che è un dato e non
un'etichetta.

## Logs

`logs/build.log`, `logs/unit-tests.log`, `logs/playwright-after.log`. Console del browser: 0
errori.

## Residual Risks

- Le consegne già scritte con tipo «Segnalazione» lo mostrano ancora nel titolo della scheda: è un
  dato salvato; rinominarlo richiederebbe una migrazione dei dati (non fatta).
- Il cambio del gesto vale anche nel diario della cartella (componente condiviso), per coerenza.
- `ConsegneWorkspace.tsx` ha un errore di lint preesistente su `main` (setState in effect).
- Restano dal QA, minori:
  - dopo l'invio il campo testo vuoto mostra il bordo «non valido» del design system;
  - il selettore del paziente resta attivo durante un invio in sospeso;
  - l'opzione di gravità si chiama ancora «Alta · richiede presa in carico» (etichetta precedente);
  - `consegnaDrafts.ts` contiene modifiche di sola formattazione del formatter del repository;
  - `ConsegnaCreateForm` non è più montato da nessuna pagina (resta per una pulizia successiva).
- Verifica su stack locale sintetico, non su prod.

## Final Decision

CLOSED — VERIFIED
