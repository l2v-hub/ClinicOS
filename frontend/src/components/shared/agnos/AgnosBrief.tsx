import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../../../config';
import { LoadingState } from '../../operator/cartella/shared';
import type { AssistantAnswer, AssistantNav } from '../AIAssistantButton';
import { buildAgnosHeaders, type AgnosOperatorIdentity } from './useAgnosChat';
import { NavChips } from './NavChips';

// Brief automatico: aprendo il pannello, Agnos recupera da solo la situazione (istantanea della
// struttura per l'admin, coda di lavoro per l'operatore) senza che l'utente scriva nulla.
// NON è un turno di conversazione: non viene letto dal TTS, non è annullabile e non entra
// nell'indice dei turni. Passa comunque dallo stesso /ai/actions/plan, quindi resta una lettura
// fondata sulle stesse fonti citate di ogni altra risposta.

export type BriefKind = 'facility' | 'operator';

/** Domande che il planner deterministico riconosce (backend/src/ai/assistant/plan.ts). */
const BRIEF_QUESTION: Record<BriefKind, string> = {
  facility: 'Cosa sta succedendo nella struttura?',
  operator: 'Cosa devo fare adesso?',
};

const EYEBROW: Record<BriefKind, string> = {
  facility: 'Situazione struttura',
  operator: 'La giornata di oggi',
};

const LOADING_COPY: Record<BriefKind, string> = {
  facility: 'Sto raccogliendo la situazione della struttura…',
  operator: 'Sto preparando la tua giornata…',
};

interface BriefTherapy {
  patientId: string;
  patientName: string;
  therapyId: string;
  drugName: string;
  dosage?: string;
  scheduledTime: string;
  minutesLate: number;
  minutesUntil: number;
}

interface BriefConsegna {
  id: string;
  pazienteId: string;
  pazienteNome: string;
  tipo: string;
  priorita: string;
  scadenza: string;
  oraScadenza: string | null;
}

interface FacilitySnapshot {
  occupancy: {
    totalBeds: number;
    occupiedBeds: number;
    freeBeds: number;
    occupancyPct: number;
  } | null;
  therapiesOverdueCount: number;
  therapiesOverdue: BriefTherapy[];
  consegneOverdueCount: number;
  consegneOverdue: BriefConsegna[];
  appointmentsTodayCount: number;
}

interface OperatorQueue {
  windowMinutes: number;
  therapiesOverdueCount: number;
  therapiesOverdue: BriefTherapy[];
  therapiesDueSoonCount: number;
  therapiesDueSoon: BriefTherapy[];
  myLikelyConsegneCount: number;
  myLikelyConsegne: BriefConsegna[];
  otherOpenConsegneCount: number;
  otherOpenConsegne: BriefConsegna[];
}

/** I due tool hanno insiemi di campi distinti: la forma della risposta decide cosa mostrare,
 *  non il ruolo dichiarato dal client. */
function isOperatorQueue(r: unknown): r is OperatorQueue {
  return !!r && typeof r === 'object' && 'windowMinutes' in r && 'therapiesDueSoon' in r;
}
function isFacilitySnapshot(r: unknown): r is FacilitySnapshot {
  return !!r && typeof r === 'object' && 'occupancy' in r && 'therapiesOverdueCount' in r;
}

const ROWS_MAX = 5;
const ORA = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

const giorno = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8)}/${iso.slice(5, 7)}` : iso;

interface Props extends AgnosOperatorIdentity {
  /** Il brief parte solo a pannello aperto: un pannello montato-ma-nascosto non interroga il backend. */
  active: boolean;
  kind: BriefKind;
  navKey?: string;
  /** Il suggerimento iniziale ha senso solo finché la conversazione è vuota. */
  showHint: boolean;
  onNavigate?: (n: AssistantNav) => void;
  formatNavLabel?: (n: AssistantNav) => string;
}

export function AgnosBrief({
  active,
  kind,
  operatorId,
  operatorRole,
  operatorName,
  navKey,
  showHint,
  onNavigate,
  formatNavLabel,
}: Props) {
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  // Il pannello ora resta montato tra un'apertura e l'altra: senza questo guard il brief
  // ripartirebbe a ogni riapertura invece che una sola volta per sessione.
  const startedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`${API_URL}/ai/actions/plan`, {
        method: 'POST',
        headers: buildAgnosHeaders({ operatorId, operatorRole, operatorName }),
        body: JSON.stringify({
          text: BRIEF_QUESTION[kind],
          channel: 'testo',
          navKey,
          // Lettura di struttura: il sub-agent selezionato nella UI non viene toccato né letto.
          agent: 'facility',
        }),
      });
      const data = (await res.json()) as { read?: AssistantAnswer | null };
      const read = data?.read;
      if (!res.ok || !read || read.refusal || read.results.length === 0) {
        setFailed(true);
        return;
      }
      setAnswer(read);
      setFetchedAt(new Date());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [operatorId, operatorRole, operatorName, kind, navKey]);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;
    void load();
  }, [active, load]);

  const hint = showHint ? (
    <p className="ai-drawer__hint">
      Sono un assistente virtuale: cerco e mostro i dati già presenti in ClinicOS. Chiedi dati
      esistenti (allergie, terapie, parametri, documenti, appuntamenti) oppure scrivi — o detta con
      il microfono — un comando, es. «Registra pressione 130 su 80 alle 9:00». Ogni modifica viene
      mostrata in anteprima e salvata solo dopo la tua conferma. Non elimino mai dati e non fornisco
      diagnosi né terapie.
    </p>
  ) : null;

  if (failed) {
    return (
      <>
        <div className="agnos-brief">
          <p className="ai-asst__muted">Non sono riuscito a recuperare la situazione.</p>
          <button type="button" className="link-btn" onClick={() => void load()}>
            Riprova
          </button>
        </div>
        {hint}
      </>
    );
  }

  if (loading || !answer) {
    return (
      <div className="agnos-brief" aria-busy="true" aria-live="polite">
        <div className="agnos-brief__eyebrow">{EYEBROW[kind]}</div>
        <LoadingState msg={LOADING_COPY[kind]} />
      </div>
    );
  }

  const result = answer.results[0];
  const chips = (
    <NavChips
      navigation={answer.navigation}
      onNavigate={onNavigate}
      formatLabel={formatNavLabel}
      max={4}
    />
  );
  const rilevato = fetchedAt ? (
    <div className="ai-asst__source-meta">rilevato alle {ORA.format(fetchedAt)}</div>
  ) : null;

  if (isOperatorQueue(result)) {
    return (
      <div className="agnos-brief">
        <OperatorQueueBody queue={result} onNavigate={onNavigate} />
        {chips}
        {rilevato}
      </div>
    );
  }
  if (isFacilitySnapshot(result)) {
    return (
      <div className="agnos-brief">
        <FacilitySnapshotBody snapshot={result} />
        {chips}
        {rilevato}
      </div>
    );
  }
  return (
    <>
      <div className="agnos-brief">
        <p className="ai-asst__muted">Non sono riuscito a recuperare la situazione.</p>
        <button type="button" className="link-btn" onClick={() => void load()}>
          Riprova
        </button>
      </div>
      {hint}
    </>
  );
}

function BriefRow({
  title,
  meta,
  badge,
}: {
  title: React.ReactNode;
  meta?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="agnos-brief__row">
      <div className="agnos-brief__row-main">
        <div className="ai-asst__source-label">{title}</div>
        {meta && <div className="ai-asst__source-meta">{meta}</div>}
      </div>
      {badge}
    </div>
  );
}

function FacilitySnapshotBody({ snapshot }: { snapshot: FacilitySnapshot }) {
  const { occupancy } = snapshot;
  const terapie = snapshot.therapiesOverdue[0];
  const consegna = snapshot.consegneOverdue[0];
  const tutto = snapshot.therapiesOverdueCount === 0 && snapshot.consegneOverdueCount === 0;
  return (
    <>
      <div className="agnos-brief__eyebrow">{EYEBROW.facility}</div>
      {occupancy && (
        <div>
          <div className="kpi-alert-card__val">
            {occupancy.occupiedBeds}/{occupancy.totalBeds}
          </div>
          <div className="kpi-alert-card__lbl">
            Letti occupati · {occupancy.occupancyPct}% · {occupancy.freeBeds} liberi
          </div>
        </div>
      )}
      <div className="agnos-brief__rule" />
      {tutto ? (
        <>
          <span className="kpi-alert-card__ok">Tutto sotto controllo</span>
          <div className="ai-asst__source-meta">
            Controllate le somministrazioni in ritardo e le consegne oltre il termine.
          </div>
        </>
      ) : (
        <>
          <div className="agnos-brief__eyebrow">Da controllare</div>
          {snapshot.therapiesOverdueCount > 0 && (
            <BriefRow
              title="Terapie in ritardo"
              meta={
                terapie
                  ? `${terapie.drugName} delle ${terapie.scheduledTime} · ${terapie.patientName}`
                  : undefined
              }
              badge={<span className="badge badge--red">{snapshot.therapiesOverdueCount}</span>}
            />
          )}
          {snapshot.consegneOverdueCount > 0 && (
            <BriefRow
              title="Consegne scadute"
              meta={consegna ? `${consegna.tipo} · ${consegna.pazienteNome}` : undefined}
              badge={<span className="badge badge--amber">{snapshot.consegneOverdueCount}</span>}
            />
          )}
        </>
      )}
      <div className="agnos-brief__rule" />
      <BriefRow
        title="Appuntamenti oggi"
        badge={<span className="badge badge--blue">{snapshot.appointmentsTodayCount}</span>}
      />
    </>
  );
}

function OperatorQueueBody({
  queue,
  onNavigate,
}: {
  queue: OperatorQueue;
  onNavigate?: (n: AssistantNav) => void;
}) {
  const terapieTot = queue.therapiesOverdueCount + queue.therapiesDueSoonCount;
  const consegneTot = queue.myLikelyConsegneCount + queue.otherOpenConsegneCount;
  const totale = terapieTot + consegneTot;

  const righe: React.ReactNode[] = [];
  const push = (node: React.ReactNode) => {
    if (righe.length < ROWS_MAX) righe.push(node);
  };
  for (const t of queue.therapiesOverdue)
    push(
      <BriefRow
        key={`late-${t.therapyId}-${t.scheduledTime}`}
        title={`${t.drugName} · ${t.patientName}`}
        meta={`delle ${t.scheduledTime} · in ritardo di ${t.minutesLate} min`}
        badge={<span className="badge badge--red">in ritardo</span>}
      />,
    );
  for (const t of queue.therapiesDueSoon)
    push(
      <BriefRow
        key={`soon-${t.therapyId}-${t.scheduledTime}`}
        title={`${t.drugName} · ${t.patientName}`}
        meta={`delle ${t.scheduledTime} · tra ${t.minutesUntil} min`}
      />,
    );
  for (const c of queue.myLikelyConsegne)
    push(<ConsegnaRow key={`mine-${c.id}`} consegna={c} mine />);
  for (const c of queue.otherOpenConsegne) push(<ConsegnaRow key={`other-${c.id}`} consegna={c} />);

  // Il pannello è troppo stretto per espandere in-place: l'elenco completo vive nella schermata
  // della categoria più numerosa.
  const vediTutte: AssistantNav =
    terapieTot >= consegneTot
      ? { type: 'open_therapies_today', label: 'Terapie di oggi' }
      : { type: 'open_consegne', label: 'Consegne' };

  return (
    <>
      <div className="agnos-brief__eyebrow">{EYEBROW.operator}</div>
      <div>
        <div className="kpi-alert-card__val">{totale}</div>
        <div className="kpi-alert-card__lbl">Attività aperte adesso</div>
      </div>
      <div className="agnos-brief__rule" />
      {totale === 0 ? (
        <>
          <span className="kpi-alert-card__ok">Nessuna attività in scadenza</span>
          <div className="ai-asst__source-meta">
            Controllate le somministrazioni entro {queue.windowMinutes} minuti e le consegne aperte.
          </div>
        </>
      ) : (
        <>
          <div className="agnos-brief__eyebrow">Da controllare</div>
          {righe}
          {totale > righe.length && (
            <button type="button" className="link-btn" onClick={() => onNavigate?.(vediTutte)}>
              Vedi tutte le {totale} attività
            </button>
          )}
          {queue.myLikelyConsegneCount > 0 && (
            <div className="ai-asst__source-meta">
              Ordinato per corrispondenza di nome sull’operatore assegnato: non è un elenco
              esclusivo.
            </div>
          )}
        </>
      )}
    </>
  );
}

function ConsegnaRow({ consegna, mine }: { consegna: BriefConsegna; mine?: boolean }) {
  return (
    <BriefRow
      title={
        <>
          {consegna.tipo} · {consegna.pazienteNome}
          {mine && <span className="ai-asst__source-meta"> · assegnato a te</span>}
        </>
      }
      meta={`scadenza ${giorno(consegna.scadenza)}${consegna.oraScadenza ? ` alle ${consegna.oraScadenza}` : ''}`}
      badge={<span className="badge badge--amber">consegna</span>}
    />
  );
}
