import { useState } from 'react';
import type { CartellaPaziente, ScalaTinettiValutazione, Paziente } from '../../../types';
import { uid, todayStr, nowISO, fmtDate, PrintButton, ClinicalTableSection } from './shared';
import { ClinicalTable } from './ClinicalTable';
import type { ColumnDef } from './ClinicalTable';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

// ── Scoring & severity ────────────────────────────────────────────────────────

export function calcTinettiBalance(v: Partial<ScalaTinettiValutazione>): number {
  return (v.equilibrioSeduto ?? 0) + (v.alzarsi ?? 0) + (v.tentativiAlzarsi ?? 0) +
    (v.equilibrioImmediato ?? 0) + (v.equilibrioProlungato ?? 0) + (v.rombergSpinta ?? 0) +
    (v.occhiChiusi ?? 0) + (v.girarsi360Passi ?? 0) + (v.girarsi360Stabilita ?? 0) +
    (v.sedersi ?? 0);
}

export function calcTinettiGait(v: Partial<ScalaTinettiValutazione>): number {
  return (v.iniziazione ?? 0) + (v.lunghezzaPassoDx ?? 0) + (v.altezzaPassoDx ?? 0) +
    (v.lunghezzaPassoSx ?? 0) + (v.altezzaPassoSx ?? 0) + (v.simmetria ?? 0) +
    (v.continuita ?? 0) + (v.traiettoria ?? 0) + (v.tronco ?? 0) + (v.cammino ?? 0);
}

export function calcTinettiTotal(v: Partial<ScalaTinettiValutazione>): number {
  return calcTinettiBalance(v) + calcTinettiGait(v);
}

export function tinettiRischio(total: number): { label: string; cls: string; color: string } {
  if (total < 19) return { label: 'Alto rischio cadute',  cls: 'badge--red',   color: '#DC2626' };
  if (total < 24) return { label: 'Rischio moderato',     cls: 'badge--amber', color: '#D97706' };
  return              { label: 'Basso rischio',           cls: 'badge--green', color: '#059669' };
}

// ── Form state ────────────────────────────────────────────────────────────────

interface TinettiFormState {
  data: string;
  equilibrioSeduto: number;
  alzarsi: number;
  tentativiAlzarsi: number;
  equilibrioImmediato: number;
  equilibrioProlungato: number;
  rombergSpinta: number;
  occhiChiusi: number;
  girarsi360Passi: number;
  girarsi360Stabilita: number;
  sedersi: number;
  iniziazione: number;
  lunghezzaPassoDx: number;
  altezzaPassoDx: number;
  lunghezzaPassoSx: number;
  altezzaPassoSx: number;
  simmetria: number;
  continuita: number;
  traiettoria: number;
  tronco: number;
  cammino: number;
  note: string;
}

const EMPTY_FORM: TinettiFormState = {
  data: todayStr(),
  equilibrioSeduto: -1, alzarsi: -1, tentativiAlzarsi: -1, equilibrioImmediato: -1,
  equilibrioProlungato: -1, rombergSpinta: -1, occhiChiusi: -1, girarsi360Passi: -1,
  girarsi360Stabilita: -1, sedersi: -1,
  iniziazione: -1, lunghezzaPassoDx: -1, altezzaPassoDx: -1, lunghezzaPassoSx: -1,
  altezzaPassoSx: -1, simmetria: -1, continuita: -1, traiettoria: -1, tronco: -1,
  cammino: -1,
  note: '',
};

// ── Item definitions ──────────────────────────────────────────────────────────

const EQUILIBRIO_ITEMS: { key: keyof TinettiFormState; label: string; options: { v: number; label: string }[] }[] = [
  {
    key: 'equilibrioSeduto',
    label: 'Equilibrio seduto',
    options: [{ v: 0, label: '0 — Instabile' }, { v: 1, label: '1 — Stabile, sicuro' }],
  },
  {
    key: 'alzarsi',
    label: 'Alzarsi dalla sedia',
    options: [
      { v: 0, label: '0 — Incapace senza aiuto' },
      { v: 1, label: '1 — Capace, usa braccia / non sicuro' },
      { v: 2, label: '2 — Capace, senza usare le braccia' },
    ],
  },
  {
    key: 'tentativiAlzarsi',
    label: 'Tentativi per alzarsi',
    options: [
      { v: 0, label: '0 — Incapace' },
      { v: 1, label: '1 — Richiede > 1 tentativo' },
      { v: 2, label: '2 — Riesce al 1° tentativo' },
    ],
  },
  {
    key: 'equilibrioImmediato',
    label: 'Equilibrio in piedi (primi 5 s)',
    options: [
      { v: 0, label: '0 — Instabile (vacilla, sposta i piedi)' },
      { v: 1, label: '1 — Stabile con appoggio' },
      { v: 2, label: '2 — Stabile senza appoggio' },
    ],
  },
  {
    key: 'equilibrioProlungato',
    label: 'Equilibrio prolungato',
    options: [
      { v: 0, label: '0 — Instabile' },
      { v: 1, label: '1 — Base allargata o appoggio' },
      { v: 2, label: '2 — Stabile senza appoggio, base stretta' },
    ],
  },
  {
    key: 'rombergSpinta',
    label: 'Romberg con spinta sternale',
    options: [
      { v: 0, label: '0 — Cade' },
      { v: 1, label: '1 — Vacilla, si aggrappa' },
      { v: 2, label: '2 — Stabile' },
    ],
  },
  {
    key: 'occhiChiusi',
    label: 'Equilibrio occhi chiusi',
    options: [{ v: 0, label: '0 — Instabile' }, { v: 1, label: '1 — Stabile' }],
  },
  {
    key: 'girarsi360Passi',
    label: 'Girarsi 360° — continuità dei passi',
    options: [{ v: 0, label: '0 — Passi discontinui' }, { v: 1, label: '1 — Passi continui' }],
  },
  {
    key: 'girarsi360Stabilita',
    label: 'Girarsi 360° — stabilità',
    options: [{ v: 0, label: '0 — Instabile (si aggrappa)' }, { v: 1, label: '1 — Stabile' }],
  },
  {
    key: 'sedersi',
    label: 'Sedersi',
    options: [
      { v: 0, label: '0 — Insicuro (caduta nella sedia)' },
      { v: 1, label: '1 — Usa le braccia o movimenti bruschi' },
      { v: 2, label: '2 — Sicuro, movimenti fluidi' },
    ],
  },
];

const ANDATURA_ITEMS: { key: keyof TinettiFormState; label: string; options: { v: number; label: string }[] }[] = [
  {
    key: 'iniziazione',
    label: 'Inizio della deambulazione',
    options: [{ v: 0, label: '0 — Esitazione / passi multipli' }, { v: 1, label: '1 — Nessuna esitazione' }],
  },
  {
    key: 'lunghezzaPassoDx',
    label: 'Lunghezza passo destro',
    options: [{ v: 0, label: '0 — Piede dx non supera il sx' }, { v: 1, label: '1 — Piede dx supera il sx' }],
  },
  {
    key: 'altezzaPassoDx',
    label: 'Altezza passo destro',
    options: [{ v: 0, label: '0 — Piede dx striscia' }, { v: 1, label: '1 — Piede dx si solleva' }],
  },
  {
    key: 'lunghezzaPassoSx',
    label: 'Lunghezza passo sinistro',
    options: [{ v: 0, label: '0 — Piede sx non supera il dx' }, { v: 1, label: '1 — Piede sx supera il dx' }],
  },
  {
    key: 'altezzaPassoSx',
    label: 'Altezza passo sinistro',
    options: [{ v: 0, label: '0 — Piede sx striscia' }, { v: 1, label: '1 — Piede sx si solleva' }],
  },
  {
    key: 'simmetria',
    label: 'Simmetria del passo',
    options: [{ v: 0, label: '0 — Asimmetrico' }, { v: 1, label: '1 — Simmetrico' }],
  },
  {
    key: 'continuita',
    label: 'Continuità del passo',
    options: [{ v: 0, label: '0 — Interruzioni / fermate' }, { v: 1, label: '1 — Continuo' }],
  },
  {
    key: 'traiettoria',
    label: 'Traiettoria',
    options: [
      { v: 0, label: '0 — Deviazione marcata' },
      { v: 1, label: '1 — Deviazione lieve / usa ausilio' },
      { v: 2, label: '2 — Rettilinea senza ausilio' },
    ],
  },
  {
    key: 'tronco',
    label: 'Stabilità del tronco',
    options: [
      { v: 0, label: '0 — Oscillazione marcata / usa ausilio' },
      { v: 1, label: '1 — Flette ginocchia o allarga le braccia' },
      { v: 2, label: '2 — Stabile, nessuna oscillazione' },
    ],
  },
  {
    key: 'cammino',
    label: 'Base d\'appoggio nel cammino',
    options: [{ v: 0, label: '0 — Talloni distanti' }, { v: 1, label: '1 — Talloni vicini' }],
  },
];

const ALL_BALANCE_KEYS = EQUILIBRIO_ITEMS.map(i => i.key);
const ALL_GAIT_KEYS = ANDATURA_ITEMS.map(i => i.key);

// ── Compact radio selector ────────────────────────────────────────────────────

function ItemSelect({ label, options, value, onChange }: {
  label: string;
  options: { v: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="braden-field">
      <div className="braden-field__label">{label}</div>
      <div className="braden-field__options">
        {options.map(o => (
          <label key={o.v} className={`braden-option${value === o.v ? ' selected' : ''}`}>
            <input
              type="radio"
              name={label}
              value={o.v}
              checked={value === o.v}
              onChange={() => onChange(o.v)}
            />
            <div className="braden-option__content">
              <div className="braden-option__score">{o.v}</div>
              <div>
                <div className="braden-option__title">{o.label.split('—')[1]?.trim() ?? o.label}</div>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Modulo print view ─────────────────────────────────────────────────────────

function TinettiModulo({ v, paziente }: { v: ScalaTinettiValutazione | null; paziente: Paziente }) {
  const balance = v ? calcTinettiBalance(v) : 0;
  const gait = v ? calcTinettiGait(v) : 0;
  const total = balance + gait;
  const r = v ? tinettiRischio(total) : { label: '—', cls: '', color: '' };

  return (
    <div className="fm braden-modulo">
      <div className="fm-title">Scala di Tinetti (POMA)</div>

      <div className="fm-patient-header">
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Cognome e Nome</span>
          <span className="fm-patient-field__val">{v ? `${paziente.lastName} ${paziente.firstName}` : ''}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Data valutazione</span>
          <span className="fm-patient-field__val">{v ? fmtDate(v.data) : ''}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Operatore</span>
          <span className="fm-patient-field__val">{v?.operatore ?? ''}</span>
        </div>
      </div>

      {/* Equilibrio */}
      <table className="braden-modulo-table">
        <thead>
          <tr>
            <th className="col-indicator" style={{ fontWeight: 700 }}>EQUILIBRIO</th>
            <th className="col-score-hdr">Punteggio</th>
          </tr>
        </thead>
        <tbody>
          {EQUILIBRIO_ITEMS.map(item => {
            const val = v ? (v[item.key as keyof ScalaTinettiValutazione] as number) : -1;
            const optLabel = item.options.find(o => o.v === val)?.label ?? '—';
            return (
              <tr key={item.key}>
                <td className="col-indicator">{item.label}</td>
                <td className="score-cell selected" style={{ textAlign: 'left', paddingLeft: 8 }}>{val >= 0 ? `${val} — ${optLabel.split('—')[1]?.trim() ?? ''}` : '—'}</td>
              </tr>
            );
          })}
          <tr className="totale-row">
            <td style={{ textAlign: 'right', padding: '4px 10px', fontWeight: 700 }}>Totale Equilibrio</td>
            <td className="totale-box">{v ? balance : '___'} / 16</td>
          </tr>
        </tbody>
      </table>

      {/* Andatura */}
      <table className="braden-modulo-table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th className="col-indicator" style={{ fontWeight: 700 }}>ANDATURA</th>
            <th className="col-score-hdr">Punteggio</th>
          </tr>
        </thead>
        <tbody>
          {ANDATURA_ITEMS.map(item => {
            const val = v ? (v[item.key as keyof ScalaTinettiValutazione] as number) : -1;
            const optLabel = item.options.find(o => o.v === val)?.label ?? '—';
            return (
              <tr key={item.key}>
                <td className="col-indicator">{item.label}</td>
                <td className="score-cell selected" style={{ textAlign: 'left', paddingLeft: 8 }}>{val >= 0 ? `${val} — ${optLabel.split('—')[1]?.trim() ?? ''}` : '—'}</td>
              </tr>
            );
          })}
          <tr className="totale-row">
            <td style={{ textAlign: 'right', padding: '4px 10px', fontWeight: 700 }}>Totale Andatura</td>
            <td className="totale-box">{v ? gait : '___'} / 12</td>
          </tr>
        </tbody>
      </table>

      {/* Grand total */}
      <table className="braden-modulo-table" style={{ marginTop: 12 }}>
        <tbody>
          <tr className="totale-row">
            <td colSpan={1} style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 700, fontSize: '10pt' }}>
              TOTALE — {v ? r.label : ''}
            </td>
            <td className="totale-box" style={{ color: r.color }}>
              {v ? total : '___'} / 28
            </td>
          </tr>
        </tbody>
      </table>

      <div className="braden-legend" style={{ marginTop: 12 }}>
        <div>Punteggio &lt; 19 — Alto rischio cadute</div>
        <div>Punteggio 19–23 — Rischio moderato cadute</div>
        <div>Punteggio ≥ 24 — Basso rischio cadute</div>
      </div>

      {v?.note && (
        <div className="fm-notes" style={{ marginTop: 12 }}>
          <span className="fm-notes__lbl">Note</span>
          {v.note}
        </div>
      )}

      <div className="fm-signature-row" style={{ marginTop: 16 }}>
        <div className="fm-signature">
          <span className="fm-signature__lbl">Firma operatore</span>
          <div className="fm-signature__line"></div>
        </div>
      </div>
    </div>
  );
}

// ── History table ─────────────────────────────────────────────────────────────

function TinettiHistoryTable({
  list,
  onOpenModulo,
  onDelete,
}: {
  list: ScalaTinettiValutazione[];
  onOpenModulo: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  type Row = ScalaTinettiValutazione & { _balance: number; _gait: number; _total: number; _rischio: string; _rischioClass: string };

  const rows: Row[] = list.map(v => {
    const balance = calcTinettiBalance(v);
    const gait = calcTinettiGait(v);
    const total = balance + gait;
    const rv = tinettiRischio(total);
    return { ...v, _balance: balance, _gait: gait, _total: total, _rischio: rv.label, _rischioClass: rv.cls };
  });

  const columns: ColumnDef<Row>[] = [
    {
      key: 'data',
      label: 'Data',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (_v, row) => fmtDate(row.data),
    },
    {
      key: '_balance',
      label: 'Equilibrio',
      sortable: true,
      render: (_v, row) => <span style={{ textAlign: 'center', display: 'block' }}>{row._balance} / 16</span>,
    },
    {
      key: '_gait',
      label: 'Andatura',
      sortable: true,
      render: (_v, row) => <span style={{ textAlign: 'center', display: 'block' }}>{row._gait} / 12</span>,
    },
    {
      key: '_total',
      label: 'Totale',
      sortable: true,
      render: (_v, row) => <span style={{ fontWeight: 700, display: 'block', textAlign: 'center' }}>{row._total} / 28</span>,
    },
    {
      key: '_rischio',
      label: 'Rischio',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'Alto rischio cadute',  label: 'Alto rischio cadute' },
        { value: 'Rischio moderato',     label: 'Rischio moderato' },
        { value: 'Basso rischio',        label: 'Basso rischio' },
      ],
      render: (_v, row) => <span className={`badge ${row._rischioClass}`}>{row._rischio}</span>,
    },
    {
      key: 'operatore',
      label: 'Operatore',
      sortable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      key: '_actions',
      label: '',
      width: '64px',
      render: (_v, row) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn icon-btn--sm" onClick={() => onOpenModulo(row.id)} title="Vista modulo">📋</button>
          <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => onDelete(row.id)} title="Elimina">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <ClinicalTable<Row>
      title="Storico valutazioni"
      columns={columns}
      data={rows}
      count={rows.length}
      countLabel="valutazioni"
      emptyMessage="Nessuna valutazione Tinetti registrata."
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScalaTinettiTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const list = cartella.valutazioniTinetti ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<TinettiFormState>({ ...EMPTY_FORM });
  const [modulo, setModulo] = useState(false);
  const [moduloTarget, setModuloTarget] = useState<string | null>(null);

  function set(f: Partial<TinettiFormState>) { setForm(p => ({ ...p, ...f })); }

  const balanceScore = calcTinettiBalance(form as Partial<ScalaTinettiValutazione>);
  const gaitScore = calcTinettiGait(form as Partial<ScalaTinettiValutazione>);
  const totalScore = balanceScore + gaitScore;

  const allBalanceFilled = ALL_BALANCE_KEYS.every(k => (form[k] as number) >= 0);
  const allGaitFilled = ALL_GAIT_KEYS.every(k => (form[k] as number) >= 0);
  const canSave = allBalanceFilled && allGaitFilled;
  const anyFilled = ALL_BALANCE_KEYS.some(k => (form[k] as number) >= 0) || ALL_GAIT_KEYS.some(k => (form[k] as number) >= 0);

  const r = anyFilled ? tinettiRischio(totalScore) : { label: '—', cls: '', color: '' };

  function handleSave() {
    if (!canSave) return;
    const v: ScalaTinettiValutazione = {
      id: uid(),
      data: form.data,
      equilibrioSeduto: form.equilibrioSeduto as 0 | 1,
      alzarsi: form.alzarsi as 0 | 1 | 2,
      tentativiAlzarsi: form.tentativiAlzarsi as 0 | 1 | 2,
      equilibrioImmediato: form.equilibrioImmediato as 0 | 1 | 2,
      equilibrioProlungato: form.equilibrioProlungato as 0 | 1 | 2,
      rombergSpinta: form.rombergSpinta as 0 | 1 | 2,
      occhiChiusi: form.occhiChiusi as 0 | 1,
      girarsi360Passi: form.girarsi360Passi as 0 | 1,
      girarsi360Stabilita: form.girarsi360Stabilita as 0 | 1,
      sedersi: form.sedersi as 0 | 1 | 2,
      iniziazione: form.iniziazione as 0 | 1,
      lunghezzaPassoDx: form.lunghezzaPassoDx as 0 | 1,
      altezzaPassoDx: form.altezzaPassoDx as 0 | 1,
      lunghezzaPassoSx: form.lunghezzaPassoSx as 0 | 1,
      altezzaPassoSx: form.altezzaPassoSx as 0 | 1,
      simmetria: form.simmetria as 0 | 1,
      continuita: form.continuita as 0 | 1,
      traiettoria: form.traiettoria as 0 | 1 | 2,
      tronco: form.tronco as 0 | 1 | 2,
      cammino: form.cammino as 0 | 1,
      operatore: operatoreNome,
      note: form.note,
      createdAt: nowISO(),
    };
    onUpdate({ valutazioniTinetti: [v, ...list] });
    setShowAdd(false);
    setForm({ ...EMPTY_FORM });
  }

  function handleDelete(id: string) {
    onUpdate({ valutazioniTinetti: list.filter(v => v.id !== id) });
  }

  function openModulo(id: string | null) {
    setModuloTarget(id);
    setModulo(true);
  }

  const moduloData = moduloTarget ? list.find(v => v.id === moduloTarget) ?? null : (list[0] ?? null);

  return (
    <div className={`cr-tab-content${modulo ? ' mode-modulo' : ''}`}>

      {/* ── Modulo view (paper form) ── */}
      <div className="modulo-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }} className="no-print">
          <button className="btn-secondary btn-sm" onClick={() => setModulo(false)}>← Vista operativa</button>
          <PrintButton label="Stampa modulo" />
        </div>
        <TinettiModulo v={moduloData} paziente={paziente} />
      </div>

      {/* ── Web view ── */}
      <div className="web-content">
        <ClinicalTableSection
          title="Scala di Tinetti (POMA)"
          count={list.length}
          countLabel="valutazioni"
          actions={<>
            <button className="btn-sm" onClick={() => openModulo(null)} title="Vista modulo cartaceo">
              Vista modulo
            </button>
            <button className="btn-sm" onClick={() => { setForm({ ...EMPTY_FORM }); setShowAdd(true); }}>
              + Nuova valutazione
            </button>
          </>}
        >

          {list.length > 0 && !showAdd && (
            <div className="braden-history">
              <TinettiHistoryTable list={list} onOpenModulo={openModulo} onDelete={handleDelete} />
            </div>
          )}

          {showAdd && (
            <div className="cr-inline-form braden-form">
              <div className="cr-form-section__title">Nuova valutazione Tinetti</div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Data valutazione</label>
                  <input type="date" className="form-input" value={form.data} onChange={e => set({ data: e.target.value })} />
                </div>
                {anyFilled && (
                  <div className="braden-score-preview">
                    <div className="braden-score-preview__val" style={{ color: r.color }}>{totalScore}</div>
                    <div className="braden-score-preview__label">/ 28</div>
                    <span className={`badge ${r.cls}`}>{r.label}</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12, marginBottom: 4, fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#667085' }}>
                Equilibrio (max 16 punti)
              </div>
              {EQUILIBRIO_ITEMS.map(item => (
                <ItemSelect
                  key={item.key}
                  label={item.label}
                  options={item.options}
                  value={form[item.key] as number}
                  onChange={v => set({ [item.key]: v } as Partial<TinettiFormState>)}
                />
              ))}

              <div style={{ marginTop: 16, marginBottom: 4, fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#667085' }}>
                Andatura (max 12 punti)
              </div>
              {ANDATURA_ITEMS.map(item => (
                <ItemSelect
                  key={item.key}
                  label={item.label}
                  options={item.options}
                  value={form[item.key] as number}
                  onChange={v => set({ [item.key]: v } as Partial<TinettiFormState>)}
                />
              ))}

              <div className="form-row" style={{ marginTop: 12 }}>
                <label className="form-label">Note</label>
                <textarea className="form-input" rows={2} value={form.note} onChange={e => set({ note: e.target.value })} />
              </div>

              {anyFilled && (
                <div className="braden-score-summary">
                  <span>Equilibrio: <strong>{balanceScore} / 16</strong></span>
                  <span>Andatura: <strong>{gaitScore} / 12</strong></span>
                  <span>Totale: <strong>{totalScore} / 28</strong></span>
                  <span className={`badge ${r.cls}`}>{r.label}</span>
                </div>
              )}

              <div className="cr-inline-form__actions">
                <button className="btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Annulla</button>
                <button
                  className="btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={!canSave}
                >
                  Salva valutazione
                </button>
              </div>
            </div>
          )}

          {list.length === 0 && !showAdd && (
            <p className="cr-empty">Nessuna valutazione Tinetti registrata.</p>
          )}
        </ClinicalTableSection>
      </div>
    </div>
  );
}
