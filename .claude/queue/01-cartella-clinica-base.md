Implementa la Fase 1: evoluzione della Cartella Clinica Paziente esistente.

Deve somigliare a una griglia verticale ripetuta.

Layout:
- tabella a righe ripetute
- colonna sinistra: Data e sigla
- colonna centrale: “Medicazione sostituita per”
- colonna destra: Note

Per ogni riga:
- campo data
- campo sigla operatore
- checkbox:
  - Termine
  - Bagnata
  - Sporca
- campo note ampio

La versione stampabile deve avere molte righe vuote, come un registro cartaceo.

Non creare una nuova app.
Non riscrivere tutto da zero.
Integra queste funzionalità nella sezione paziente/cartella clinica già presente in ClinicOS.

Obiettivo:
Creare una struttura più solida della Cartella Clinica Operatore, con sezioni cliniche organizzate, editabili, espandibili e stampabili.

Aggiungi o migliora:

1. Testata paziente sempre visibile
Deve mostrare:
- nome e cognome
- data di nascita
- età
- camera
- letto/posto letto
- operatore assegnato
- stato paziente
- alert urgenti
- terapie attive
- consegne aperte
- documenti mancanti
- pulsanti rapidi:
  - Modifica paziente
  - Aggiungi consegna
  - Aggiungi nota clinica
  - Aggiungi parametro
  - Aggiungi terapia
  - Stampa cartella

2. Navigazione interna cartella clinica
Aggiungi tab o navigazione interna:
- Panoramica
- Presa in carico
- Documenti
- Diario infermieristico
- Diario medico
- Parametri vitali
- Terapie
- Medicazioni
- Moduli
- Storico

3. Card cliniche riutilizzabili
Ogni card deve avere:
- modalità visualizzazione
- modalità modifica
- salva
- annulla
- espandi/focalizza
- comprimi
- stampa

4. Stampa
Aggiungi CSS print-friendly.
Quando si stampa un modulo:
- nascondi sidebar
- nascondi menu
- nascondi header app
- stampa solo il modulo selezionato
- mostra dati paziente
- mostra titolo modulo
- mostra data
- mostra area firma/sigla

Scope:
Puoi creare componenti sotto:
frontend/src/components/clinical/

Componenti suggeriti:
- ClinicalRecordWorkspace.tsx
- ClinicalSectionCard.tsx
- PatientHeader.tsx

Aggiorna App.tsx e App.css solo se necessario.
Non modificare backend.
Non modificare Prisma.
Esegui npm run build e correggi errori.