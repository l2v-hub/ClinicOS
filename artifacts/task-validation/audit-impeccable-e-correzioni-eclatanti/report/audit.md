# Audit impeccable — ClinicOS frontend (2026-11-21)

Modalità: **Operate** (app clinica di reparto). Guida: `.claude/skills/impeccable/reference/audit.md`.
Il motore della skill non è stato eseguito (avvio bloccato dai controlli della sessione): niente
detector automatico. Misure: axe-core 4.10 (WCAG 2.0/2.1/2.2 A+AA) e Playwright su 21 pagine a
1366px e 20 a 390px (profili Operatore e Amministratore, ambiente locale con dati sintetici),
5 finestre/moduli, campionamento dei pixel per gli avatar. Dati grezzi in `../logs/`.

## Audit Health Score

| #         | Dimensione               |     Prima |      Dopo | Problema principale                                                    |
| --------- | ------------------------ | --------: | --------: | ---------------------------------------------------------------------- |
| 1         | Accessibility            |         2 |         3 | contrasto delle etichette piccole; campi senza nome (corretti)         |
| 2         | Performance              |         3 |         3 | avvio già ridotto (458 kB); lampo «Caricamento modulo…» alla 1ª visita |
| 3         | Theming                  |         2 |         2 | ~1.600 colori esadecimali nei CSS accanto ai token; nessun tema scuro  |
| 4         | Responsive Design        |         3 |         3 | nessuno sbordo a 390px; pochi link-pulsante alti 20px                  |
| 5         | Implementation Integrity |         2 |         2 | strati CSS storici (`App.css`, `app-additions.css`) accanto ai `ds-*`  |
| **Total** |                          | **12/20** | **13/20** | **Acceptable → Acceptable (alto)**                                     |

## Implementation Integrity Verdict

**Pass con riserva.** Il sistema è coerente e specifico del prodotto: token (`--ds-*`, palette
medica), componenti condivisi (`AccessibleDialogSurface` con focus intrappolato ed Esc, `TopNav`,
`ds-badge`, `ds-chip`), una sola altezza dei controlli, sidebar canonica. La riserva: due fogli
storici molto grandi convivono con il design system e lo correggono a colpi di `:not(#ds)`. I
problemi di contrasto trovati nascevano proprio lì: badge storici che non usavano le varianti
leggibili già presenti in `ds-badge`.

## Executive Summary

- Punteggio: **12/20 → 13/20** dopo le correzioni.
- Problemi: P0 0 · P1 5 (tutti corretti) · P2 4 · P3 4.
- Corretti: contrasto di 14 tipi di etichetta, badge e avatar; campi dell'ingresso senza etichetta;
  pulsanti icona senza nome nella lista operatori su telefono; menu orari senza nome.
- Nessuna pagina cambia struttura; sidebar identica (0 pixel diversi su 20 pagine).

## Detailed Findings by Severity

### P1 — corretti

1. **[P1] Contrasto insufficiente delle etichette piccole** — Accessibility, WCAG 1.4.3.
   Blu `#2F6BED` su tinta blu (4.24/3.91:1) in `.cts__badge`, `.room-number-badge`,
   `.assistant-id__badge`, `.patient-roster-status`, avatar senza colore; ambra `#C77700` su
   `#FDF3E2` (3.14) in `.alert-chip--amber`; bianco su ambra (3.46) in `.agt-badge--programmato`;
   rosso su rosa (3.69) in `.letto-stato--occupato`; verde su verde chiaro (2.89) e grigio
   attenuato (3.6/2.8) negli Orari. Impatto: etichette di stato illeggibili con luce di corsia o
   vista ridotta. **Corretto** in `design-system.css` («Contrasto delle etichette piccole») con le
   varianti scure della stessa tinta, come già fa `ds-badge`; Orari in `OperatorSchedule.tsx`.
2. **[P1] Iniziali degli operatori illeggibili** — Accessibility, WCAG 1.4.3. Bianco sul colore
   dell'operatore: 3.46–4.23:1 (azzurro 2.8). **Corretto** con un velo scuro interno del 25%
   (stessa tinta): minimo misurato sui pixel 4.71:1 (`../logs/avatar-pixel-contrast.txt`). axe
   continua a segnalarli perché non vede l'ombra interna: falso positivo verificato.
3. **[P1] Campi dell'ingresso senza nome accessibile** — `StepIngresso.tsx` (`NpmField`): data,
   ora, provenienza e modalità d'ingresso avevano un'etichetta visiva non collegata. WCAG 1.3.1 /
   4.1.2. **Corretto**: etichetta collegata con `htmlFor` + `aria-required`, come in
   `StepAnagrafica`.
4. **[P1] Pulsanti icona senza nome** — `OperatorManagement.tsx`, lista a schede su telefono:
   «Modifica» e «Disattiva/Riattiva» erano solo icone (18 pulsanti). WCAG 4.1.2. **Corretto** con
   `aria-label` che include il nome dell'operatore.
5. **[P1] Menu degli orari senza nome** — `OperatorSchedule.tsx` in modifica: 10 select
   inizio/fine. **Corretto**: «Inizio turno lunedì», «Fine turno lunedì», …

### P2 — non corretti (richiedono un passo dedicato)

6. **[P2] Colori codificati** — ~1.600 esadecimali nei CSS contro ~3.650 usi di token; i badge
   storici duplicano `ds-badge`. Raccomandazione: `/impeccable extract` per migrare i badge storici
   su `ds-badge`.
7. **[P2] Select degli orari alti 32px** (`OperatorSchedule.tsx`, stile inline) contro i 44px
   canonici. Funziona (≥24px), ma è fuori regola. `/impeccable adapt`.
8. **[P2] Nessun tema scuro** — non richiesto dal brief; da decidere per il turno di notte.
9. **[P2] «Caricamento modulo…»** ~280 ms alla prima visita di una pagina (già noto). `/impeccable optimize`.

### P3

10. Link-pulsanti alti 20px (nome paziente nel Turno/Agenda, «Verifica turni» nella dashboard):
    passano la deroga di spaziatura 2.5.8, ma sono piccoli al tatto.
11. `prefers-reduced-motion` coperto in 8 fogli: verificare le animazioni restanti.
12. Ingresso: titoli su 3–4 stili (18/600, 14/600, 12/700): voluto, il terzo è condiviso con la
    cartella.
13. `padding-bottom: 84px` sotto i 1024px per un pulsante dell'assistente non montato
    (`App.css`): spazio vuoto in fondo a cartella e consegne su telefono.

## Punti aperti del task precedente

| Punto                               | Esito                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schede `TopNav level3` sottolineate | Lasciate per scelta: contratto di navigazione in `CLAUDE.md` e test che lo fissano                                                                            |
| Tre livelli di titolo nell'ingresso | Lasciati (P3 n. 12): il terzo è condiviso con la cartella                                                                                                     |
| Finestre/moduli non verificati      | Verificati: ricerca, «Nuovo appuntamento», «Nuovo operatore», «Nuova camera», «Modifica orari» — focus dentro, Esc chiude, axe pulito dopo la correzione n. 5 |
| `padding-bottom: 84px` residuo      | Lasciato (P3 n. 13): nessun difetto visibile oltre lo spazio vuoto                                                                                            |

## Patterns & Systemic Issues

- I badge storici usano il colore «di marca» come testo su tinta chiara: sotto i 14px non basta
  mai. La regola ora è centralizzata; i badge nuovi devono usare `ds-badge`.
- Componenti duplicati (`NpmField` in due file) divergono: uno era accessibile, l'altro no.

## Positive Findings

- Finestre di dialogo: un solo componente (`AccessibleDialogSurface`) con ruolo, titolo, focus
  intrappolato, ritorno del focus ed Esc.
- Nessuno sbordo orizzontale a 390px su 20 pagine; drawer della sidebar sotto i 1024px.
- Focus: quasi ogni `outline: none` ha un sostituto (`--shadow-focus`, bordo blu).
- Controlli a 44px ovunque, gerarchia h1/h2 uniforme (18/600) su tutte le pagine.

## Recommended Actions

1. **[P2] `/impeccable extract`** — migrare i badge storici (`agt-badge`, `letto-stato`,
   `alert-chip`, `cts__badge`) su `ds-badge`.
2. **[P2] `/impeccable adapt`** — orari in modifica a 44px.
3. **[P2] `/impeccable optimize`** — lampo di caricamento alla prima visita.
4. **[P3] `/impeccable polish`** — link-pulsanti piccoli, spazio residuo su telefono.

Report non salvato con `impeccable audit-storage` (motore non eseguito): questa copia ne fa le veci.

## Seconda tornata (verifica sul sito pubblicato)

Sulla demo, con dati diversi dall'ambiente locale (letti liberi, simulatore ruoli), axe ha trovato
stati non visibili in locale, dello stesso tipo del P1 n. 1:

- «LIBERO» verde su verde chiaro (2.89:1), contatore dei letti liberi e «0/1» verdi su bianco
  (3.2:1), «In manutenzione» ambra su bianco: **corretti** con le varianti scure della stessa tinta
  (`design-system.css`, `RoomsManagement.tsx`).
- Badge «SIMULATORE» (`.badge--amber`, bianco su ambra, 3.46:1) e `.badge--green`: sfondo scurito
  come per `agt-badge` (6.3 e 5.3:1).

Verifica: suite 1598/1598 (`logs/frontend-tests-2.log`), build OK (`logs/frontend-build-2.log`),
scansione amministratore a 1366px pulita salvo il falso positivo degli avatar, sidebar 0 pixel
diversi (`logs/after2/`). Esito sul sito: `test-results/live-demo-check.txt`.
