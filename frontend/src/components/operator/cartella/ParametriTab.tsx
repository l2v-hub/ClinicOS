// Note: feature 010 reference baseline for clinical sub-menu gap = --clinical-submenu-gap (16px); applied via TerapiaFarmacologicaTab.tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { IcoCheck } from '../../../icons';
import type { CartellaPaziente, Paziente, ParametriMensili, ParametroGiorno } from '../../../types';
import { uid, todayStr, nowISO, PrintButton, ClinicalTableSection } from './shared';
import { ParametriModuloView } from './ParametriModuloView';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

const MESI = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

const GRID_COLS: { key: keyof ParametroGiorno; label: string; sub?: string }[] = [
  { key: 'pa', label: 'PA', sub: 'mmHg' },
  { key: 'fc', label: 'FC', sub: 'bpm' },
  { key: 'spo2', label: 'SpO\u2082', sub: '%' },
  { key: 'temperatura', label: 'TC', sub: '\u00b0C' },
  { key: 'dtx08', label: 'DTX 08', sub: 'mg/dl' },
  { key: 'dtx12', label: 'DTX 12', sub: 'mg/dl' },
  { key: 'dtx18', label: 'DTX 18', sub: 'mg/dl' },
  { key: 'evacuazione', label: 'EVAC', sub: '' },
  { key: 'catetere', label: 'CATET', sub: '' },
  { key: 'firmaIpM', label: 'IP M', sub: '' },
  { key: 'firmaIpP', label: 'IP P', sub: '' },
  { key: 'note', label: 'NOTE', sub: '' },
];

const EVACUAZIONE_OPTIONS = ['\u2014', 'S\u00ec', 'No', 'Alvo regolare', 'Stipsi', 'Diarrea'];

const NUMERIC_COLS: Set<keyof ParametroGiorno> = new Set([
  'fc',
  'spo2',
  'temperatura',
  'dtx08',
  'dtx12',
  'dtx18',
  'catetere',
]);

/** Soglie anti-errore-di-battitura (non cliniche): un valore fuori qui e' quasi certamente un
 * refuso, non una lettura estrema ma vera — per questo il salvataggio non viene mai bloccato,
 * solo segnalato. */
const PLAUSIBLE_RANGES: Partial<Record<keyof ParametroGiorno, [number, number]>> = {
  fc: [20, 300],
  spo2: [0, 100],
  temperatura: [25, 45],
  dtx08: [10, 900],
  dtx12: [10, 900],
  dtx18: [10, 900],
};
const PA_PATTERN = /^(\d{2,3})\/(\d{2,3})$/;

function isOutOfRange(colKey: keyof ParametroGiorno, value: string): boolean {
  if (!value) return false;
  if (colKey === 'pa') {
    const m = value.match(PA_PATTERN);
    if (!m) return true;
    const sist = Number(m[1]);
    const dias = Number(m[2]);
    return sist < 40 || sist > 300 || dias < 20 || dias > 200;
  }
  const range = PLAUSIBLE_RANGES[colKey];
  if (!range) return false;
  const n = Number(value);
  if (Number.isNaN(n)) return true;
  return n < range[0] || n > range[1];
}

function emptyGiorno(giorno: number): ParametroGiorno {
  return { giorno };
}

function findOrCreateMese(
  mensili: ParametriMensili[],
  mese: number,
  anno: number,
): ParametriMensili {
  const found = mensili.find((m) => m.mese === mese && m.anno === anno);
  if (found) return found;
  return {
    id: uid(),
    mese,
    anno,
    giorni: [],
    createdAt: nowISO(),
  };
}

function giornoHasData(g: ParametroGiorno): boolean {
  return !!(
    g.pa ||
    g.fc ||
    g.spo2 ||
    g.temperatura ||
    g.dtx08 ||
    g.dtx12 ||
    g.dtx18 ||
    g.evacuazione ||
    g.catetere ||
    g.firmaIpM ||
    g.firmaIpP ||
    g.note
  );
}

function daysInMonth(mese: number, anno: number): number {
  return new Date(anno, mese, 0).getDate();
}

export function ParametriTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const today = new Date();
  const [viewMese, setViewMese] = useState(today.getMonth() + 1);
  const [viewAnno, setViewAnno] = useState(today.getFullYear());
  const [modulo, setModulo] = useState(false);
  const [showVitalePanel, setShowVitalePanel] = useState(false);
  const [vitaleForm, setVitaleForm] = useState<{
    etichetta: string;
    valore: string;
    unita: string;
    stato: 'normale' | 'attenzione' | 'critico';
    rilevato: string;
    note: string;
  }>({
    etichetta: '',
    valore: '',
    unita: '',
    stato: 'normale',
    rilevato: todayStr(),
    note: '',
  });

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    giorno: number;
    colKey: keyof ParametroGiorno;
  } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const mensili: ParametriMensili[] = cartella.parametriMensili ?? [];
  const meseCorrente = findOrCreateMese(mensili, viewMese, viewAnno);
  const numGiorni = daysInMonth(viewMese, viewAnno);

  // Quante celle si possono compilare in rapida sequenza (Tab attraverso una riga) prima che
  // il salvataggio parta: raggruppa una PUT dell'intera cartella per "burst" di editing invece
  // di una per cella. 800ms di pausa fa scattare il salvataggio; un tetto massimo di 4s evita che
  // una sessione di editing ininterrotta (l'utente non si ferma mai) rimandi il salvataggio
  // indefinitamente.
  const OVERLAY_DEBOUNCE_MS = 800;
  const OVERLAY_MAX_WAIT_MS = 4000;

  // Overlay locale: valori confermati ma non ancora spediti al backend, mostrati subito nella
  // griglia (giornoData li legge con priorita') mentre la PUT vera e' ancora in coda. STATO, non
  // ref: il React Compiler richiede che i dati letti durante il render siano reattivi. Ogni
  // modifica clona la Map e la rimpiazza (mai mutata in place).
  const [overlay, setOverlay] = useState<Map<string, string | undefined>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPendingAtRef = useRef<number | null>(null);
  // Evita closure stantie dentro flush(), che puo' scattare da un setTimeout creato molti render
  // fa: sincronizzato in un effect (MAI durante il render, per le regole dei ref del React
  // Compiler) cosi' flush() legge sempre lo stato piu' recente al momento in cui gira davvero,
  // non quello catturato quando il timer e' stato creato.
  const flushDepsRef = useRef({ meseCorrente, mensili, viewMese, viewAnno, overlay, onUpdate });
  useEffect(() => {
    flushDepsRef.current = { meseCorrente, mensili, viewMese, viewAnno, overlay, onUpdate };
  });

  function giornoData(g: number): ParametroGiorno {
    const base = meseCorrente.giorni.find((d) => d.giorno === g) ?? emptyGiorno(g);
    if (overlay.size === 0) return base;
    let result = base;
    for (const col of GRID_COLS) {
      const key = `${g}-${String(col.key)}`;
      if (overlay.has(key)) {
        if (result === base) result = { ...base };
        (result as unknown as Record<string, unknown>)[col.key] = overlay.get(key);
      }
    }
    return result;
  }

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Applica le modifiche in coda al mese CORRENTE AL MOMENTO DELLA CHIAMATA e le spedisce in una
  // sola PUT. `overrideOverlay`, quando presente, e' la Map appena calcolata da `queueCellSave`
  // per il ramo "tetto massimo superato": la usa al posto di `flushDepsRef.current.overlay`
  // perche' quest'ultimo puo' non essere ancora sincronizzato (l'effect che lo aggiorna non ha
  // ancora girato) nello stesso istante in cui viene accodata l'ultima modifica \u2014 senza questo
  // parametro, un flush forzato nello stesso tick in cui si preme l'ultimo tasto perderebbe
  // esattamente quell'ultima modifica.
  const flush = useCallback(
    (overrideOverlay?: Map<string, string | undefined>) => {
      clearDebounceTimer();
      firstPendingAtRef.current = null;
      const {
        meseCorrente: mc,
        mensili: allMesi,
        viewMese: vm,
        viewAnno: va,
        overlay: pendingFromDeps,
        onUpdate: update,
      } = flushDepsRef.current;
      const pending = overrideOverlay ?? pendingFromDeps;
      if (pending.size === 0) return;
      let giorni = mc.giorni;
      for (const [key, value] of pending) {
        const sep = key.indexOf('-');
        const giorno = Number(key.slice(0, sep));
        const colKey = key.slice(sep + 1) as keyof ParametroGiorno;
        const gd = giorni.find((d) => d.giorno === giorno) ?? emptyGiorno(giorno);
        const updated = { ...gd, giorno, [colKey]: value };
        giorni = giorni.filter((d) => d.giorno !== giorno);
        if (giornoHasData(updated)) giorni.push(updated);
      }
      giorni.sort((a, b) => a.giorno - b.giorno);
      const updatedMese: ParametriMensili = { ...mc, giorni };
      const otherMesi = allMesi.filter((m) => !(m.mese === vm && m.anno === va));
      setOverlay(new Map());
      update({ parametriMensili: [...otherMesi, updatedMese] });
    },
    [clearDebounceTimer],
  );

  // Accoda una modifica: aggiorna l'overlay (visibile subito, letto durante il render da
  // giornoData) e riavvia il debounce, salvo superamento del tetto massimo, nel qual caso
  // spedisce subito passando la Map appena calcolata (vedi commento su `flush`).
  const queueCellSave = useCallback(
    (giorno: number, colKey: keyof ParametroGiorno, value: string) => {
      const cleanValue = value.trim();
      const finalValue =
        colKey === 'evacuazione' && cleanValue === '\u2014' ? undefined : cleanValue || undefined;
      const key = `${giorno}-${String(colKey)}`;
      const nextOverlay = new Map(overlay);
      nextOverlay.set(key, finalValue);
      setOverlay(nextOverlay);
      setModifiedCells((prev) => new Set(prev).add(key));
      if (firstPendingAtRef.current === null) firstPendingAtRef.current = Date.now();
      clearDebounceTimer();
      if (Date.now() - firstPendingAtRef.current >= OVERLAY_MAX_WAIT_MS) {
        flush(nextOverlay);
      } else {
        debounceTimerRef.current = setTimeout(() => flush(), OVERLAY_DEBOUNCE_MS);
      }
    },
    [overlay, clearDebounceTimer, flush],
  );

  // Sicurezza: nessuna modifica in coda deve andare persa lasciando il tab (cambio scheda,
  // cambio paziente, chiusura cartella smontano questo componente).
  useEffect(() => {
    return () => flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flush legge lo stato via flushDepsRef, non serve nelle dep
  }, []);

  function prevMese() {
    flush();
    if (viewMese === 1) {
      setViewMese(12);
      setViewAnno((v) => v - 1);
    } else setViewMese((v) => v - 1);
    setEditingCell(null);
  }
  function nextMese() {
    flush();
    if (viewMese === 12) {
      setViewMese(1);
      setViewAnno((v) => v + 1);
    } else setViewMese((v) => v + 1);
    setEditingCell(null);
  }

  function startEditing(giorno: number, colKey: keyof ParametroGiorno) {
    const gd = giornoData(giorno);
    const currentVal = (gd[colKey] as string | undefined) ?? '';
    setEditingCell({ giorno, colKey });
    setEditingValue(currentVal);
    // Focus will happen via useEffect-like approach in the render
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  function moveToNextCell(giorno: number, colKey: keyof ParametroGiorno) {
    const colIdx = GRID_COLS.findIndex((c) => c.key === colKey);
    if (colIdx < GRID_COLS.length - 1) {
      // Next column, same row
      startEditing(giorno, GRID_COLS[colIdx + 1].key);
    } else if (giorno < numGiorni) {
      // First column, next row
      startEditing(giorno + 1, GRID_COLS[0].key);
    } else {
      // Last cell in grid, just close
      setEditingCell(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, giorno: number, colKey: keyof ParametroGiorno) {
    if (e.key === 'Enter') {
      e.preventDefault();
      queueCellSave(giorno, colKey, editingValue);
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      queueCellSave(giorno, colKey, editingValue);
      moveToNextCell(giorno, colKey);
    }
  }

  function handleBlur() {
    if (!editingCell) return;
    queueCellSave(editingCell.giorno, editingCell.colKey, editingValue);
    setEditingCell(null);
  }

  function addVitale() {
    if (!vitaleForm.etichetta || !vitaleForm.valore) return;
    const newV = {
      id: uid(),
      etichetta: vitaleForm.etichetta,
      valore: vitaleForm.valore,
      unita: vitaleForm.unita,
      stato: vitaleForm.stato,
      rilevato: vitaleForm.rilevato,
      rilevatoDa: operatoreNome,
      note: vitaleForm.note || undefined,
    };
    onUpdate({ parametriVitali: [newV, ...cartella.parametriVitali] });
    setVitaleForm({
      etichetta: '',
      valore: '',
      unita: '',
      stato: 'normale',
      rilevato: todayStr(),
      note: '',
    });
    setShowVitalePanel(false);
  }

  function renderCell(giorno: number, col: (typeof GRID_COLS)[number]) {
    const gd = giornoData(giorno);
    const val = (gd[col.key] as string | undefined) ?? '';
    const isEditing = editingCell?.giorno === giorno && editingCell?.colKey === col.key;
    const wasModified = modifiedCells.has(`${giorno}-${String(col.key)}`);

    const classes = [
      'vitale-inline-cell',
      val ? 'has-data' : '',
      isEditing ? 'is-editing' : '',
      wasModified ? 'was-modified' : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (isEditing) {
      if (col.key === 'evacuazione') {
        return (
          <td key={String(col.key)} className={classes}>
            <select
              ref={(el) => {
                inputRef.current = el;
              }}
              className="vitale-inline-select"
              value={editingValue || '\u2014'}
              onChange={(e) => {
                setEditingValue(e.target.value);
                queueCellSave(giorno, col.key, e.target.value);
                setEditingCell(null);
              }}
              onKeyDown={(e) => handleKeyDown(e, giorno, col.key)}
              onBlur={handleBlur}
            >
              {EVACUAZIONE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </td>
        );
      }

      const isNumeric = NUMERIC_COLS.has(col.key);
      const isPA = col.key === 'pa';

      return (
        <td key={String(col.key)} className={classes}>
          <input
            ref={(el) => {
              inputRef.current = el;
            }}
            className="vitale-inline-input"
            type="text"
            inputMode={isNumeric ? 'numeric' : undefined}
            placeholder={isPA ? '120/80' : undefined}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => handleKeyDown(e, giorno, col.key)}
            onBlur={handleBlur}
          />
        </td>
      );
    }

    const outOfRange = isOutOfRange(col.key, val);
    const finalClasses = [classes, outOfRange ? 'out-of-range' : ''].filter(Boolean).join(' ');
    const title = outOfRange
      ? `Valore insolito per questo parametro (${val}) \u2014 verificare che non sia un errore di digitazione.`
      : val.length > 8
        ? val
        : undefined;

    return (
      <td
        key={String(col.key)}
        className={finalClasses}
        title={title}
        onClick={() => startEditing(giorno, col.key)}
      >
        {val ? (
          val.length > 8 ? (
            val.slice(0, 8) + '\u2026'
          ) : (
            val
          )
        ) : (
          <span className="vitale-placeholder">{'\u2014'}</span>
        )}
      </td>
    );
  }

  return (
    <div className={`cr-tab-content${modulo ? ' mode-modulo' : ''}`}>
      {/* -- Modulo view -- */}
      <div className="modulo-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }} className="no-print">
          <button className="btn-secondary btn-sm" onClick={() => setModulo(false)}>
            &#8592; Vista operativa
          </button>
          <PrintButton label="Stampa modulo" />
        </div>
        <ParametriModuloView cartella={cartella} paziente={paziente} />
      </div>

      {/* -- Web view -- */}
      <div className="web-content">
        <ClinicalTableSection
          title="Parametri Vitali Mensili"
          actions={
            <>
              <button className="btn-sm" onClick={() => setModulo(true)}>
                Vista modulo
              </button>
              <button className="btn-sm" onClick={() => setShowVitalePanel((v) => !v)}>
                + Parametro rapido
              </button>
            </>
          }
        >
          {/* -- Quick vital panel -- */}
          {showVitalePanel && (
            <div className="cr-inline-form" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
                Aggiunta rapida parametro vitale
              </div>
              <div className="op-form-grid">
                <div className="form-field">
                  <label className="form-label">Parametro *</label>
                  <input
                    className="form-input"
                    value={vitaleForm.etichetta}
                    placeholder="Pressione Arteriosa"
                    onChange={(e) => setVitaleForm((p) => ({ ...p, etichetta: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Valore *</label>
                  <input
                    className="form-input"
                    value={vitaleForm.valore}
                    placeholder="120/80"
                    onChange={(e) => setVitaleForm((p) => ({ ...p, valore: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Unita'</label>
                  <input
                    className="form-input"
                    value={vitaleForm.unita}
                    placeholder="mmHg"
                    onChange={(e) => setVitaleForm((p) => ({ ...p, unita: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Stato</label>
                  <select
                    className="form-select"
                    value={vitaleForm.stato}
                    onChange={(e) =>
                      setVitaleForm((p) => ({
                        ...p,
                        stato: e.target.value as typeof vitaleForm.stato,
                      }))
                    }
                  >
                    <option value="normale">Normale</option>
                    <option value="attenzione">Attenzione</option>
                    <option value="critico">Critico</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Data</label>
                  <input
                    className="form-input"
                    type="date"
                    value={vitaleForm.rilevato}
                    onChange={(e) => setVitaleForm((p) => ({ ...p, rilevato: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Note</label>
                  <input
                    className="form-input"
                    value={vitaleForm.note}
                    onChange={(e) => setVitaleForm((p) => ({ ...p, note: e.target.value }))}
                  />
                </div>
              </div>
              <div className="cr-inline-form__actions">
                <button className="btn-secondary btn-sm" onClick={() => setShowVitalePanel(false)}>
                  Annulla
                </button>
                <button className="btn-success btn-sm" onClick={addVitale}>
                  <IcoCheck /> Salva
                </button>
              </div>
            </div>
          )}

          {/* -- Month selector -- (clinical sub-menu spacing per FR-013) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 'var(--clinical-submenu-gap, 16px)',
              marginBottom: 14,
            }}
          >
            <button className="btn-secondary btn-sm" onClick={prevMese}>
              &#8249;
            </button>
            <span style={{ fontWeight: 700, fontSize: 15, minWidth: 160, textAlign: 'center' }}>
              {MESI[viewMese - 1]} {viewAnno}
            </span>
            <button className="btn-secondary btn-sm" onClick={nextMese}>
              &#8250;
            </button>
            <span className="cr-meta" style={{ marginLeft: 8 }}>
              Clicca su una cella per modificare il valore direttamente
            </span>
          </div>

          {/* -- Monthly grid -- */}
          <div className="clinicos-table-wrap">
            <table className="clinicos-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  {GRID_COLS.map((c) => (
                    <th key={String(c.key)}>
                      {c.label}
                      {c.sub && (
                        <>
                          <br />
                          <span style={{ fontWeight: 400, fontSize: 8 }}>{c.sub}</span>
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: numGiorni }, (_, i) => i + 1).map((g) => (
                  <tr key={g}>
                    <td className="parametri-day-col">{g}</td>
                    {GRID_COLS.map((c) => renderCell(g, c))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ClinicalTableSection>
      </div>
    </div>
  );
}
