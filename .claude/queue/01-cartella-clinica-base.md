Usa SEMPRE Agent Team Mode con tmux swarm.

Avvia automaticamente un team di agenti coordinati:

1. LEAD / Orchestrator
2. UX-UI Max Power Agent
3. Frontend Implementer
4. QA / Visual Regression Reviewer

Usa la skill / approccio “UX-UI Max Power” per migliorare la navigazione della scheda paziente di ClinicOS.

## Contesto

Progetto: ClinicOS.
Lingua UI: italiano.
Task: migliorare SOLO header e navigazione interna della scheda paziente.

La schermata attuale mostra:

- breadcrumb: Pazienti > Lavia, Luca
- link back “Pazienti”
- avatar paziente
- nome paziente
- badge stato “Ambulatoriale”
- MRN
- età / sesso
- allergia “Penicillina”
- navigazione primo livello:
  - Panoramica
  - Clinica
  - Diario
  - Moduli
  - Documenti
- navigazione secondo livello:
  - Riepilogo
  - Profilo
  - Consegne

Attualmente la navigazione è troppo semplice, poco rifinita e non abbastanza coerente con una web app sanitaria professionale.

## Obiettivo

Migliorare la navigazione della scheda paziente usando un modello UX/UI unico, elegante e professionale.

Non aggiungere nuove funzionalità.
Non modificare backend.
Non modificare Prisma.
Non modificare deploy.
Non modificare VITE_API_URL.

Lavora solo su frontend/layout/stile.

## Problemi da correggere

1. Header paziente poco armonico
- Il breadcrumb e il back link non sono ben integrati.
- Nome, avatar, badge e metadati devono essere più ordinati.
- L’header deve avere una gerarchia più chiara.
- Gli elementi non devono sembrare appoggiati casualmente.

2. Navigazione primo livello da migliorare
La barra:
- Panoramica
- Clinica
- Diario
- Moduli
- Documenti

deve diventare più professionale.

Richieste:
- tab più leggibili
- spacing migliore
- stato attivo più evidente
- hover/focus elegante
- badge “6” di Clinica più integrato
- niente effetto tabella o linea grezza
- stile coerente con app sanitaria moderna

3. Navigazione secondo livello da migliorare
La barra:
- Riepilogo
- Profilo
- Consegne

deve essere visivamente subordinata al primo livello.

Richieste:
- non deve competere con i tab principali
- deve sembrare una section navigation
- stato attivo chiaro ma più leggero
- spacing corretto
- stile coerente e riutilizzabile

4. Spacing generale
- La pagina non deve essere attaccata ai bordi.
- Header, nav primaria, nav secondaria e contenuto devono avere spazi coerenti.
- La schermata deve respirare.
- Deve essere coerente con le altre pagine dell’app.

5. No overflow
- nessuno scroll orizzontale
- nessun tab deve uscire dalla larghezza disponibile
- su tablet i tab devono rimanere leggibili
- se necessario usa scroll orizzontale solo interno alla tab bar, non globale

## UX-UI Max Power Requirements

L’agente UX-UI Max Power deve:

1. Analizzare il pattern attuale.
2. Proporre un modello unico di navigazione:
   - Patient Header
   - Primary Patient Tabs
   - Secondary Section Tabs
3. Definire regole visive riutilizzabili.
4. Assicurare coerenza desktop/tablet.
5. Evitare soluzioni pesanti o troppo colorate.
6. Migliorare la percezione professionale dell’interfaccia.

## Design richiesto

Usa uno stile:

- healthcare professionale
- pulito
- moderno
- ordinato
- con molto respiro
- colori sobri
- blu come accento principale
- badge morbidi
- bordi leggeri
- ombre minime se utili
- font leggibile
- altezza tab coerente
- stati active/hover/focus chiari

## Modello visivo desiderato

### Header paziente

Deve diventare un blocco ordinato con:

- breadcrumb in alto, discreto
- back link “Pazienti” integrato
- area paziente compatta ma chiara
- avatar iniziali
- nome paziente in evidenza
- badge stato vicino al nome
- riga metadati:
  - MRN
  - età
  - sesso
  - camera/letto se presente
- alert allergie visibile ma non invasivo

### Navigazione primaria

Tab principali:

- Panoramica
- Clinica
- Diario
- Moduli
- Documenti

Caratteristiche:
- tab con padding orizzontale generoso
- active tab con underline più elegante oppure pill leggera
- hover leggero
- badge numerico integrato
- separatore inferiore discreto
- nessun bordo pesante

### Navigazione secondaria

Tab secondari:

- Riepilogo
- Profilo
- Consegne

Caratteristiche:
- più piccola della primaria
- meno dominante
- active state chiaro
- eventualmente stile pill/segmented leggero
- posizionata sotto la primaria con spacing coerente
- non deve sembrare una seconda barra uguale alla prima

## Refactoring

Se utile, crea o migliora componenti riutilizzabili:

- PatientHeader
- PatientPrimaryTabs
- PatientSecondaryTabs
- PageTabs
- SectionTabs

Obiettivo:
evitare che ogni pagina abbia tab diversi e incoerenti.

Non fare overengineering.
Non riscrivere tutta l’app.

## File modificabili

Puoi modificare:

- frontend/src/App.tsx
- frontend/src/App.css
- frontend/src/components/**
- eventuali file CSS/componenti della scheda paziente

Non modificare:

- backend
- prisma
- deploy
- API
- dati demo

## QA richiesto

Verifica:

1. apertura scheda paziente
2. header paziente
3. breadcrumb
4. back link Pazienti
5. tab primaria
6. tab secondaria
7. stato active
8. hover/focus
9. badge Clinica
10. alert allergia
11. desktop
12. tablet
13. nessun overflow orizzontale
14. nessun layout schiacciato
15. npm run build

## Build

Esegui:

npm run build

Correggi eventuali errori.

## Commit

Solo dopo build riuscita fai commit:

improve patient navigation ux ui

## Output finale

Riporta:

- modello UX adottato
- file modificati
- componenti creati/modificati
- miglioramenti header
- miglioramenti nav primo livello
- miglioramenti nav secondo livello
- risultato npm run build
- commit hash