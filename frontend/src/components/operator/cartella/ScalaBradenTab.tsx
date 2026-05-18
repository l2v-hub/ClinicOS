import { useState } from 'react';
import type { CartellaPaziente, ScalaBradenValutazione, Paziente } from '../../../types';
import { uid, todayStr, nowISO, fmtDate, PrintButton, ClinicalTableSection } from './shared';
import { ClinicalTable } from './ClinicalTable';
import type { ColumnDef } from './ClinicalTable';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

interface BradenFormState {
  data: string;
  percezioneSensoriale: number;
  umidita: number;
  attivita: number;
  mobilita: number;
  nutrizione: number;
  frizione: number;
  note: string;
}

function calcScore(v: BradenFormState | ScalaBradenValutazione): number {
  return (v.percezioneSensoriale ?? 0) + (v.umidita ?? 0) + (v.attivita ?? 0) +
    (v.mobilita ?? 0) + (v.nutrizione ?? 0) + (v.frizione ?? 0);
}

function rischio(score: number): { label: string; cls: string; color: string } {
  if (score === 0) return { label: '—', cls: '', color: '' };
  if (score <= 9)  return { label: 'Rischio molto alto', cls: 'badge--red',   color: '#DC2626' };
  if (score <= 12) return { label: 'Rischio alto',       cls: 'badge--red',   color: '#DC2626' };
  if (score <= 14) return { label: 'Rischio moderato',   cls: 'badge--amber', color: '#D97706' };
  if (score <= 18) return { label: 'Rischio basso',      cls: 'badge--blue',  color: '#1A56DB' };
  return              { label: 'Nessun rischio',      cls: 'badge--green', color: '#059669' };
}

// ── Braden table data (fedele al template cartaceo) ───────────────────────

const BRADEN_ROWS = [
  {
    key: 'percezioneSensoriale' as keyof ScalaBradenValutazione,
    label: 'percezione\nsensoriale',
    cells: {
      4: 'Non limitato',
      3: 'Leggermente\nlimitata',
      2: 'Molto limitata',
      1: 'Completamente\nlimitata',
    },
  },
  {
    key: 'umidita' as keyof ScalaBradenValutazione,
    label: 'umidità',
    cells: {
      4: 'Raramente\nbagnato',
      3: 'Occasionalmente\nbagnato',
      2: 'Spesso bagnato',
      1: 'Costantemente\nbagnato',
    },
  },
  {
    key: 'attivita' as keyof ScalaBradenValutazione,
    label: 'attività',
    cells: {
      4: 'Cammina\nfrequentemente',
      3: 'Cammina\noccasionalmente',
      2: 'In poltrona',
      1: 'Completamente\nallettato',
    },
  },
  {
    key: 'mobilita' as keyof ScalaBradenValutazione,
    label: 'mobilità',
    cells: {
      4: 'Limitazione\nassente',
      3: 'Parzialmente\nlimitata',
      2: 'Molto limitata',
      1: 'Immobile',
    },
  },
  {
    key: 'nutrizione' as keyof ScalaBradenValutazione,
    label: 'nutrizione',
    cells: {
      4: 'Eccellente',
      3: 'Adeguata',
      2: 'Probabilmente\npovera',
      1: 'Molto povera',
    },
  },
  {
    key: 'frizione' as keyof ScalaBradenValutazione,
    label: 'frizione e\nscivolamento',
    cells: {
      4: '',
      3: 'Assenza di\nproblemi',
      2: 'Problema\npotenziale',
      1: 'Problema',
    },
  },
];

// ── Web score selector ────────────────────────────────────────────────────

const PERCEZIONE_OPTIONS = [
  { v: 1, label: '1 — Completamente limitata', desc: 'Nessuna risposta a stimoli dolorosi o capacità limitata di sentire dolore su gran parte del corpo.' },
  { v: 2, label: '2 — Molto limitata', desc: 'Risponde solo a stimoli dolorosi. Non riesce a comunicare il disagio se non con gemiti.' },
  { v: 3, label: '3 — Leggermente limitata', desc: 'Risponde ai comandi verbali ma non sempre riesce a comunicare il disagio.' },
  { v: 4, label: '4 — Nessun deficit', desc: 'Risponde ai comandi verbali. Nessun deficit sensoriale.' },
];
const UMIDITA_OPTIONS = [
  { v: 1, label: '1 — Costantemente umida', desc: 'La cute è quasi sempre umida.' },
  { v: 2, label: '2 — Molto umida', desc: 'La cute è spesso umida. Biancheria cambiata almeno una volta per turno.' },
  { v: 3, label: '3 — Occasionalmente umida', desc: 'La cute è occasionalmente umida. Cambio circa una volta al giorno.' },
  { v: 4, label: '4 — Raramente umida', desc: 'La cute è generalmente asciutta.' },
];
const ATTIVITA_OPTIONS = [
  { v: 1, label: '1 — Allettato', desc: 'Confinato a letto.' },
  { v: 2, label: '2 — In poltrona', desc: 'Capacità di deambulazione molto limitata. Non regge il proprio peso.' },
  { v: 3, label: '3 — Cammina occasionalmente', desc: 'Cammina per brevi distanze. Trascorre la maggior parte del tempo a letto.' },
  { v: 4, label: '4 — Cammina frequentemente', desc: 'Cammina fuori dalla stanza almeno due volte al giorno.' },
];
const MOBILITA_OPTIONS = [
  { v: 1, label: '1 — Completamente immobile', desc: 'Non riesce a cambiare posizione senza aiuto.' },
  { v: 2, label: '2 — Molto limitata', desc: 'Cambia occasionalmente posizione ma non frequentemente in autonomia.' },
  { v: 3, label: '3 — Leggermente limitata', desc: 'Apporta cambiamenti frequenti ma leggeri alla posizione in autonomia.' },
  { v: 4, label: '4 — Nessuna limitazione', desc: 'Apporta frequenti e importanti cambiamenti di posizione senza assistenza.' },
];
const NUTRIZIONE_OPTIONS = [
  { v: 1, label: '1 — Molto scarsa', desc: 'Non mangia mai un pasto completo. Raramente >1/3 del cibo offerto.' },
  { v: 2, label: '2 — Probabilmente inadeguata', desc: 'Raramente mangia un pasto completo. In genere mangia metà del cibo.' },
  { v: 3, label: '3 — Adeguata', desc: 'Mangia più della metà di ogni pasto. 4 porzioni di proteine al giorno.' },
  { v: 4, label: '4 — Eccellente', desc: 'Mangia la maggior parte di ogni pasto. Non rifiuta mai un pasto.' },
];
const FRIZIONE_OPTIONS = [
  { v: 1, label: '1 — Problema', desc: 'Richiede assistenza da moderata a massima per muoversi. Vi è attrito sul lenzuolo.' },
  { v: 2, label: '2 — Problema potenziale', desc: 'Si muove poco o è assistito. Vi è qualche attrito durante il cambio posizione.' },
  { v: 3, label: '3 — Nessun problema evidente', desc: 'Si muove in modo indipendente. Sufficiente forza per sollevarsi.' },
];

const ALL_OPTIONS = [PERCEZIONE_OPTIONS, UMIDITA_OPTIONS, ATTIVITA_OPTIONS, MOBILITA_OPTIONS, NUTRIZIONE_OPTIONS, FRIZIONE_OPTIONS];

function ScoreSelect({ label, options, value, onChange }: {
  label: string; options: { v: number; label: string; desc: string }[];
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="braden-field">
      <div className="braden-field__label">{label}</div>
      <div className="braden-field__options">
        {options.map(o => (
          <label key={o.v} className={`braden-option${value === o.v ? ' selected' : ''}`}>
            <input type="radio" name={label} value={o.v} checked={value === o.v} onChange={() => onChange(o.v)} />
            <div className="braden-option__content">
              <div className="braden-option__score">{o.v}</div>
              <div>
                <div className="braden-option__title">{o.label.split('—')[1]?.trim()}</div>
                <div className="braden-option__desc">{o.desc}</div>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Modulo print view (griglia colorata fedele al cartaceo) ───────────────

function BradenModulo({ v, paziente }: { v: ScalaBradenValutazione | null; paziente: Paziente }) {
  const score = v ? calcScore(v) : 0;
  const r = rischio(score);

  return (
    <div className="fm braden-modulo">
      <div className="fm-title">Scala di Braden</div>

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

      <table className="braden-modulo-table">
        <thead>
          <tr>
            <th className="col-indicator">INDICATORI</th>
            <th className="col-score-hdr">4</th>
            <th className="col-score-hdr">3</th>
            <th className="col-score-hdr">2</th>
            <th className="col-score-hdr">1</th>
          </tr>
        </thead>
        <tbody>
          {BRADEN_ROWS.map(row => {
            const currentVal = v ? Number(v[row.key]) : 0;
            return (
              <tr key={row.key}>
                <td className="col-indicator" style={{ whiteSpace: 'pre-line' }}>{row.label}</td>
                {([4, 3, 2, 1] as const).map(score => (
                  <td
                    key={score}
                    className={`score-cell${currentVal === score ? ' selected' : ''}`}
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {row.cells[score as keyof typeof row.cells]}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr className="totale-row">
            <td colSpan={4} style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 700, fontSize: '10pt' }}>
              TOTALE — {score > 0 ? r.label : ''}
            </td>
            <td className="totale-box" style={{ color: r.color }}>
              {score > 0 ? score : '___'}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="braden-legend">
        <div>Valore ≤ 9 — grave rischio di compromissione dell'integrità cutanea</div>
        <div>Valore 10–12 — rischio alto di compromissione dell'integrità cutanea</div>
        <div>Valore 13–14 — rischio moderato di compromissione dell'integrità cutanea</div>
        <div>Valore 15–18 — lieve rischio di compromissione dell'integrità cutanea</div>
        <div>Valore ≥ 19 — rischio non presente</div>
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

const EMPTY_FORM: BradenFormState = {
  data: todayStr(), percezioneSensoriale: 0, umidita: 0,
  attivita: 0, mobilita: 0, nutrizione: 0, frizione: 0, note: '',
};

// ── Braden history ClinicalTable ─────────────────────────────────────────────

function BradenHistoryTable({
  list,
  onOpenModulo,
  onDelete,
}: {
  list: ScalaBradenValutazione[];
  onOpenModulo: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  type Row = ScalaBradenValutazione & { _score: number; _rischio: string; _rischioClass: string };

  const rows: Row[] = list.map(v => {
    const s = calcScore(v);
    const rv = rischio(s);
    return { ...v, _score: s, _rischio: rv.label, _rischioClass: rv.cls };
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
    ...BRADEN_ROWS.map(br => ({
      key: br.key as string,
      label: br.label.replace('\n', ' '),
      sortable: true,
      render: (_v: any, row: Row) => <span style={{ textAlign: 'center', display: 'block' }}>{String(row[br.key as keyof ScalaBradenValutazione])}</span>,
    } as ColumnDef<Row>)),
    {
      key: '_score',
      label: 'Punteggio',
      sortable: true,
      render: (_v, row) => <span style={{ fontWeight: 700, display: 'block', textAlign: 'center' }}>{row._score}</span>,
    },
    {
      key: '_rischio',
      label: 'Rischio',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'Nessun rischio', label: 'Nessun rischio' },
        { value: 'Rischio basso', label: 'Rischio basso' },
        { value: 'Rischio moderato', label: 'Rischio moderato' },
        { value: 'Rischio alto', label: 'Rischio alto' },
        { value: 'Rischio molto alto', label: 'Rischio molto alto' },
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
      emptyMessage="Nessuna valutazione Braden registrata."
    />
  );
}

export function ScalaBradenTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const list = cartella.valutazioniBraden ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<BradenFormState>({ ...EMPTY_FORM });
  const [modulo, setModulo] = useState(false);
  const [moduloTarget, setModuloTarget] = useState<string | null>(null); // id valutazione

  function set(f: Partial<BradenFormState>) { setForm(p => ({ ...p, ...f })); }

  const score = calcScore(form);
  const r = rischio(score);

  function handleSave() {
    if (!form.percezioneSensoriale || !form.umidita || !form.attivita || !form.mobilita || !form.nutrizione || !form.frizione) return;
    const v: ScalaBradenValutazione = {
      id: uid(),
      data: form.data,
      percezioneSensoriale: form.percezioneSensoriale as 1 | 2 | 3 | 4,
      umidita: form.umidita as 1 | 2 | 3 | 4,
      attivita: form.attivita as 1 | 2 | 3 | 4,
      mobilita: form.mobilita as 1 | 2 | 3 | 4,
      nutrizione: form.nutrizione as 1 | 2 | 3 | 4,
      frizione: form.frizione as 1 | 2 | 3,
      operatore: operatoreNome,
      note: form.note,
      createdAt: nowISO(),
    };
    onUpdate({ valutazioniBraden: [v, ...list] });
    setShowAdd(false);
    setForm({ ...EMPTY_FORM });
  }

  function handleDelete(id: string) {
    onUpdate({ valutazioniBraden: list.filter(v => v.id !== id) });
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
        <BradenModulo v={moduloData} paziente={paziente} />
      </div>

      {/* ── Web view ── */}
      <div className="web-content">
        <ClinicalTableSection
          title="Scala di Braden"
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

        {/* Storico summary */}
        {list.length > 0 && !showAdd && (
          <div className="braden-history">
            <BradenHistoryTable
              list={list}
              onOpenModulo={openModulo}
              onDelete={handleDelete}
            />
          </div>
        )}

        {showAdd && (
          <div className="cr-inline-form braden-form">
            <div className="cr-form-section__title">Nuova valutazione Braden</div>
            <div className="form-row-2col">
              <div className="form-row">
                <label className="form-label">Data valutazione</label>
                <input type="date" className="form-input" value={form.data} onChange={e => set({ data: e.target.value })} />
              </div>
              {score > 0 && (
                <div className="braden-score-preview">
                  <div className="braden-score-preview__val" style={{ color: r.color }}>{score}</div>
                  <div className="braden-score-preview__label">/ 23</div>
                  <span className={`badge ${r.cls}`}>{r.label}</span>
                </div>
              )}
            </div>

            {BRADEN_ROWS.map((row, i) => (
              <ScoreSelect
                key={row.key}
                label={row.label.replace('\n', ' ')}
                options={ALL_OPTIONS[i]}
                value={Number(form[row.key as keyof BradenFormState])}
                onChange={v => set({ [row.key]: v } as Partial<BradenFormState>)}
              />
            ))}

            <div className="form-row">
              <label className="form-label">Note</label>
              <textarea className="form-input" rows={2} value={form.note} onChange={e => set({ note: e.target.value })} />
            </div>

            {score > 0 && (
              <div className="braden-score-summary">
                <span>Punteggio totale: <strong>{score} / 23</strong></span>
                <span className={`badge ${r.cls}`}>{r.label}</span>
              </div>
            )}

            <div className="cr-inline-form__actions">
              <button className="btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Annulla</button>
              <button
                className="btn-primary btn-sm"
                onClick={handleSave}
                disabled={!form.percezioneSensoriale || !form.umidita || !form.attivita || !form.mobilita || !form.nutrizione || !form.frizione}
              >
                Salva valutazione
              </button>
            </div>
          </div>
        )}

        {list.length === 0 && !showAdd && (
          <p className="cr-empty">Nessuna valutazione Braden registrata.</p>
        )}
        </ClinicalTableSection>
      </div>
    </div>
  );
}
