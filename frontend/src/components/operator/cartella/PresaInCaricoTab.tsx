import { useState } from 'react';
import { IcoCheck } from '../../../icons';
import type { CartellaPaziente, PresaInCarico, Paziente } from '../../../types';
import { PrintButton, EmptyState, todayStr, nowTime, nowISO, ClinicalTableSection } from './shared';
import { ClinicalCard } from '../../shared/ClinicalCard';
import { InlineEditableField, type InlineOption } from '../../shared/InlineEditableField';

type EditId = 'dati' | 'cond' | 'valutazione' | 'docs' | null;

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void | Promise<boolean>;
  operatoreNome: string;
}

const EMPTY: PresaInCarico = {
  dataIngresso: todayStr(),
  oraIngresso: nowTime(),
  provenienza: 'accesso_diretto',
  centroInviante: '',
  modalitaIngresso: 'ambulante',
  accompagnatoDa: '',
  motivoIngresso: '',
  operatoreResponsabile: '',
  condizioniGenerali: 'buone',
  condizioniIniziali: '',
  noteIniziali: '',
  camera: '',
  letto: '',
  documentiRicevuti: '',
  documentiMancanti: '',
  sigla: '',
  statoCoscienza: 'vigile',
  orientamento: 'orientato',
  autonomia: 'autonomo',
  comunicazione: 'verbale',
  udito: 'normale',
  vista: 'normale',
  dentizione: 'propria',
  alimentazione: 'autonomo',
  eliminazioneUrinaria: 'autonoma',
  eliminazioneIntestinale: 'autonoma',
  mobilita: 'autonoma',
  cuteIntegrita: 'integra',
  dolore: 'assente',
  doloreLivello: 0,
  materialeConsegnato: false,
  operatore: '',
  note: '',
  compilatoAt: nowISO(),
};

const PROVENIENZA_LABEL: Record<PresaInCarico['provenienza'], string> = {
  accesso_diretto: 'Accesso diretto',
  centro_medico: 'Centro medico',
  altra_struttura: 'Altra struttura',
  dimissione_ospedaliera: 'Dimissione ospedaliera',
  familiare_caregiver: 'Familiare / Caregiver',
};

const PROVENIENZA_OPTS: InlineOption[] = (Object.entries(PROVENIENZA_LABEL) as [string, string][]).map(([value, label]) => ({ value, label }));
const MODALITA_OPTS: InlineOption[] = [
  { value: 'ambulante', label: 'Ambulante' },
  { value: 'barella', label: 'Barella' },
  { value: 'sedia_rotelle', label: 'Sedia a rotelle' },
];
const CONDGEN_OPTS: InlineOption[] = [
  { value: 'buone', label: 'Buone' },
  { value: 'discrete', label: 'Discrete' },
  { value: 'scadenti', label: 'Scadenti' },
  { value: 'critiche', label: 'Critiche' },
];
const COSCIENZA_OPTS: InlineOption[] = [
  { value: 'vigile', label: 'Vigile' },
  { value: 'confuso', label: 'Confuso' },
  { value: 'soporoso', label: 'Soporoso' },
  { value: 'stuporoso', label: 'Stuporoso' },
  { value: 'comatoso', label: 'Comatoso' },
];
const ORIENT_OPTS: InlineOption[] = [
  { value: 'orientato', label: 'Orientato' },
  { value: 'parzialmente_orientato', label: 'Parzialmente orientato' },
  { value: 'disorientato', label: 'Disorientato' },
];
const AUTON_OPTS: InlineOption[] = [
  { value: 'autonomo', label: 'Autonomo' },
  { value: 'parzialmente_autonomo', label: 'Parzialmente autonomo' },
  { value: 'non_autonomo', label: 'Non autonomo' },
  { value: 'allettato', label: 'Allettato' },
];
const DOLORE_OPTS: InlineOption[] = [
  { value: 'assente', label: 'Assente' },
  { value: 'presente', label: 'Presente' },
];

function Row({ label, value }: { label: string; value: string | boolean | number | undefined }) {
  if (!value && value !== 0 && value !== false) return null;
  const display = value === true ? 'Sì' : value === false ? 'No' : (value ?? '—');
  return (
    <div className="pic-row">
      <span className="pic-row__lbl">{label}</span>
      <span className="pic-row__val">{String(display)}</span>
    </div>
  );
}

function RowAlways({ label, value }: { label: string; value: string | boolean | number | undefined }) {
  const display = value === true ? 'Sì' : value === false ? 'No' : (value ?? '—');
  return (
    <div className="pic-row">
      <span className="pic-row__lbl">{label}</span>
      <span className="pic-row__val">{String(display)}</span>
    </div>
  );
}

export function PresaInCaricoTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const pic = cartella.presaInCarico;
  const [editingId, setEditingId] = useState<EditId>(null);
  const [form, setForm] = useState<PresaInCarico>(pic ?? { ...EMPTY, operatore: operatoreNome });

  function set(f: Partial<PresaInCarico>) { setForm(p => ({ ...p, ...f })); }

  function handleSave() {
    onUpdate({ presaInCarico: { ...form, compilatoAt: nowISO() } });
    setEditingId(null);
  }

  function startEdit(id: Exclude<EditId, null>) {
    setForm(pic ?? { ...EMPTY, operatore: operatoreNome });
    setEditingId(id);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  const safePic = pic ?? { ...EMPTY, operatore: operatoreNome };

  // Persist a single field inline (used by InlineEditableField). Returns the
  // save promise so the field can stay in edit mode and show an error on failure.
  function saveField(patch: Partial<PresaInCarico>): void | Promise<boolean> {
    return onUpdate({ presaInCarico: { ...safePic, ...patch, compilatoAt: nowISO() } });
  }

  // ── Card 1: Dati di ingresso ─────────────────────────────────────────────────
  const datiEdit = (
    <div className="pic-edit-form">
      <div className="form-row-2col">
        <div className="form-row">
          <label className="form-label">Data presa in carico</label>
          <input type="date" className="form-input" value={form.dataIngresso} onChange={e => set({ dataIngresso: e.target.value })} />
        </div>
        <div className="form-row">
          <label className="form-label">Ora presa in carico</label>
          <input type="time" className="form-input" value={form.oraIngresso} onChange={e => set({ oraIngresso: e.target.value })} />
        </div>
      </div>
      <div className="form-row-2col">
        <div className="form-row">
          <label className="form-label">Provenienza</label>
          <select className="form-input" value={form.provenienza} onChange={e => set({ provenienza: e.target.value as PresaInCarico['provenienza'] })}>
            {(Object.entries(PROVENIENZA_LABEL) as [PresaInCarico['provenienza'], string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Centro inviante</label>
          <input type="text" className="form-input" value={form.centroInviante ?? ''} onChange={e => set({ centroInviante: e.target.value })} placeholder="Nome centro / struttura…" />
        </div>
      </div>
      <div className="form-row-2col">
        <div className="form-row">
          <label className="form-label">Modalità ingresso</label>
          <select className="form-input" value={form.modalitaIngresso} onChange={e => set({ modalitaIngresso: e.target.value as PresaInCarico['modalitaIngresso'] })}>
            <option value="ambulante">Ambulante</option>
            <option value="barella">Barella</option>
            <option value="sedia_rotelle">Sedia a rotelle</option>
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Accompagnato da</label>
          <input type="text" className="form-input" value={form.accompagnatoDa} onChange={e => set({ accompagnatoDa: e.target.value })} />
        </div>
      </div>
      <div className="form-row-2col">
        <div className="form-row">
          <label className="form-label">Operatore responsabile</label>
          <input type="text" className="form-input" value={form.operatoreResponsabile ?? ''} onChange={e => set({ operatoreResponsabile: e.target.value })} placeholder="Nome operatore…" />
        </div>
        <div className="form-row-2col" style={{ gap: 10 }}>
          <div className="form-row">
            <label className="form-label">Camera</label>
            <input type="text" className="form-input" value={form.camera ?? ''} onChange={e => set({ camera: e.target.value })} placeholder="es. 12" />
          </div>
          <div className="form-row">
            <label className="form-label">Letto / posto</label>
            <input type="text" className="form-input" value={form.letto ?? ''} onChange={e => set({ letto: e.target.value })} placeholder="es. A" />
          </div>
        </div>
      </div>
      <div className="form-row">
        <label className="form-label">Motivo dell'ingresso</label>
        <textarea className="form-input" rows={4} value={form.motivoIngresso} onChange={e => set({ motivoIngresso: e.target.value })} placeholder="Descrivere il motivo del ricovero / accesso…" />
      </div>
      <div className="cr-form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn-secondary" onClick={cancelEdit}>Annulla</button>
        <button className="btn-primary" onClick={handleSave}><IcoCheck /> Salva</button>
      </div>
    </div>
  );

  const datiView = (
    <div className="cr-form-section">
      <RowAlways label="Data / Ora" value={`${safePic.dataIngresso.split('-').reverse().join('/')} ${safePic.oraIngresso}`} />
      <InlineEditableField
        label="Provenienza" type="select" options={PROVENIENZA_OPTS}
        value={safePic.provenienza}
        display={PROVENIENZA_LABEL[safePic.provenienza] ?? safePic.provenienza}
        onSave={v => saveField({ provenienza: v as PresaInCarico['provenienza'] })}
      />
      <InlineEditableField label="Centro inviante" value={safePic.centroInviante ?? ''} placeholder="Nome centro / struttura…" onSave={v => saveField({ centroInviante: v })} />
      <InlineEditableField
        label="Modalità ingresso" type="select" options={MODALITA_OPTS}
        value={safePic.modalitaIngresso} display={safePic.modalitaIngresso.replace('_', ' ')}
        onSave={v => saveField({ modalitaIngresso: v as PresaInCarico['modalitaIngresso'] })}
      />
      <InlineEditableField label="Accompagnato da" value={safePic.accompagnatoDa ?? ''} onSave={v => saveField({ accompagnatoDa: v })} />
      <InlineEditableField label="Operatore responsabile" value={safePic.operatoreResponsabile ?? ''} placeholder="Nome operatore…" onSave={v => saveField({ operatoreResponsabile: v })} />
      <RowAlways label="Camera / Letto" value={safePic.camera ? `${safePic.camera}${safePic.letto ? ' — ' + safePic.letto : ''}` : '—'} />
      <InlineEditableField label="Motivo ingresso" type="textarea" value={safePic.motivoIngresso ?? ''} placeholder="Descrivere il motivo del ricovero / accesso…" onSave={v => saveField({ motivoIngresso: v })} />
    </div>
  );

  // ── Card 2: Condizioni iniziali ──────────────────────────────────────────────
  const condEdit = (
    <div className="pic-edit-form">
      <div className="form-row-2col">
        <div className="form-row">
          <label className="form-label">Condizioni generali</label>
          <select className="form-input" value={form.condizioniGenerali} onChange={e => set({ condizioniGenerali: e.target.value as PresaInCarico['condizioniGenerali'] })}>
            <option value="buone">Buone</option>
            <option value="discrete">Discrete</option>
            <option value="scadenti">Scadenti</option>
            <option value="critiche">Critiche</option>
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Stato di coscienza</label>
          <select className="form-input" value={form.statoCoscienza} onChange={e => set({ statoCoscienza: e.target.value as PresaInCarico['statoCoscienza'] })}>
            <option value="vigile">Vigile</option>
            <option value="confuso">Confuso</option>
            <option value="soporoso">Soporoso</option>
            <option value="stuporoso">Stuporoso</option>
            <option value="comatoso">Comatoso</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <label className="form-label">Descrizione condizioni all'ingresso</label>
        <textarea className="form-input" rows={4} value={form.condizioniIniziali ?? ''} onChange={e => set({ condizioniIniziali: e.target.value })} placeholder="Descrizione condizioni al momento dell'ingresso…" />
      </div>
      <div className="form-row">
        <label className="form-label">Note iniziali</label>
        <textarea className="form-input" rows={3} value={form.noteIniziali ?? ''} onChange={e => set({ noteIniziali: e.target.value })} placeholder="Note aggiuntive sull'accesso…" />
      </div>
      <div className="cr-form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn-secondary" onClick={cancelEdit}>Annulla</button>
        <button className="btn-primary" onClick={handleSave}><IcoCheck /> Salva</button>
      </div>
    </div>
  );

  const condView = (
    <div className="cr-form-section">
      <InlineEditableField label="Condizioni generali" type="select" options={CONDGEN_OPTS} value={safePic.condizioniGenerali} display={safePic.condizioniGenerali} onSave={v => saveField({ condizioniGenerali: v as PresaInCarico['condizioniGenerali'] })} />
      <InlineEditableField label="Stato di coscienza" type="select" options={COSCIENZA_OPTS} value={safePic.statoCoscienza} display={safePic.statoCoscienza} onSave={v => saveField({ statoCoscienza: v as PresaInCarico['statoCoscienza'] })} />
      <InlineEditableField label="Condizioni iniziali" type="textarea" value={safePic.condizioniIniziali ?? ''} placeholder="Descrizione condizioni al momento dell'ingresso…" onSave={v => saveField({ condizioniIniziali: v })} />
      <InlineEditableField label="Note iniziali" type="textarea" value={safePic.noteIniziali ?? ''} placeholder="Note aggiuntive sull'accesso…" onSave={v => saveField({ noteIniziali: v })} />
    </div>
  );

  // ── Card 3: Valutazione funzionale ───────────────────────────────────────────
  const valutazioneEdit = (
    <div className="pic-edit-form">
      <div className="form-row-2col">
        <div className="form-row">
          <label className="form-label">Orientamento</label>
          <select className="form-input" value={form.orientamento} onChange={e => set({ orientamento: e.target.value as PresaInCarico['orientamento'] })}>
            <option value="orientato">Orientato</option>
            <option value="parzialmente_orientato">Parzialmente orientato</option>
            <option value="disorientato">Disorientato</option>
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Autonomia</label>
          <select className="form-input" value={form.autonomia} onChange={e => set({ autonomia: e.target.value as PresaInCarico['autonomia'] })}>
            <option value="autonomo">Autonomo</option>
            <option value="parzialmente_autonomo">Parzialmente autonomo</option>
            <option value="non_autonomo">Non autonomo</option>
            <option value="allettato">Allettato</option>
          </select>
        </div>
      </div>
      <div className="form-row-3col">
        <div className="form-row">
          <label className="form-label">Comunicazione</label>
          <input type="text" className="form-input" value={form.comunicazione} onChange={e => set({ comunicazione: e.target.value })} placeholder="es. verbale, afasico…" />
        </div>
        <div className="form-row">
          <label className="form-label">Udito</label>
          <input type="text" className="form-input" value={form.udito} onChange={e => set({ udito: e.target.value })} placeholder="es. normale, ridotto…" />
        </div>
        <div className="form-row">
          <label className="form-label">Vista</label>
          <input type="text" className="form-input" value={form.vista} onChange={e => set({ vista: e.target.value })} placeholder="es. normale, occhiali…" />
        </div>
        <div className="form-row">
          <label className="form-label">Dentizione</label>
          <input type="text" className="form-input" value={form.dentizione} onChange={e => set({ dentizione: e.target.value })} placeholder="es. propria, protesi…" />
        </div>
        <div className="form-row">
          <label className="form-label">Alimentazione</label>
          <input type="text" className="form-input" value={form.alimentazione} onChange={e => set({ alimentazione: e.target.value })} placeholder="es. autonomo, SNG…" />
        </div>
        <div className="form-row">
          <label className="form-label">Elim. urinaria</label>
          <input type="text" className="form-input" value={form.eliminazioneUrinaria} onChange={e => set({ eliminazioneUrinaria: e.target.value })} placeholder="es. autonoma, catetere…" />
        </div>
        <div className="form-row">
          <label className="form-label">Elim. intestinale</label>
          <input type="text" className="form-input" value={form.eliminazioneIntestinale} onChange={e => set({ eliminazioneIntestinale: e.target.value })} placeholder="es. autonoma, stomia…" />
        </div>
        <div className="form-row">
          <label className="form-label">Mobilità</label>
          <input type="text" className="form-input" value={form.mobilita} onChange={e => set({ mobilita: e.target.value })} placeholder="es. autonoma, allettato…" />
        </div>
        <div className="form-row">
          <label className="form-label">Cute / mucose</label>
          <input type="text" className="form-input" value={form.cuteIntegrita} onChange={e => set({ cuteIntegrita: e.target.value })} placeholder="es. integra, eritema…" />
        </div>
      </div>
      <div className="form-row-2col">
        <div className="form-row">
          <label className="form-label">Dolore</label>
          <select className="form-input" value={form.dolore} onChange={e => set({ dolore: e.target.value as 'assente' | 'presente' })}>
            <option value="assente">Assente</option>
            <option value="presente">Presente</option>
          </select>
        </div>
        {form.dolore === 'presente' && (
          <div className="form-row">
            <label className="form-label">Livello NRS (0–10)</label>
            <input type="number" className="form-input" min={0} max={10} value={form.doloreLivello} onChange={e => set({ doloreLivello: Number(e.target.value) })} />
          </div>
        )}
      </div>
      <div className="cr-form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn-secondary" onClick={cancelEdit}>Annulla</button>
        <button className="btn-primary" onClick={handleSave}><IcoCheck /> Salva</button>
      </div>
    </div>
  );

  const valutazioneView = (
    <div className="cr-form-section">
      <InlineEditableField label="Orientamento" type="select" options={ORIENT_OPTS} value={safePic.orientamento} display={safePic.orientamento.replace('_', ' ')} onSave={v => saveField({ orientamento: v as PresaInCarico['orientamento'] })} />
      <InlineEditableField label="Autonomia" type="select" options={AUTON_OPTS} value={safePic.autonomia} display={safePic.autonomia.replace('_', ' ')} onSave={v => saveField({ autonomia: v as PresaInCarico['autonomia'] })} />
      <InlineEditableField label="Comunicazione" value={safePic.comunicazione ?? ''} onSave={v => saveField({ comunicazione: v })} />
      <InlineEditableField label="Udito" value={safePic.udito ?? ''} onSave={v => saveField({ udito: v })} />
      <InlineEditableField label="Vista" value={safePic.vista ?? ''} onSave={v => saveField({ vista: v })} />
      <InlineEditableField label="Dentizione" value={safePic.dentizione ?? ''} onSave={v => saveField({ dentizione: v })} />
      <InlineEditableField label="Alimentazione" value={safePic.alimentazione ?? ''} onSave={v => saveField({ alimentazione: v })} />
      <InlineEditableField label="Elim. urinaria" value={safePic.eliminazioneUrinaria ?? ''} onSave={v => saveField({ eliminazioneUrinaria: v })} />
      <InlineEditableField label="Elim. intestinale" value={safePic.eliminazioneIntestinale ?? ''} onSave={v => saveField({ eliminazioneIntestinale: v })} />
      <InlineEditableField label="Mobilità" value={safePic.mobilita ?? ''} onSave={v => saveField({ mobilita: v })} />
      <InlineEditableField label="Cute / mucose" value={safePic.cuteIntegrita ?? ''} onSave={v => saveField({ cuteIntegrita: v })} />
      <InlineEditableField
        label="Dolore" type="select" options={DOLORE_OPTS}
        value={safePic.dolore} display={safePic.dolore === 'presente' ? 'Presente' : 'Assente'}
        onSave={v => saveField(v === 'presente' ? { dolore: 'presente' } : { dolore: 'assente', doloreLivello: 0 })}
      />
      {safePic.dolore === 'presente' && (
        <InlineEditableField
          label="Livello NRS (0–10)" type="number"
          value={String(safePic.doloreLivello ?? 0)} display={`${safePic.doloreLivello ?? 0}/10`}
          onSave={v => saveField({ doloreLivello: Math.max(0, Math.min(10, Math.round(Number(v) || 0))) })}
        />
      )}
    </div>
  );

  // ── Card 4: Documenti e firma ────────────────────────────────────────────────
  const docsEdit = (
    <div className="pic-edit-form">
      <div className="form-row">
        <label className="form-label">Documenti ricevuti</label>
        <textarea className="form-input" rows={3} value={form.documentiRicevuti ?? ''} onChange={e => set({ documentiRicevuti: e.target.value })} placeholder="Elenco documenti ricevuti all'ingresso…" />
      </div>
      <div className="form-row">
        <label className="form-label">Documenti mancanti</label>
        <textarea className="form-input" rows={3} value={form.documentiMancanti ?? ''} onChange={e => set({ documentiMancanti: e.target.value })} placeholder="Documenti ancora da richiedere…" />
      </div>
      <div className="form-row">
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 18, height: 18 }} checked={form.materialeConsegnato} onChange={e => set({ materialeConsegnato: e.target.checked })} />
          <span className="form-label" style={{ margin: 0 }}>Materiale informativo consegnato al paziente / familiare</span>
        </label>
      </div>
      <div className="form-row-2col">
        <div className="form-row">
          <label className="form-label">Operatore</label>
          <input type="text" className="form-input" value={form.operatore} onChange={e => set({ operatore: e.target.value })} />
        </div>
        <div className="form-row">
          <label className="form-label">Sigla / firma</label>
          <input type="text" className="form-input" value={form.sigla ?? ''} onChange={e => set({ sigla: e.target.value })} placeholder="es. M.F." />
        </div>
      </div>
      <div className="form-row">
        <label className="form-label">Note</label>
        <textarea className="form-input" rows={4} value={form.note} onChange={e => set({ note: e.target.value })} placeholder="Note libere…" />
      </div>
      <div className="cr-form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn-secondary" onClick={cancelEdit}>Annulla</button>
        <button className="btn-primary" onClick={handleSave}><IcoCheck /> Salva</button>
      </div>
    </div>
  );

  const docsView = (
    <div className="cr-form-section">
      <Row label="Documenti ricevuti" value={safePic.documentiRicevuti} />
      {safePic.documentiMancanti && (
        <div className="pic-row" style={{ background: '#FEF2F2', borderRadius: 4, padding: '4px 8px' }}>
          <span className="pic-row__lbl" style={{ color: '#B91C1C' }}>Documenti mancanti</span>
          <span className="pic-row__val" style={{ color: '#B91C1C' }}>{safePic.documentiMancanti}</span>
        </div>
      )}
      <RowAlways label="Materiale consegnato" value={safePic.materialeConsegnato} />
      <RowAlways label="Operatore" value={safePic.operatore} />
      <Row label="Sigla" value={safePic.sigla} />
      <RowAlways label="Compilato il" value={safePic.compilatoAt ? new Date(safePic.compilatoAt).toLocaleDateString('it-IT') : '—'} />
      {safePic.note && <RowAlways label="Note" value={safePic.note} />}
    </div>
  );

  return (
    <div className="cr-tab-content">
      {/* Print header */}
      <div className="print-only print-form-header">
        <div className="print-form-header__title">PRESA IN CARICO</div>
        <div className="print-form-header__patient">
          Paziente: {paziente.lastName} {paziente.firstName} — Tessera: {paziente.medicalRecordNumber}
        </div>
      </div>

      <ClinicalTableSection
        title="Presa in Carico"
        actions={<PrintButton />}
      >
        <div className="cts__body--padded">
          {!pic && editingId === null && (
            <EmptyState msg="Presa in carico non ancora compilata." />
          )}

          <ClinicalCard
            title="Dati di ingresso"
            defaultExpanded={true}
            onEdit={() => startEdit('dati')}
          >
            {editingId === 'dati' ? datiEdit : datiView}
          </ClinicalCard>

          <ClinicalCard
            title="Condizioni iniziali"
            defaultExpanded={true}
            onEdit={() => startEdit('cond')}
          >
            {editingId === 'cond' ? condEdit : condView}
          </ClinicalCard>

          <ClinicalCard
            title="Valutazione funzionale"
            defaultExpanded={true}
            onEdit={() => startEdit('valutazione')}
          >
            {editingId === 'valutazione' ? valutazioneEdit : valutazioneView}
          </ClinicalCard>

          <ClinicalCard
            title="Documenti e firma"
            defaultExpanded={true}
            onEdit={() => startEdit('docs')}
          >
            {editingId === 'docs' ? docsEdit : docsView}
          </ClinicalCard>
        </div>
      </ClinicalTableSection>
    </div>
  );
}
