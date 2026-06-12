# REQ-001 — Uniformare card e tabelle con collapse, edit modal e UX comune

## Contesto / problema

Oggi card e tabelle di ClinicOS non hanno una UX uniforme.  
Alcune card sono solo visuali, altre modificabili, alcune tabelle hanno uno stile diverso e non esiste un comportamento standard per collassare, espandere e modificare i dati.

## Obiettivo

Ogni card e ogni tabella dell’applicazione deve avere la stessa grafica e la stessa UX:

- icona per collassare;
- secondo click per espandere;
- icona modifica oppure click sulla card/riga;
- apertura popup/modale di modifica;
- X per chiudere;
- Salva per salvare i dati;
- comportamento coerente in tutta l’app.

## Scope incluso

- Creare o consolidare un componente condiviso per le card.
- Creare o consolidare un componente condiviso per le tabelle.
- Creare o consolidare una modale condivisa di modifica.
- Applicare il pattern alle principali sezioni ClinicOS.
- Uniformare stile, spacing, bordo, radius, shadow, header e azioni.
- Supportare comportamento responsive tablet e desktop.

## Scope escluso

- Non modificare backend.
- Non modificare Prisma.
- Non modificare API.
- Non modificare VITE_API_URL.
- Non cambiare logiche cliniche.
- Non usare local state come salvataggio definitivo se esiste API backend.

## Acceptance criteria

- [ ] Ogni card ha una icona visibile per collassare/espandere.
- [ ] Ogni tabella ha una icona visibile per collassare/espandere.
- [ ] Il click sull’icona collapse nasconde il corpo della card/tabella.
- [ ] Il secondo click riapre il corpo della card/tabella.
- [ ] Ogni card dati modificabile ha icona modifica oppure click sulla card.
- [ ] Ogni riga dati modificabile in tabella può aprire la modale di modifica dove applicabile.
- [ ] La modale ha sempre X per chiudere.
- [ ] La modale ha sempre Salva per salvare.
- [ ] Se il salvataggio fallisce, la modale resta aperta e mostra errore.
- [ ] Lo stile è coerente in Scheda Paziente, Presa in Carico, Anamnesi, Diagnosi, Terapia Farmacologica, Parametri Vitali, Diario, Documenti, Agenda e Admin.
- [ ] Nessun overflow orizzontale globale.
- [ ] Layout funzionante su tablet e desktop.
- [ ] npm run build passa.

## Test richiesti

### Test UI/UX

- [ ] Aprire una card.
- [ ] Cliccare icona collassa.
- [ ] Verificare che il corpo si nasconda.
- [ ] Cliccare di nuovo.
- [ ] Verificare che il corpo si riapra.
- [ ] Cliccare icona modifica.
- [ ] Verificare apertura popup.
- [ ] Chiudere con X.
- [ ] Riaprire e salvare.
- [ ] Verificare stile coerente con le altre popup.

### Test funzionale

- [ ] Modificare un dato in una card.
- [ ] Salvare.
- [ ] Fare refresh pagina.
- [ ] Verificare che il dato sia persistente.
- [ ] Simulare errore API.
- [ ] Verificare che la popup resti aperta e mostri errore.

### Test regressione

- [ ] Verificare Scheda Paziente.
- [ ] Verificare Diario.
- [ ] Verificare Terapia Farmacologica.
- [ ] Verificare Parametri.
- [ ] Verificare Documenti.
- [ ] Verificare Admin.
- [ ] Verificare tablet.
- [ ] Verificare desktop.

### Build

- [ ] npm run build

## Priorità

Alta

## Dipendenze

- Componente shared card.
- Componente shared tabella.
- Componente shared modale.
- API backend disponibili per le sezioni persistenti.

## Output atteso da Claude

- componente ClinicalCard o equivalente;
- componente ClinicalDataTable o equivalente;
- componente EditModal o equivalente;
- card e tabelle migrate al comportamento comune;
- sezioni eventualmente non migrate con motivazione;
- test eseguiti;
- risultato npm run build.
