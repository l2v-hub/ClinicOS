# PO13 — Contratto DTO backend/frontend MNA

Stato: preparazione DTO concordata con il frontend; il task-contract root prevale. Nessuna applicazione prima del GO esplicito dopo PO12 pubblicata/verificata. Artifact preparato nel worktree PO12 sotto un percorso PO13 distinto; nessun file del manifest PO12 è modificato.

Tipo `mna`; versione `mna-it-2026-09-22-q-corrected-v1`. Stesso envelope create/PATCH/finalize, CAS, replay, scope, PDF recuperabile, storico e rettifiche PO10–12. Nessun punteggio finale accettato dal client. Nessuna attestazione MNA.

## Answers canoniche

Tutte le chiavi sono richieste, salvo `notes` omesso normalizzato a stringa vuota. Oggetti stretti: chiavi mancanti o sconosciute rifiutate anche nei sotto-oggetti. Null è assenza; false, categorie non-sa e punteggi zero rimangono risposte distinte. I valori numerici sono numeri JSON, mai stringhe/coercizioni.

```ts
type MnaExtent = 'screening' | 'full';
type MnaItemId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'
  | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R';
type MeasurementKey =
  | 'weightKg' | 'heightCm'
  | 'armCircumferenceCm' | 'calfCircumferenceCm';
type CalendarDate = string; // YYYY-MM-DD valido, anni 0001–9999
type AnthropometricAnswer<C extends string> =
  | { method: 'category'; category: C | null }
  | { method: 'measured' }; // category deve essere assente, anche se null

interface MnaAnswers {
  extent: MnaExtent;
  A: 'severe_reduction' | 'moderate_reduction' | 'no_reduction' | null;
  B: 'loss_over_3kg' | 'unknown' | 'loss_1_to_3kg' | 'no_loss' | null;
  C: 'bed_or_chair' | 'independent_at_home' | 'goes_out' | null;
  D: boolean | null;
  E: 'severe_dementia_or_depression' | 'moderate_dementia' | 'no_psychological_problems' | null;
  F: AnthropometricAnswer<'lt19' | 'gte19_lt21' | 'gte21_lt23' | 'gte23'>;
  G: boolean | null;
  H: boolean | null;
  I: boolean | null;
  J: 'one_meal' | 'two_meals' | 'three_meals' | null;
  K: {
    dairyDaily: boolean | null;
    eggsOrLegumesWeekly: boolean | null;
    meatFishOrPoultryDaily: boolean | null;
  };
  L: boolean | null;
  M: 'lt3_glasses' | '3_to_5_glasses' | 'gt5_glasses' | null;
  N: 'needs_assistance' | 'independent_with_difficulty' | 'independent_without_difficulty' | null;
  O: 'severe_malnutrition' | 'moderate_or_unknown' | 'no_nutritional_problems' | null;
  P: 'worse' | 'unknown' | 'same' | 'better' | null;
  Q: AnthropometricAnswer<'lt21' | '21_to_22' | 'gt22'>;
  R: AnthropometricAnswer<'lt31' | 'gte31'>;
  measurements: Record<MeasurementKey, number | null>;
  measurementDates: Record<MeasurementKey, CalendarDate | null>;
  notes: string;
}
```

Ordine canonico per parse/hash: extent, A–R (K: dairyDaily, eggsOrLegumesWeekly, meatFishOrPoultryDaily), measurements, measurementDates, notes. Misure/date nell'ordine weightKg, heightCm, armCircumferenceCm, calfCircumferenceCm; tagged union in ordine method/category. Nessuna normalizzazione clinica o cancellazione silenziosa.

Bozza iniziale: extent screening; tutte le risposte semplici e K null; F/Q/R `{method:'category',category:null}`; tutte le misure/date null; notes ''. La modalità tecnica non preseleziona una risposta clinica. Passare a full/screening cambia solo extent; G–R e misure restano presenti.

## Mappa alternative → punti

| Item | Valori in ordine | Punti |
|---|---|---|
| A | severe_reduction / moderate_reduction / no_reduction | 0 / 1 / 2 |
| B | loss_over_3kg / unknown / loss_1_to_3kg / no_loss | 0 / 1 / 2 / 3 |
| C | bed_or_chair / independent_at_home / goes_out | 0 / 1 / 2 |
| D | true / false | 0 / 2 |
| E | severe_dementia_or_depression / moderate_dementia / no_psychological_problems | 0 / 1 / 2 |
| F | lt19 / gte19_lt21 / gte21_lt23 / gte23 | 0 / 1 / 2 / 3 |
| G | true / false | 1 / 0 |
| H, I | true / false | 0 / 1 |
| J | one_meal / two_meals / three_meals | 0 / 1 / 2 |
| K | 0–1 sì / 2 sì / 3 sì, tutti e tre risposti | 0 / 0,5 / 1 |
| L | false / true | 0 / 1 |
| M | lt3_glasses / 3_to_5_glasses / gt5_glasses | 0 / 0,5 / 1 |
| N | needs_assistance / independent_with_difficulty / independent_without_difficulty | 0 / 1 / 2 |
| O | severe_malnutrition / moderate_or_unknown / no_nutritional_problems | 0 / 1 / 2 |
| P | worse / unknown / same / better | 0 / 0,5 / 1 / 2 |
| Q | lt21 / 21_to_22 / gt22 | 0 / 0,5 / 1 |
| R | lt31 / gte31 | 0 / 1 |

Somme con interi in mezzi punti, poi divisione per 2. B non viene dedotto dal peso attuale. J non ammette categorie extra. K conserva tre risposte, non accetta un conteggio o punteggio sintetico; una sola null rende K incompleto anche se il risultato è prevedibile. Testo K eggsOrLegumesWeekly = «Una o due volte la settimana uova o legumi?».

## Misure, modalità, date e precisione

Ogni misura presente deve essere finita e strettamente positiva. Unità canoniche: kg per weightKg; cm per le altre. Non convertire zero, testo vuoto, NaN/Infinity, stringhe numeriche, overflow o valori negativi in null o in una risposta. Valori grezzi invalidi restano nel draft locale in metadati raw/inputErrors, mai nel payload; bloccano salvataggio, finalizzazione e «salva ed esci». Una precedente misura valida nascosta non può essere salvata al posto del testo invalido mostrato.

F è completo in category quando category non è null e almeno una tra weightKg/heightCm è null. È completo in measured soltanto con entrambe le misure presenti e IMC finito positivo calcolabile. Formula IMC = weightKg / (heightCm / 100)^2, in kg/m²; soglie applicate al risultato non arrotondato. Nessun IMC numerico con una misura mancante. Una coppia che produce intermedi/risultato non finiti, zero per underflow o overflow non è salvabile: errore esplicito riferito alle misure, nessuna fascia di ripiego o categoria concorrente. Non introdurre limiti fisiologici arbitrari.

Q è completo in category quando category non è null e armCircumferenceCm è null; in measured quando la circonferenza è presente. R equivalente per calfCircumferenceCm. F/Q/R measured con misure mancanti è una bozza valida e incompleta. Category insieme a un set completo di misure concorrenti è sempre rifiutato, anche quando category è null. Measured con qualsiasi chiave category è rifiutato.

Inserire un set completo valido passa visibilmente a measured e rimuove category in una sola transizione del draft. Eliminare esplicitamente una misura rende disponibile category senza ripristinare una vecchia categoria nascosta. Nessuna misura viene eliminata per imporre una categoria. Per Q 21 e 22 inclusi valgono 0,5; R 31 vale 1. UI mostra sufficiente precisione IMC vicino 19/21/23 per non far apparire sulla soglia un valore realmente dal lato opposto.

measurementDates contiene una data facoltativa per ciascuna misura; date di calendario reali 0001–9999, non istanti UTC, nessun default odierno. Le date sono indipendenti dalla data clinica e di registrazione. Una data inserita prima del valore può restare in bozza/snapshot con valore null, etichettata senza inventare una rilevazione numerica. Rimozione della misura non cancella implicitamente la data.

PO13 usa solo inserimento manuale di dati della valutazione, nessun prefill da cartella. Provenienza server dello snapshot: `manual_assessment`; non serve un campo client manipolabile. Una futura acquisizione da cartella richiederebbe accettazione esplicita e un'estensione versionata di provenienza. Notes: massimo 4000 codepoint Unicode, spazi/a-capo conservati, controlli non ammessi e surrogate isolate rifiutati come PO11/12.

## Completezza, progressi e risultato

History/detail espongono extent (proiezione di answers.extent), answeredCount (0–18, K conta una voce solo se completo), completion e result. History continua a omettere answers/finalSnapshot/hash. Il progresso UI usa i due conteggi di sezione.

Nel detail di una bozza finalSnapshot e snapshotSha256 sono entrambi null. Nel detail finale finalSnapshot è lo snapshot MNA e snapshotSha256 è il digest SHA256 di 64 caratteri esadecimali minuscoli. History omette sempre finalSnapshot e snapshotSha256.

```ts
interface MnaSectionCompletion {
  answeredCount: number;
  requiredCount: 6 | 12;
  complete: boolean;
  missingPaths: string[];
}
interface MnaCompletion {
  complete: boolean; // requisiti dell'extent selezionato
  missingPaths: string[]; // soltanto requisiti dell'extent selezionato
  screening: MnaSectionCompletion; // A–F, requiredCount 6
  global: MnaSectionCompletion; // G–R, requiredCount 12
}
type MnaBand = 'malnourished' | 'at_risk' | 'normal';
interface MnaResult {
  screening: { score: number; maximum: 14; band: MnaBand; label: string } | null;
  global: { score: number; maximum: 16 } | null;
  total: { score: number; maximum: 30; band: MnaBand; label: string } | null;
}
```

result è sempre un oggetto, anche per una bozza vuota; le tre proprietà sono nullable. screening esiste solo se A–F completi. global esiste solo se G–R completi, anche se A–F incompleti, e non ha fascia/diagnosi. total esiste solo con extent full e tutte le 18 voci complete; è sempre null per extent screening anche se tutte le risposte sono conservate.

Percorsi senza prefisso answers, nell'ordine A–R: risposta semplice mancante = A/B/...; categoria mancante = F.category/Q.category/R.category; measured incompleto = measurements.weightKg, measurements.heightCm, measurements.armCircumferenceCm, measurements.calfCircumferenceCm secondo la voce; K = K.dairyDaily, K.eggsOrLegumesWeekly, K.meatFishOrPoultryDaily. Nessun required-path per note/date/misure non necessarie alla modalità. I percorsi K possono essere tre, ma il conteggio resta una voce.

| Sezione | Score | band | label |
|---|---|---|---|
| screening | 0–7 | malnourished | Malnutrito |
| screening | 8–11 | at_risk | A rischio di malnutrizione |
| screening | 12–14 | normal | Stato nutrizionale normale |
| total | <17 | malnourished | Cattivo stato nutrizionale |
| total | 17–23,5 | at_risk | Rischio di malnutrizione |
| total | 24–30 | normal | Stato nutrizionale normale |

Score screening ≤11 invita al completamento globale; il passaggio resta sempre disponibile. Nessuna finalizzazione automatica. Finalizzare screening richiede A–F e usa titolo «Screening MNA®»; finalizzare full richiede A–R e titolo «Valutazione completa MNA®». HTTP422 assessment_incomplete con missingPaths principali dell'extent. Errori input restano HTTP400 assessment_invalid_input con messaggio specifico e missingPaths usato soltanto per incompletezza; i controlli locali identificano il campo prima della richiesta.

## Snapshot MNA dedicato

Campi comuni invariati: snapshotVersion 1, patient (PatientIdentityDto esistente), author, assessedAt, createdAt, finalizedAt, predecessorId, predecessor, correctionReason. Non modificare la forma dei vecchi snapshot.

```ts
{
  form: {
    type: 'mna',
    version: 'mna-it-2026-09-22-q-corrected-v1',
    sourceSha256: '67964491d0ceb5c221e776079c3af2bc7c1ddbf834428997f1b5531e469c6ffa'
  },
  extent: MnaExtent,
  title: string,
  demographics: {
    sex: string | null,
    ageAtAssessment: number | null,
    ageOnDate: CalendarDate,
    timeZone: 'Europe/Rome'
  },
  answers: MnaAnswers, // TUTTE le risposte, incluso G–R parziale
  completion: MnaCompletion,
  items: Array<{
    id: MnaItemId,
    group: 'screening' | 'global',
    label: string,
    answer: MnaAnswers[MnaItemId],
    score: number | null,
    description: string | null
  }>,
  measurements: Array<{
    id: MeasurementKey,
    label: string,
    value: number | null,
    unit: 'kg' | 'cm',
    measuredOn: CalendarDate | null,
    source: 'manual_assessment'
  }>,
  bmi: number | null, // solo se coppia valida completa; nessun numero da categoria
  result: MnaResult,
  notes: string,
  provenance: string,
  references: string[],
  copyright: string
}
```

items contiene sempre A–R in ordine originale. score/description null se la voce è incompleta; answer conserva comunque il dato parziale K. Le tre domande e risposte K sono visibili nel PDF anche se K incompleto. answers e measurements non possono divergere: sono generate dallo stesso valore canonico appena riletto sotto lock al finale.

Il sesso è letto da Patient.sex nella transazione autorizzata, mai dalla richiesta o cartella; mancante/vuoto → null, gli altri valori autorevoli restano testo. Patient.dateOfBirth resta nel patient comune. ageOnDate deriva dall'istante assessedAt in Europe/Rome, non da creazione/finalizzazione o dal giorno UTC. Età intera solo con data di nascita valida e non successiva ad ageOnDate; altrimenti null. Non inventare età o sesso. Calcolo compleanno per confronti mese/giorno; DOB 29 febbraio compie l'anno il 1 marzo negli anni non bisestili.

Il PDF usa solo lo snapshot. In screening G–R resta visibile sotto «Dati globali aggiuntivi conservati — non inclusi nel totale», con risposte effettive, mancanze esplicite e nessun totale a 30. Un global completo può essere mostrato soltanto come subtotale, mai come valutazione completa. Rimangono presenti misure/unità/date/provenienza, età/sesso, note, autore/date, rettifica e fonte. Nessuna firma/attestazione aggiunta.

Provenienza letterale proposta:
> MNA® in italiano dalla fonte fornita. Correzioni editoriali: «acuteo» → «acute o» e «Oni giorne» → «Ogni giorno». Q: corretto il refuso della fonte italiana; CB < 21 cm = 0, 21 ≤ CB ≤ 22 cm = 0,5, CB > 22 cm = 1, secondo il riscontro ufficiale inglese 2023. Conservati E «demenza moderata» e K «una o due volte la settimana». Questa trascrizione non costituisce convalida clinica indipendente.

Riferimenti e avvisi da conservare:
- Vellas B, Villars H, Abellan G, et al. Overview of MNA® - Its History and Challenges. J Nut Health Aging 2006; 10: 456-465.
- Rubenstein LZ, Harker JO, Salva A, Guigoz Y, Vellas B. Screening for Undernutrition in Geriatric Practice: Developing the Short-Form Mini Nutritional Assessment (MNA-SF). J. Geront 2001; 56A: M366-377.
- Guigoz Y. The Mini-Nutritional Assessment (MNA®) Review of the Literature – What does it tell us? J Nutr Health Aging 2006; 10: 466-487.
- ® Société des Produits Nestlé, S.A., Vevey, Switzerland, Trademark Owners; © Nestlé, 1994, Revision 2006. N67200 12/99 10M; www.mna-elderly.com.

references contiene esattamente le tre stringhe bibliografiche dei primi tre punti, nello stesso ordine. copyright contiene come unica stringa il testo integrale del quarto punto, inclusi trademark, copyright e sito; non è un quarto riferimento bibliografico.

Fingerprint create/PATCH/finale distingue tutti i dati canonici, K, extent, metodi, misure, date e note, non solo score. Il meccanismo finalize resta requestId + expectedVersion della revisione corrente; lo snapshot hash lega anche i dati autorevoli e le derivazioni. Nuova valutazione completa dopo screening finale = nuovo record o rettifica tracciata. Nessun aggiornamento di un finale.

## Accettazione dopo GO

Prisma models invariati previsti; migration dei validatori/CHECK per tipo mna, nessuna tabella o dipendenza nuova. Implementazione isolata nel nuovo worktree assegnato da root dal commit PO12. Runtime privato preparato dopo assegnazione, mai rigenerazione del client condiviso.

Test previsti (non eseguiti in preparazione): tutti i domini e payload stretti; massimi 14/16/30; soglie 7/8/11/12 e 16,5/17/23,5/24; otto combinazioni K e ogni sottorisposta null; F a 19/21/23 e lati; Q 21/22 e lati, R 31; mezzi punti M/P/Q; coppie misure incomplete, invalide, overflow/underflow; category/measured contraddittori; date calendario/fingerprint; screening/full/null/progress e finale screening con G–R parziale conservato; snapshot età Europe/Rome/copyright/Q; CAS/replay/scope/retry PDF e regressioni PO10–12. PDF normale/lungo renderizzato e ispezionato prima del handoff.

Questa preparazione non afferma esecuzione di test, convalida clinica, benchmark, generazione runtime, commit o pubblicazione.
