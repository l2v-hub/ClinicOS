# Task Validation Report

## Task

- Title: Milo competenze: valutazione, feedback e proposte
- Slug: milo-competenze-valutazione-feedback-e-proposte
- Commit: PR #552 (parte 1, merge `1d7d6347f`) e PR #553 (parte 2, merge `d013f4596`)
- Date: 2026-11-23

## Implementation Summary

Il ciclo con cui le competenze degli specialisti di Milo si misurano e si migliorano.

- **Prove misurabili** (`backend/src/ai/evals/milo-cases.ts`, `scripts/milo-evals/run.mts`): nove casi
  con controlli oggettivi (lettura usata, blocchi, fonti, anteprima e conferma, rifiuto del ruolo,
  nessun farmaco scelto da Milo, nessun giudizio clinico, tempo di risposta). Girano nei test sui
  dati del seed e contro un sito, riportando percorso, specialisti e versione delle competenze.
- **Giudizio** sotto ogni risposta («Questa risposta era utile?» Sì/No con correzione):
  `POST /ai/actions/feedback`, tabella `MiloAnswerFeedback`.
- **Proposta e approvazione** (Ruoli → Competenze di Milo, solo amministratore): proposta scritta da
  Milo dai giudizi o a mano, confronto riga per riga, approvazione, rifiuto, ritorno alla versione
  rilasciata: `/authz/milo/*`, tabella `MiloSkillVersion`.
- **Limiti di una proposta**: solo istruzioni; regole fisse e strumenti restano nel file rilasciato
  con il servizio AI; limiti di numero e lunghezza controllati nel backend e nel servizio AI.

Schema del database cambiato con il via libera esplicito dell'utente (2026-11-23): migrazione
`20261123220000_milo_feedback_and_skill_versions`.

## Files Changed

- Backend: `milo-skills/store.ts`, `routes/{milo-skills,ai-actions}.ts`, `app.ts`,
  `ai/assistant/{team,service,runtime-client}.ts`, `ai/evals/milo-cases.ts`,
  `ai/actions/prescriptions.ts`, `synthetic/wipe.ts`, catalogo e registro dei permessi, test.
- Database: `prisma/schema.prisma`, migrazione.
- Servizio AI: `skills/__init__.py` e file delle competenze (regole fisse, versione 1.2.0),
  `agents/skill_proposal.py`, `api/app.py`, `domain/contracts.py`, provider di prova, test.
- Frontend: `agnos/{MiloFeedback,AgnosTurnView,useAgnosChat}.tsx`, `AgnosPanel.tsx`,
  `admin/role-permissions/{MiloSkillsView,miloSkillsModel}`, `RolePermissionsPage.{tsx,css}`,
  `lib/{miloFeedback,miloSkillsApi}.ts`, `App.css`, test.
- Strumenti: `scripts/milo-evals/run.mts`. Documentazione: `docs/product/milo-casi-d-uso.md`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                   |
| --- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `milo-evals.test.ts` (6), `milo-scenarios-seed.test.mts` (nove prove sui dati del seed); `scripts/milo-evals/run.mts` contro la demo con versioni delle competenze nel risultato                                           |
| AC2 |   PASS | `evidence/milo-evals-demo-9su9.json`: 9/9 sulla demo; correzioni come versioni nuove (file 1.1.0 → 1.2.0; coordinatore 1.2.0+r2 approvato dall'amministratore)                                                             |
| AC3 |   PASS | sulla demo: giudizio «No» con correzione registrato (`evidence/01…03`); `milo-skills-e2e` A: un giudizio per risposta e per persona, dati non validi rifiutati, senza identità 401                                         |
| AC4 |   PASS | sulla demo: elenco giudizi, proposta scritta da Milo, approvazione, ritorno alla versione rilasciata (`evidence/04…06`, `logs/demo-verification.txt`); Infermiere 403; `milo-skills-e2e` B–E                               |
| AC5 |   PASS | `milo-skills-e2e` C (20 istruzioni, 700 caratteri, frasi vuote), `test_milo_team.py` (regole fisse e strumenti invariati con una versione approvata; proposta solo testo, giudizi recintati come dati non attendibili)     |
| AC6 |   PASS | CI della PR #553 verde (12 controlli); in locale backend senza nuovi fallimenti, frontend 1633/0, build, servizio AI 266                                                                                                   |
| AC7 |   PASS | sulla demo: dopo l'approvazione le due risposte successive iniziano con «In sintesi:» come chiesto dal giudizio e dichiarano le versioni approvate (`logs/demo-verification.txt`, `evidence/07`)                           |

## Test Results

| Test             | Result | Evidence                                                                                                                  |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | `milo-evals` 6, `milo-prescription-handoff` 9; frontend `miloFeedback` 3, `miloSkillsModel` 4; servizio AI 266            |
| Integration      |   PASS | `milo-skills-e2e` 5 (Postgres), `milo-phase2-team` 6 e `milo-scenarios-seed` 6 (PGlite, con la nuova migrazione)          |
| API              |   PASS | sulla demo: `/ai/actions/feedback`, `/authz/milo/skills`, `/authz/milo/feedback`, proposte, approvazione, ripristino      |
| Playwright       |   PASS | sulla demo, profili Infermiere 1 e Amministratore: `evidence/01…07`; in locale desktop e 390 px: `evidence/locale-*`      |
| Persistence      |   PASS | la versione approvata resta in uso tra una richiesta e l'altra e dopo una nuova sessione (prove eseguite dopo il ciclo)   |
| Agnos AI         |   PASS | catalogo dei permessi rigenerato (rotta di giudizio sotto `agnos.plan_command`); team con le istruzioni approvate         |
| Voice            |     NA |                                                                                                                           |
| OCR              |     NA |                                                                                                                           |
| Security/privacy |   PASS | solo `authz.manage_policy`; testo dei giudizi mai nell'audit; nessun contenuto della risposta salvato; iniezione recintata |

## Runtime Evidence

Demo: servizio AI `2a1b6353`, backend `87e2b4ae` (commit `d013f4596`), interfaccia
`clinicos-ejk2uok8c` in produzione. Dettaglio, con orari, in `logs/demo-verification.txt`.

Stato lasciato sulla demo: clinico, sorveglianza e struttura alla versione rilasciata 1.2.0;
coordinatore con la versione approvata 1.2.0+r2 (regola «conserva la forma della risposta dello
specialista»). La stessa regola entra nel file rilasciato con la versione 1.3.0 del coordinatore
(prossimo rilascio del servizio AI); a quel punto la versione approvata si ritira con «Torna alla
versione rilasciata».

Osservazione dal ciclo sulla demo: una modifica approvata per uno specialista non cambiava la
risposta finale finché il coordinatore la riscriveva. Corretta con la regola qui sopra.

## Logs

`logs/demo-verification.txt`. Only sanitized logs are allowed: dati sintetici, nessun segreto.

## Final Decision

CLOSED — VERIFIED
