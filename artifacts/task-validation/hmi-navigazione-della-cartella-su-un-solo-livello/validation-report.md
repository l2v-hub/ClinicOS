# Task Validation Report

## Task

- Title: HMI: navigazione della cartella su un solo livello
- Slug: hmi-navigazione-della-cartella-su-un-solo-livello
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`PatientDetail.tsx`:**
  - i due livelli (L2 aree + L3 sezioni) sono sostituiti da una sola barra `TopNav`
    (`variant="level2"` + `top-nav--section-grid`) con i 13 tab in fila: Anagrafica, Contatti,
    Presa in carico | Diagnosi, Terapia Farmacologica, Consegne, Parametri Vitali, Esami e
    consulenze, Note e visite | Diario Paziente | Moduli | Documenti | Dimissione;
  - etichette di gruppo visive "Ingresso" e "Clinica";
  - `TAB_GROUPS`, TabId, etichette, badge, collegamenti e caricamento lazy sono invariati;
  - Moduli resta una voce sola (catalogo), e aprendo una scala resta attiva;
  - il filtro per autore del Diario resta un filtro di contenuto.
- **Correzione emersa durante la prova:** i collegamenti interni ("Vai alla terapia" e i
  pulsanti delle finestre) chiamavano `switchGroup` e poi `switchTab`, così la cronologia del
  ciclo 5 registrava un passo intermedio spurio (la sezione ricordata del gruppo). Chiamate
  rimosse; `switchGroup` e `lastTabByGroup` eliminati perché non più usati.
- **`TopNav.tsx`:** `TopNavItem` ha `groupStart`/`groupLabel` opzionali, resi come elementi
  visivi `aria-hidden` (nessun cambio a ruoli e tastiera). Nessun nuovo componente di
  navigazione.
- **`TopNav.css`:** barra della cartella a capo, allineata a sinistra, con pillola blu piena per
  la voce attiva (prima era testo bianco su sfondo chiaro, illeggibile). Sul telefono (≤ 600 px)
  una riga che scorre dentro la barra.
- **Documentazione:** CLAUDE.md "Navigation system" e CLINICOS_NAVIGATION_CONTRACT.md aggiornati.

## Files Changed

- frontend/src/components/operator/PatientDetail.tsx
- frontend/src/components/navigation/TopNav.tsx, TopNav.css
- CLAUDE.md, .claude/design-reference/CLINICOS_NAVIGATION_CONTRACT.md

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                             |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 |   PASS | logs/playwright-evidence.txt B (una barra, 13 voci in ordine, un solo tablist, etichette Ingresso/Clinica) e T (13 sezioni, ognuna con un tocco, voce attiva e contenuto atteso)     |
| AC2 |   PASS | M: scala Braden aperta dal catalogo con "Moduli" attiva; "← Tutti i moduli" torna al catalogo                                                                                        |
| AC3 |   PASS | L: "Vai alla terapia" attiva Terapia con UN solo passo di cronologia; la freccia indietro dice "Nome · Contatti" e ci riporta                                                        |
| AC4 |   PASS | W1024 e W1280: nessuno scorrimento della pagina né della barra. W390: pagina senza scorrimento, barra su una riga che scorre al suo interno                                          |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 829/838, stessi 9 fallimenti della baseline; unit-nav.txt 20/20 (patientDetailWorkspace, patientChartNavigation, navHistory, patientDetailLazyGuard) |

## Test Results

| Test             | Result | Evidence                                                                 |
| ---------------- | -----: | ------------------------------------------------------------------------ |
| Unit             |   PASS | unit-nav.txt 20/20; unit-full.txt (baseline)                             |
| Integration      |     NA |                                                                          |
| API              |     NA |                                                                          |
| Playwright       |   PASS | evidence.mjs 25/25 (stub API + preview)                                  |
| Persistence      |     NA |                                                                          |
| Agnos AI         |     NA | i collegamenti Agnos passano da `selectPazienteById(id, tab)`, invariato |
| Voice            |     NA |                                                                          |
| OCR              |     NA |                                                                          |
| Security/privacy |     NA |                                                                          |

## Runtime Evidence

- screenshots/B-barra-1024.png, W-1024.png, W-1280.png, W-390.png

## Logs

Only sanitized logs are allowed.

## Residual Risks

- A 1024 px la barra occupa tre righe (140 px), meno dei due livelli di prima (circa 160 px).
- **Script e2e storici** che cliccano "Clinica" come tab di secondo livello:
  - `e2e/esami-shot.mjs`, `foglio-farmaco-aifa.mjs`, `issue-241-giorni-settimana.mjs`,
    `issue-245-anamnesi.mjs`, `loop-ux-ciclo-13-patient-switch-safety.mjs`,
    `shot-cartella-card.mjs`, `verify-91-dolore.mjs`, `verify-94-multiorari.mjs`;
  - `e2e/remediation/issue-241/242/245/246.spec.ts`.

  Vanno aggiornati: ora si clicca direttamente la sezione. Alcuni erano già obsoleti (tab
  rinominati o rimossi). Non girano in CI: il job browser-e2e è saltato.

## QA

- QA indipendente: READY FOR QA. Nessun problema bloccante.
- Verifiche proprie del QA:
  - tastiera su tutte le 13 voci (frecce, Home, End, un Tab per uscire);
  - coerenza ARIA a ogni passo;
  - ruolo amministratore;
  - 768, 600 e 390 px.
- Avvisi chiusi dopo il QA:
  - contrasto del badge sulla pillola attiva portato sopra 4,5:1;
  - commento in TopNav.css e testo di CLAUDE.md allineati;
  - test di contratto: una sola `<TopNav` nella cartella, nessun `variant="level3"`, voci da
    `TAB_GROUPS`.
- Restano due punti:
  - con le frecce si attiva ogni sezione, un comportamento dei tablist invariato da prima;
  - a 768 px la barra superiore dell'app scorre di 30 px. È preesistente, fuori dal diff, e va
    trattato in un ciclo dedicato.

## Final Decision

CLOSED — VERIFIED
