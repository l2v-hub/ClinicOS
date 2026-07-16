import { useState } from 'react';
import type { CartellaPaziente, ScalaNRSValutazione, Paziente } from '../../../types';
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

export function nrsSeverity(punteggio: number): { label: string; cls: string; color: string } {
  if (punteggio === 0) return { label: 'Assente',  cls: 'badge--green', color: '#16A37B' };
  if (punteggio <= 3)  return { label: 'Lieve',    cls: 'badge--blue',  color: '#1A56DB' };
  if (punteggio <= 6)  return { label: 'Moderato', cls: 'badge--amber', color: '#C77700' };
  return                      { label: 'Severo',   cls: 'badge--red',   color: '#DC2626' };
}

// ── Form state ────────────────────────────────────────────────────────────────

interface NRSFormState {
  data: string;
  ora: string;
  punteggio: number;   // -1 = not selected
  aRiposo: number;     // -1 = not selected (optional)
  inMovimento: number; // -1 = not selected (optional)
  sede: string;
  note: string;
}

const EMPTY_FORM: NRSFormState = {
  data: todayStr(),
  ora: '',
  punteggio: -1,
  aRiposo: -1,
  inMovimento: -1,
  sede: '',
  note: '',
};

// ── NRS scale visual selector ─────────────────────────────────────────────────

const NRS_LABELS: Record<number, string> = {
  0: 'Nessun dolore',
  1: 'Dolore appena percettibile',
  2: 'Dolore lieve',
  3: 'Dolore lieve-moderato',
  4: 'Dolore moderato',
  5: 'Dolore moderato-forte',
  6: 'Dolore forte',
  7: 'Dolore molto forte',
  8: 'Dolore intenso',
  9: 'Dolore quasi insopportabile',
  10: 'Dolore insopportabile',
};

function NRSScaleSelector({ label, value, onChange, required }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
}) {
  return (
    <div className="braden-field">
      <div className="braden-field__label">
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 4 }}>*</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {Array.from({ length: 11 }, (_, i) => {
          const sev = nrsSeverity(i);
          const selected = value === i;
          return (
            <label
              key={i}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <input
                type="radio"
                name={label}
                value={i}
                checked={selected}
                onChange={() => onChange(i)}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1rem',
                  border: selected ? `2px solid ${sev.color}` : '2px solid #D0D5DD',
                  background: selected ? sev.color : '#F9FAFB',
                  color: selected ? '#fff' : '#101828',
                  transition: 'all 0.1s',
                }}
              >
                {i}
              </div>
              <span style={{ fontSize: '0.65rem', color: '#667085' }}>
                {i === 0 ? 'No' : i === 10 ? 'Max' : ''}
              </span>
            </label>
          );
        })}
      </div>
      {value >= 0 && (
        <div style={{ marginTop: 6, fontSize: '0.82rem', color: nrsSeverity(value).color, fontWeight: 500 }}>
          {NRS_LABELS[value]}
        </div>
      )}
    </div>
  );
}

// ── Modulo print view ─────────────────────────────────────────────────────────

function NRSModulo({ v, paziente }: { v: ScalaNRSValutazione | null; paziente: Paziente }) {
  const r = v ? nrsSeverity(v.punteggio) : { label: '—', cls: '', color: '' };

  return (
    <div className="fm braden-modulo">
      <div className="fm-title">Scala NRS — Numeric Rating Scale del Dolore</div>

      <div className="fm-patient-header">
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Cognome e Nome</span>
          <span className="fm-patient-field__val">{v ? `${paziente.lastName} ${paziente.firstName}` : ''}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Data</span>
          <span className="fm-patient-field__val">{v ? fmtDate(v.data) : ''}</span>
        </div>
        {v?.ora && (
          <div className="fm-patient-field">
            <span className="fm-patient-field__lbl">Ora</span>
            <span className="fm-patient-field__val">{v.ora}</span>
          </div>
        )}
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Operatore</span>
          <span className="fm-patient-field__val">{v?.operatore ?? ''}</span>
        </div>
      </div>

      {/* NRS scale graphic */}
      <div style={{ margin: '16px 0' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {Array.from({ length: 11 }, (_, i) => {
            const sev = nrsSeverity(i);
            const selected = v ? v.punteggio === i : false;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1rem',
                  background: selected ? sev.color : '#F3F4F6',
                  color: selected ? '#fff' : '#6B7280',
                  border: '1px solid #E5E7EB',
                }}
              >
                {i}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#667085', marginTop: 4 }}>
          <span>0 — Nessun dolore</span>
          <span>10 — Dolore massimo</span>
        </div>
      </div>

      <table className="braden-modulo-table">
        <tbody>
          <tr className="totale-row">
            <td style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 700 }}>Punteggio NRS</td>
            <td className="totale-box" style={{ color: r.color }}>{v ? v.punteggio : '___'} / 10</td>
          </tr>
          <tr>
            <td style={{ padding: '4px 10px' }}>Interpretazione</td>
            <td style={{ padding: '4px 10px', fontWeight: 600, color: r.color }}>{r.label}</td>
          </tr>
          {v?.aRiposo !== undefined && v.aRiposo >= 0 && (
            <tr>
              <td style={{ padding: '4px 10px' }}>Dolore a riposo</td>
              <td style={{ padding: '4px 10px' }}>{v.aRiposo} / 10</td>
            </tr>
          )}
          {v?.inMovimento !== undefined && v.inMovimento >= 0 && (
            <tr>
              <td style={{ padding: '4px 10px' }}>Dolore in movimento</td>
              <td style={{ padding: '4px 10px' }}>{v.inMovimento} / 10</td>
            </tr>
          )}
          {v?.sede && (
            <tr>
              <td style={{ padding: '4px 10px' }}>Sede del dolore</td>
              <td style={{ padding: '4px 10px' }}>{v.sede}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="braden-legend" style={{ marginTop: 12 }}>
        <div>0 — Dolore assente</div>
        <div>1–3 — Dolore lieve</div>
        <div>4–6 — Dolore moderato</div>
        <div>7–10 — Dolore severo</div>
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

function NRSHistoryTable({
  list,
  onOpenModulo,
  onDelete,
}: {
  list: ScalaNRSValutazione[];
  onOpenModulo: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  type Row = ScalaNRSValutazione & { _severity: string; _severityClass: string };

  const rows: Row[] = list.map(v => {
    const sv = nrsSeverity(v.punteggio);
    return { ...v, _severity: sv.label, _severityClass: sv.cls };
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
      key: 'ora',
      label: 'Ora',
      render: (_v, row) => <span>{row.ora ?? '—'}</span>,
    },
    {
      key: 'punteggio',
      label: 'NRS',
      sortable: true,
      render: (_v, row) => (
        <span style={{ fontWeight: 700, display: 'block', textAlign: 'center', color: nrsSeverity(row.punteggio).color }}>
          {row.punteggio} / 10
        </span>
      ),
    },
    {
      key: '_severity',
      label: 'Intensità',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'Assente',  label: 'Assente' },
        { value: 'Lieve',    label: 'Lieve' },
        { value: 'Moderato', label: 'Moderato' },
        { value: 'Severo',   label: 'Severo' },
      ],
      render: (_v, row) => <span className={`badge ${row._severityClass}`}>{row._severity}</span>,
    },
    {
      key: 'sede',
      label: 'Sede',
      render: (_v, row) => <span>{row.sede ?? '—'}</span>,
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
      title="Storico rilevazioni"
      columns={columns}
      data={rows}
      count={rows.length}
      countLabel="rilevazioni"
      emptyMessage="Nessuna rilevazione NRS registrata."
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScalaNRSTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const list = cartella.valutazioniNRS ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<NRSFormState>({ ...EMPTY_FORM });
  const [modulo, setModulo] = useState(false);
  const [moduloTarget, setModuloTarget] = useState<string | null>(null);

  function set(f: Partial<NRSFormState>) { setForm(p => ({ ...p, ...f })); }

  const canSave = form.punteggio >= 0;
  const r = form.punteggio >= 0 ? nrsSeverity(form.punteggio) : { label: '—', cls: '', color: '' };

  function handleSave() {
    if (!canSave) return;
    const v: ScalaNRSValutazione = {
      id: uid(),
      data: form.data,
      ora: form.ora || undefined,
      punteggio: form.punteggio,
      aRiposo: form.aRiposo >= 0 ? form.aRiposo : undefined,
      inMovimento: form.inMovimento >= 0 ? form.inMovimento : undefined,
      sede: form.sede || undefined,
      operatore: operatoreNome,
      note: form.note,
      createdAt: nowISO(),
    };
    onUpdate({ valutazioniNRS: [v, ...list] });
    setShowAdd(false);
    setForm({ ...EMPTY_FORM });
  }

  function handleDelete(id: string) {
    onUpdate({ valutazioniNRS: list.filter(v => v.id !== id) });
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
        <NRSModulo v={moduloData} paziente={paziente} />
      </div>

      {/* ── Web view ── */}
      <div className="web-content">
        <ClinicalTableSection
          title="Scala NRS — Valutazione del Dolore"
          count={list.length}
          countLabel="rilevazioni"
          actions={<>
            <button className="btn-sm" onClick={() => openModulo(null)} title="Vista modulo cartaceo">
              Vista modulo
            </button>
            <button className="btn-sm" onClick={() => { setForm({ ...EMPTY_FORM }); setShowAdd(true); }}>
              + Nuova rilevazione
            </button>
          </>}
        >

          {list.length > 0 && !showAdd && (
            <div className="braden-history">
              <NRSHistoryTable list={list} onOpenModulo={openModulo} onDelete={handleDelete} />
            </div>
          )}

          {showAdd && (
            <div className="cr-inline-form braden-form">
              <div className="cr-form-section__title">Nuova rilevazione NRS</div>

              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Data</label>
                  <input type="date" className="form-input" value={form.data} onChange={e => set({ data: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="form-label">Ora (opzionale)</label>
                  <input type="time" className="form-input" value={form.ora} onChange={e => set({ ora: e.target.value })} />
                </div>
              </div>

              <NRSScaleSelector
                label="Punteggio NRS (dolore globale)"
                value={form.punteggio}
                onChange={v => set({ punteggio: v })}
                required
              />

              {form.punteggio >= 0 && (
                <div className="braden-score-preview" style={{ marginTop: 4 }}>
                  <div className="braden-score-preview__val" style={{ color: r.color }}>{form.punteggio}</div>
                  <div className="braden-score-preview__label">/ 10</div>
                  <span className={`badge ${r.cls}`}>{r.label}</span>
                </div>
              )}

              <NRSScaleSelector
                label="Dolore a riposo (opzionale)"
                value={form.aRiposo}
                onChange={v => set({ aRiposo: v })}
              />

              <NRSScaleSelector
                label="Dolore in movimento (opzionale)"
                value={form.inMovimento}
                onChange={v => set({ inMovimento: v })}
              />

              <div className="form-row" style={{ marginTop: 8 }}>
                <label className="form-label">Sede del dolore (opzionale)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="es. lombare, spalla dx, addome..."
                  value={form.sede}
                  onChange={e => set({ sede: e.target.value })}
                />
              </div>

              <div className="form-row">
                <label className="form-label">Note</label>
                <textarea className="form-input" rows={2} value={form.note} onChange={e => set({ note: e.target.value })} />
              </div>

              <div className="cr-inline-form__actions">
                <button className="btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Annulla</button>
                <button
                  className="btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={!canSave}
                >
                  Salva rilevazione
                </button>
              </div>
            </div>
          )}

          {list.length === 0 && !showAdd && (
            <p className="cr-empty">Nessuna rilevazione NRS registrata.</p>
          )}
        </ClinicalTableSection>
      </div>
    </div>
  );
}
