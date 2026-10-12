# Task Validation Report

## Task
- Title: 446 turno per ruolo medico oss
- Slug: 446-turno-per-ruolo-medico-oss
- Issue: #446 (epic #455)
- Commit: branch `ux3/446-turno-ruoli` (hash nel commit che contiene questo report)
- Date: 2026-10-12

## Implementation Summary

- **Variante per capability** (`lib/turnoVariant.ts`), mai per nome del ruolo:
  - `administration.confirm` → infermiere: il Turno della #445, invariato;
  - `therapy.create` senza somministrazione → medico;
  - altrimenti `parameters.create_reading` → OSS.
- **Una sola fonte per «Da leggere» e per le urgenze**: la coda `/patients/diary-unread` (note di
  diario e consegne senza conferma), che è la stessa del badge Consegne della barra laterale.
  - «Da leggere» mostra il totale del server (`data-unread-total`), prima le urgenze, con un solo
    gesto per voce: «Ho capito» per un'urgenza altrui, «Letta» per le altre, «In attesa di un
    collega» per la propria urgenza.
  - Le azioni usano lo stesso hook della pagina Consegne (`useUnreadDiaryQueue`), quindi badge e
    home si aggiornano con gli stessi eventi.
  - Sostituisce `TurnoHandovers`, che leggeva solo la tabella Consegna da `/consegne/overview`.
- **Medico, «Serve una tua decisione»** (`TurnoDecisioni`), in quest'ordine:
  1. urgenze da prendere in carico, con «Ho capito» e «Apri diario/consegna»;
  2. terapie da verificare per paziente, con i nomi dei farmaci e «Verifica N» che porta al farmaco
     da sanare;
  3. dosi non registrate come sola informazione («Vedi»).

  Nessuna azione di somministrazione e nessuna coda dosi.
- **OSS**:
  - in cima le urgenze altrui con «Ho capito» (`TurnoUrgenti`);
  - poi «Giro parametri di oggi · X di N» (`TurnoGiroParametri` + `useGiroParametri`: pagina
    Parametri del giorno della struttura, più `hasCriticalVitals` dal riepilogo clinico);
  - prima i pazienti con parametri critici, poi i non rilevati; «Rileva» apre i Parametri di quel
    paziente.
- **«Niente in sospeso»** (`nienteInSospeso`) compare solo se tutte le fonti sono arrivate e dicono
  niente: zero da leggere, zero parametri critici, giro completo. La coda dell'infermiere vuota dice
  «Nessuna dose da somministrare adesso».
- **Le chip non ripetono ciò che la variante mostra in evidenza**:
  - per medico e OSS niente chip urgenze;
  - per il medico niente chip farmaci;
  - la chip urgenze conta dalla coda unica, solo le urgenze altrui.

## Files Changed

- `frontend/src/lib/turnoVariant.ts`, `turnoUnread.ts`, `useGiroParametri.ts` — nuovi
- `frontend/src/components/operator/TurnoDaLeggere.tsx`, `TurnoUrgenti.tsx`, `TurnoDecisioni.tsx`, `TurnoGiroParametri.tsx` — nuovi
- `frontend/src/components/operator/OperatorDashboard.tsx`, `OperatorDashboard.css` — varianti e coda unica
- `frontend/src/components/operator/TurnoHandovers.tsx` — rimosso (resta il CSS, riusato)
- `frontend/src/components/operator/AdessoQueue.tsx` — testo vuoto preciso
- `frontend/src/App.tsx` — rimosse due props non più usate
- Test: `turnoVariant446.test.ts` (nuovo), `operator-dashboard-first-view`, `turno-review-ui`, `turnoSomministra445`, `adessoGrouping410`
- `scripts/e2e/issue-446-turno-ruoli.mjs`

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | `screenshots/01-medico.png`: 0 «Somministra», nessuna coda dosi; ordine urgente → terapie da verificare → dosi non registrate |
| AC2 | PASS | `screenshots/02-oss.png`: urgenze in cima, tutte con «Ho capito»; «Giro parametri di oggi · 0 di 5», primo «Nanni Miriam · prima: parametro critico»; «Rileva» apre la scheda Parametri (`03-oss-rileva.png`) |
| AC3 | PASS | con elementi in sospeso non compare; con tutte le fonti a zero (stub) compare (`04-oss-niente-in-sospeso.png`); unit `nienteInSospeso` |
| AC4 | PASS | badge = «Da leggere» per medico (6 = 6), OSS (6 = 6) e infermiere; dopo «Ho capito» entrambi 6 → 5 |
| AC5 | PASS | infermiere: coda «Adesso» presente, nessuna variante medico/OSS; E2E della #445 rieseguito: 10/10 PASS |
| AC6 | PASS | tsc + build verdi, unit 1358/1358, Playwright 11/11 per i tre ruoli sullo stesso stato dei dati, 0 errori in console |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | `logs/unit-tests.log` (1358/1358) |
| Integration | NA | |
| API | NA | nessuna modifica backend |
| Playwright | PASS | `scripts/e2e/issue-446-turno-ruoli.mjs`, `logs/playwright-after.log`, `trace/*.zip`, `screenshots/0*.png` |
| Persistence | PASS | «Ho capito» scritto via `/ack` e riletto: badge e home scendono insieme |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | |
| Security/privacy | PASS | solo endpoint esistenti, varianti per capability |

## Runtime Evidence

Stack locale sintetico: DB `uxaudit`, backend demo con simulatore su :3111, vite su :5211, a
1180×820. Fixture: una consegna urgente di Infermiere 1, così il medico e l'OSS hanno un'urgenza
altrui da prendere in carico. Il caso «Niente in sospeso» è verificato con stub sulle tre fonti
(coda vuota, zero critici, giro completo), perché il seed ha sempre qualcosa in sospeso.

## Logs

`logs/build.log`, `logs/unit-tests.log`, `logs/playwright-after.log`. Console del browser: 0
errori.

## Residual Risks

- La coda è paginata (20 voci): «Da leggere» mostra le prime 5, con il totale del server; le
  urgenze si contano dalla pagina, con «Altre urgenze nella pagina Consegne» quando ce ne sono altre.
- «Assistenza da registrare» (OSS) e «I tuoi pazienti» (medico) della tela di design non sono nei
  criteri di accettazione e non sono stati fatti.
- Il giro conta come «rilevato» un paziente con almeno una lettura oggi; la frequenza per paziente
  (es. ogni 4 ore) non esiste nei dati.
- Verifica su stack locale sintetico, non su prod.

## Final Decision

CLOSED — VERIFIED
