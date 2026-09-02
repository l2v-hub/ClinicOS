import { useEffect, useMemo, useRef, useState } from 'react';
import type { CartellaPaziente, ParametriMensili, ParametroGiorno } from '../../types';
import { IcoSearch, IcoX, IcoMessage } from '../../icons';
import { PageHeader } from '../shared/PageHeader';
import { ClinicalTableSection } from './cartella/shared';
import { comparePazienti } from '../../lib/patientSort';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { createLatestRequestGuard } from '../../lib/usePatientDirectorySearch';
import {
  fetchPatientParametersPage,
  mergePatientParametersPage,
  savePatientParameterMonth,
  type ParameterPagePatient,
  type PatientParametersPageItem,
} from '../../lib/patientParametersPage';

// ── Helpers ────────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomUUID();
}

function todayStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function meseCorrente(): { mese: number; anno: number; giorno: number } {
  const d = new Date();
  return { mese: d.getMonth() + 1, anno: d.getFullYear(), giorno: d.getDate() };
}

function getParametroOggi(cartella: CartellaPaziente): ParametroGiorno | null {
  const { mese, anno, giorno } = meseCorrente();
  const mensile = cartella.parametriMensili?.find((m) => m.mese === mese && m.anno === anno);
  return mensile?.giorni.find((g) => g.giorno === giorno) ?? null;
}

function emptyRow(giorno: number): RigaEditabile {
  return {
    giorno,
    pa: '',
    fc: '',
    spo2: '',
    temperatura: '',
    dtx: '',
    evacuazione: '',
    note: '',
    ora: todayStr(),
    operatore: '',
  };
}

interface RigaEditabile {
  giorno: number;
  pa: string;
  fc: string;
  spo2: string;
  temperatura: string;
  dtx: string;
  evacuazione: string;
  note: string;
  ora: string;
  operatore: string;
}

function parametroToRiga(p: ParametroGiorno, giorno: number): RigaEditabile {
  return {
    giorno,
    pa: p.pa ?? '',
    fc: p.fc ?? '',
    spo2: p.spo2 ?? '',
    temperatura: p.temperatura ?? '',
    dtx: p.dtx08 ?? '',
    evacuazione: p.evacuazione ?? '',
    note: p.note ?? '',
    ora: todayStr(),
    operatore: p.firmaIpM ?? '',
  };
}

function rigaToParametroGiorno(r: RigaEditabile): ParametroGiorno {
  return {
    giorno: r.giorno,
    pa: r.pa || undefined,
    fc: r.fc || undefined,
    spo2: r.spo2 || undefined,
    temperatura: r.temperatura || undefined,
    dtx08: r.dtx || undefined,
    evacuazione: r.evacuazione || undefined,
    note: r.note || undefined,
  };
}

// ── Soglie cliniche (evidenza automatica, sola presentazione client-side) ────────
// SpO2 < 92 → critico (rosso). TC ≥ 37,5 → attenzione (ambra). Accetta virgola o punto.
function parseNum(v: string): number {
  return parseFloat(v.replace(',', '.'));
}
function spo2Critico(v: string): boolean {
  const n = parseNum(v);
  return !Number.isNaN(n) && n < 92;
}
function tempAttenzione(v: string): boolean {
  const n = parseNum(v);
  return !Number.isNaN(n) && n >= 37.5;
}
function hasRilevazione(p: ParametroGiorno | null): boolean {
  return !!p && !!(p.pa || p.fc || p.spo2 || p.temperatura || p.dtx08 || p.evacuazione);
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  operatoreNome: string;
  onSelectPaziente: (patientId: string) => void;
}

// ── Singola riga paziente (sub-component) ─────────────────────────────────────

interface RigaProps {
  paziente: ParameterPagePatient;
  cartella: CartellaPaziente;
  operatoreNome: string;
  isNoteOpen: boolean;
  onToggleNote: (open: boolean) => void;
  onClickPaziente: () => void;
  onSalva: (pazienteId: string, riga: RigaEditabile) => void | Promise<void>;
}

function RigaPaziente({
  paziente,
  cartella,
  operatoreNome,
  isNoteOpen,
  onToggleNote,
  onClickPaziente,
  onSalva,
}: RigaProps) {
  const { giorno } = meseCorrente();
  const existing = getParametroOggi(cartella);
  const initialRiga: RigaEditabile = existing
    ? parametroToRiga(existing, giorno)
    : { ...emptyRow(giorno), operatore: operatoreNome };

  const [riga, setRiga] = useState<RigaEditabile>(initialRiga);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const noteButtonRef = useRef<HTMLButtonElement>(null);
  const patientName = `${paziente.firstName} ${paziente.lastName}`;

  const hasSavedNote = Boolean(
    (existing?.note && existing.note.trim().length > 0) ||
    (riga.note && riga.note.trim().length > 0),
  );
  const initials = ((paziente.firstName?.[0] ?? '') + (paziente.lastName?.[0] ?? '')).toUpperCase();

  const cameraInfo = (() => {
    const cam = cartella.cameraNumero || '';
    const let_ = cartella.lettoNumero || '';
    if (cam && let_) return `Camera ${cam} - L${let_}`;
    if (cam) return `Camera ${cam}`;
    return 'Camera —';
  })();

  function update<K extends keyof RigaEditabile>(k: K, v: RigaEditabile[K]) {
    setRiga((r) => ({ ...r, [k]: v }));
  }

  async function handleSave() {
    if (saving) return;
    if (!operatoreNome) {
      setErrorMessage('Sessione scaduta — accedi di nuovo');
      return;
    }
    setSaving(true);
    const oraAuto = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    try {
      await Promise.resolve(
        onSalva(paziente.id, { ...riga, ora: oraAuto, operatore: operatoreNome }),
      );
      setErrorMessage(null);
      onToggleNote(false);
    } catch {
      setErrorMessage('Salvataggio fallito — riprova');
    } finally {
      setSaving(false);
    }
  }

  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }

  const rowClass = 'qe-row' + (isNoteOpen ? ' qe-row--has-note-open' : '');

  return (
    <div
      className={rowClass}
      role="group"
      aria-label={`Parametri ${paziente.firstName} ${paziente.lastName}`}
    >
      <div
        className="qe-row__patient"
        role="button"
        tabIndex={0}
        onClick={onClickPaziente}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClickPaziente();
          }
        }}
        aria-label={`Apri scheda ${paziente.firstName} ${paziente.lastName}`}
      >
        <div className="qe-row__avatar">{initials}</div>
        <div style={{ overflow: 'hidden' }}>
          <div className="qe-row__name">
            {paziente.lastName}, {paziente.firstName}
          </div>
          <div className="qe-row__room">{cameraInfo}</div>
        </div>
      </div>

      <input
        className="qe-row__input qe-row__input--wide"
        placeholder="PA"
        aria-label={`PA per ${patientName}`}
        inputMode="text"
        value={riga.pa}
        onChange={(e) => update('pa', e.target.value)}
        onKeyDown={onEnter}
      />
      <input
        className={'qe-row__input' + (spo2Critico(riga.spo2) ? ' qe-row__input--critico' : '')}
        placeholder="SpO2 %"
        aria-label={`SpO2 per ${patientName}`}
        inputMode="decimal"
        value={riga.spo2}
        onChange={(e) => update('spo2', e.target.value)}
        onKeyDown={onEnter}
        title={spo2Critico(riga.spo2) ? 'SpO2 sotto soglia (<92)' : undefined}
      />
      <input
        className="qe-row__input"
        placeholder="FC bpm"
        aria-label={`Frequenza cardiaca per ${patientName}`}
        inputMode="decimal"
        value={riga.fc}
        onChange={(e) => update('fc', e.target.value)}
        onKeyDown={onEnter}
      />
      <input
        className={
          'qe-row__input' + (tempAttenzione(riga.temperatura) ? ' qe-row__input--attenzione' : '')
        }
        placeholder="TC °C"
        aria-label={`Temperatura corporea per ${patientName}`}
        inputMode="decimal"
        value={riga.temperatura}
        onChange={(e) => update('temperatura', e.target.value)}
        onKeyDown={onEnter}
        title={tempAttenzione(riga.temperatura) ? 'Temperatura ≥ 37,5 °C' : undefined}
      />
      <input
        className="qe-row__input"
        placeholder="DTX"
        aria-label={`Glicemia DTX per ${patientName}`}
        inputMode="decimal"
        value={riga.dtx}
        onChange={(e) => update('dtx', e.target.value)}
        onKeyDown={onEnter}
      />
      <input
        className="qe-row__input qe-row__input--wide"
        placeholder="Evac."
        aria-label={`Evacuazione per ${patientName}`}
        inputMode="text"
        value={riga.evacuazione}
        onChange={(e) => update('evacuazione', e.target.value)}
        onKeyDown={onEnter}
      />

      <button
        ref={noteButtonRef}
        type="button"
        className={'qe-row__note-btn' + (hasSavedNote ? ' qe-row__note-btn--has-note' : '')}
        aria-label={`${isNoteOpen ? 'Chiudi' : 'Apri'} note per ${patientName}`}
        aria-expanded={isNoteOpen}
        onClick={() => onToggleNote(!isNoteOpen)}
        title="Note"
      >
        <span className="qe-row__note-btn-ico" aria-hidden="true">
          <IcoMessage />
        </span>
        <span className="qe-row__note-btn-label">Note</span>
      </button>

      <button
        type="button"
        className="qe-row__save"
        disabled={saving}
        aria-busy={saving}
        aria-label={`Salva parametri per ${patientName}`}
        onClick={handleSave}
      >
        {saving ? '...' : 'Salva'}
      </button>

      {isNoteOpen && (
        <div className="qe-row__note-input">
          <textarea
            value={riga.note}
            rows={2}
            placeholder="Note rapide"
            aria-label={`Note rapide per ${patientName}`}
            onChange={(e) => update('note', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onToggleNote(false);
                window.requestAnimationFrame(() => noteButtonRef.current?.focus());
              }
            }}
          />
        </div>
      )}

      {errorMessage && (
        <div className="qe-row__error" role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MultiPatientParametri({ operatoreNome, onSelectPaziente }: Props) {
  const [noteOpenForPazienteId, setNoteOpenForPazienteId] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState('');
  const [items, setItems] = useState<PatientParametersPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageRequestGuard = useRef(createLatestRequestGuard());
  const pazienti = useMemo(() => items.map((item) => item.patient), [items]);
  const cartellePerPaziente = useMemo(
    () =>
      new Map(items.map((item) => [item.patient.id, item.cartella as CartellaPaziente] as const)),
    [items],
  );

  useEffect(() => {
    const guard = pageRequestGuard.current;
    const request = guard.start();
    const normalizedQuery = ricerca.trim() || undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadingMore(false);
      setPageError(null);
      fetchPatientParametersPage(
        API_URL,
        { q: normalizedQuery, limit: 25, month: meseCorrente().mese, year: meseCorrente().anno },
        {
          headers: operatorHeaders(),
          signal: controller.signal,
        },
      )
        .then((page) => {
          if (!guard.isCurrent(request)) return;
          setItems(page.items);
          setNextCursor(page.nextCursor);
          setHasMore(page.hasMore);
        })
        .catch((error: unknown) => {
          if ((error as { name?: string }).name !== 'AbortError') {
            if (!guard.isCurrent(request)) return;
            setItems([]);
            setPageError('Impossibile caricare i parametri. Riprova.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted && guard.isCurrent(request)) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      guard.invalidate();
    };
  }, [ricerca]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    const guard = pageRequestGuard.current;
    const request = guard.start();
    const cursor = nextCursor;
    const normalizedQuery = ricerca.trim() || undefined;
    setLoadingMore(true);
    setPageError(null);
    try {
      const page = await fetchPatientParametersPage(
        API_URL,
        {
          q: normalizedQuery,
          cursor,
          limit: 25,
          month: meseCorrente().mese,
          year: meseCorrente().anno,
        },
        { headers: operatorHeaders() },
      );
      if (!guard.isCurrent(request)) return;
      setItems((current) => mergePatientParametersPage(current, page.items, true));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      if (guard.isCurrent(request)) {
        setPageError('Impossibile caricare altri pazienti. Riprova.');
      }
    } finally {
      if (guard.isCurrent(request)) setLoadingMore(false);
    }
  }

  function getCartella(pazienteId: string): CartellaPaziente {
    return cartellePerPaziente.get(pazienteId) ?? createEmptyCartella(pazienteId);
  }

  async function salvaRiga(pazienteId: string, riga: RigaEditabile) {
    const cartella = getCartella(pazienteId);
    const { mese, anno } = meseCorrente();
    const parametroGiorno = rigaToParametroGiorno(riga);

    const mensili: ParametriMensili[] = [...(cartella.parametriMensili ?? [])];
    const idxMensile = mensili.findIndex((m) => m.mese === mese && m.anno === anno);

    if (idxMensile >= 0) {
      const giorni = [...mensili[idxMensile].giorni];
      const idxGiorno = giorni.findIndex((g) => g.giorno === riga.giorno);
      if (idxGiorno >= 0) {
        giorni[idxGiorno] = parametroGiorno;
      } else {
        giorni.push(parametroGiorno);
      }
      mensili[idxMensile] = { ...mensili[idxMensile], giorni };
    } else {
      mensili.push({
        id: uid(),
        mese,
        anno,
        giorni: [parametroGiorno],
        createdAt: new Date().toISOString(),
      });
    }

    const monthToSave = mensili.find((item) => item.mese === mese && item.anno === anno);
    if (!monthToSave) throw new Error('Periodo parametri non valido');
    const savedMonth = await savePatientParameterMonth(API_URL, pazienteId, monthToSave, {
      headers: operatorHeaders(),
    });
    setItems((current) =>
      current.map((item) =>
        item.patient.id === pazienteId
          ? { ...item, cartella: { ...item.cartella, parametriMensili: [savedMonth] } }
          : item,
      ),
    );
  }

  const oggi = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Issue #129: ordinamento alfabetico stabile per cognome+nome, anche con filtri attivi.
  const filtrati = [...pazienti].sort(comparePazienti);

  // Contatore avanzamento: pazienti con almeno una rilevazione registrata oggi.
  const totaleRilevabili = filtrati.length;
  const rilevatiOggi = filtrati.filter((p) =>
    hasRilevazione(getParametroOggi(getCartella(p.id))),
  ).length;
  const rilevatiPct = totaleRilevabili ? Math.round((rilevatiOggi / totaleRilevabili) * 100) : 0;

  return (
    <div className="patient-list-view">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Parametri' }]}
        title="Parametri pazienti"
        subtitle={oggi}
      />

      {/* Toolbar — coerente con pagina Pazienti */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-wrap__ico">
            <IcoSearch />
          </span>
          <input
            className="search-input"
            type="search"
            placeholder="Cerca per nome, MRN, camera…"
            aria-label="Cerca paziente per nome, MRN o camera"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
          {ricerca && (
            <button
              className="search-clear-btn"
              onClick={() => setRicerca('')}
              aria-label="Cancella"
            >
              <IcoX />
            </button>
          )}
        </div>
        {!loading && totaleRilevabili > 0 && (
          <div
            className="qe-progress"
            aria-label={`${rilevatiOggi} di ${totaleRilevabili} pazienti caricati rilevati oggi`}
          >
            <span>
              <span className="qe-progress__count">{rilevatiOggi}</span>/{totaleRilevabili} caricati
              rilevati oggi
            </span>
            <span className="qe-progress__bar">
              <span className="qe-progress__fill" style={{ width: `${rilevatiPct}%` }} />
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-state-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Caricamento pazienti…</p>
        </div>
      ) : pageError && pazienti.length === 0 ? (
        <div
          className="empty-state-card"
          role="alert"
          style={{ textAlign: 'center', padding: '48px 32px' }}
        >
          <p style={{ color: 'var(--danger, #b91c1c)' }}>{pageError}</p>
        </div>
      ) : pazienti.length === 0 ? (
        <div className="empty-state-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nessun paziente in elenco.</p>
        </div>
      ) : (
        <ClinicalTableSection title="Parametri" count={filtrati.length} countLabel="pazienti">
          <div className="qe-list">
            {/* Column headers */}
            <div className="qe-row qe-row--header" role="presentation" aria-hidden="true">
              <div className="qe-row__patient">
                <span className="qe-row__col-label">Paziente</span>
              </div>
              <span className="qe-row__col-label qe-row__col-label--wide">PA</span>
              <span className="qe-row__col-label">SpO2</span>
              <span className="qe-row__col-label">FC</span>
              <span className="qe-row__col-label">TC</span>
              <span className="qe-row__col-label">DTX</span>
              <span className="qe-row__col-label qe-row__col-label--wide">Evac.</span>
              <span className="qe-row__col-label">Note</span>
              <span className="qe-row__col-label">Salva</span>
            </div>
            {filtrati.map((paziente) => (
              <RigaPaziente
                key={`${paziente.id}:${JSON.stringify(getParametroOggi(getCartella(paziente.id)))}`}
                paziente={paziente}
                cartella={getCartella(paziente.id)}
                operatoreNome={operatoreNome}
                isNoteOpen={noteOpenForPazienteId === paziente.id}
                onToggleNote={(open: boolean) =>
                  setNoteOpenForPazienteId(open ? paziente.id : null)
                }
                onClickPaziente={() => onSelectPaziente(paziente.id)}
                onSalva={salvaRiga}
              />
            ))}
          </div>
          {pageError && (
            <p className="qe-row__error" role="alert">
              {pageError}
            </p>
          )}
          {hasMore && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              style={{ marginTop: 16 }}
            >
              {loadingMore ? 'Caricamento…' : 'Carica altri 25 pazienti'}
            </button>
          )}
        </ClinicalTableSection>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function createEmptyCartella(pazienteId: string): CartellaPaziente {
  return {
    pazienteId,
    statoRicovero: 'ricoverato',
    anamnesi: {
      fisiologica: '',
      patologicaRemota: '',
      patologicaProssima: '',
      familiare: '',
      lavorativa: '',
      abitudini: '',
      note: '',
      updatedAt: new Date().toISOString(),
      operatore: '',
    },
    diagnosi: [],
    terapie: [],
    farmaci: [],
    allergie: [],
    noteClinica: [],
    visite: [],
    parametriVitali: [],
    interventi: [],
    pianoCura: {
      obiettivi: '',
      interventiPrevisti: '',
      notePianificazione: '',
      dataAggiornamento: '',
      operatore: '',
    },
    indicatoriRischio: [],
    documentiConsegnati: [],
    diarioInfermieristico: [],
    diarioMedico: [],
    medicazioniFerite: [],
    contenzioni: [],
    valutazioniBraden: [],
    parametriMensili: [],
  };
}
