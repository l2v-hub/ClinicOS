# Milo «AI first» — stato attuale, architettura di arrivo e piano

Data: 2026-11-22 · Stato: proposta da approvare · Task: `artifacts/task-validation/milo-ai-first-analisi-e-piano/`

Obiettivo del committente: Milo diventa l'assistente di tutta l'applicazione, non un supporto.

- Risponde su un paziente o su più pazienti: andamenti, situazione clinica, correlazioni fra
  parametri e storia clinica.
- Applica protocolli clinici riconosciuti: una combinazione di valori diventa una **sentinella** da
  portare all'attenzione del medico.
- Risponde sulla struttura: turni, agenda, cosa c'è da fare oggi, visite dei medici.
- Porta l'utente alla schermata giusta se esiste. Se non esiste, **genera al momento** la dashboard,
  la misura o il report richiesti.
- Aiuta nella registrazione quotidiana (giro visita a voce) e, in una seconda fase, segnala lui per
  primo le situazioni che richiedono attenzione, con l'operatore che decide.

---

## 1. Stato attuale (verificato sul codice)

### 1.1 Due assistenti separati

|                  | **A. Pannello «Assistente»** (storico Agnos)                            | **B. Milo a schermo intero**                                          |
| ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Frontend         | `components/shared/AgnosPanel.tsx`, `agnos/useAgnosChat.ts`             | `components/assistant/AssistantMode.tsx`, `assistantApi.ts`           |
| Backend          | `/ai/assistant/query`, `/ai/actions/plan                                | execute`, `/ai/voice`                                                 | `/skills/converse`, `/skills/voice/*`, `/skills/proactive/*`, `/skills/copilot/*`, `/tools/:name/invoke` |
| Letture          | pianificatore → 15 strumenti del gateway (`ai/assistant/read-tools.ts`) | 16 skill (`skills/catalog.ts`), di cui `clinical.question` → A        |
| Scritture        | 7 azioni (`ai/actions/catalog.ts`), anteprima + conferma                | 5 skill di scrittura, anteprima + conferma (`skills/confirmation.ts`) |
| Parametri vitali | legge e scrive il JSON `Cartella.data.parametriVitali`                  | scrive la tabella `PatientParameterReading`                           |
| Voce             | Web Speech del browser, pianificato subito                              | trascrizione lato server, testo rivisto prima dell'invio              |

Non condividono né lo stato, né il formato delle risposte, né il modo di navigare. **Il pannello A
non vede i parametri registrati dalla pagina Parametri e da B**: `ai/gateway/services.ts:732,1095`
legge solo il JSON della cartella, mentre `PatientParameterReading` è letta solo da
`proactive/sources.ts:52`.

### 1.2 Servizio AI e Agno

Agno è usato solo come involucro della chiamata al modello. In ogni adattatore
(`models/providers/azure.py:76-90`, `google.py`, `anthropic.py`, `openai_like.py`) un `Agent` viene
creato per una chiamata e poi buttato.

Non trovati: `agno.team`, `Team`, `Workflow`, `tools=`, memoria, conoscenza. Gli «agenti» sono
quattro modelli di prompt a chiamata singola:

- pianificatore (`agents/assistant.py:135`, ruolo `reasoning`);
- compositore della risposta (`:164`, ruolo `summary`);
- instradatore di skill (`agents/skill_router.py:72`, ruolo `command_parser`);
- estrazione dei documenti.

Il modello **non vede i risultati** e non può fare una seconda domanda ai dati: un piano, una
esecuzione, fine. Nel backend gli «agenti» `facility` e `clinical` (`ai/assistant/agents.ts`) sono
solo un'etichetta che cambia il tono della risposta.

### 1.3 Accesso ai dati

- **Gateway** (`ai/gateway/*`): SQL parametrico con controllo del perimetro su ogni chiamata
  (`assertTenant`, `assertPatientAllowed`) e limiti di finestra (100 righe).
- **Linguaggio di query** (`ai/gateway/query/*`): 7 entità (paziente, camera, letto, assegnazione,
  appuntamento, terapia, parametro), al massimo 4 passi e 200 righe, aggregati con raggruppamento.
  Per i parametri solo la sistolica in una finestra di date (`engine.ts:164`).
- **Registro degli strumenti** (`tools/registry.ts`, ~60 strumenti): è già la base giusta. Ogni
  chiamata passa per identità → politica → schema → perimetro del paziente → esecuzione → audit, e
  la conferma è obbligatoria dove la politica la richiede.
- **Non raggiungibili** dall'assistente: contenuto del diario, scale e valutazioni, note, storico
  delle somministrazioni, turni degli operatori (`OperatorSchedule`), letti per paziente.

### 1.4 Clinica

- **Nessuno score lato server.** NEWS2 è calcolato solo nel frontend (`frontend/src/lib/news2.ts`,
  soglie RCP 2017, scala SpO₂ 1) e Milo non lo vede.
- Il conteggio dei pazienti «critici» dipende da uno stato scritto a mano (`routes/patients.ts:164`).
- Le domande di interpretazione («è grave?», «interpreta i valori») sono rifiutate per progetto.

### 1.5 Interfaccia

- Le risposte sono testo, coppie chiave/valore, elenchi di fonti e collegamenti.
- **Nessun formato per tabelle, indicatori, grafici o dashboard** e nessuna libreria di grafici.
  L'unico grafico dentro l'assistente è una mini-curva per un solo parametro (`VitalsSparkline`,
  `AIAssistantButton.tsx:224`).
- I grafici veri dell'applicazione sono SVG scritti a mano e legati alla propria pagina:
  `PatientParameterTrendChart.tsx` (andamento a più corsie) e `News2Chip.tsx`.
- La navigazione non porta date o periodi e non copre le pagine di amministrazione (operatori,
  orari, ruoli, note).

### 1.6 Voce, giro visita, proattività

- **Voce:** una frase alla volta, con conferma a pulsante (giusto). Manca la dettatura continua del
  giro con più valori e più pazienti.
- **Giro visita** (`RoundPanel.tsx`): avanzamento solo nella memoria della pagina, nessun riepilogo
  per paziente.
- **Proattività** (`proactive/*`): 13 tipi di evento con priorità decisa da chi scrive o da soglie
  tecniche. «Nessuno score clinico in questa fase» (`proactive/catalog.ts:80`). La lista si aggiorna
  ogni 60 s solo a pannello aperto; il badge esiste (`AssistantEntryBadge.tsx`) ma non è montato.

### 1.7 Sicurezza e privacy

- **Pubblica `/ai/assistant/query`:** il ruolo è forzato a «operatore» perché sulla demo arriva da
  un'intestazione non verificata (`routes/ai-assistant-public.ts:20-27`). È corretto, ma rende
  impossibili le domande fra più pazienti finché l'identità non è verificata (accesso con Entra,
  `AUTH_MODE=entra`).
- **Compositore e briefing** inviano al modello le righe cliniche grezze (nomi, parametri,
  consegne). Il vincolo «solo modello UE / sotto contratto» è scritto nei commenti ma **non
  controllato nel codice**, e non c'è minimizzazione dei dati.

### 1.8 Difetti trovati

1. `query_data` con `patient: "current"` restituisce sempre vuoto: `service.ts:702` chiama
   `dispatchQueryData` senza `currentPatientId`.
2. L'elenco degli intenti ammessi dal pianificatore LLM (`llm-planner.ts:64`) non contiene
   `vitals_trend`, `facility_snapshot` e `operator_queue`.
3. `query_rooms_occupancy` è eseguibile ma non è fra gli strumenti offerti al modello.
4. Lo stato dei flussi delle skill vive nella memoria del processo (`skills/store.ts`): un riavvio lo
   perde.
5. Il badge dei segnali proattivi (`AssistantEntryBadge.tsx`) non è montato.

---

## 2. Architettura di arrivo

### 2.1 Principi (non negoziabili)

- **I dati escono solo dal backend.** Il servizio AI non tocca il database: gli agenti chiamano gli
  strumenti del backend con l'identità e il perimetro dell'operatore, verificati lato server.
- **L'AI non calcola gli score e non fa diagnosi.**
  - Gli score e le regole dei protocolli sono codice deterministico, versionato e testato, con la
    fonte citata.
  - L'AI li richiama, li spiega e li mette in relazione con la storia del paziente.
  - Ogni sentinella è una segnalazione al professionista, mai una decisione.
- **Ogni scrittura passa da anteprima e conferma** dell'operatore: a mano, a voce o da dispositivo.
- **Dati clinici al modello solo con fornitore e regione approvati**, controllati nel codice, e solo
  i campi che servono alla domanda.

### 2.2 Un solo Milo

Un'unica porta d'ingresso nell'interfaccia (pannello e schermo intero sono due viste dello stesso
assistente) e un unico contratto di risposta (§2.5). Nel backend le due pile convergono:

- le **letture** passano tutte per il registro degli strumenti, che ha già politica, perimetro e audit;
- le **scritture** usano le skill con anteprima e conferma;
- i **parametri** si leggono da `PatientParameterReading`, più il JSON storico in sola lettura
  finché non è migrato.

### 2.3 Il team di agenti (servizio AI, Agno `Team`)

```
                         ┌──────────────────────────┐
  domanda / voce  ──▶    │   Milo — coordinatore    │  capisce l'intento, sceglie gli specialisti,
                         │  (Agno Team, mode=route  │  compone la risposta in blocchi (§2.5)
                         │   o coordinate)          │
                         └─────┬──────┬──────┬──────┘
          ┌────────────────────┘      │      └─────────────────────┐
          ▼                           ▼                            ▼
 ┌─────────────────┐      ┌──────────────────────┐      ┌───────────────────────┐
 │ Clinico paziente│      │ Sorveglianza clinica │      │ Struttura e personale │
 │ storia, terapia,│      │ score e protocolli   │      │ turni, agenda, compiti│
 │ andamenti,      │      │ (calcolati dal       │      │ di oggi, visite,      │
 │ correlazioni    │      │ backend), sentinelle │      │ occupazione, operatori│
 └────────┬────────┘      └──────────┬───────────┘      └───────────┬───────────┘
          │        ┌─────────────────┴─────────┐                    │
          │        ▼                           ▼                    │
          │  ┌───────────────┐      ┌────────────────────┐          │
          │  │ Registrazione │      │ Report e dashboard │          │
          │  │ giro visita,  │      │ trasforma i dati in│          │
          │  │ voce → bozza  │      │ grafici, tabelle,  │          │
          │  │ (mai scrive)  │      │ report (blocchi)   │          │
          │  └───────┬───────┘      └─────────┬──────────┘          │
          └──────────┴──────────┬─────────────┴─────────────────────┘
                                ▼
            strumenti = registro del backend (/tools/:name/invoke)
            identità e perimetro dell'operatore, politica, audit, conferma
```

Ogni specialista ha istruzioni proprie e un **insieme proprio di strumenti** (le sue skill). Lavora
in **ciclo**: chiede i dati, li vede, può chiederne altri, entro un limite di passi e di tempo.

| Agente                | Strumenti (lettura, salvo dove indicato)                                                                              | Esempi di domanda                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Clinico paziente      | panoramica, parametri (serie), diario, terapia e somministrazioni, allergie, scale e valutazioni, documenti, consegne | «Come sta andando la pressione di Rossi da quando ha cambiato terapia?» |
| Sorveglianza clinica  | `clinical_scores` (NEWS2, qSOFA, …), `sentinels` per paziente o reparto, storico degli score                          | «Chi ha un NEWS2 in aumento nelle ultime 24 ore?»                       |
| Struttura e personale | turni (`OperatorSchedule`), agenda e visite, occupazione, coda di lavoro, operatori, consegne aperte                  | «Chi è di turno stanotte? Quando passa il medico domani?»               |
| Registrazione         | parsing dei valori dettati, bozza del giro, **proposta** di scrittura (le skill di scrittura con conferma)            | «Letto 3 pressione 140 su 85, saturazione 94, frequenza 88»             |
| Report e dashboard    | nessun accesso proprio ai dati: riceve i risultati degli altri e produce blocchi (§2.5)                               | «Fammi una dashboard di glicemia e insulina degli ultimi 14 giorni»     |

Il **coordinatore** risponde da solo alle domande semplici (una chiamata, nessun costo in più) e
coinvolge gli specialisti solo quando servono, così le domande comuni restano veloci.

### 2.4 Motore dei protocolli clinici (backend, deterministico)

Modulo nuovo `backend/src/clinical/scores/`. Ogni score è una funzione pura con:

- versione;
- fonte citata;
- soglie;
- dati mancanti dichiarati;
- test sui casi limite.

Score proposti per partire, da confermare con il direttore sanitario:

| Score                      | Fonte                                                                         | Uso                  |
| -------------------------- | ----------------------------------------------------------------------------- | -------------------- |
| NEWS2                      | Royal College of Physicians, 2017 (già nel frontend: va spostato nel backend) | deterioramento acuto |
| qSOFA                      | Sepsis-3 (Singer et al., JAMA 2016)                                           | sospetto di sepsi    |
| Braden / Norton            | scale validate di rischio di lesioni da pressione                             | prevenzione          |
| Glicemia: ipo/iperglicemia | soglie di reparto da protocollo interno                                       | diabetici in terapia |
| Pressione: classi          | linee guida ESC/ESH; OMS 2021 per l'ipertensione                              | andamento cronico    |

Nota sulle fonti: l'OMS pubblica linee guida (es. ipertensione 2021, triage ETAT), ma gli score di
deterioramento più usati in reparto (NEWS2, qSOFA) vengono da società scientifiche. Il motore cita
sempre la fonte reale di ogni regola.

Le **sentinelle** sono regole composte: score, andamento, combinazioni di parametri e contesto
clinico. Esempi:

- NEWS2 ≥ 5, oppure un singolo parametro a 3;
- SpO₂ in calo di 3 punti in 24 ore;
- febbre con frequenza cardiaca > 90 in un paziente con catetere.

Sono configurabili dalla struttura e versionate. Il risultato è sempre «da valutare dal medico»,
con il perché e i valori che l'hanno attivata.

**Attenzione regolatoria.** Un software che calcola il rischio clinico di un paziente per
supportare decisioni può rientrare nel Regolamento UE 2017/745 sui dispositivi medici (regola 11:
software di classe IIa o superiore). Prima di usare le sentinelle con pazienti reali serve una
valutazione regolatoria. Fino ad allora le sentinelle restano **promemoria informativi**, chiaramente
etichettati, che non sostituiscono la valutazione clinica.

### 2.5 Interfaccia generativa: i «blocchi» di Milo

Contratto unico di risposta, validato dal backend prima di arrivare al frontend:

```
risposta = { testo, blocchi[], fonti[], azioni[] }
blocco   = kpi | tabella | serie_temporale | correlazione | elenco_allerte | timeline | report_sezione
azione   = apri_schermata(destinazione, paziente?, scheda?, periodo?) | proponi_scrittura(anteprima) | fissa_dashboard
```

- **Se la funzione esiste nell'applicazione**, Milo restituisce `apri_schermata` con paziente,
  scheda e periodo (es. Parametri di Rossi, ultimi 14 giorni) e la naviga. Va aggiunto il periodo
  ai collegamenti diretti.
- **Se non esiste**, Milo restituisce i blocchi e il frontend li disegna con un renderer generico.
  Il renderer nasce generalizzando l'SVG già scritto per l'andamento dei parametri: più serie, assi
  diversi, bande di normalità e di score, marcatori degli eventi (cambio di terapia, ricovero).
  Nessuna libreria pesante.
- **«Fissa questa dashboard»** salva la sua specifica (non i dati) per l'operatore o per il reparto.
  Riaprendola, i dati si ricaricano con le autorizzazioni di chi la guarda. Così le dashboard
  generate al momento diventano viste riutilizzabili senza scrivere codice.
- **Il report di un paziente** è una sequenza di blocchi con testo composto e fonti, esportabile in
  PDF con il motore PDF già presente.

I blocchi contengono **solo dati restituiti dagli strumenti**. Il modello sceglie quali mostrare e
come, ma non può inventare valori: il backend controlla ogni serie contro le fonti, come già fa il
controllo «anti-invenzione» del compositore.

### 2.6 Giro visita a voce e dispositivi

- **Sessione di giro** salvata nel backend: elenco dei pazienti in ordine di camera, stato per
  paziente, riepilogo di cosa è stato registrato.
- **Dettatura continua:** «letto 3: pressione 140 su 85, saturazione 94…». L'agente di
  registrazione divide per paziente e parametro e accumula una **bozza**. A fine paziente (o a fine
  giro) l'operatore vede l'elenco e conferma con un gesto; i valori fuori scala restano evidenziati.
  Niente si scrive senza conferma.
- **Dispositivi indossabili o da letto** (fase successiva): un punto di ingresso unico per le misure
  (modello FHIR `Observation`) che scrive in `PatientParameterReading` con origine «dispositivo».
  Le misure entrano come proposte da confermare o, se la struttura lo decide, come valori marcati.
  Lo stesso flusso alimenta score e sentinelle.

### 2.7 Proattività (seconda fase)

1. A ogni nuova misura il motore degli score ricalcola e valuta le sentinelle.
2. Un segnale con priorità clinica entra nella coda proattiva esistente, con il «perché» e i valori.
3. Il segnale arriva in tempo reale (Server-Sent Events) con il badge nella barra in alto. Oggi la
   lista si aggiorna ogni 60 s solo a pannello aperto.
4. L'operatore prende visione o apre la scheda; il medico decide. Tutto resta nell'audit.
5. Il briefing di inizio turno include gli score e le sentinelle aperte.

---

## 3. Decisioni che spettano al committente

1. **Identità verificata.** Le domande su più pazienti e sulla struttura richiedono l'accesso
   verificato (Entra, `AUTH_MODE=entra`). Sulla demo con ruoli simulati restano limitate al singolo
   paziente, per sicurezza.
2. **Dati clinici al modello.** Fornitore, regione e contratto (DPA) di `gpt-6.1-sol` su Azure.
   Serve confermare la regione UE per abilitare il controllo nel codice; senza conferma il
   compositore va limitato a dati minimizzati.
3. **Protocolli.** Quali score e sentinelle adottare, con quali soglie, validati dal direttore
   sanitario.
4. **Inquadramento regolatorio** delle sentinelle (§2.4).
5. **Migrazione dei parametri storici** dal JSON della cartella alla tabella, oppure lettura
   combinata a tempo indeterminato.

---

## 4. Piano a fasi

Ogni fase si chiude con test, evidenze e rilascio verificato sulla demo, come da Quality Gate.

### Fase 1 — Fondamenta dei dati (prerequisito di tutto)

Contenuto:

- l'assistente legge i parametri da `PatientParameterReading`, più il JSON storico;
- nuovi strumenti di lettura: contenuto del diario, scale e valutazioni, note, somministrazioni,
  turni degli operatori, appuntamenti e visite per persona;
- serie dei parametri con più grandezze e aggregati per periodo;
- correzione dei difetti 1–5 (§1.8);
- **NEWS2 spostato nel backend** (stesso algoritmo e stessi test del frontend), disponibile come
  strumento.

Accettazione:

- un valore registrato dalla pagina Parametri è visibile a Milo;
- «chi è di turno domani» trova la risposta nei turni;
- `query_data` sul paziente corrente restituisce righe;
- NEWS2 calcolato nel backend coincide con quello del frontend su tutti i casi di test.

### Fase 2 — Team di agenti e Milo unico

Contenuto:

- Agno `Team` nel servizio AI con coordinatore e specialisti (§2.3);
- gli strumenti degli agenti chiamano il registro del backend con un token delegato per
  operatore e richiesta (scadenza breve, perimetro dell'operatore);
- ciclo strumenti → risultati → nuova domanda, con limiti di passi e tempo;
- memoria di sessione nel backend, non nel processo;
- un solo punto d'ingresso nell'interfaccia;
- controllo nel codice della regione del fornitore prima di inviare dati clinici.

Accettazione:

- domande di prova per ogni specialista con risposte corrette e fonti citate;
- il team non accede a pazienti fuori perimetro (test avversari esistenti estesi);
- una domanda semplice non diventa più lenta di oggi.

### Fase 3 — Interfaccia generativa

Contenuto:

- contratto dei blocchi (§2.5) e renderer generico (indicatori, tabella, serie, correlazione,
  allerte, timeline);
- navigazione con periodo e nuove destinazioni (pagine di amministrazione, scale, NEWS2);
- «Fissa questa dashboard»;
- report del paziente in PDF.

Accettazione:

- «andamento di pressione e frequenza di Rossi nell'ultimo mese con i cambi di terapia» produce un
  grafico con i dati veri e le fonti;
- «apri i parametri di Rossi dell'ultima settimana» porta alla pagina con quel periodo;
- una dashboard fissata si riapre con i dati aggiornati.

### Fase 4 — Giro visita a voce

Contenuto: sessione di giro salvata, dettatura continua con più parametri e più pazienti, bozza e
conferma per paziente, riepilogo di fine giro.

Accettazione: un giro di 5 pazienti dettato in una sola sessione arriva alla conferma con tutti i
valori giusti; niente è scritto prima della conferma.

### Fase 5 — Sentinelle e proattività

Contenuto:

- motore delle sentinelle (§2.4) sulle misure nuove;
- segnali clinici in tempo reale, badge, briefing con gli score;
- configurazione delle regole per struttura.

Accettazione:

- una misura che porta NEWS2 a 5 genera entro pochi secondi un segnale con il perché, visibile
  senza aprire il pannello;
- la presa visione è registrata.

### Fase 6 — Dispositivi

Contenuto: punto di ingresso delle misure (FHIR `Observation`), origine «dispositivo», proposte da
confermare, integrazione con score e sentinelle.

### Ordine e dipendenze

1 → 2 → 3 sono in sequenza: senza i dati la squadra non ha cosa leggere, e senza la squadra i
blocchi non hanno chi li compone. 4 e 5 possono procedere in parallelo dopo la 2. La 6 dopo la 5.
