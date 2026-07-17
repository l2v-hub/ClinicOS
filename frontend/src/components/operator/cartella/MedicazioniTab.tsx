import { useState } from 'react';
import { IcoCheck } from '../../../icons';
import type { CartellaPaziente, MedicazioneRecord, EssudatoLivello, Paziente, FollowUpMedicazione } from '../../../types';
import { uid, todayStr, nowISO, fmtDate, PrintButton, ClinicalTableSection } from './shared';
import { ClinicalTable } from './ClinicalTable';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

const ESSUDATO_LABEL: Record<EssudatoLivello, string> = {
  assente: 'Assente', scarso: 'Scarso', moderato: 'Moderato', abbondante: 'Abbondante',
};
const ESSUDATO_BADGE: Record<EssudatoLivello, string> = {
  assente: 'badge--gray', scarso: 'badge--blue', moderato: 'badge--amber', abbondante: 'badge--red',
};

const TIPO_LESIONE_OPTIONS = ['Ferita chirurgica', 'FLC', 'Lesione trofica', 'LDP', 'PEG'];
const GRADO_OPTIONS = ['1°', '2°', '3°', '4°', 'Escara'];
const ASPETTO_OPTIONS = ['Eritema', 'Flittene', 'Detersa', 'Granuleggiante', 'Fibrina', 'Necrosi', 'Essudato', 'Infetta', 'Flogosi', 'Punti sutura', 'Macerata', 'Sanguinante', 'Deiscenza', 'Altro'];
const DETERSIONE_OPTIONS = ['Soluzione fisiologica', 'Iodopovidone', 'Clorexidina', 'Altro'];
const TRATTAMENTO_OPTIONS = ['Mepilex', 'Inadine', 'Comfeel', 'Alginato', 'Nu-gel', 'Iruxol', 'Bionect', 'Adaptic garza', 'Connettivina garze', 'Film poliuretano', 'Cerotto TNT', 'Garze sterili', 'Olio', 'Zinco', 'Sofargen', 'Altro'];

function toggleInList(current: string, val: string): string {
  const items = current.split(',').map(s => s.trim()).filter(Boolean);
  return items.includes(val)
    ? items.filter(i => i !== val).join(', ')
    : [...items, val].join(', ');
}

function listIncludes(list: string, val: string): boolean {
  return list.split(',').map(s => s.trim()).includes(val);
}

const EMPTY_FORM = {
  data: todayStr(),
  dataFine: '',
  sede: '',
  tipoLesione: '',
  grado: '',
  tipoMedicazione: '',
  materiale: '',
  aspettoLesione: '',
  dimensioni: '',
  odore: false,
  essudato: 'assente' as EssudatoLivello,
  cutePerilisionale: '',
  prossimaMedicazione: '',
  desutura: '',
  sigla: '',
  note: '',
};

// ── Checkbox helper for modulo view ─────────────────────────────────────────
const MedCb = ({ checked, label }: { checked: boolean; label: string }) => (
  <li><span className={`med-modulo-cb${checked ? ' checked' : ''}`}></span> {label}</li>
);

// ── Chip toggle button for form ──────────────────────────────────────────────
function ChipGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {options.map(opt => {
        const active = listIncludes(value, opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(toggleInList(value, opt))}
            style={{
              padding: '4px 10px',
              border: `1px solid ${active ? '#2F6BED' : '#d1d5db'}`,
              borderRadius: 4,
              background: active ? '#EEF3FE' : '#fff',
              color: active ? '#2F6BED' : '#374151',
              cursor: 'pointer',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
          >{opt}</button>
        );
      })}
    </div>
  );
}

// ── Printable modulo (Template 2) ────────────────────────────────────────────
function MedicazioneModulo({ meds, paziente }: { meds: MedicazioneRecord[]; paziente: Paziente }) {
  return (
    <div className="fm">
      <div className="fm-title">Scheda Medicazioni / Lesioni</div>

      {/* Patient header */}
      <div className="fm-patient-header cols-4">
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Cognome</span>
          <span className="fm-patient-field__val">{paziente.lastName}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Nome</span>
          <span className="fm-patient-field__val">{paziente.firstName}</span>
        </div>
        <div className="fm-patient-field" style={{ gridColumn: '3/5' }}>
          <span className="fm-patient-field__lbl">Camera</span>
          <span className="fm-patient-field__val"></span>
        </div>
      </div>

      {/* Body map placeholder */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: 6 }}>SEDE DELLA LESIONE</div>
          <div style={{ borderBottom: '1px dotted #999', minHeight: 18, marginBottom: 4, minWidth: 260 }}></div>
          <div style={{ borderBottom: '1px dotted #999', minHeight: 18, marginBottom: 4 }}></div>
        </div>
        <div style={{
          border: '1px solid #bbb',
          width: 110,
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8pt',
          color: '#aaa',
          flexShrink: 0,
          flexDirection: 'column',
          gap: 2,
        }}>
          <svg width="48" height="80" viewBox="0 0 48 80" fill="none" stroke="#ccc" strokeWidth="1.2">
            <circle cx="24" cy="8" r="7" />
            <line x1="24" y1="15" x2="24" y2="45" />
            <line x1="24" y1="22" x2="8" y2="35" />
            <line x1="24" y1="22" x2="40" y2="35" />
            <line x1="24" y1="45" x2="14" y2="68" />
            <line x1="24" y1="45" x2="34" y2="68" />
          </svg>
          <span>Body Map</span>
        </div>
      </div>

      {meds.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#aaa', marginTop: 20 }}>Nessuna medicazione registrata.</p>
      ) : (
        meds.map((m, idx) => (
          <div key={m.id} style={{ marginBottom: 16, borderBottom: '1px solid #ccc', paddingBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: 4 }}>LESIONE #{idx + 1} — {m.sede}</div>

            <table className="med-modulo-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Data e Sigla<br />INIZIO</th>
                  <th style={{ width: 90 }}>Tipo di<br />Lesione</th>
                  <th style={{ width: 55 }}>Grado</th>
                  <th>Descrizione</th>
                  <th style={{ width: 110 }}>Detersione<br />Disinfezione</th>
                  <th style={{ width: 140 }}>Trattamento</th>
                  <th style={{ width: 80 }}>Data e sigla<br />FINE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {/* Data e sigla inizio */}
                  <td style={{ fontSize: '9pt', textAlign: 'center' }}>
                    {m.data.split('-').reverse().join('/')}<br />
                    <span style={{ fontSize: '8pt', color: '#555' }}>{m.sigla || m.operatore.split(' ').map((p: string) => p[0]).join('.')}</span>
                  </td>
                  {/* Tipo lesione */}
                  <td>
                    <ul className="med-modulo-checklist">
                      {TIPO_LESIONE_OPTIONS.map(t => (
                        <MedCb key={t} label={t} checked={m.tipoLesione === t} />
                      ))}
                    </ul>
                  </td>
                  {/* Grado */}
                  <td>
                    <ul className="med-modulo-checklist">
                      {GRADO_OPTIONS.map(g => (
                        <MedCb key={g} label={g} checked={m.grado === g} />
                      ))}
                    </ul>
                  </td>
                  {/* Descrizione */}
                  <td>
                    <ul className="med-modulo-checklist">
                      {ASPETTO_OPTIONS.map(d => (
                        <MedCb key={d} label={d} checked={listIncludes(m.aspettoLesione ?? '', d)} />
                      ))}
                    </ul>
                    {m.dimensioni && (
                      <div style={{ fontSize: '8pt', marginTop: 4 }}>
                        <strong>cm:</strong> {m.dimensioni}
                      </div>
                    )}
                  </td>
                  {/* Detersione */}
                  <td>
                    <ul className="med-modulo-checklist">
                      {DETERSIONE_OPTIONS.map(d => (
                        <MedCb key={d} label={d} checked={m.tipoMedicazione === d} />
                      ))}
                    </ul>
                  </td>
                  {/* Trattamento */}
                  <td>
                    <ul className="med-modulo-checklist">
                      {TRATTAMENTO_OPTIONS.map(t => (
                        <MedCb key={t} label={t} checked={listIncludes(m.materiale ?? '', t)} />
                      ))}
                    </ul>
                  </td>
                  {/* Data e sigla fine */}
                  <td style={{ textAlign: 'center', verticalAlign: 'top', fontSize: '9pt' }}>
                    {m.dataFine ? (
                      <>
                        {m.dataFine.split('-').reverse().join('/')}<br />
                        <span style={{ fontSize: '8pt', color: '#555' }}>{m.sigla || ''}</span>
                      </>
                    ) : (
                      <span style={{ color: '#bbb' }}>——</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #ccc', padding: '5px 8px', background: '#f5f5f5', fontSize: '9pt' }}>
              <span><strong>ESECUZIONE OGNI</strong>&nbsp;
                <span style={{ borderBottom: '1px dotted #999', display: 'inline-block', minWidth: 60 }}>{m.prossimaMedicazione}</span>
              </span>
              <span><strong>DESUTURA IL</strong>&nbsp;
                <span style={{ borderBottom: '1px dotted #999', display: 'inline-block', minWidth: 60 }}>{m.desutura}</span>
              </span>
              <span><strong>SIGLA</strong>&nbsp;
                <span style={{ borderBottom: '1px dotted #999', display: 'inline-block', minWidth: 40 }}>{m.sigla}</span>
              </span>
            </div>
          </div>
        ))
      )}

      {/* Follow-up log */}
      {meds.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: '10pt', marginTop: 16, marginBottom: 8, borderTop: '2px solid #333', paddingTop: 10 }}>
            Registro sostituzione medicazioni
          </div>
          <table className="med-followup-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Data e sigla</th>
                <th>Motivo sostituzione</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {meds.map(m => (
                <tr key={m.id}>
                  <td style={{ fontSize: '9pt' }}>
                    {m.data.split('-').reverse().join('/')}<br />
                    {m.sigla || m.operatore.split(' ').map((p: string) => p[0]).join('.')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '9pt' }}>
                      {[
                        { label: 'Termine', checked: m.prossimaMedicazione?.toLowerCase().includes('termin') ?? false },
                        { label: 'Bagnata', checked: m.essudato === 'abbondante' || m.essudato === 'moderato' },
                        { label: 'Sporca', checked: m.odore },
                      ].map(({ label, checked }) => (
                        <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className={`med-modulo-cb${checked ? ' checked' : ''}`}></span>
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '9pt' }}>{m.note}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(3, 8 - meds.length) }).map((_, i) => (
                <tr key={`e-${i}`}>
                  <td style={{ height: 36 }}></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '9pt' }}>
                      {['Termine', 'Bagnata', 'Sporca'].map(l => (
                        <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="med-modulo-cb"></span><span>{l}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const MOTIVO_LABEL: Record<FollowUpMedicazione['motivoSostituzione'], string> = {
  termine: 'Termine programmato',
  bagnata: 'Bagnata',
  sporca: 'Sporca',
};

type FuForm = { data: string; siglaOperatore: string; motivoSostituzione: FollowUpMedicazione['motivoSostituzione']; note: string };
const EMPTY_FU: FuForm = { data: todayStr(), siglaOperatore: '', motivoSostituzione: 'termine', note: '' };

function FollowUpSection({
  med, onSave,
}: {
  med: MedicazioneRecord;
  onSave: (updated: MedicazioneRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [fuForm, setFuForm] = useState<FuForm>({ ...EMPTY_FU });
  const followUps = med.followUps ?? [];

  function setFu(f: Partial<typeof fuForm>) { setFuForm(p => ({ ...p, ...f })); }

  function handleSave() {
    if (!fuForm.siglaOperatore) return;
    const fu: FollowUpMedicazione = {
      id: uid(), data: fuForm.data, siglaOperatore: fuForm.siglaOperatore,
      motivoSostituzione: fuForm.motivoSostituzione, note: fuForm.note,
      createdAt: nowISO(),
    };
    onSave({ ...med, followUps: [...followUps, fu] });
    setFuForm({ ...EMPTY_FU }); setShowAdd(false);
  }

  function handleDelete(id: string) {
    onSave({ ...med, followUps: followUps.filter(f => f.id !== id) });
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 6 }}>
      <button
        className="btn-secondary btn-sm"
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: '12px' }}
      >
        {open ? '▲' : '▼'} Follow-up medicazione ({followUps.length})
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {followUps.length > 0 && (
            <ClinicalTable<FollowUpMedicazione>
              title="Follow-up medicazione"
              noWrapper
              keyField="id"
              data={followUps}
              columns={[
                { key: 'data', label: 'Data', width: '110px', render: (_v, fu) => fmtDate(fu.data) },
                { key: 'siglaOperatore', label: 'Sigla', width: '90px', render: (_v, fu) => <span style={{ fontWeight: 600 }}>{fu.siglaOperatore}</span> },
                { key: 'motivoSostituzione', label: 'Motivo sostituzione', render: (_v, fu) => MOTIVO_LABEL[fu.motivoSostituzione] },
                { key: 'note', label: 'Note', render: (_v, fu) => <span style={{ color: 'var(--text-muted)' }}>{fu.note}</span> },
                {
                  key: 'id', label: '', width: '40px', align: 'right',
                  render: (_v, fu) => (
                    <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => handleDelete(fu.id)} title="Elimina">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  ),
                },
              ]}
            />
          )}

          {showAdd ? (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div className="form-row">
                  <label className="form-label">Data</label>
                  <input type="date" className="form-input" value={fuForm.data} onChange={e => setFu({ data: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="form-label">Sigla operatore</label>
                  <input type="text" className="form-input" value={fuForm.siglaOperatore} onChange={e => setFu({ siglaOperatore: e.target.value })} placeholder="es. M.F." />
                </div>
                <div className="form-row">
                  <label className="form-label">Sostituzione per</label>
                  <select className="form-input" value={fuForm.motivoSostituzione} onChange={e => setFu({ motivoSostituzione: e.target.value as FollowUpMedicazione['motivoSostituzione'] })}>
                    <option value="termine">Termine programmato</option>
                    <option value="bagnata">Bagnata</option>
                    <option value="sporca">Sporca</option>
                  </select>
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <label className="form-label">Note</label>
                <input type="text" className="form-input" value={fuForm.note} onChange={e => setFu({ note: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Annulla</button>
                <button className="btn-primary btn-sm" onClick={handleSave} disabled={!fuForm.siglaOperatore}><IcoCheck /> Salva follow-up</button>
              </div>
            </div>
          ) : (
            <button className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Aggiungi follow-up</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MedicazioniTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const meds = cartella.medicazioniFerite ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [modulo, setModulo] = useState(false);

  function set(f: Partial<typeof form>) { setForm(p => ({ ...p, ...f })); }

  function handleSave() {
    if (!form.sede) return;
    const record: MedicazioneRecord = {
      id: editId ?? uid(),
      data: form.data,
      dataFine: form.dataFine || undefined,
      sede: form.sede,
      tipoLesione: form.tipoLesione,
      grado: form.grado || undefined,
      tipoMedicazione: form.tipoMedicazione,
      materiale: form.materiale,
      aspettoLesione: form.aspettoLesione,
      dimensioni: form.dimensioni,
      odore: form.odore,
      essudato: form.essudato,
      cutePerilisionale: form.cutePerilisionale,
      prossimaMedicazione: form.prossimaMedicazione,
      desutura: form.desutura || undefined,
      sigla: form.sigla || undefined,
      operatore: operatoreNome,
      note: form.note,
      createdAt: nowISO(),
    };
    onUpdate({ medicazioniFerite: editId ? meds.map(m => m.id === editId ? record : m) : [record, ...meds] });
    setShowAdd(false); setEditId(null); setForm({ ...EMPTY_FORM });
  }

  function startEdit(m: MedicazioneRecord) {
    setForm({
      data: m.data,
      dataFine: m.dataFine ?? '',
      sede: m.sede,
      tipoLesione: m.tipoLesione,
      grado: m.grado ?? '',
      tipoMedicazione: m.tipoMedicazione,
      materiale: m.materiale,
      aspettoLesione: m.aspettoLesione,
      dimensioni: m.dimensioni,
      odore: m.odore,
      essudato: m.essudato,
      cutePerilisionale: m.cutePerilisionale,
      prossimaMedicazione: m.prossimaMedicazione,
      desutura: m.desutura ?? '',
      sigla: m.sigla ?? '',
      note: m.note,
    });
    setEditId(m.id); setShowAdd(true);
  }

  return (
    <div className={`cr-tab-content${modulo ? ' mode-modulo' : ''}`}>

      {/* ── Modulo view ── */}
      <div className="modulo-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }} className="no-print">
          <button className="btn-secondary btn-sm" onClick={() => setModulo(false)}>← Vista operativa</button>
          <PrintButton label="Stampa modulo" />
        </div>
        <MedicazioneModulo meds={meds} paziente={paziente} />
      </div>

      {/* ── Web view ── */}
      <div className="web-content">
        <ClinicalTableSection
          title="Medicazioni / Wound Care"
          count={meds.filter(m => !m.dataFine).length}
          countLabel="attive"
          actions={<>
            <button className="btn-sm" onClick={() => setModulo(true)}>Vista modulo</button>
            <button className="btn-sm" onClick={() => { setEditId(null); setForm({ ...EMPTY_FORM }); setShowAdd(true); }}>
              + Nuova medicazione
            </button>
          </>}
        >
        <div className="cts__body--padded">

        {showAdd && (
          <div className="cr-inline-form">
            <div className="cr-form-section__title">{editId ? 'Modifica medicazione' : 'Nuova medicazione'}</div>

            {/* Date + sede */}
            <div className="form-row-3col">
              <div className="form-row">
                <label className="form-label">Data inizio</label>
                <input type="date" className="form-input" value={form.data} onChange={e => set({ data: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Data fine</label>
                <input type="date" className="form-input" value={form.dataFine} onChange={e => set({ dataFine: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Sede lesione</label>
                <input type="text" className="form-input" value={form.sede} onChange={e => set({ sede: e.target.value })} placeholder="es. tallone dx, sacro…" />
              </div>
            </div>

            {/* Tipo + grado */}
            <div className="form-row-2col">
              <div className="form-row">
                <label className="form-label">Tipo lesione</label>
                <select className="form-input" value={form.tipoLesione} onChange={e => set({ tipoLesione: e.target.value })}>
                  <option value="">— seleziona —</option>
                  {TIPO_LESIONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Grado</label>
                <select className="form-input" value={form.grado} onChange={e => set({ grado: e.target.value })}>
                  <option value="">— seleziona —</option>
                  {GRADO_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Descrizione / aspetto */}
            <div className="form-row">
              <label className="form-label">Descrizione lesione</label>
              <ChipGroup options={ASPETTO_OPTIONS} value={form.aspettoLesione} onChange={v => set({ aspettoLesione: v })} />
            </div>

            <div className="form-row">
              <label className="form-label">Dimensioni</label>
              <input type="text" className="form-input" value={form.dimensioni} onChange={e => set({ dimensioni: e.target.value })} placeholder="es. 3×2 cm" style={{ maxWidth: 180 }} />
            </div>

            {/* Detersione + essudato */}
            <div className="form-row-2col">
              <div className="form-row">
                <label className="form-label">Detersione / disinfezione</label>
                <select className="form-input" value={form.tipoMedicazione} onChange={e => set({ tipoMedicazione: e.target.value })}>
                  <option value="">— seleziona —</option>
                  {DETERSIONE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Essudato</label>
                <select className="form-input" value={form.essudato} onChange={e => set({ essudato: e.target.value as EssudatoLivello })}>
                  {(Object.keys(ESSUDATO_LABEL) as EssudatoLivello[]).map(k => <option key={k} value={k}>{ESSUDATO_LABEL[k]}</option>)}
                </select>
              </div>
            </div>

            {/* Trattamento */}
            <div className="form-row">
              <label className="form-label">Trattamento</label>
              <ChipGroup options={TRATTAMENTO_OPTIONS} value={form.materiale} onChange={v => set({ materiale: v })} />
            </div>

            {/* Cute perilesionale + odore */}
            <div className="form-row-2col">
              <div className="form-row">
                <label className="form-label">Cute perilesionale</label>
                <input type="text" className="form-input" value={form.cutePerilisionale} onChange={e => set({ cutePerilisionale: e.target.value })} placeholder="es. integra, macerata…" />
              </div>
              <div className="form-row" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 22 }}>
                  <input type="checkbox" checked={form.odore} onChange={e => set({ odore: e.target.checked })} />
                  <span className="form-label" style={{ margin: 0 }}>Odore presente</span>
                </label>
              </div>
            </div>

            {/* Footer fields */}
            <div className="form-row-3col">
              <div className="form-row">
                <label className="form-label">Esecuzione ogni</label>
                <input type="text" className="form-input" value={form.prossimaMedicazione} onChange={e => set({ prossimaMedicazione: e.target.value })} placeholder="es. 2 giorni, al bisogno…" />
              </div>
              <div className="form-row">
                <label className="form-label">Desutura il</label>
                <input type="date" className="form-input" value={form.desutura} onChange={e => set({ desutura: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Sigla operatore</label>
                <input type="text" className="form-input" value={form.sigla} onChange={e => set({ sigla: e.target.value })} placeholder="es. M.F." />
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">Note</label>
              <textarea className="form-input" rows={2} value={form.note} onChange={e => set({ note: e.target.value })} />
            </div>

            <div className="cr-inline-form__actions">
              <button className="btn-secondary btn-sm" onClick={() => { setShowAdd(false); setEditId(null); }}>Annulla</button>
              <button className="btn-primary btn-sm" onClick={handleSave}><IcoCheck /> Salva</button>
            </div>
          </div>
        )}

        {meds.length === 0 ? (
          <p className="cr-empty">Nessuna medicazione registrata.</p>
        ) : (
          <div className="med-list">
            {meds.map(m => (
              <div key={m.id} className="med-card">
                <div className="med-card__header">
                  <div className="med-card__date">{fmtDate(m.data)}</div>
                  <div className="med-card__sede">{m.sede}</div>
                  {m.tipoLesione && <span className="badge badge--blue">{m.tipoLesione}</span>}
                  {m.grado && <span className="badge badge--gray">Grado {m.grado}</span>}
                  <span className={`badge ${ESSUDATO_BADGE[m.essudato]}`}>Essudato: {ESSUDATO_LABEL[m.essudato]}</span>
                  {m.odore && <span className="badge badge--amber">Odore</span>}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button className="icon-btn icon-btn--sm" onClick={() => startEdit(m)} title="Modifica">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => onUpdate({ medicazioniFerite: meds.filter(x => x.id !== m.id) })} title="Elimina">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
                <div className="med-card__details">
                  {m.aspettoLesione && <div><strong>Descrizione:</strong> {m.aspettoLesione}</div>}
                  {m.tipoMedicazione && <div><strong>Detersione:</strong> {m.tipoMedicazione}</div>}
                  {m.materiale && <div><strong>Trattamento:</strong> {m.materiale}</div>}
                  {m.dimensioni && <div><strong>Dimensioni:</strong> {m.dimensioni}</div>}
                  {m.cutePerilisionale && <div><strong>Cute perilesionale:</strong> {m.cutePerilisionale}</div>}
                  {m.prossimaMedicazione && <div><strong>Esecuzione ogni:</strong> {m.prossimaMedicazione}</div>}
                  {m.desutura && <div><strong>Desutura il:</strong> {fmtDate(m.desutura)}</div>}
                  {m.dataFine && <div><strong>Data fine:</strong> {fmtDate(m.dataFine)}</div>}
                  {m.note && <div><strong>Note:</strong> {m.note}</div>}
                </div>
                <div className="med-card__footer">
                  <span className="cr-meta">Operatore: {m.operatore}</span>
                  {m.sigla && <span className="cr-meta"> — Sigla: {m.sigla}</span>}
                </div>
                <FollowUpSection
                  med={m}
                  onSave={updated => onUpdate({ medicazioniFerite: meds.map(x => x.id === updated.id ? updated : x) })}
                />
              </div>
            ))}
          </div>
        )}
        </div>
        </ClinicalTableSection>
      </div>
    </div>
  );
}
