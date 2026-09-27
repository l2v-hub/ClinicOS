# Task Validation Report

## Task

- Title: HMI parità 1: guscio comune (barra laterale, intestazione, carattere) come il prototipo
- Slug: hmi-parita-1-guscio-comune-barra-laterale-intestazione-carattere-come-il-prototi
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **`TeamsLikeSidebar.tsx`:** voci operatore nell'ordine ed etichette del prototipo (Turno,
  Pazienti, Terapia, Parametri, Consegne, Agenda, Note, Farmaci) con le sue icone (tratto 2);
  logo croce su quadrato blu 48; "Assistente" separato in fondo. Avatar ed Esci tolti dalla barra
  (ora nell'intestazione). Amministratore: stesse voci di prima, stessa forma.
- **Intestazione (`App.tsx`)**: freccia indietro quadrata 48 solo icona (aria-label e tooltip con
  la destinazione, Alt+← invariato); spazio del titolo; `ShiftClock` (turno e ora, aggiornato al
  minuto); pulsante ricerca 48 (stessa ricerca globale, Ctrl+K invariato); reparto con
  pallino verde; `UserMenu` (avatar 48 → nome, ruolo, reparto, Esci; chiusura con Esc e clic
  fuori).
- **`PageHeader.tsx` + `topbarTitleSlot.ts`**: con lo spazio dell'intestazione disponibile il
  titolo e il sottotitolo della pagina vanno lì (portal); nel contenuto restano solo azioni e tab;
  niente breadcrumb. Senza spazio (test, anteprime) il comportamento è quello di prima.
- **Palette a schermo** (`App.css`): fondo #eef1f6, superfici bianche, bordo #e1e7f0, grigio testo
  #5a6b80 come il prototipo; tolta la banda a 88 px della barra.
- **`lib/turno.ts`**: turno dall'ora con le fasce del diario (mattina 7–14, pomeriggio 14–21, notte
  21–7).
- **`App.css`**: stili di barra e intestazione con le misure del prototipo; carattere Inter;
  intestazione 72 px; barra 96 px anche fra 1024 e 1180 px; hamburger 48.
- **`designTokens.test.ts`**: la larghezza della barra sul tablet passa da 88 a 96 px (decisione di
  parità con il prototipo approvato).

## Files Changed

- frontend/src/components/shared/TeamsLikeSidebar.tsx
- frontend/src/components/shared/PageHeader.tsx
- frontend/src/components/shared/topbarTitleSlot.ts (nuovo)
- frontend/src/components/shared/ShiftClock.tsx (nuovo)
- frontend/src/components/shared/UserMenu.tsx (nuovo)
- frontend/src/lib/turno.ts (nuovo)
- frontend/src/App.tsx
- frontend/src/App.css
- frontend/src/lib/**tests**/designTokens.test.ts
- frontend/src/components/shared/**tests**/hmiShell.test.ts (nuovo)
- CLAUDE.md (sezione navigazione)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                  |
| --- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | playwright-evidence.txt: ordine Turno…Farmaci + Assistente in fondo; barra 96, voce 80×64, logo 48, intestazione 72, ricerca e avatar 48; carattere Inter; "Turno pomeriggio 16:58"                       |
| AC2 |   PASS | 8 pagine: titolo nell'intestazione, 0 breadcrumb e 0 titoli nel contenuto, overflow 0; "Nuovo paziente" apre ancora la scelta                                                                             |
| AC3 |   PASS | freccia 48×48 con aria-label "Indietro: Anagrafica farmaci", torna alla pagina precedente; ricerca con clic e Ctrl+K; avatar → "Dr. Marco Ferretti · Operatore · Cardiologia · Esci", Esci torna al login |
| AC4 |   PASS | 390/768 drawer con hamburger e navigazione, 1024/1180/1440: overflow 0, intestazione entro lo schermo                                                                                                     |
| AC5 |   PASS | build.txt exit 0; unit-full.txt 841/850, stessi 9 fallimenti della baseline                                                                                                                               |

## Test Results

| Test             | Result | Evidence                         |
| ---------------- | -----: | -------------------------------- |
| Unit             |   PASS | hmiShell.test.ts 3/3 (titolo inline senza slot, ramo intestazione con slot, fasce del turno); designTokens 5/5 |
| Integration      |     NA |                                  |
| API              |     NA |                                  |
| Playwright       |   PASS | evidence.mjs 23/23               |
| Persistence      |     NA |                                  |
| Agnos AI         |     NA |                                  |
| Voice            |     NA |                                  |
| OCR              |     NA |                                  |
| Security/privacy |     NA |                                  |

## Runtime Evidence

- screenshots/turno-1180.png, pazienti-1180.png, … (8 pagine), menu-utente.png,
  larghezza-390/768/1024/1180/1440.png
- confronto con il prototipo: artifacts/hmi-parity/proto/*.png

## Independent QA

- READY FOR QA: build, suite (baseline), evidence 23/23 riprodotta; misure della barra identiche al
  prototipo (96, logo 48 a y=12, voci 80×64, colori, Assistente a y=748), intestazione 72, avatar
  48, Inter caricato; titolo sempre coerente con la pagina anche con navigazione rapida e
  indietro; menu utente da tastiera; ruolo Amministratore; larghezze 390–1440.
- Note corrette dopo la QA, poi rieseguiti lint, build, suite 841/850 ed evidence 23/23:
  - "/" non ha mai aperto la ricerca: tolto dal contratto e dal report (resta Ctrl+K);
  - aggiunti i test unitari previsti (`hmiShell.test.ts`);
  - intestazione e card bianche, fondo e bordi con la palette del prototipo;
  - 4 px fra logo e prima voce, come il prototipo;
  - "Turno mattino" come nel prototipo; banda a 88 px rimossa e CLAUDE.md aggiornato;
  - menu utente: tolto aria-haspopup, aria-controls solo a menu aperto.

## Residual Risks

- Pagine senza `PageHeader` (cartella, pagine amministratore Operatori/Agenda/Posti letto/Orari):
  lo spazio del titolo resta vuoto finché i rispettivi cicli non le portano al prototipo.

- I titoli delle pagine sono quelli di oggi ("Benvenuto, …", "Terapia giornaliera", …): diventano
  quelli del prototipo nei cicli delle singole schermate.
- Il pulsante flottante dell'Assistente resta finché il ciclo dell'Assistente non lo sostituisce con
  il pannello laterale del prototipo.
- Turno ricavato dall'ora (fasce del diario) e reparto al posto di "Sincronizzato": da confermare.

## Final Decision

CLOSED — VERIFIED
