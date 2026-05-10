import { useState } from 'react';
import type { CartellaPaziente, Paziente, FarmacoItem } from '../../../types';
import { uid, todayStr, PrintButton, ClinicalTableSection } from './shared';
import { TerapieModuloView } from './TerapieModuloView';
import { API_URL } from '../../../config';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

type ViaSezione = 'orale' | 'im-sc' | 'insulinica' | 'bisogno';

function sezionePerVia(via?: string): ViaSezione {
  if (!via) return 'orale';
  const v = via.toLowerCase();
  if (v.includes('insul')) return 'insulinica';
  if (v.includes('bisogno') || v.includes('prn')) return 'bisogno';
  if (v.includes('im') || v.includes('intramusc') || v.includes('sc')) return 'im-sc';
  if (v.includes('oral') || v.includes('os') || v.includes('po')) return 'orale';
  return 'orale';
}

const TIME_COLS: { key: keyof FarmacoItem; label: string }[] = [
  { key: 'h08', label: '08' },
  { key: 'h12', label: '12' },
  { key: 'h16', label: '16' },
  { key: 'h18', label: '18' },
  { key: 'h20', label: '20' },
];

const STATO_BADGE: Record<string, string> = {
  attivo: 'badge--green',
  sospeso: 'badge--amber',
  completato: 'badge--gray',
};

const VIA_OPTIONS = ['orale', 'IM', 'SC', 'IV', 'insulina', 'al bisogno', 'sublinguale', 'topico', 'altro'];

type FarmForm = Partial<FarmacoItem> & {
  nome: string; dose: string; frequenza: string; inizio: string;
  stato: 'attivo' | 'sospeso' | 'completato'; prescrittoDA: string;
  fasceMattina: boolean; fascePranzo: boolean; fascePomeriggio: boolean;
  fasceSera: boolean; fasceNotte: boolean;
  tipo: 'periodica' | 'una_tantum';
};

function emptyForm(operatoreNome: string): FarmForm {
  return {
    nome: '', dose: '', frequenza: '', via: 'orale', inizio: todayStr(),
    fine: '', stato: 'attivo', prescrittoDA: operatoreNome,
    indicazione: '', note: '', h08: '', h12: '', h16: '', h18: '', h20: '',
    fasceMattina: true, fascePranzo: false, fascePomeriggio: false,
    fasceSera: false, fasceNotte: false, tipo: 'periodica',
  };
}

interface SezioneProps {
  title: string;
  farmaci: FarmacoItem[];
  storici: FarmacoItem[];
  onAdd: () => void;
  onEdit: (f: FarmacoItem) => void;
  onDelete: (id: string) => void;
}

function TerapiaSezione({ title, farmaci, storici, onAdd, onEdit, onDelete }: SezioneProps) {
  const [showStorico, setShowStorico] = useState(false);

  return (
    <div className="terapia-section">
      <div className="terapia-section__header">
        <span>{title}</span>
        <button
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4, color: 'white', padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}
          onClick={onAdd}
        >
          + Aggiungi
        </button>
      </div>
      <div className="terapia-section__body">
        {farmaci.length === 0 && storici.length === 0 && (
          <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>Nessun farmaco in questa sezione.</div>
        )}

        {/* Header row */}
        {farmaci.length > 0 && (
          <div className="terapia-row terapia-row--header">
            <div>STATO</div>
            <div>INIZIO</div>
            <div>FARMACO / DOSE</div>
            <div>VIA</div>
            <div>08</div>
            <div>12</div>
            <div>16</div>
            <div>18</div>
            <div>20</div>
            <div>MEDICO</div>
            <div>FINE</div>
            <div>NOTE</div>
            <div></div>
          </div>
        )}

        {farmaci.map(f => (
          <div key={f.id} className={`terapia-row terapia-row--${f.stato}`}>
            <div>
              <span className={`badge ${STATO_BADGE[f.stato]}`}>{f.stato}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.inizio}</div>
            <div>
              <div className="terapia-nome">{f.nome}</div>
              <div className="terapia-dose">{f.dose}{f.frequenza ? ` — ${f.frequenza}` : ''}</div>
              {f.indicazione && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.indicazione}</div>}
            </div>
            <div style={{ textAlign: 'center', fontSize: 11 }}>{f.via ?? ''}</div>
            {TIME_COLS.map(tc => (
              <div key={tc.key} className="terapia-orario">
                {(f[tc.key] as string | undefined) ?? ''}
              </div>
            ))}
            <div style={{ fontSize: 11, textAlign: 'center' }}>{f.prescrittoDA?.split(' ').map(p => p[0]).join('.') ?? ''}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.fine ?? ''}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.note ?? ''}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="icon-btn icon-btn--sm" title="Modifica" onClick={() => onEdit(f)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button className="icon-btn icon-btn--sm icon-btn--danger" title="Elimina" onClick={() => onDelete(f.id)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        ))}

        {/* Storico */}
        {storici.length > 0 && (
          <div className="terapia-storico">
            <button className="terapia-storico__toggle" onClick={() => setShowStorico(v => !v)}>
              {showStorico ? '▲' : '▼'} Storico ({storici.length} farmaco/i)
            </button>
            {showStorico && storici.map(f => (
              <div key={f.id} className={`terapia-row terapia-row--${f.stato}`} style={{ opacity: 0.7 }}>
                <div><span className={`badge ${STATO_BADGE[f.stato]}`}>{f.stato}</span></div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.inizio}</div>
                <div>
                  <div className="terapia-nome">{f.nome}</div>
                  <div className="terapia-dose">{f.dose}{f.frequenza ? ` — ${f.frequenza}` : ''}</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 11 }}>{f.via ?? ''}</div>
                {TIME_COLS.map(tc => (
                  <div key={tc.key} className="terapia-orario">{(f[tc.key] as string | undefined) ?? ''}</div>
                ))}
                <div style={{ fontSize: 11, textAlign: 'center' }}>{f.prescrittoDA?.split(' ').map(p => p[0]).join('.') ?? ''}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.fine ?? ''}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.note ?? ''}</div>
                <div>
                  <button className="icon-btn icon-btn--sm icon-btn--danger" title="Elimina" onClick={() => onDelete(f.id)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TerapiaMedicaTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const [modulo, setModulo] = useState(false);
  const [editInfoHeader, setEditInfoHeader] = useState(false);
  const [infoForm, setInfoForm] = useState({
    patologiaIngresso: cartella.patologiaIngresso ?? '',
    diabetico: cartella.diabetico ?? false,
    ipertensione: cartella.ipertensione ?? false,
    terapiaTriturata: cartella.terapiaTriturata ?? false,
  });

  const [addSezione, setAddSezione] = useState<ViaSezione | null>(null);
  const [editFarmId, setEditFarmId] = useState<string | null>(null);
  const [farmForm, setFarmForm] = useState<FarmForm>(emptyForm(operatoreNome));

  const farmaci = cartella.farmaci ?? [];

  function saveFarmaci(list: FarmacoItem[]) { onUpdate({ farmaci: list }); }

  function openAdd(sezione: ViaSezione) {
    const via = sezione === 'orale' ? 'orale'
      : sezione === 'im-sc' ? 'IM'
      : sezione === 'insulinica' ? 'insulina'
      : 'al bisogno';
    setFarmForm({ ...emptyForm(operatoreNome), via });
    setEditFarmId(null);
    setAddSezione(sezione);
  }

  function persistToApi(form: FarmForm) {
    const statoMap: Record<string, string> = { attivo: 'attiva', sospeso: 'sospesa', completato: 'conclusa' };
    fetch(`${API_URL}/patients/${paziente.id}/therapies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmacoNome: form.nome,
        dosaggio: form.dose || '',
        viaSomministrazione: form.via || 'orale',
        tipo: form.tipo || 'periodica',
        stato: statoMap[form.stato] || 'attiva',
        dataInizio: form.inizio || todayStr(),
        dataFine: form.fine || null,
        fasceMattina: form.fasceMattina,
        fascePranzo: form.fascePranzo,
        fascePomeriggio: form.fascePomeriggio,
        fasceSera: form.fasceSera,
        fasceNotte: form.fasceNotte,
        prescrittore: form.prescrittoDA || null,
        operatoreInseritore: operatoreNome,
        note: form.note || null,
        ...(form.tipo === 'una_tantum' && {
          dataSomministrazione: form.inizio || todayStr(),
          orarioSomministrazione: form.h08 ? '08:00' : form.h12 ? '12:00' : form.h16 ? '16:00' : form.h18 ? '18:00' : form.h20 ? '20:00' : '08:00',
        }),
      }),
    }).catch(() => { /* cartella save is primary, API is secondary persistence */ });
  }

  function saveAdd() {
    if (!farmForm.nome?.trim()) return;
    // Auto-fill hXX from fascia checkboxes if hXX fields are empty
    const h08 = farmForm.h08 || (farmForm.fasceMattina ? '✓' : undefined);
    const h12 = farmForm.h12 || (farmForm.fascePranzo ? '✓' : undefined);
    const h16 = farmForm.h16 || (farmForm.fascePomeriggio ? '✓' : undefined);
    const h18 = farmForm.h18 || (farmForm.fasceSera ? '✓' : undefined);
    const h20 = farmForm.h20 || (farmForm.fasceSera ? '✓' : farmForm.fasceNotte ? '✓' : undefined);
    const f: FarmacoItem = {
      id: uid(),
      nome: farmForm.nome,
      dose: farmForm.dose ?? '',
      frequenza: farmForm.frequenza ?? '',
      via: farmForm.via,
      inizio: farmForm.inizio ?? todayStr(),
      fine: farmForm.fine || undefined,
      stato: farmForm.stato ?? 'attivo',
      prescrittoDA: farmForm.prescrittoDA ?? operatoreNome,
      indicazione: farmForm.indicazione || undefined,
      note: farmForm.note || undefined,
      h08, h12, h16, h18, h20,
    };
    saveFarmaci([f, ...farmaci]);
    persistToApi(farmForm);
    setAddSezione(null);
    setFarmForm(emptyForm(operatoreNome));
  }

  function openEdit(f: FarmacoItem) {
    setEditFarmId(f.id);
    setAddSezione(null);
    const hasVal = (v?: string) => !!v && v !== '' && v !== '-';
    setFarmForm({
      nome: f.nome, dose: f.dose, frequenza: f.frequenza, via: f.via, inizio: f.inizio,
      fine: f.fine ?? '', stato: f.stato, prescrittoDA: f.prescrittoDA,
      indicazione: f.indicazione ?? '', note: f.note ?? '',
      h08: f.h08 ?? '', h12: f.h12 ?? '', h16: f.h16 ?? '', h18: f.h18 ?? '', h20: f.h20 ?? '',
      fasceMattina: hasVal(f.h08),
      fascePranzo: hasVal(f.h12),
      fascePomeriggio: hasVal(f.h16),
      fasceSera: hasVal(f.h18) || hasVal(f.h20),
      fasceNotte: false,
      tipo: 'periodica',
    });
  }

  function saveEdit() {
    if (!editFarmId) return;
    const h08 = farmForm.h08 || (farmForm.fasceMattina ? '✓' : undefined);
    const h12 = farmForm.h12 || (farmForm.fascePranzo ? '✓' : undefined);
    const h16 = farmForm.h16 || (farmForm.fascePomeriggio ? '✓' : undefined);
    const h18 = farmForm.h18 || (farmForm.fasceSera ? '✓' : undefined);
    const h20 = farmForm.h20 || (farmForm.fasceSera ? '✓' : farmForm.fasceNotte ? '✓' : undefined);
    saveFarmaci(farmaci.map(f => f.id === editFarmId ? {
      ...f,
      nome: farmForm.nome,
      dose: farmForm.dose ?? f.dose,
      frequenza: farmForm.frequenza ?? f.frequenza,
      via: farmForm.via ?? f.via,
      inizio: farmForm.inizio ?? f.inizio,
      fine: farmForm.fine || undefined,
      stato: farmForm.stato ?? f.stato,
      prescrittoDA: farmForm.prescrittoDA ?? f.prescrittoDA,
      indicazione: farmForm.indicazione || undefined,
      note: farmForm.note || undefined,
      h08, h12, h16, h18, h20,
    } : f));
    persistToApi(farmForm);
    setEditFarmId(null);
    setFarmForm(emptyForm(operatoreNome));
  }

  function deleteFarmaco(id: string) {
    saveFarmaci(farmaci.filter(f => f.id !== id));
  }

  function saveInfoHeader() {
    onUpdate({
      patologiaIngresso: infoForm.patologiaIngresso || undefined,
      diabetico: infoForm.diabetico,
      ipertensione: infoForm.ipertensione,
      terapiaTriturata: infoForm.terapiaTriturata,
    });
    setEditInfoHeader(false);
  }

  // Group farmaci by sezione
  const SEZIONI: { id: ViaSezione; title: string }[] = [
    { id: 'orale', title: 'TERAPIA ORALE' },
    { id: 'im-sc', title: 'TERAPIA IM \u2013 SC' },
    { id: 'insulinica', title: 'TERAPIA INSULINICA' },
    { id: 'bisogno', title: 'TERAPIA AL BISOGNO' },
  ];

  const allergie = (cartella.allergie ?? []).map(a => a.allergene).join(', ');

  return (
    <div className={`cr-tab-content${modulo ? ' mode-modulo' : ''}`}>

      {/* ── Modulo view ── */}
      <div className="modulo-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }} className="no-print">
          <button className="btn-secondary btn-sm" onClick={() => setModulo(false)}>← Vista operativa</button>
          <PrintButton label="Stampa modulo" />
        </div>
        <TerapieModuloView cartella={cartella} paziente={paziente} />
      </div>

      {/* ── Web view ── */}
      <div className="web-content">
        <ClinicalTableSection
          title="Terapia Medica & Farmaci"
          count={farmaci.filter(f => f.stato === 'attivo').length}
          countLabel="farmaci attivi"
          actions={<>
            <button className="btn-sm" onClick={() => setModulo(true)}>Vista modulo</button>
          </>}
        >

        {/* ── Patient info header ── */}
        <div className="terapia-info-header">
          <div className="terapia-info-header__row">
            <div className="terapia-info-header__field">
              <span className="terapia-info-header__label">Camera / Letto</span>
              <span className="terapia-info-header__value">
                {cartella.cameraNumero ?? '—'}{cartella.lettoNumero ? ` / L.${cartella.lettoNumero}` : ''}
              </span>
            </div>
            <div className="terapia-info-header__field" style={{ flex: 2 }}>
              <span className="terapia-info-header__label">Patologia d&apos;ingresso</span>
              {editInfoHeader
                ? <input className="form-input" style={{ maxWidth: 400 }} value={infoForm.patologiaIngresso}
                    onChange={e => setInfoForm(p => ({ ...p, patologiaIngresso: e.target.value }))} />
                : <span className="terapia-info-header__value">{cartella.patologiaIngresso || '—'}</span>
              }
            </div>
            <div className="terapia-info-header__field" style={{ flex: 2 }}>
              <span className="terapia-info-header__label">Allergie</span>
              <span className="terapia-info-header__value" style={{ color: allergie ? 'var(--red, #DC2626)' : undefined }}>
                {allergie || 'Nessuna'}
              </span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {editInfoHeader
                ? <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary btn-sm" onClick={() => setEditInfoHeader(false)}>Annulla</button>
                    <button className="btn-primary btn-sm" onClick={saveInfoHeader}>Salva</button>
                  </div>
                : <button className="btn-secondary btn-sm" onClick={() => {
                    setInfoForm({
                      patologiaIngresso: cartella.patologiaIngresso ?? '',
                      diabetico: cartella.diabetico ?? false,
                      ipertensione: cartella.ipertensione ?? false,
                      terapiaTriturata: cartella.terapiaTriturata ?? false,
                    });
                    setEditInfoHeader(true);
                  }}>Modifica</button>
              }
            </div>
          </div>

          <div className="terapia-flags" style={{ marginTop: 10 }}>
            {editInfoHeader ? (
              <>
                <label className="terapia-flag">
                  <input type="checkbox" checked={infoForm.diabetico}
                    onChange={e => setInfoForm(p => ({ ...p, diabetico: e.target.checked }))} />
                  DIABETICO
                </label>
                <label className="terapia-flag">
                  <input type="checkbox" checked={infoForm.ipertensione}
                    onChange={e => setInfoForm(p => ({ ...p, ipertensione: e.target.checked }))} />
                  IPERTENSIONE
                </label>
                <label className="terapia-flag">
                  <input type="checkbox" checked={infoForm.terapiaTriturata}
                    onChange={e => setInfoForm(p => ({ ...p, terapiaTriturata: e.target.checked }))} />
                  TERAPIA TRITURATA
                </label>
              </>
            ) : (
              <>
                <span className={`badge ${cartella.diabetico ? 'badge--amber' : 'badge--gray'}`}>DIABETICO: {cartella.diabetico ? 'SI' : 'NO'}</span>
                <span className={`badge ${cartella.ipertensione ? 'badge--amber' : 'badge--gray'}`}>IPERTENSIONE: {cartella.ipertensione ? 'SI' : 'NO'}</span>
                <span className={`badge ${cartella.terapiaTriturata ? 'badge--blue' : 'badge--gray'}`}>TERAPIA TRITURATA: {cartella.terapiaTriturata ? 'SI' : 'NO'}</span>
              </>
            )}
          </div>
        </div>

        {/* ── Edit/Add form ── */}
        {(addSezione !== null || editFarmId !== null) && (
          <div className="cr-inline-form" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>
              {editFarmId ? 'Modifica farmaco' : `Aggiungi farmaco — ${addSezione ? SEZIONI.find(s => s.id === addSezione)?.title : ''}`}
            </div>
            <div className="op-form-grid">
              <div className="form-field">
                <label className="form-label">Nome *</label>
                <input className="form-input" value={farmForm.nome}
                  onChange={e => setFarmForm(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Dose</label>
                <input className="form-input" value={farmForm.dose ?? ''} placeholder="50 mg"
                  onChange={e => setFarmForm(p => ({ ...p, dose: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Via</label>
                <select className="form-select" value={farmForm.via ?? 'orale'}
                  onChange={e => setFarmForm(p => ({ ...p, via: e.target.value }))}>
                  {VIA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Frequenza</label>
                <input className="form-input" value={farmForm.frequenza ?? ''} placeholder="1x/die"
                  onChange={e => setFarmForm(p => ({ ...p, frequenza: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Stato</label>
                <select className="form-select" value={farmForm.stato ?? 'attivo'}
                  onChange={e => setFarmForm(p => ({ ...p, stato: e.target.value as FarmacoItem['stato'] }))}>
                  <option value="attivo">Attivo</option>
                  <option value="sospeso">Sospeso</option>
                  <option value="completato">Completato</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={farmForm.tipo ?? 'periodica'}
                  onChange={e => setFarmForm(p => ({ ...p, tipo: e.target.value as 'periodica' | 'una_tantum' }))}>
                  <option value="periodica">Periodica</option>
                  <option value="una_tantum">Una tantum</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Data inizio</label>
                <input className="form-input" type="date" value={farmForm.inizio ?? todayStr()}
                  onChange={e => setFarmForm(p => ({ ...p, inizio: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Data fine</label>
                <input className="form-input" type="date" value={farmForm.fine ?? ''}
                  onChange={e => setFarmForm(p => ({ ...p, fine: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Prescritto da</label>
                <input className="form-input" value={farmForm.prescrittoDA ?? ''}
                  onChange={e => setFarmForm(p => ({ ...p, prescrittoDA: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Fasce orarie (per Agenda)</label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {([
                  ['fasceMattina', 'Mattina (08:00)'],
                  ['fascePranzo', 'Pranzo (12:00)'],
                  ['fascePomeriggio', 'Pomeriggio (16:00)'],
                  ['fasceSera', 'Sera (20:00)'],
                  ['fasceNotte', 'Notte (22:00)'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="terapia-flag" style={{ fontSize: 12 }}>
                    <input type="checkbox"
                      checked={farmForm[key as keyof FarmForm] as boolean}
                      onChange={e => setFarmForm(p => ({ ...p, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {TIME_COLS.map(tc => (
                <div key={tc.key} className="form-field" style={{ minWidth: 80 }}>
                  <label className="form-label">Ore {tc.label}</label>
                  <input className="form-input" value={(farmForm[tc.key] as string | undefined) ?? ''}
                    onChange={e => setFarmForm(p => ({ ...p, [tc.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="op-form-grid" style={{ marginTop: 8 }}>
              <div className="form-field">
                <label className="form-label">Indicazione</label>
                <input className="form-input" value={farmForm.indicazione ?? ''}
                  onChange={e => setFarmForm(p => ({ ...p, indicazione: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Note</label>
                <input className="form-input" value={farmForm.note ?? ''}
                  onChange={e => setFarmForm(p => ({ ...p, note: e.target.value }))} />
              </div>
            </div>
            <div className="cr-inline-form__actions">
              <button className="btn-secondary btn-sm" onClick={() => { setAddSezione(null); setEditFarmId(null); }}>Annulla</button>
              <button className="btn-primary btn-sm" onClick={editFarmId ? saveEdit : saveAdd}>Salva</button>
            </div>
          </div>
        )}

        {/* ── Four sezioni ── */}
        {SEZIONI.map(s => {
          const attivi = farmaci.filter(f => sezionePerVia(f.via) === s.id && f.stato === 'attivo');
          const storici = farmaci.filter(f => sezionePerVia(f.via) === s.id && f.stato !== 'attivo');
          return (
            <TerapiaSezione
              key={s.id}
              title={s.title}
              farmaci={attivi}
              storici={storici}
              onAdd={() => openAdd(s.id)}
              onEdit={openEdit}
              onDelete={deleteFarmaco}
            />
          );
        })}
        </ClinicalTableSection>
      </div>
    </div>
  );
}
