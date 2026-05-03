import { useState } from 'react';
import type { CartellaPaziente, DimissioneInfermieristica, Liberatoria, Paziente } from '../../../types';
import { todayStr, nowISO, nowTime, PrintButton } from './shared';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

const EMPTY_DIM: DimissioneInfermieristica = {
  data: todayStr(), ora: nowTime(), condizioni: 'stabili', autonomiaResidua: '',
  pianoCuraConsegnato: false, istruzioni: '', controlliProgrammati: '',
  personaAccompagna: '', mezzoTrasporto: '', destinazione: 'domicilio',
  materialeConsegnato: '', operatore: '', note: '', compilatoAt: nowISO(),
};
const EMPTY_LIB: Liberatoria = {
  data: todayStr(), ora: nowTime(), controParereMedico: false, consapevoleRischi: false,
  firmaPatient: '', firmaTestimone: '', operatore: '', note: '', compilatoAt: nowISO(),
};

function Row({ label, value }: { label: string; value: string | boolean | undefined }) {
  const display = value === true ? 'Sì' : value === false ? 'No' : (value ?? '—');
  return (
    <div className="pic-row">
      <span className="pic-row__lbl">{label}</span>
      <span className="pic-row__val">{String(display)}</span>
    </div>
  );
}

// ── Checkbox helper ────────────────────────────────────────────────────────
const Cb = ({ checked, label }: { checked: boolean; label: string }) => (
  <span className="fm-cb">
    <span className={`fm-cb__box${checked ? ' fm-cb__box--checked' : ''}`}></span>
    {label}
  </span>
);

// ── Modulo dimissione (fedele al template 04) ─────────────────────────────
function DimissioneModulo({ dim, lib, paziente }: {
  dim: DimissioneInfermieristica | undefined;
  lib: Liberatoria | undefined;
  paziente: Paziente;
}) {
  return (
    <div className="fm dimissione-modulo">
      <div className="fm-title">Scheda di Dimissione Infermieristica</div>

      <div className="fm-patient-header">
        <div className="fm-patient-field" style={{ gridColumn: '1 / 3' }}>
          <span className="fm-patient-field__lbl">Cognome e Nome</span>
          <span className="fm-patient-field__val">{paziente.lastName} {paziente.firstName}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Nato/a il</span>
          <span className="fm-patient-field__val">{new Date(paziente.dateOfBirth).toLocaleDateString('it-IT')}</span>
        </div>
      </div>

      {/* RESPIRAZIONE */}
      <DimSection label="RESPIRAZIONE">
        <Cb checked={dim?.condizioni === 'buone' || dim?.condizioni === 'stabili'} label="autonomo" />
        <span style={{ fontSize: '9pt' }}>O₂ terapia lt/min <span style={{ borderBottom: '1px dotted #999', minWidth: 40, display: 'inline-block' }}></span></span>
        <Cb checked={false} label="cannula tracheale" />
        <span style={{ fontSize: '9pt' }}>ultima sostituzione <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}></span></span>
      </DimSection>

      {/* ALIMENTAZIONE */}
      <DimSection label="ALIMENTAZIONE">
        <Cb checked={dim?.autonomiaResidua?.toLowerCase().includes('alim') ?? false} label="autonomo" />
        <Cb checked={false} label="assistito" />
        <span style={{ fontSize: '9pt' }}>dieta <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}></span></span>
        <span style={{ fontSize: '9pt' }}>SNG tipo/n° <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}></span></span>
        <span style={{ fontSize: '9pt' }}>PEG tipo/n° <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}></span></span>
      </DimSection>

      {/* ELIMINAZIONE */}
      <DimSection label="ELIMINAZIONE">
        <Cb checked={false} label="continente" />
        <Cb checked={false} label="parzialmente incontinente" />
        <span style={{ fontSize: '9pt' }}>FEC <span style={{ borderBottom: '1px dotted #999', minWidth: 30, display: 'inline-block' }}></span></span>
        <Cb checked={false} label="URINE" />
        <span style={{ fontSize: '9pt' }}>data ultima evacuazione <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}></span></span>
        <span style={{ fontSize: '9pt' }}>cat. vescicale tipo/n° <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}></span></span>
        <Cb checked={false} label="presenza stomia" />
      </DimSection>

      {/* MOBILIZZAZIONE */}
      <DimSection label="MOBILIZZAZIONE">
        <Cb checked={dim?.autonomiaResidua?.toLowerCase().includes('auton') ?? false} label="autonomo" />
        <Cb checked={dim?.autonomiaResidua?.toLowerCase().includes('allett') ?? false} label="allettato" />
        <span style={{ fontSize: '9pt' }}>assistito con <span style={{ borderBottom: '1px dotted #999', minWidth: 120, display: 'inline-block' }}>{dim?.mezzoTrasporto}</span></span>
        <br />
        <span style={{ fontSize: '9pt', fontWeight: 600 }}>A RISCHIO DI CADUTA</span>
        <Cb checked={false} label="SI" />
        <Cb checked={false} label="NO" />
        <span style={{ fontSize: '9pt' }}>CONTENZIONE <span style={{ borderBottom: '1px dotted #999', minWidth: 100, display: 'inline-block' }}></span></span>
      </DimSection>

      {/* IGIENE */}
      <DimSection label="IGIENE / VESTIZIONE">
        <Cb checked={false} label="autonomo" />
        <Cb checked={false} label="dipendente" />
        <Cb checked={false} label="parzialmente dipendente" />
      </DimSection>

      {/* LESIONI DA PRESSIONE */}
      <DimSection label="LESIONI DA PRESSIONE">
        <Cb checked={false} label="NO" />
        <Cb checked={false} label="SI" />
        <span style={{ fontSize: '9pt' }}>SEDE <span style={{ borderBottom: '1px dotted #999', minWidth: 100, display: 'inline-block' }}></span></span>
        <span style={{ fontSize: '9pt' }}>grado <span style={{ borderBottom: '1px dotted #999', minWidth: 40, display: 'inline-block' }}></span></span>
        <br />
        <span style={{ fontSize: '9pt' }}>tipo di medicazione <span style={{ borderBottom: '1px dotted #999', minWidth: 150, display: 'inline-block' }}></span></span>
        <span style={{ fontSize: '9pt' }}>frequenza <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}></span></span>
        <span style={{ fontSize: '9pt' }}>note <span style={{ borderBottom: '1px dotted #999', minWidth: 100, display: 'inline-block' }}></span></span>
      </DimSection>

      {/* DISTURBI DEL SONNO */}
      <DimSection label="DISTURBI DEL SONNO">
        <Cb checked={false} label="NO" />
        <Cb checked={false} label="SI" />
        <span style={{ fontSize: '9pt' }}>note <span style={{ borderBottom: '1px dotted #999', minWidth: 200, display: 'inline-block' }}></span></span>
        <br />
        <span style={{ fontSize: '9pt' }}>Uso di farmaci</span>
        <Cb checked={false} label="NO" />
        <Cb checked={false} label="SI" />
        <span style={{ borderBottom: '1px dotted #999', minWidth: 200, display: 'inline-block', fontSize: '9pt' }}></span>
      </DimSection>

      {/* COMUNICAZIONE */}
      <DimSection label="COMUNICAZIONE">
        <Cb checked={false} label="orientato" />
        <Cb checked={false} label="parzialmente orientato" />
        <Cb checked={false} label="disorientato" />
        <br />
        <span style={{ fontSize: '9pt' }}>alterazioni sensoriali <span style={{ borderBottom: '1px dotted #999', minWidth: 200, display: 'inline-block' }}></span></span>
        <span style={{ fontSize: '9pt' }}>Comunica</span>
        <Cb checked={false} label="SI" />
        <Cb checked={false} label="NO" />
        <span style={{ fontSize: '9pt' }}>con difficoltà <span style={{ borderBottom: '1px dotted #999', minWidth: 100, display: 'inline-block' }}></span></span>
      </DimSection>

      {/* Istruzioni */}
      {dim?.istruzioni && (
        <div className="fm-notes" style={{ marginTop: 10 }}>
          <span className="fm-notes__lbl">Istruzioni fornite al paziente / familiare</span>
          {dim.istruzioni}
        </div>
      )}
      {dim?.controlliProgrammati && (
        <div className="fm-notes">
          <span className="fm-notes__lbl">Controlli programmati</span>
          {dim.controlliProgrammati}
        </div>
      )}
      {dim?.materialeConsegnato && (
        <div className="fm-notes">
          <span className="fm-notes__lbl">Materiale consegnato</span>
          {dim.materialeConsegnato}
        </div>
      )}

      <div className="fm-signature-row" style={{ marginTop: 16 }}>
        <div className="fm-signature">
          <span className="fm-signature__lbl">Data</span>
          <div className="fm-signature__line">{dim?.data ? dim.data.split('-').reverse().join('/') : ''}</div>
        </div>
        <div className="fm-signature">
          <span className="fm-signature__lbl">Firma infermiere</span>
          <div className="fm-signature__line">{dim?.operatore}</div>
        </div>
      </div>

      {/* ── LIBERATORIA (same print page) ── */}
      <div style={{ marginTop: 40, borderTop: '2px solid #333', paddingTop: 20, pageBreakBefore: 'auto' }}>
        <div className="fm-title">Dichiarazione Liberatoria</div>

        <div className="declaration-text" style={{ fontSize: '9pt', lineHeight: 1.9, border: '1px solid #ccc', padding: 14, marginTop: 12, background: '#fafafa' }}>
          <p>
            Il/La sottoscritto/a <span style={{ borderBottom: '1px dotted #999', display: 'inline-block', minWidth: 280 }}>{lib?.firmaPatient ?? ''}</span>
          </p>
          <p>
            quale ospite / referente dell'ospite della struttura, con la presente esonera la Direzione da ogni responsabilità
            per danni e conseguenze presenti o future che possano insorgere a causa di gesti, movimenti, azioni, posture,
            assunzione di cibi, bevande, farmaci e tutte le altre iniziative non conformi e/o non autorizzate, cioè tutto
            quanto possa causare danni fisici o compromettere la validità della terapia, per fatti procurati dall'ospite o
            da suoi parenti/visitatori, all'interno della struttura o all'esterno in occasione degli eventuali permessi di uscita.
          </p>
        </div>

        <div className="fm-signature-row" style={{ marginTop: 12 }}>
          <div className="fm-signature">
            <span className="fm-signature__lbl">Firma dell'ospite o suo referente</span>
            <div className="fm-signature__line">{lib?.firmaPatient ?? ''}</div>
          </div>
        </div>

        <table className="fm-table" style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th style={{ width: 130 }}>Data uscita</th>
              <th style={{ width: 80 }}>Ora</th>
              <th>Firma dell'ospite o suo referente</th>
            </tr>
          </thead>
          <tbody>
            {lib?.data ? (
              <tr>
                <td>{lib.data.split('-').reverse().join('/')}</td>
                <td>{lib.ora}</td>
                <td>{lib.firmaPatient}</td>
              </tr>
            ) : null}
            {Array.from({ length: Math.max(5, 7 - (lib ? 1 : 0)) }).map((_, i) => (
              <tr key={i}><td style={{ height: 24 }}></td><td></td><td></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DimSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fm-dim-section" style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 0, borderBottom: '1px solid #ccc', minHeight: 28, alignItems: 'center' }}>
      <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', padding: '4px 8px', borderRight: '1px solid #ccc' }}>{label}</div>
      <div style={{ padding: '4px 8px', display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'center', fontSize: '9pt' }}>
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function DimissioneTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const dim = cartella.dimissione;
  const lib = cartella.liberatoria;
  const [modulo, setModulo] = useState(false);

  const [editingDim, setEditingDim] = useState(false);
  const [dimForm, setDimForm] = useState<DimissioneInfermieristica>(dim ?? { ...EMPTY_DIM, operatore: operatoreNome });
  const [editingLib, setEditingLib] = useState(false);
  const [libForm, setLibForm] = useState<Liberatoria>(lib ?? { ...EMPTY_LIB, operatore: operatoreNome });

  function setDim(f: Partial<DimissioneInfermieristica>) { setDimForm(p => ({ ...p, ...f })); }
  function setLib(f: Partial<Liberatoria>) { setLibForm(p => ({ ...p, ...f })); }
  function saveDim() { onUpdate({ dimissione: { ...dimForm, compilatoAt: nowISO() } }); setEditingDim(false); }
  function saveLib() { onUpdate({ liberatoria: { ...libForm, compilatoAt: nowISO() } }); setEditingLib(false); }

  return (
    <div className={`cr-tab-content${modulo ? ' mode-modulo' : ''}`}>

      {/* ── Modulo view ── */}
      <div className="modulo-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }} className="no-print">
          <button className="btn-secondary btn-sm" onClick={() => setModulo(false)}>← Vista operativa</button>
          <PrintButton label="Stampa modulo" />
        </div>
        <DimissioneModulo dim={dim} lib={lib} paziente={paziente} />
      </div>

      {/* ── Web view ── */}
      <div className="web-content">
        <div className="cr-tab-header">
          <h3 className="cr-tab-title">Dimissione Infermieristica</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary btn-sm" onClick={() => setModulo(true)}>📋 Vista modulo</button>
          </div>
        </div>

        {/* ── Dimissione section ── */}
        <div className="cr-section-header" style={{ marginBottom: 12 }}>
          <span className="cr-section-title">Scheda di Dimissione</span>
          <button className="btn-primary btn-sm" onClick={() => { setDimForm(dim ?? { ...EMPTY_DIM, operatore: operatoreNome }); setEditingDim(true); }}>
            {dim ? 'Modifica' : 'Compila'}
          </button>
        </div>

        {editingDim ? (
          <div className="cr-inline-form">
            <div className="form-row-2col">
              <div className="form-row"><label className="form-label">Data dimissione</label><input type="date" className="form-input" value={dimForm.data} onChange={e => setDim({ data: e.target.value })} /></div>
              <div className="form-row"><label className="form-label">Ora</label><input type="time" className="form-input" value={dimForm.ora} onChange={e => setDim({ ora: e.target.value })} /></div>
            </div>
            <div className="form-row-2col">
              <div className="form-row">
                <label className="form-label">Condizioni alla dimissione</label>
                <select className="form-input" value={dimForm.condizioni} onChange={e => setDim({ condizioni: e.target.value as DimissioneInfermieristica['condizioni'] })}>
                  <option value="buone">Buone</option><option value="discrete">Discrete</option>
                  <option value="stabili">Stabili</option><option value="scadenti">Scadenti</option>
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Destinazione</label>
                <select className="form-input" value={dimForm.destinazione} onChange={e => setDim({ destinazione: e.target.value as DimissioneInfermieristica['destinazione'] })}>
                  <option value="domicilio">Domicilio</option><option value="altra_struttura">Altra struttura</option>
                  <option value="hospice">Hospice</option><option value="ospedale">Ospedale</option>
                </select>
              </div>
            </div>
            <div className="form-row"><label className="form-label">Autonomia residua</label><input type="text" className="form-input" value={dimForm.autonomiaResidua} onChange={e => setDim({ autonomiaResidua: e.target.value })} /></div>
            <div className="form-row"><label className="form-label">Istruzioni al paziente / familiare</label><textarea className="form-input" rows={3} value={dimForm.istruzioni} onChange={e => setDim({ istruzioni: e.target.value })} /></div>
            <div className="form-row"><label className="form-label">Controlli programmati</label><textarea className="form-input" rows={2} value={dimForm.controlliProgrammati} onChange={e => setDim({ controlliProgrammati: e.target.value })} /></div>
            <div className="form-row-2col">
              <div className="form-row"><label className="form-label">Persona che accompagna</label><input type="text" className="form-input" value={dimForm.personaAccompagna} onChange={e => setDim({ personaAccompagna: e.target.value })} /></div>
              <div className="form-row"><label className="form-label">Mezzo di trasporto</label><input type="text" className="form-input" value={dimForm.mezzoTrasporto} onChange={e => setDim({ mezzoTrasporto: e.target.value })} /></div>
            </div>
            <div className="form-row"><label className="form-label">Materiale consegnato</label><textarea className="form-input" rows={2} value={dimForm.materialeConsegnato} onChange={e => setDim({ materialeConsegnato: e.target.value })} /></div>
            <div className="form-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={dimForm.pianoCuraConsegnato} onChange={e => setDim({ pianoCuraConsegnato: e.target.checked })} />
                <span className="form-label" style={{ margin: 0 }}>Piano di cura consegnato</span>
              </label>
            </div>
            <div className="form-row"><label className="form-label">Operatore infermieristico</label><input type="text" className="form-input" value={dimForm.operatore} onChange={e => setDim({ operatore: e.target.value })} /></div>
            <div className="form-row"><label className="form-label">Note</label><textarea className="form-input" rows={2} value={dimForm.note} onChange={e => setDim({ note: e.target.value })} /></div>
            <div className="cr-inline-form__actions">
              <button className="btn-secondary btn-sm" onClick={() => setEditingDim(false)}>Annulla</button>
              <button className="btn-primary btn-sm" onClick={saveDim}>Salva</button>
            </div>
          </div>
        ) : dim ? (
          <div className="cr-form-grid">
            <div className="cr-form-section">
              <Row label="Data / Ora" value={`${dim.data.split('-').reverse().join('/')} ${dim.ora}`} />
              <Row label="Condizioni" value={dim.condizioni} />
              <Row label="Destinazione" value={dim.destinazione.replace('_', ' ')} />
              <Row label="Autonomia residua" value={dim.autonomiaResidua} />
              <Row label="Piano cura consegnato" value={dim.pianoCuraConsegnato} />
            </div>
            <div className="cr-form-section">
              <Row label="Istruzioni" value={dim.istruzioni} />
              <Row label="Controlli programmati" value={dim.controlliProgrammati} />
              <Row label="Accompagnato da" value={dim.personaAccompagna} />
              <Row label="Mezzo di trasporto" value={dim.mezzoTrasporto} />
              <Row label="Materiale consegnato" value={dim.materialeConsegnato} />
              <Row label="Operatore" value={dim.operatore} />
            </div>
          </div>
        ) : (
          <p className="cr-empty">Scheda di dimissione non ancora compilata.</p>
        )}

        {/* ── Liberatoria section ── */}
        <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
          <div className="cr-section-header" style={{ marginBottom: 12 }}>
            <span className="cr-section-title">Liberatoria di Uscita</span>
            <button className="btn-secondary btn-sm" onClick={() => { setLibForm(lib ?? { ...EMPTY_LIB, operatore: operatoreNome }); setEditingLib(true); }}>
              {lib ? 'Modifica' : 'Compila liberatoria'}
            </button>
          </div>

          {editingLib ? (
            <div className="cr-inline-form">
              <div className="form-row-2col">
                <div className="form-row"><label className="form-label">Data</label><input type="date" className="form-input" value={libForm.data} onChange={e => setLib({ data: e.target.value })} /></div>
                <div className="form-row"><label className="form-label">Ora</label><input type="time" className="form-input" value={libForm.ora} onChange={e => setLib({ ora: e.target.value })} /></div>
              </div>
              <div className="form-row" style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)', borderRadius: 8, padding: '12px 16px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={libForm.controParereMedico} onChange={e => setLib({ controParereMedico: e.target.checked })} style={{ marginTop: 2 }} />
                  <span className="form-label" style={{ margin: 0 }}>Il/la paziente dichiara di lasciare la struttura <strong>contro parere medico</strong></span>
                </label>
              </div>
              <div className="form-row">
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={libForm.consapevoleRischi} onChange={e => setLib({ consapevoleRischi: e.target.checked })} style={{ marginTop: 2 }} />
                  <span className="form-label" style={{ margin: 0 }}>Il/la paziente è stato/a informato/a dei rischi derivanti dall'abbandono anticipato delle cure</span>
                </label>
              </div>
              <div className="form-row-2col">
                <div className="form-row"><label className="form-label">Firma paziente / tutore</label><input type="text" className="form-input" value={libForm.firmaPatient} onChange={e => setLib({ firmaPatient: e.target.value })} /></div>
                <div className="form-row"><label className="form-label">Firma testimone</label><input type="text" className="form-input" value={libForm.firmaTestimone} onChange={e => setLib({ firmaTestimone: e.target.value })} /></div>
              </div>
              <div className="form-row"><label className="form-label">Operatore</label><input type="text" className="form-input" value={libForm.operatore} onChange={e => setLib({ operatore: e.target.value })} /></div>
              <div className="form-row"><label className="form-label">Note</label><textarea className="form-input" rows={2} value={libForm.note} onChange={e => setLib({ note: e.target.value })} /></div>
              <div className="cr-inline-form__actions">
                <button className="btn-secondary btn-sm" onClick={() => setEditingLib(false)}>Annulla</button>
                <button className="btn-primary btn-sm" onClick={saveLib}>Salva liberatoria</button>
              </div>
            </div>
          ) : lib ? (
            <div className="cr-form-grid">
              <div className="cr-form-section">
                <Row label="Data / Ora" value={`${lib.data.split('-').reverse().join('/')} ${lib.ora}`} />
                <Row label="Contro parere medico" value={lib.controParereMedico} />
                <Row label="Consapevole dei rischi" value={lib.consapevoleRischi} />
                <Row label="Firma paziente/tutore" value={lib.firmaPatient} />
                <Row label="Firma testimone" value={lib.firmaTestimone} />
                <Row label="Operatore" value={lib.operatore} />
                {lib.note && <Row label="Note" value={lib.note} />}
              </div>
            </div>
          ) : (
            <p className="cr-empty">Liberatoria non compilata.</p>
          )}
        </div>
      </div>
    </div>
  );
}
