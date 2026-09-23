# PO11 — Trasferimenti posturali

Contratto preparatorio del 23 settembre 2026. Implementazione dopo PO10 pubblicata e verificata. L'utente ha approvato piano e delivery senza ulteriori domande. Root integra e pubblica; worker backend e frontend operano in worktree distinti. Dati di test sintetici, database loopback; nessuna scrittura su pazienti online.

## Fonte e versione

DOCX allegato: SHA256 `5d5c25cfc322b4f12a6eeba4ac2cf8d4476b15e95c9152cbe09889f0cc75d49f`.
Testo/tabelle già verificati: `../po-10-painad/source-text/trasferimenti.txt`.
Tipo `postural_transfers`, versione `transfers-it-2026-09-22-v1`.
Questa è una scheda operativa: `result: null`, nessun punteggio numerico o prescrizione automatica. "Sollievo" diventa "struttura" nell'app; "desk" mantiene il termine e la spiegazione "deambulatore con tavolo". Nessuna variazione implicita a degenza, terapie o contenzioni.

## Dati strutturati

Riutilizzare l'involucro PatientAssessment: paziente, autore autenticato, data clinica, bozza/finale, CAS, replay, rettifica, snapshot immutabile e PDF. Tipo discriminato nei DTO; non alterare la versione o reinterpretare gli snapshot PAINAD esistenti.

```ts
answers = {
  context: {
    admissionDate: { status: null | 'known' | 'unavailable', value: null | 'YYYY-MM-DD' },
    diagnosis: { status: null | 'provided' | 'unavailable', text: '', unavailableReason: '' }
  },
  operatedLegLoad: {
    applicable: null | boolean,
    side: null | 'right' | 'left',
    level: null | 'not_allowed' | 'touch_down' | 'full'
  },
  walking: null | 'independent' | 'assisted' | 'not_possible',
  transfers: {
    bedToWheelchair: null | TransferMode8,
    wheelchairToBed: null | TransferMode8,
    toilet: null | TransferMode6
  },
  hygiene: null | 'bed_bath' | 'shower',
  painOnMovement: null | boolean,
  cognitiveDeterioration: null | 'none' | 'mild' | 'severe',
  aids: {
    wheelchair: OwnedAid,
    pressureReliefCushion: OwnedAid,
    wheelchairRestraint: PlainAid,
    oneForearmCrutch: OwnedAid,
    walkingStick: OwnedAid,
    quadCane: OwnedAid,
    twoForearmCrutches: OwnedAid,
    rollator: OwnedAid,
    axillaryWalker: OwnedAid,
    tableWalker: OwnedAid,
    spinalBrace: PlainAid,
    kneeBrace: PlainAid
  },
  notes: ''
}
OwnedAid = { selected: null | boolean, ownership: null | 'personal' | 'facility' }
PlainAid = { selected: null | boolean }
```

Modalità trasferimento, in ordine di fonte: `independent` Autonomo; `one_operator` 1 operatore; `two_operators` 2 operatori; `one_operator_desk` 1 op. + desk; `one_operator_axillary` 1 op. + ascellare; `one_operator_rollator` 1 op. + rollator; `hoist_one_operator` sollevatore + 1 op.; `hoist_two_operators` sollevatore + 2 op. Per WC soltanto le prime sei. Ogni trasferimento ha una scelta indipendente esclusiva.

Altre etichette: DX/SX, carico non concesso/sfiorato/totale; deambulazione autonoma/con assistenza/non possibile; igiene bagno a letto/doccia; dolore Sì/No; deterioramento cognitivo No/lieve/grave.

Ausili: carrozzina, cuscino antidecubito, contenzione in carrozzina, 1 antibrachiale, bastone, tetrapode, 2 antibrachiali, deambulatore rollator, deambulatore ascellare, deambulatore con tavolo (desk), busto, ginocchiera. Proprietà personale/struttura solo sui nove OwnedAid, non su contenzione/busto/ginocchiera.

## Completezza e validazione

Bozze sempre parziali, senza risposte preselezionate. `null` significa non verificato; No/assenza sono risposte esplicite. Campi sconosciuti rifiutati, enum e dipendenze validati dal server; limite corpo 32 KiB, diagnosi/motivo indisponibilità massimo 1.000 caratteri ciascuno, note massimo 4.000. Preservare gli a capo.

Finale: contesto risolto (data ingresso oppure indisponibile, diagnosi oppure indisponibilità motivata), applicabilità carico esplicita (se sì lato+livello; se no entrambi null), deambulazione, tre trasferimenti, igiene, dolore, cognizione e tutti i dodici ausili verificati. Per OwnedAid presente la proprietà è obbligatoria; per assente è null. Un comando esplicito "Nessun ausilio" può impostare tutti a false. Nessuna inferenza tra ausilio selezionato e modalità di trasferimento. Note facoltative.

`completion: { complete, missingPaths }` server-authoritative per questo tipo; mantenere compatibilità DTO PAINAD. `422 assessment_incomplete` con percorsi mancanti, focus UI al campo. Completezza/non applicabilità/procedura firme sono decisioni applicative, non obblighi attribuiti al DOCX.

Dati di ingresso/diagnosi eventualmente proposti dalla cartella riportano provenienza e richiedono accettazione esplicita; nessuna diagnosi viene estratta o confermata automaticamente. Identità finale e posizione restano server-authoritative secondo PO06/PO10.

## UX, storico e documenti

Aprire la scheda corrente, con data clinica e compilatore, oppure uno stato vuoto con "Nuova compilazione". Cinque gruppi leggibili: contesto; mobilizzazione; assistenza; ausili; note. Opzioni descrittive complete, etichette visibili, campi con contrasto/focus, scelte toccabili da mobile, niente griglie che tagliano il testo. Salva bozza, anteprima e finalizzazione esplicita riusano PO10. Nessun pulsante salva per riga.

Ultima scheda corrente = ultima valutazione clinica finale per data, risolvendo la catena di rettifiche. Una rettifica tardiva della scheda vecchia non sostituisce una più recente. Storico distingue nuova valutazione e rettifica; record, finali e documenti precedenti restano accessibili. Filtri per tipo prima della paginazione; deep-link archivio apre il tipo corretto, senza assumere PAINAD. Riutilizzare scope PDF, lista/count/ricerca/AI e categoria riservata di PO10.

PDF: identità e data ripetute su tutte le pagine, tutti i gruppi e le risposte, note a capo, autore e data di finalizzazione, fonte/versione, eventuale predecessore/motivo. Nessun punteggio. Conservare spazi "Firma Fisioterapista" e "Firma Operatori" del DOCX. Impaginazione A4 con dati lunghi senza tagli; non alterare il PDF già archiviato.

## Compilazione e conferme personali

La finalizzazione registra autore/istante reali e non viene presentata come firma digitale. Implementare conferme personali separate dal PDF immutabile: conferma contenuto fisioterapista e presa visione operatore. Ogni evento è append-only e legato a assessmentId/snapshotSha256, attore, nome, qualifica registrata, timestamp server. Unicità su assessmentId+kind+actor; replay restituisce lo stesso evento. No nome digitato, no attestazione per altri, no trasferimento al successore.

La conferma fisioterapista è disponibile solo se la qualifica dell'operatore nel DB normalizzata con trim/lowercase è esattamente `fisioterapista`; non dedurla da reparto/ruolo generico né accettarla dal client. Nell'interfaccia chiamarla "qualifica registrata", senza dichiarare verifica di un albo. Presa visione a operatore autenticato con patientScope corrente. Controllare scope e stato finale nella transazione. Nessun numero minimo blocca il finale: la fonte non lo impone. Conteggio/storico conferme a lato del finale; PDF originale resta invariato. Registrare quale versione è stata confermata e indicare se successivamente rettificata.

## Verifiche e rilascio

Test backend delle opzioni, campo mancante/No, dipendenze, WC con sollevatore rifiutato, proprietà non ammessa, data invalida, limiti Unicode; assenza di score anche completo. Regressioni PAINAD, CAS/replay/rettifiche, accessi, finali/PDF e autenticità delle conferme. Caso rettifica vecchia successiva a valutazione recente. Nessuna modifica a prescrizioni/degenza.

Test frontend su bozza per paziente+tipo+sessione, incompletezza, cambi paziente/tipo durante risposta lenta, errore e reinvio; archivio verso il modulo corretto. Browser desktop/mobile/tastiera su autonomia e assistenza DX/SX, dodici ausili/proprietà, bozza/ripresa, anteprima/finale, rettifica, conferme, archivio e stampa. Render/ispezione PDF sintetico con testo lungo. Build e secret scan sorgenti+bundle; manifest hash e claim rilasciati prima dell'integrazione. Backend/migrazione prima del frontend, alias/sourceCommit e health verificati prima di PO12.
