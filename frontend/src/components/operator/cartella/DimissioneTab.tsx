import { useState } from 'react';
import type { CartellaPaziente, DimissioneInfermieristica, Liberatoria, UscitaLog, Paziente } from '../../../types';
import { todayStr, nowISO, nowTime, PrintButton, ClinicalTableSection } from './shared';
import { ClinicalTable } from './ClinicalTable';

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
  // Respirazione
  respAutonomo: false, respO2Terapia: false, respO2LitriMin: '',
  respCannulaTracheale: false, respUltimaSostituzione: '',
  // Alimentazione
  alimentAutonomo: false, alimentAssistito: false, alimentDieta: '',
  alimentSNG: '', alimentPEG: '',
  // Eliminazione
  elimContinente: false, elimParzialmenteIncontinente: false,
  elimIncontinenzaFeci: false, elimIncontinenzaUrine: false,
  elimDataUltimaEvacuazione: '', elimCatetereVescicale: '', elimStomia: false,
  // Mobilizzazione
  mobAutonomo: false, mobAllettato: false, mobAssistitoCon: '',
  mobRischioCaduta: false, mobContenzione: '',
  // Igiene
  igieneAutonomo: false, igieneDipendente: false, igieneParzialmenteDipendente: false,
  // Lesioni
  lesioniNo: true, lesioniSi: false, lesioniSede: '', lesioniGrado: '',
  lesioniTipoMedicazione: '', lesioniFrequenza: '', lesioniNote: '',
  // Sonno
  sonnoNo: true, sonnoSi: false, sonnoNote: '',
  // Farmaci
  farmaciNo: true, farmaciSi: false, farmaciDettaglio: '',
  // Comunicazione
  commOrientato: false, commParzialmenteOrientato: false, commDisorientato: false,
  commAlterazioniSensoriali: '', commComunicaSi: false, commComunicaNo: false, commDifficolta: '',
  // Servizi
  servizioSocialeSi: false, servizioSocialeNo: true,
  servizioDomiciliareSi: false, servizioDomiciliareNo: true,
};

const EMPTY_LIB: Liberatoria = {
  data: todayStr(), ora: nowTime(), controParereMedico: false, consapevoleRischi: false,
  firmaPatient: '', firmaTestimone: '', operatore: '', note: '', compilatoAt: nowISO(),
  referenteNome: '', referenteDataNascita: '', referenteRapporto: '', soloUscitaParenti: false,
};

// ── Inline checkbox (modulo stampa) ───────────────────────────────────────────
const Cb = ({ checked, label }: { checked: boolean; label: string }) => (
  <span className="fm-cb">
    <span className={`fm-cb__box${checked ? ' fm-cb__box--checked' : ''}`}></span>
    {label}
  </span>
);

// ── Sezione modulo con etichetta a sinistra ───────────────────────────────────
function DimSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fm-dim-section" style={{
      display: 'grid', gridTemplateColumns: '140px 1fr', gap: 0,
      borderBottom: '1px solid #ccc', minHeight: 28, alignItems: 'center',
    }}>
      <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', padding: '4px 8px', borderRight: '1px solid #ccc' }}>{label}</div>
      <div style={{ padding: '4px 8px', display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'center', fontSize: '9pt' }}>
        {children}
      </div>
    </div>
  );
}

function Fill({ width = 80 }: { width?: number }) {
  return <span style={{ borderBottom: '1px dotted #999', minWidth: width, display: 'inline-block' }}></span>;
}

// ── Modulo stampa dimissione ───────────────────────────────────────────────────
function DimissioneModulo({ dim, lib, paziente }: {
  dim: DimissioneInfermieristica | undefined;
  lib: Liberatoria | undefined;
  paziente: Paziente;
}) {
  const d = dim;
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

      <DimSection label="RESPIRAZIONE">
        <Cb checked={d?.respAutonomo ?? false} label="autonomo" />
        <Cb checked={d?.respO2Terapia ?? false} label="O₂ terapia" />
        {d?.respO2Terapia && <>lt/min <Fill width={40} /></>}
        <Cb checked={d?.respCannulaTracheale ?? false} label="cannula tracheale" />
        <span style={{ fontSize: '9pt' }}>ultima sostituzione <Fill width={80} /></span>
      </DimSection>

      <DimSection label="ALIMENTAZIONE">
        <Cb checked={d?.alimentAutonomo ?? false} label="autonomo" />
        <Cb checked={d?.alimentAssistito ?? false} label="assistito" />
        <span style={{ fontSize: '9pt' }}>dieta <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}>{d?.alimentDieta}</span></span>
        <Cb checked={!!d?.alimentSNG} label="SNG" />
        {d?.alimentSNG && <span style={{ fontSize: '9pt' }}>tipo/n° {d.alimentSNG}</span>}
        <Cb checked={!!d?.alimentPEG} label="PEG" />
        {d?.alimentPEG && <span style={{ fontSize: '9pt' }}>tipo/n° {d.alimentPEG}</span>}
      </DimSection>

      <DimSection label="ELIMINAZIONE">
        <Cb checked={d?.elimContinente ?? false} label="continente" />
        <Cb checked={d?.elimParzialmenteIncontinente ?? false} label="parz. incontinente" />
        <Cb checked={d?.elimIncontinenzaFeci ?? false} label="incont. feci" />
        <Cb checked={d?.elimIncontinenzaUrine ?? false} label="incont. urine" />
        <br style={{ width: '100%' }} />
        <span style={{ fontSize: '9pt' }}>data ultima evacuazione <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}>{d?.elimDataUltimaEvacuazione}</span></span>
        <span style={{ fontSize: '9pt' }}>cat. vescicale <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}>{d?.elimCatetereVescicale}</span></span>
        <Cb checked={d?.elimStomia ?? false} label="stomia" />
      </DimSection>

      <DimSection label="MOBILIZZAZIONE">
        <Cb checked={d?.mobAutonomo ?? false} label="autonomo" />
        <Cb checked={d?.mobAllettato ?? false} label="allettato" />
        <span style={{ fontSize: '9pt' }}>assistito con <span style={{ borderBottom: '1px dotted #999', minWidth: 100, display: 'inline-block' }}>{d?.mobAssistitoCon}</span></span>
        <br style={{ width: '100%' }} />
        <span style={{ fontSize: '9pt', fontWeight: 600 }}>RISCHIO CADUTA</span>
        <Cb checked={d?.mobRischioCaduta ?? false} label="SÌ" />
        <Cb checked={!(d?.mobRischioCaduta ?? false)} label="NO" />
        <span style={{ fontSize: '9pt' }}>CONTENZIONE <span style={{ borderBottom: '1px dotted #999', minWidth: 100, display: 'inline-block' }}>{d?.mobContenzione}</span></span>
      </DimSection>

      <DimSection label="IGIENE / VESTIZIONE">
        <Cb checked={d?.igieneAutonomo ?? false} label="autonomo" />
        <Cb checked={d?.igieneDipendente ?? false} label="dipendente" />
        <Cb checked={d?.igieneParzialmenteDipendente ?? false} label="parzialmente dipendente" />
      </DimSection>

      <DimSection label="LESIONI DA PRESSIONE">
        <Cb checked={d?.lesioniNo ?? true} label="NO" />
        <Cb checked={d?.lesioniSi ?? false} label="SÌ" />
        {d?.lesioniSi && <>
          <span style={{ fontSize: '9pt' }}>SEDE <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}>{d.lesioniSede}</span></span>
          <span style={{ fontSize: '9pt' }}>grado <span style={{ borderBottom: '1px dotted #999', minWidth: 30, display: 'inline-block' }}>{d.lesioniGrado}</span></span>
          <br style={{ width: '100%' }} />
          <span style={{ fontSize: '9pt' }}>tipo medicazione <span style={{ borderBottom: '1px dotted #999', minWidth: 120, display: 'inline-block' }}>{d.lesioniTipoMedicazione}</span></span>
          <span style={{ fontSize: '9pt' }}>frequenza <span style={{ borderBottom: '1px dotted #999', minWidth: 80, display: 'inline-block' }}>{d.lesioniFrequenza}</span></span>
          {d.lesioniNote && <span style={{ fontSize: '9pt' }}>note {d.lesioniNote}</span>}
        </>}
      </DimSection>

      <DimSection label="DISTURBI DEL SONNO">
        <Cb checked={d?.sonnoNo ?? true} label="NO" />
        <Cb checked={d?.sonnoSi ?? false} label="SÌ" />
        {d?.sonnoSi && d.sonnoNote && <span style={{ fontSize: '9pt' }}>note {d.sonnoNote}</span>}
        <br style={{ width: '100%' }} />
        <span style={{ fontSize: '9pt', fontWeight: 600 }}>Uso di farmaci</span>
        <Cb checked={d?.farmaciNo ?? true} label="NO" />
        <Cb checked={d?.farmaciSi ?? false} label="SÌ" />
        {d?.farmaciSi && d.farmaciDettaglio && <span style={{ fontSize: '9pt' }}>{d.farmaciDettaglio}</span>}
      </DimSection>

      <DimSection label="COMUNICAZIONE">
        <Cb checked={d?.commOrientato ?? false} label="orientato" />
        <Cb checked={d?.commParzialmenteOrientato ?? false} label="parz. orientato" />
        <Cb checked={d?.commDisorientato ?? false} label="disorientato" />
        <br style={{ width: '100%' }} />
        {d?.commAlterazioniSensoriali && <span style={{ fontSize: '9pt' }}>alterazioni sensoriali: {d.commAlterazioniSensoriali}</span>}
        <span style={{ fontSize: '9pt', fontWeight: 600 }}>Comunica</span>
        <Cb checked={d?.commComunicaSi ?? false} label="SÌ" />
        <Cb checked={d?.commComunicaNo ?? false} label="NO" />
        {d?.commDifficolta && <span style={{ fontSize: '9pt' }}>con difficoltà: {d.commDifficolta}</span>}
      </DimSection>

      <DimSection label="SERV. TERRITORIALI">
        <span style={{ fontSize: '9pt', fontWeight: 600 }}>Serv. sociale:</span>
        <Cb checked={d?.servizioSocialeSi ?? false} label="SÌ" />
        <Cb checked={d?.servizioSocialeNo ?? true} label="NO" />
        <span style={{ fontSize: '9pt', fontWeight: 600, marginLeft: 12 }}>Serv. inf. domiciliare:</span>
        <Cb checked={d?.servizioDomiciliareSi ?? false} label="SÌ" />
        <Cb checked={d?.servizioDomiciliareNo ?? true} label="NO" />
      </DimSection>

      {(d?.istruzioni || d?.controlliProgrammati || d?.materialeConsegnato) && (
        <div style={{ marginTop: 10 }}>
          {d?.istruzioni && (
            <div className="fm-notes">
              <span className="fm-notes__lbl">Istruzioni fornite al paziente / familiare</span>
              {d.istruzioni}
            </div>
          )}
          {d?.controlliProgrammati && (
            <div className="fm-notes">
              <span className="fm-notes__lbl">Controlli programmati</span>
              {d.controlliProgrammati}
            </div>
          )}
          {d?.materialeConsegnato && (
            <div className="fm-notes">
              <span className="fm-notes__lbl">Materiale consegnato</span>
              {d.materialeConsegnato}
            </div>
          )}
        </div>
      )}

      <div className="fm-signature-row" style={{ marginTop: 16 }}>
        <div className="fm-signature">
          <span className="fm-signature__lbl">Data</span>
          <div className="fm-signature__line">{d?.data ? d.data.split('-').reverse().join('/') : ''}</div>
        </div>
        <div className="fm-signature">
          <span className="fm-signature__lbl">Firma infermiere</span>
          <div className="fm-signature__line">{d?.operatore}</div>
        </div>
      </div>

      {/* ── LIBERATORIA (same print page) ── */}
      <div style={{ marginTop: 40, borderTop: '2px solid #333', paddingTop: 20, pageBreakBefore: 'auto' }}>
        <div className="fm-title">Dichiarazione Liberatoria di Uscita</div>

        {lib?.soloUscitaParenti && (
          <div style={{ fontSize: '8.5pt', background: '#fff8dc', border: '1px solid #f0c040', padding: '4px 10px', marginBottom: 8, borderRadius: 4 }}>
            ⚠ Compilare solo in caso di uscita con parenti
          </div>
        )}

        <div className="fm-patient-header cols-4" style={{ marginBottom: 8 }}>
          <div className="fm-patient-field" style={{ gridColumn: '1/3' }}>
            <span className="fm-patient-field__lbl">Paziente</span>
            <span className="fm-patient-field__val">{paziente.lastName} {paziente.firstName}</span>
          </div>
          <div className="fm-patient-field">
            <span className="fm-patient-field__lbl">Data uscita</span>
            <span className="fm-patient-field__val">{lib?.data ? lib.data.split('-').reverse().join('/') : ''}</span>
          </div>
          <div className="fm-patient-field">
            <span className="fm-patient-field__lbl">Ora uscita</span>
            <span className="fm-patient-field__val">{lib?.ora ?? ''}</span>
          </div>
          <div className="fm-patient-field">
            <span className="fm-patient-field__lbl">Referente / Familiare</span>
            <span className="fm-patient-field__val">{lib?.referenteNome ?? ''}</span>
          </div>
          <div className="fm-patient-field">
            <span className="fm-patient-field__lbl">Nato/a il</span>
            <span className="fm-patient-field__val">{lib?.referenteDataNascita ?? ''}</span>
          </div>
          <div className="fm-patient-field">
            <span className="fm-patient-field__lbl">Rapporto con paziente</span>
            <span className="fm-patient-field__val">{lib?.referenteRapporto ?? ''}</span>
          </div>
        </div>

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

        {lib?.note && (
          <div className="fm-notes" style={{ marginTop: 8 }}>
            <span className="fm-notes__lbl">Note</span>
            {lib.note}
          </div>
        )}

        <div className="fm-signature-row" style={{ marginTop: 16 }}>
          <div className="fm-signature">
            <span className="fm-signature__lbl">Firma ospite / referente</span>
            <div className="fm-signature__line">{lib?.firmaPatient ?? ''}</div>
          </div>
          <div className="fm-signature">
            <span className="fm-signature__lbl">Firma testimone</span>
            <div className="fm-signature__line">{lib?.firmaTestimone ?? ''}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Checkbox form helper ───────────────────────────────────────────────────────
function CbInput({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '14px' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#1A56DB' }} />
      <span>{label}</span>
    </label>
  );
}

// ── Sezione form ───────────────────────────────────────────────────────────────
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>{title}</div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DimissioneTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const dim = cartella.dimissione;
  const lib = cartella.liberatoria;
  const [modulo, setModulo] = useState(false);
  const [editingDim, setEditingDim] = useState(false);
  const [dimForm, setDimForm] = useState<DimissioneInfermieristica>(dim ?? { ...EMPTY_DIM, operatore: operatoreNome });
  const [editingLib, setEditingLib] = useState(false);
  const [libForm, setLibForm] = useState<Liberatoria>(lib ?? { ...EMPTY_LIB, operatore: operatoreNome });
  const [showAddUscita, setShowAddUscita] = useState(false);
  const [uscitaForm, setUscitaForm] = useState<Partial<UscitaLog>>({});

  function setDim(f: Partial<DimissioneInfermieristica>) { setDimForm(p => ({ ...p, ...f })); }
  function setLib(f: Partial<Liberatoria>) { setLibForm(p => ({ ...p, ...f })); }
  function saveDim() { onUpdate({ dimissione: { ...dimForm, compilatoAt: nowISO() } }); setEditingDim(false); }
  function saveLib() { onUpdate({ liberatoria: { ...libForm, compilatoAt: nowISO() } }); setEditingLib(false); }

  function addUscita() {
    if (!uscitaForm.data || !uscitaForm.ora) return;
    const entry: UscitaLog = {
      id: crypto.randomUUID(),
      data: uscitaForm.data,
      ora: uscitaForm.ora,
      oraRientro: uscitaForm.oraRientro,
      referenteNome: uscitaForm.referenteNome,
      firma: uscitaForm.firma,
      operatore: operatoreNome,
      note: uscitaForm.note,
    };
    const existing = cartella.liberatoria ?? { ...EMPTY_LIB, operatore: operatoreNome };
    onUpdate({ liberatoria: { ...existing, usciteLog: [...(existing.usciteLog ?? []), entry] } });
    setUscitaForm({});
    setShowAddUscita(false);
  }

  function deleteUscita(id: string) {
    if (!cartella.liberatoria) return;
    onUpdate({ liberatoria: { ...cartella.liberatoria, usciteLog: (cartella.liberatoria.usciteLog ?? []).filter(u => u.id !== id) } });
  }

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
        <ClinicalTableSection
          title="Dimissione Infermieristica"
          actions={<>
            <button className="btn-sm" onClick={() => setModulo(true)}>Vista modulo</button>
          </>}
        >
        <div className="cts__body--padded">

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
              <div className="form-row">
                <label className="form-label">Data</label>
                <input type="date" className="form-input" value={dimForm.data} onChange={e => setDim({ data: e.target.value })} />
              </div>
              <div className="form-row">
                <label className="form-label">Ora</label>
                <input type="time" className="form-input" value={dimForm.ora} onChange={e => setDim({ ora: e.target.value })} />
              </div>
            </div>

            {/* RESPIRAZIONE */}
            <FormSection title="Respirazione">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: 8 }}>
                <CbInput checked={dimForm.respAutonomo ?? false} label="Autonomo" onChange={v => setDim({ respAutonomo: v })} />
                <CbInput checked={dimForm.respO2Terapia ?? false} label="O₂ terapia" onChange={v => setDim({ respO2Terapia: v })} />
                <CbInput checked={dimForm.respCannulaTracheale ?? false} label="Cannula tracheale" onChange={v => setDim({ respCannulaTracheale: v })} />
              </div>
              <div className="form-row-2col">
                {dimForm.respO2Terapia && (
                  <div className="form-row">
                    <label className="form-label">O₂ lt/min</label>
                    <input type="text" className="form-input" value={dimForm.respO2LitriMin ?? ''} onChange={e => setDim({ respO2LitriMin: e.target.value })} placeholder="es. 2" />
                  </div>
                )}
                {dimForm.respCannulaTracheale && (
                  <div className="form-row">
                    <label className="form-label">Ultima sostituzione</label>
                    <input type="date" className="form-input" value={dimForm.respUltimaSostituzione ?? ''} onChange={e => setDim({ respUltimaSostituzione: e.target.value })} />
                  </div>
                )}
              </div>
            </FormSection>

            {/* ALIMENTAZIONE */}
            <FormSection title="Alimentazione">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: 8 }}>
                <CbInput checked={dimForm.alimentAutonomo ?? false} label="Autonomo" onChange={v => setDim({ alimentAutonomo: v })} />
                <CbInput checked={dimForm.alimentAssistito ?? false} label="Assistito" onChange={v => setDim({ alimentAssistito: v })} />
                <CbInput checked={!!dimForm.alimentSNG} label="SNG" onChange={v => setDim({ alimentSNG: v ? dimForm.alimentSNG || '' : '' })} />
                <CbInput checked={!!dimForm.alimentPEG} label="PEG" onChange={v => setDim({ alimentPEG: v ? dimForm.alimentPEG || '' : '' })} />
              </div>
              <div className="form-row-3col">
                <div className="form-row">
                  <label className="form-label">Dieta</label>
                  <input type="text" className="form-input" value={dimForm.alimentDieta ?? ''} onChange={e => setDim({ alimentDieta: e.target.value })} placeholder="es. libera, tritatina…" />
                </div>
                <div className="form-row">
                  <label className="form-label">SNG tipo/n°</label>
                  <input type="text" className="form-input" value={dimForm.alimentSNG ?? ''} onChange={e => setDim({ alimentSNG: e.target.value })} disabled={!dimForm.alimentSNG && dimForm.alimentSNG !== ''} placeholder="es. 14Ch" />
                </div>
                <div className="form-row">
                  <label className="form-label">PEG tipo/n°</label>
                  <input type="text" className="form-input" value={dimForm.alimentPEG ?? ''} onChange={e => setDim({ alimentPEG: e.target.value })} placeholder="es. 20Fr" />
                </div>
              </div>
            </FormSection>

            {/* ELIMINAZIONE */}
            <FormSection title="Eliminazione">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: 8 }}>
                <CbInput checked={dimForm.elimContinente ?? false} label="Continente" onChange={v => setDim({ elimContinente: v })} />
                <CbInput checked={dimForm.elimParzialmenteIncontinente ?? false} label="Parzialmente incontinente" onChange={v => setDim({ elimParzialmenteIncontinente: v })} />
                <CbInput checked={dimForm.elimIncontinenzaFeci ?? false} label="Incontinenza feci" onChange={v => setDim({ elimIncontinenzaFeci: v })} />
                <CbInput checked={dimForm.elimIncontinenzaUrine ?? false} label="Incontinenza urine" onChange={v => setDim({ elimIncontinenzaUrine: v })} />
                <CbInput checked={dimForm.elimStomia ?? false} label="Stomia" onChange={v => setDim({ elimStomia: v })} />
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Data ultima evacuazione</label>
                  <input type="date" className="form-input" value={dimForm.elimDataUltimaEvacuazione ?? ''} onChange={e => setDim({ elimDataUltimaEvacuazione: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="form-label">Catetere vescicale tipo/n°</label>
                  <input type="text" className="form-input" value={dimForm.elimCatetereVescicale ?? ''} onChange={e => setDim({ elimCatetereVescicale: e.target.value })} placeholder="es. 16Ch Foley" />
                </div>
              </div>
            </FormSection>

            {/* MOBILIZZAZIONE */}
            <FormSection title="Mobilizzazione">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: 8 }}>
                <CbInput checked={dimForm.mobAutonomo ?? false} label="Autonomo" onChange={v => setDim({ mobAutonomo: v })} />
                <CbInput checked={dimForm.mobAllettato ?? false} label="Allettato" onChange={v => setDim({ mobAllettato: v })} />
                <CbInput checked={dimForm.mobRischioCaduta ?? false} label="Rischio caduta" onChange={v => setDim({ mobRischioCaduta: v })} />
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Assistito con</label>
                  <input type="text" className="form-input" value={dimForm.mobAssistitoCon ?? ''} onChange={e => setDim({ mobAssistitoCon: e.target.value })} placeholder="es. deambulatore, carrozzina…" />
                </div>
                <div className="form-row">
                  <label className="form-label">Contenzione</label>
                  <input type="text" className="form-input" value={dimForm.mobContenzione ?? ''} onChange={e => setDim({ mobContenzione: e.target.value })} placeholder="tipo di contenzione applicata" />
                </div>
              </div>
            </FormSection>

            {/* IGIENE */}
            <FormSection title="Igiene e vestizione">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
                <CbInput checked={dimForm.igieneAutonomo ?? false} label="Autonomo" onChange={v => setDim({ igieneAutonomo: v })} />
                <CbInput checked={dimForm.igieneDipendente ?? false} label="Dipendente" onChange={v => setDim({ igieneDipendente: v })} />
                <CbInput checked={dimForm.igieneParzialmenteDipendente ?? false} label="Parzialmente dipendente" onChange={v => setDim({ igieneParzialmenteDipendente: v })} />
              </div>
            </FormSection>

            {/* LESIONI DA PRESSIONE */}
            <FormSection title="Lesioni da pressione">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: 8 }}>
                <CbInput checked={dimForm.lesioniNo ?? true} label="Assenti" onChange={v => setDim({ lesioniNo: v, lesioniSi: !v })} />
                <CbInput checked={dimForm.lesioniSi ?? false} label="Presenti" onChange={v => setDim({ lesioniSi: v, lesioniNo: !v })} />
              </div>
              {dimForm.lesioniSi && (
                <div className="form-row-3col">
                  <div className="form-row">
                    <label className="form-label">Sede</label>
                    <input type="text" className="form-input" value={dimForm.lesioniSede ?? ''} onChange={e => setDim({ lesioniSede: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Grado</label>
                    <select className="form-input" value={dimForm.lesioniGrado ?? ''} onChange={e => setDim({ lesioniGrado: e.target.value })}>
                      <option value="">—</option>
                      <option>1°</option><option>2°</option><option>3°</option><option>4°</option><option>Escara</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label className="form-label">Tipo medicazione</label>
                    <input type="text" className="form-input" value={dimForm.lesioniTipoMedicazione ?? ''} onChange={e => setDim({ lesioniTipoMedicazione: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Frequenza</label>
                    <input type="text" className="form-input" value={dimForm.lesioniFrequenza ?? ''} onChange={e => setDim({ lesioniFrequenza: e.target.value })} />
                  </div>
                  <div className="form-row" style={{ gridColumn: '2/4' }}>
                    <label className="form-label">Note</label>
                    <input type="text" className="form-input" value={dimForm.lesioniNote ?? ''} onChange={e => setDim({ lesioniNote: e.target.value })} />
                  </div>
                </div>
              )}
            </FormSection>

            {/* DISTURBI DEL SONNO */}
            <FormSection title="Disturbi del sonno">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: 8 }}>
                <CbInput checked={dimForm.sonnoNo ?? true} label="Assenti" onChange={v => setDim({ sonnoNo: v, sonnoSi: !v })} />
                <CbInput checked={dimForm.sonnoSi ?? false} label="Presenti" onChange={v => setDim({ sonnoSi: v, sonnoNo: !v })} />
              </div>
              {dimForm.sonnoSi && (
                <div className="form-row">
                  <label className="form-label">Note</label>
                  <input type="text" className="form-input" value={dimForm.sonnoNote ?? ''} onChange={e => setDim({ sonnoNote: e.target.value })} />
                </div>
              )}
            </FormSection>

            {/* USO FARMACI */}
            <FormSection title="Uso di farmaci">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: 8 }}>
                <CbInput checked={dimForm.farmaciNo ?? true} label="No" onChange={v => setDim({ farmaciNo: v, farmaciSi: !v })} />
                <CbInput checked={dimForm.farmaciSi ?? false} label="Sì" onChange={v => setDim({ farmaciSi: v, farmaciNo: !v })} />
              </div>
              {dimForm.farmaciSi && (
                <div className="form-row">
                  <label className="form-label">Dettaglio farmaci</label>
                  <input type="text" className="form-input" value={dimForm.farmaciDettaglio ?? ''} onChange={e => setDim({ farmaciDettaglio: e.target.value })} />
                </div>
              )}
            </FormSection>

            {/* COMUNICAZIONE */}
            <FormSection title="Comunicazione / Orientamento">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: 8 }}>
                <CbInput checked={dimForm.commOrientato ?? false} label="Orientato" onChange={v => setDim({ commOrientato: v })} />
                <CbInput checked={dimForm.commParzialmenteOrientato ?? false} label="Parzialmente orientato" onChange={v => setDim({ commParzialmenteOrientato: v })} />
                <CbInput checked={dimForm.commDisorientato ?? false} label="Disorientato" onChange={v => setDim({ commDisorientato: v })} />
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Alterazioni sensoriali</label>
                  <input type="text" className="form-input" value={dimForm.commAlterazioniSensoriali ?? ''} onChange={e => setDim({ commAlterazioniSensoriali: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="form-label">Difficoltà di comunicazione</label>
                  <input type="text" className="form-input" value={dimForm.commDifficolta ?? ''} onChange={e => setDim({ commDifficolta: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginTop: 8 }}>
                <CbInput checked={dimForm.commComunicaSi ?? false} label="Comunica — Sì" onChange={v => setDim({ commComunicaSi: v, commComunicaNo: !v })} />
                <CbInput checked={dimForm.commComunicaNo ?? false} label="Comunica — No" onChange={v => setDim({ commComunicaNo: v, commComunicaSi: !v })} />
              </div>
            </FormSection>

            {/* SERVIZI TERRITORIALI */}
            <FormSection title="Servizi territoriali">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 6 }}>Segnalazione servizio sociale</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <CbInput checked={dimForm.servizioSocialeSi ?? false} label="Sì" onChange={v => setDim({ servizioSocialeSi: v, servizioSocialeNo: !v })} />
                    <CbInput checked={dimForm.servizioSocialeNo ?? true} label="No" onChange={v => setDim({ servizioSocialeNo: v, servizioSocialeSi: !v })} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 6 }}>Servizio infermieristico domiciliare</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <CbInput checked={dimForm.servizioDomiciliareSi ?? false} label="Sì" onChange={v => setDim({ servizioDomiciliareSi: v, servizioDomiciliareNo: !v })} />
                    <CbInput checked={dimForm.servizioDomiciliareNo ?? true} label="No" onChange={v => setDim({ servizioDomiciliareNo: v, servizioDomiciliareSi: !v })} />
                  </div>
                </div>
              </div>
            </FormSection>

            {/* NOTE GENERALI */}
            <div className="form-row">
              <label className="form-label">Istruzioni al paziente / familiare</label>
              <textarea className="form-input" rows={2} value={dimForm.istruzioni} onChange={e => setDim({ istruzioni: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Controlli programmati</label>
              <textarea className="form-input" rows={2} value={dimForm.controlliProgrammati} onChange={e => setDim({ controlliProgrammati: e.target.value })} />
            </div>
            <div className="form-row">
              <label className="form-label">Materiale consegnato</label>
              <textarea className="form-input" rows={2} value={dimForm.materialeConsegnato} onChange={e => setDim({ materialeConsegnato: e.target.value })} />
            </div>
            <div className="form-row-2col">
              <div className="form-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 22 }}>
                  <input type="checkbox" checked={dimForm.pianoCuraConsegnato} onChange={e => setDim({ pianoCuraConsegnato: e.target.checked })} />
                  <span className="form-label" style={{ margin: 0 }}>Piano di cura consegnato</span>
                </label>
              </div>
              <div className="form-row">
                <label className="form-label">Operatore infermieristico</label>
                <input type="text" className="form-input" value={dimForm.operatore} onChange={e => setDim({ operatore: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Note</label>
              <textarea className="form-input" rows={2} value={dimForm.note} onChange={e => setDim({ note: e.target.value })} />
            </div>

            <div className="cr-inline-form__actions">
              <button className="btn-secondary btn-sm" onClick={() => setEditingDim(false)}>Annulla</button>
              <button className="btn-primary btn-sm" onClick={saveDim}>Salva</button>
            </div>
          </div>
        ) : dim ? (
          <DimissioneDisplay dim={dim} />
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
              <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '13px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={libForm.soloUscitaParenti ?? false} onChange={e => setLib({ soloUscitaParenti: e.target.checked })} />
                  <span>Compilare solo in caso di uscita con parenti</span>
                </label>
              </div>
              <div className="form-row-3col">
                <div className="form-row">
                  <label className="form-label">Data uscita</label>
                  <input type="date" className="form-input" value={libForm.data} onChange={e => setLib({ data: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="form-label">Ora uscita</label>
                  <input type="time" className="form-input" value={libForm.ora} onChange={e => setLib({ ora: e.target.value })} />
                </div>
              </div>
              <div className="form-row-3col">
                <div className="form-row">
                  <label className="form-label">Referente / Familiare</label>
                  <input type="text" className="form-input" value={libForm.referenteNome ?? ''} onChange={e => setLib({ referenteNome: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="form-label">Data di nascita referente</label>
                  <input type="date" className="form-input" value={libForm.referenteDataNascita ?? ''} onChange={e => setLib({ referenteDataNascita: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="form-label">Rapporto con paziente</label>
                  <input type="text" className="form-input" value={libForm.referenteRapporto ?? ''} onChange={e => setLib({ referenteRapporto: e.target.value })} placeholder="es. figlio, coniuge…" />
                </div>
              </div>
              <div className="form-row" style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)', borderRadius: 8, padding: '12px 16px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={libForm.controParereMedico} onChange={e => setLib({ controParereMedico: e.target.checked })} style={{ marginTop: 2 }} />
                  <span className="form-label" style={{ margin: 0 }}>Uscita <strong>contro parere medico</strong></span>
                </label>
              </div>
              <div className="form-row">
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={libForm.consapevoleRischi} onChange={e => setLib({ consapevoleRischi: e.target.checked })} style={{ marginTop: 2 }} />
                  <span className="form-label" style={{ margin: 0 }}>Informato/a dei rischi</span>
                </label>
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Firma ospite / referente</label>
                  <input type="text" className="form-input" value={libForm.firmaPatient} onChange={e => setLib({ firmaPatient: e.target.value })} />
                </div>
                <div className="form-row">
                  <label className="form-label">Firma testimone</label>
                  <input type="text" className="form-input" value={libForm.firmaTestimone} onChange={e => setLib({ firmaTestimone: e.target.value })} />
                </div>
              </div>
              <div className="form-row-2col">
                <div className="form-row">
                  <label className="form-label">Operatore</label>
                  <input type="text" className="form-input" value={libForm.operatore} onChange={e => setLib({ operatore: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Note</label>
                <textarea className="form-input" rows={2} value={libForm.note} onChange={e => setLib({ note: e.target.value })} />
              </div>
              <div className="cr-inline-form__actions">
                <button className="btn-secondary btn-sm" onClick={() => setEditingLib(false)}>Annulla</button>
                <button className="btn-primary btn-sm" onClick={saveLib}>Salva liberatoria</button>
              </div>
            </div>
          ) : lib ? (
            <div className="cr-form-section">
              <div className="pic-row"><span className="pic-row__lbl">Data / Ora uscita</span><span className="pic-row__val">{lib.data.split('-').reverse().join('/')} {lib.ora}</span></div>
              {lib.referenteNome && <div className="pic-row"><span className="pic-row__lbl">Referente</span><span className="pic-row__val">{lib.referenteNome} ({lib.referenteRapporto})</span></div>}
              {lib.referenteDataNascita && <div className="pic-row"><span className="pic-row__lbl">Data nascita referente</span><span className="pic-row__val">{lib.referenteDataNascita.split('-').reverse().join('/')}</span></div>}
              <div className="pic-row"><span className="pic-row__lbl">Contro parere medico</span><span className="pic-row__val">{lib.controParereMedico ? 'Sì' : 'No'}</span></div>
              <div className="pic-row"><span className="pic-row__lbl">Consapevole dei rischi</span><span className="pic-row__val">{lib.consapevoleRischi ? 'Sì' : 'No'}</span></div>
              <div className="pic-row"><span className="pic-row__lbl">Firma paziente/tutore</span><span className="pic-row__val">{lib.firmaPatient}</span></div>
              <div className="pic-row"><span className="pic-row__lbl">Firma testimone</span><span className="pic-row__val">{lib.firmaTestimone}</span></div>
              <div className="pic-row"><span className="pic-row__lbl">Operatore</span><span className="pic-row__val">{lib.operatore}</span></div>
              {lib.note && <div className="pic-row"><span className="pic-row__lbl">Note</span><span className="pic-row__val">{lib.note}</span></div>}
            </div>
          ) : (
            <p className="cr-empty">Liberatoria non compilata.</p>
          )}

          {/* ── Log uscite temporanee ── */}
          <div style={{ marginTop: 20 }}>
            <div className="cr-section-header" style={{ marginBottom: 10 }}>
              <span className="cr-section-title" style={{ fontSize: 13 }}>Registro Uscite Temporanee</span>
              <button className="btn-secondary btn-sm" onClick={() => setShowAddUscita(v => !v)}>
                {showAddUscita ? 'Annulla' : '+ Aggiungi uscita'}
              </button>
            </div>

            {showAddUscita && (
              <div className="cr-inline-form" style={{ marginBottom: 12 }}>
                <div className="form-row-3col">
                  <div className="form-row">
                    <label className="form-label">Data uscita *</label>
                    <input type="date" className="form-input" value={uscitaForm.data ?? ''} onChange={e => setUscitaForm(p => ({...p, data: e.target.value}))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Ora uscita *</label>
                    <input type="time" className="form-input" value={uscitaForm.ora ?? ''} onChange={e => setUscitaForm(p => ({...p, ora: e.target.value}))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Ora rientro</label>
                    <input type="time" className="form-input" value={uscitaForm.oraRientro ?? ''} onChange={e => setUscitaForm(p => ({...p, oraRientro: e.target.value}))} />
                  </div>
                </div>
                <div className="form-row-2col">
                  <div className="form-row">
                    <label className="form-label">Accompagnato da</label>
                    <input type="text" className="form-input" value={uscitaForm.referenteNome ?? ''} onChange={e => setUscitaForm(p => ({...p, referenteNome: e.target.value}))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Firma referente</label>
                    <input type="text" className="form-input" value={uscitaForm.firma ?? ''} onChange={e => setUscitaForm(p => ({...p, firma: e.target.value}))} />
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">Note</label>
                  <input type="text" className="form-input" value={uscitaForm.note ?? ''} onChange={e => setUscitaForm(p => ({...p, note: e.target.value}))} />
                </div>
                <div className="cr-inline-form__actions">
                  <button className="btn-secondary btn-sm" onClick={() => { setShowAddUscita(false); setUscitaForm({}); }}>Annulla</button>
                  <button className="btn-primary btn-sm" onClick={addUscita}>Registra uscita</button>
                </div>
              </div>
            )}

            <ClinicalTable<UscitaLog>
              title="Registro Uscite Temporanee"
              noWrapper
              keyField="id"
              emptyMessage="Nessuna uscita registrata."
              data={cartella.liberatoria?.usciteLog ?? []}
              columns={[
                { key: 'data', label: 'Data', width: '110px', render: (_v, u) => u.data.split('-').reverse().join('/') },
                { key: 'ora', label: 'Ora uscita', width: '100px', render: (_v, u) => u.ora },
                { key: 'oraRientro', label: 'Rientro', width: '100px', render: (_v, u) => u.oraRientro ?? '—' },
                { key: 'referenteNome', label: 'Accompagnato da', render: (_v, u) => u.referenteNome ?? '—' },
                { key: 'firma', label: 'Firma', render: (_v, u) => u.firma ?? '—' },
                {
                  key: 'id', label: '', width: '40px', align: 'right',
                  render: (_v, u) => (
                    <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => deleteUscita(u.id)} title="Elimina">✕</button>
                  ),
                },
              ]}
            />
          </div>
        </div>
        </div>
        </ClinicalTableSection>
      </div>
    </div>
  );
}

// ── Display view for dimissione ───────────────────────────────────────────────
function DimissioneDisplay({ dim }: { dim: DimissioneInfermieristica }) {
  const sections: { label: string; items: string[] }[] = [];

  const respItems: string[] = [];
  if (dim.respAutonomo) respItems.push('Autonomo');
  if (dim.respO2Terapia) respItems.push(`O₂ terapia${dim.respO2LitriMin ? ' ' + dim.respO2LitriMin + ' lt/min' : ''}`);
  if (dim.respCannulaTracheale) respItems.push(`Cannula tracheale${dim.respUltimaSostituzione ? ' (sost. ' + dim.respUltimaSostituzione.split('-').reverse().join('/') + ')' : ''}`);
  if (respItems.length) sections.push({ label: 'Respirazione', items: respItems });

  const alimentItems: string[] = [];
  if (dim.alimentAutonomo) alimentItems.push('Autonomo');
  if (dim.alimentAssistito) alimentItems.push('Assistito');
  if (dim.alimentDieta) alimentItems.push('Dieta: ' + dim.alimentDieta);
  if (dim.alimentSNG) alimentItems.push('SNG: ' + dim.alimentSNG);
  if (dim.alimentPEG) alimentItems.push('PEG: ' + dim.alimentPEG);
  if (alimentItems.length) sections.push({ label: 'Alimentazione', items: alimentItems });

  const elimItems: string[] = [];
  if (dim.elimContinente) elimItems.push('Continente');
  if (dim.elimParzialmenteIncontinente) elimItems.push('Parzialmente incontinente');
  if (dim.elimIncontinenzaFeci) elimItems.push('Incont. feci');
  if (dim.elimIncontinenzaUrine) elimItems.push('Incont. urine');
  if (dim.elimStomia) elimItems.push('Stomia');
  if (dim.elimCatetereVescicale) elimItems.push('Catetere: ' + dim.elimCatetereVescicale);
  if (dim.elimDataUltimaEvacuazione) elimItems.push('Ultima evacuazione: ' + dim.elimDataUltimaEvacuazione.split('-').reverse().join('/'));
  if (elimItems.length) sections.push({ label: 'Eliminazione', items: elimItems });

  const mobItems: string[] = [];
  if (dim.mobAutonomo) mobItems.push('Autonomo');
  if (dim.mobAllettato) mobItems.push('Allettato');
  if (dim.mobAssistitoCon) mobItems.push('Assistito con: ' + dim.mobAssistitoCon);
  if (dim.mobRischioCaduta) mobItems.push('Rischio caduta');
  if (dim.mobContenzione) mobItems.push('Contenzione: ' + dim.mobContenzione);
  if (mobItems.length) sections.push({ label: 'Mobilizzazione', items: mobItems });

  const igieneItems: string[] = [];
  if (dim.igieneAutonomo) igieneItems.push('Autonomo');
  if (dim.igieneDipendente) igieneItems.push('Dipendente');
  if (dim.igieneParzialmenteDipendente) igieneItems.push('Parzialmente dipendente');
  if (igieneItems.length) sections.push({ label: 'Igiene / Vestizione', items: igieneItems });

  const lesioniItems: string[] = [];
  if (dim.lesioniNo) lesioniItems.push('Assenti');
  if (dim.lesioniSi) {
    lesioniItems.push('Presenti');
    if (dim.lesioniSede) lesioniItems.push('Sede: ' + dim.lesioniSede);
    if (dim.lesioniGrado) lesioniItems.push('Grado: ' + dim.lesioniGrado);
  }
  if (lesioniItems.length) sections.push({ label: 'Lesioni da pressione', items: lesioniItems });

  const commItems: string[] = [];
  if (dim.commOrientato) commItems.push('Orientato');
  if (dim.commParzialmenteOrientato) commItems.push('Parzialmente orientato');
  if (dim.commDisorientato) commItems.push('Disorientato');
  if (dim.commComunicaSi) commItems.push('Comunica: Sì');
  if (dim.commComunicaNo) commItems.push('Comunica: No');
  if (commItems.length) sections.push({ label: 'Comunicazione', items: commItems });

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        {sections.map(s => (
          <div key={s.label} style={{ borderBottom: '1px solid var(--border)', width: '50%', padding: '10px 14px', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {s.items.map(item => (
                <span key={item} style={{ background: 'var(--blue-bg)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 4, fontSize: '12px' }}>{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Data: {dim.data.split('-').reverse().join('/')}</span>
        {dim.operatore && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Operatore: {dim.operatore}</span>}
      </div>
    </div>
  );
}
