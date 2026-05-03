import { useState } from 'react';
import type { CartellaPaziente, PresaInCarico, Paziente } from '../../../types';
import { PrintButton, EmptyState, todayStr, nowTime, nowISO } from './shared';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
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
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PresaInCarico>(pic ?? { ...EMPTY, operatore: operatoreNome });

  function set(f: Partial<PresaInCarico>) { setForm(p => ({ ...p, ...f })); }

  function handleSave() {
    onUpdate({ presaInCarico: { ...form, compilatoAt: nowISO() } });
    setEditing(false);
  }

  function startEdit() {
    setForm(pic ?? { ...EMPTY, operatore: operatoreNome });
    setEditing(true);
  }

  return (
    <div className="cr-tab-content">
      {/* Print header */}
      <div className="print-only print-form-header">
        <div className="print-form-header__title">PRESA IN CARICO</div>
        <div className="print-form-header__patient">
          Paziente: {paziente.lastName} {paziente.firstName} — Tessera: {paziente.medicalRecordNumber}
        </div>
      </div>

      <div className="cr-tab-header no-print">
        <h3 className="cr-tab-title">Presa in Carico</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <PrintButton />
          {!editing && (
            <button className="btn-primary btn-sm" onClick={startEdit}>
              {pic ? 'Modifica' : 'Compila'}
            </button>
          )}
        </div>
      </div>

      {!pic && !editing && (
        <EmptyState msg="Presa in carico non ancora compilata." />
      )}

      {editing ? (
        <div className="cr-form-grid">

          {/* Section: Dati di ingresso */}
          <div className="cr-form-section">
            <div className="cr-form-section__title">Dati di ingresso</div>
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
              <div className="form-row" style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Camera</label>
                  <input type="text" className="form-input" value={form.camera ?? ''} onChange={e => set({ camera: e.target.value })} placeholder="es. 12" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Letto / posto</label>
                  <input type="text" className="form-input" value={form.letto ?? ''} onChange={e => set({ letto: e.target.value })} placeholder="es. A" />
                </div>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Motivo dell'ingresso</label>
              <textarea className="form-input" rows={3} value={form.motivoIngresso} onChange={e => set({ motivoIngresso: e.target.value })} />
            </div>
          </div>

          {/* Section: Condizioni iniziali */}
          <div className="cr-form-section">
            <div className="cr-form-section__title">Condizioni iniziali</div>
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
              <label className="form-label">Condizioni iniziali (descrizione)</label>
              <textarea className="form-input" rows={3} value={form.condizioniIniziali ?? ''} onChange={e => set({ condizioniIniziali: e.target.value })} placeholder="Descrizione condizioni al momento dell'ingresso…" />
            </div>
            <div className="form-row">
              <label className="form-label">Note iniziali</label>
              <textarea className="form-input" rows={2} value={form.noteIniziali ?? ''} onChange={e => set({ noteIniziali: e.target.value })} />
            </div>
          </div>

          {/* Section: Valutazione funzionale */}
          <div className="cr-form-section">
            <div className="cr-form-section__title">Valutazione funzionale</div>
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
          </div>

          {/* Section: Documenti */}
          <div className="cr-form-section">
            <div className="cr-form-section__title">Documenti e firma</div>
            <div className="form-row">
              <label className="form-label">Documenti ricevuti</label>
              <textarea className="form-input" rows={2} value={form.documentiRicevuti ?? ''} onChange={e => set({ documentiRicevuti: e.target.value })} placeholder="Elenco documenti ricevuti all'ingresso…" />
            </div>
            <div className="form-row">
              <label className="form-label">Documenti mancanti</label>
              <textarea className="form-input" rows={2} value={form.documentiMancanti ?? ''} onChange={e => set({ documentiMancanti: e.target.value })} placeholder="Documenti da richiedere…" />
            </div>
            <div className="form-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.materialeConsegnato} onChange={e => set({ materialeConsegnato: e.target.checked })} />
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
              <textarea className="form-input" rows={3} value={form.note} onChange={e => set({ note: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn-secondary btn-sm" onClick={() => setEditing(false)}>Annulla</button>
            <button className="btn-primary btn-sm" onClick={handleSave}>Salva Presa in Carico</button>
          </div>
        </div>
      ) : pic ? (
        <div className="cr-form-grid">
          <div className="cr-form-section">
            <div className="cr-form-section__title">Dati di ingresso</div>
            <RowAlways label="Data / Ora" value={`${pic.dataIngresso.split('-').reverse().join('/')} ${pic.oraIngresso}`} />
            <RowAlways label="Provenienza" value={PROVENIENZA_LABEL[pic.provenienza] ?? pic.provenienza} />
            <Row label="Centro inviante" value={pic.centroInviante} />
            <RowAlways label="Modalità ingresso" value={pic.modalitaIngresso.replace('_', ' ')} />
            <Row label="Accompagnato da" value={pic.accompagnatoDa} />
            <Row label="Operatore responsabile" value={pic.operatoreResponsabile} />
            <Row label="Camera / Letto" value={pic.camera ? `${pic.camera}${pic.letto ? ' — ' + pic.letto : ''}` : undefined} />
            <RowAlways label="Motivo ingresso" value={pic.motivoIngresso} />
          </div>
          <div className="cr-form-section">
            <div className="cr-form-section__title">Condizioni iniziali</div>
            <RowAlways label="Condizioni generali" value={pic.condizioniGenerali} />
            <RowAlways label="Stato di coscienza" value={pic.statoCoscienza} />
            <Row label="Condizioni iniziali" value={pic.condizioniIniziali} />
            <Row label="Note iniziali" value={pic.noteIniziali} />
          </div>
          <div className="cr-form-section">
            <div className="cr-form-section__title">Valutazione funzionale</div>
            <RowAlways label="Orientamento" value={pic.orientamento.replace('_', ' ')} />
            <RowAlways label="Autonomia" value={pic.autonomia.replace('_', ' ')} />
            <RowAlways label="Comunicazione" value={pic.comunicazione} />
            <RowAlways label="Udito" value={pic.udito} />
            <RowAlways label="Vista" value={pic.vista} />
            <RowAlways label="Dentizione" value={pic.dentizione} />
            <RowAlways label="Alimentazione" value={pic.alimentazione} />
            <RowAlways label="Elim. urinaria" value={pic.eliminazioneUrinaria} />
            <RowAlways label="Elim. intestinale" value={pic.eliminazioneIntestinale} />
            <RowAlways label="Mobilità" value={pic.mobilita} />
            <RowAlways label="Cute / mucose" value={pic.cuteIntegrita} />
            <RowAlways label="Dolore" value={pic.dolore === 'presente' ? `Presente — NRS ${pic.doloreLivello}/10` : 'Assente'} />
          </div>
          <div className="cr-form-section">
            <div className="cr-form-section__title">Documenti e firma</div>
            <Row label="Documenti ricevuti" value={pic.documentiRicevuti} />
            {pic.documentiMancanti && (
              <div className="pic-row" style={{ background: '#FEF2F2', borderRadius: 4, padding: '4px 8px' }}>
                <span className="pic-row__lbl" style={{ color: '#B91C1C' }}>Documenti mancanti</span>
                <span className="pic-row__val" style={{ color: '#B91C1C' }}>{pic.documentiMancanti}</span>
              </div>
            )}
            <RowAlways label="Materiale consegnato" value={pic.materialeConsegnato} />
            <RowAlways label="Operatore" value={pic.operatore} />
            <Row label="Sigla" value={pic.sigla} />
            <RowAlways label="Compilato il" value={pic.compilatoAt ? new Date(pic.compilatoAt).toLocaleDateString('it-IT') : '—'} />
            {pic.note && <RowAlways label="Note" value={pic.note} />}
          </div>
        </div>
      ) : null}
    </div>
  );
}
