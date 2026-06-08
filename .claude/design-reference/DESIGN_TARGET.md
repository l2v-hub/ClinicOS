Usa Agent Team Mode con tmux swarm.

Usa Spec Kit prima di implementare.

Task:
Rifare il design system e il layout grafico di ClinicOS prendendo come riferimento TUTTE le immagini PNG presenti nella folder:

.claude/design-reference/

Non indicare una singola immagine: devi analizzare automaticamente tutte le PNG presenti nella cartella.

Prima di scrivere codice devi:

1. cercare tutte le immagini:
   .claude/design-reference/**/*.png

2. analizzarle una per una

3. creare un documento:
   .claude/design-reference/CLINICOS_VISUAL_AUDIT.md

Nel documento devi riportare:
- elenco delle immagini analizzate
- pattern visuali ricorrenti
- regole per la sidebar
- regole per il layout generale
- regole per navigazione livello 2
- regole per navigazione livello 3
- regole per le tabelle
- regole per card e contenitori
- palette ClinicOS proposta in blue medical
- cosa NON copiare dalle immagini reference

Se non riesci a leggere o interpretare le immagini PNG, fermati e scrivi chiaramente:
“Non riesco ad analizzare le immagini reference”.

Non procedere inventando.

Obiettivo:
Usare le immagini solo come riferimento di layout e UX, non come copia del brand.

Non copiare:
- logo
- colori originali
- brand identity
- asset grafici proprietari

Usare invece:
- struttura layout
- gerarchia visiva
- proporzioni sidebar
- stile navigazione multilivello
- stile tabelle
- uso dello spazio
- densità informativa
- organizzazione dei contenuti

ClinicOS deve usare una palette medicale professionale basata sul blu.

Palette richiesta:
- primary blue medical
- blue hover
- blue active
- light blue background
- neutral gray
- white cards
- success green
- warning amber
- danger red solo per alert clinici o errori

Problemi attuali da correggere:
1. sidebar troppo stretta e poco leggibile
2. navigazione livello 2 non uniforme
3. navigazione livello 3 non uniforme
4. Diario usa ancora uno stile custom diverso dagli altri terzi livelli
5. tabelle con stili diversi nelle varie pagine
6. layout non sempre full-width
7. spazio non sfruttato bene su desktop
8. tablet non ottimizzato
9. breadcrumb e header a volte duplicano informazioni
10. card e sezioni cliniche non sempre coerenti

Regola architetturale UX:
ClinicOS deve usare un layout Left-Top-Top.

Livello 1:
sidebar sinistra.

Livello 2:
navigazione orizzontale principale della pagina.

Livello 3:
navigazione orizzontale secondaria, più compatta.

Il livello 2 e il livello 3 devono usare lo stesso design system, ma con gerarchia visiva diversa:
- livello 2 più evidente
- livello 3 più leggero
- niente stili custom pagina per pagina

Componenti condivisi obbligatori:
- AppSidebar
- AppTopNav
- AppSubNav
- PageShell
- PageHeader
- ClinicalCard
- ClinicalDataTable

Regole obbligatorie:

Sidebar:
- più leggibile dell’attuale
- icona + label
- active state chiaro
- stile professionale medical blue
- non troppo stretta
- tablet friendly

Navigazione livello 2:
- unico componente
- orizzontale
- active underline blu
- niente bordo/pill pesante
- spacing coerente
- usata ovunque

Navigazione livello 3:
- unico componente
- stesso linguaggio del livello 2
- più compatta
- niente bottoni custom
- Diario deve usare lo stesso componente degli altri livelli 3

Tabelle:
- unico componente ClinicalDataTable
- stile coerente ovunque
- header uniforme
- filtri per colonna
- ordinamento per colonna
- righe coerenti
- azioni coerenti
- no tabelle custom pagina per pagina

Card:
- unico stile ClinicalCard
- padding coerente
- bordo coerente
- shadow leggera
- sezioni collassabili quando utile
- pulsante modifica coerente

Pagine prioritarie da riallineare:
1. Scheda Paziente
2. Diario Paziente
3. Terapia Farmacologica
4. Parametri
5. Agenda
6. Pazienti
7. Documenti
8. Admin Stanze/Posti Letto
9. Operatori

Processo obbligatorio:

FASE 1 — Audit
- trova tutte le PNG in .claude/design-reference
- analizzale
- crea CLINICOS_VISUAL_AUDIT.md
- non scrivere codice prima dell’audit

FASE 2 — Design system
- crea o aggiorna design tokens CSS
- definisci palette blue medical
- definisci spacing, radius, shadow, typography, table density, nav heights

FASE 3 — Componenti shared
- crea/consolida AppSidebar
- crea/consolida AppTopNav
- crea/consolida AppSubNav
- crea/consolida ClinicalDataTable
- crea/consolida ClinicalCard

FASE 4 — Applicazione
- sostituisci gli stili locali duplicati
- applica componenti condivisi alle pagine prioritarie
- rimuovi tab custom del Diario
- uniforma tabelle principali
- rendi layout full-width responsive

FASE 5 — QA
Verifica:
- tablet 1024x768
- tablet 1180x820
- desktop 1366+
- nessun overflow orizzontale globale
- sidebar leggibile
- livello 2 uniforme
- livello 3 uniforme
- tabelle uniformi
- Diario allineato agli altri terzi livelli
- npm run build

Esegui:
npm run build

Commit:
redesign ClinicOS from design reference folder