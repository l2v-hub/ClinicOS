import { useState } from 'react';
import { IcoCheck } from '../../../icons';
import type {
  CartellaPaziente,
  Contenzione,
  TipoContenzione,
  FrequenzaContenzione,
  Paziente,
} from '../../../types';
import {
  uid,
  todayStr,
  nowISO,
  nowTime,
  fmtDate,
  PrintButton,
  ClinicalTableSection,
} from './shared';

interface Props {
  cartella: CartellaPaziente;
  paziente: Paziente;
  onUpdate: (updates: Partial<CartellaPaziente>) => void;
  operatoreNome: string;
}

const TIPO_LABEL: Record<TipoContenzione, string> = {
  cintura: 'Cintura addominale',
  polsino: 'Polsino al polso',
  guanto: 'Guanto protettivo',
  spondina: 'Spondina del letto',
  altro: 'Altro',
};

const FREQ_OPTIONS: FrequenzaContenzione[] = ['sempre', 'notturna', 'diurna', 'altro'];
const FREQ_LABEL: Record<FrequenzaContenzione, string> = {
  sempre: 'Sempre',
  notturna: 'Notturna',
  diurna: 'Diurna',
  altro: 'Altro',
};

const EMPTY_FORM = {
  dataInizio: todayStr(),
  oraInizio: nowTime(),
  tipo: 'spondina' as TipoContenzione,
  motivoClinico: '',
  autorizzazioneMedico: false,
  autorizzazioneTutore: false,
  dataFine: '',
  oraFine: '',
  note: '',
  // Extended
  camera: '',
  letto: '',
  firmaMedicoInizio: '',
  firmaMedicoFine: '',
  spondineAttive: false,
  spondineFrequenza: 'sempre' as FrequenzaContenzione,
  spondineAltro: '',
  cinturaCarrozzina: false,
  cinturaCarrozzinaFreq: 'sempre' as FrequenzaContenzione,
  cinturaPoltrona: false,
  cinturaPoltronaFreq: 'sempre' as FrequenzaContenzione,
  cinturaSedia: false,
  cinturaSediaFreq: 'sempre' as FrequenzaContenzione,
  cinturaLetto: false,
  cinturaLettoFreq: 'sempre' as FrequenzaContenzione,
  carrozzinaConTavolino: false,
  altriPresidi: '',
  motivAgitazione: false,
  motivConfusionale: false,
  motivCadute: false,
  motivAutoEtero: false,
  motivInconsapevolezza: false,
  motivAltro: '',
  firmaPazienteReferente: '',
  firmaParente: '',
};

// ── Modulo paper view (fedele al template 05 contenzioni) ─────────────────

function ContenzioneModulo({ c, paziente }: { c: Contenzione | null; paziente: Paziente }) {
  const Cb = ({ checked, label }: { checked: boolean; label: string }) => (
    <span className="fm-cb">
      <span className={`fm-cb__box${checked ? ' fm-cb__box--checked' : ''}`}></span>
      {label}
    </span>
  );

  const motivazioni = [
    {
      key: 'agitazione',
      label: 'Agitazione psicomotoria',
      checked: c?.motivAgitazione ?? c?.motivoClinico?.toLowerCase().includes('agitaz') ?? false,
    },
    {
      key: 'confusionale',
      label: 'Stato confusionale',
      checked: c?.motivConfusionale ?? c?.motivoClinico?.toLowerCase().includes('confus') ?? false,
    },
    {
      key: 'cadute',
      label: 'Cadute ricorrenti / Instabilità posturale',
      checked: c?.motivCadute ?? c?.motivoClinico?.toLowerCase().includes('cadut') ?? false,
    },
    {
      key: 'etero',
      label: 'Auto/eterolesionismo',
      checked: c?.motivAutoEtero ?? c?.motivoClinico?.toLowerCase().includes('lesion') ?? false,
    },
    {
      key: 'inconsapev',
      label: 'Inconsapevolezza dei propri limiti',
      checked: c?.motivInconsapevolezza ?? false,
    },
    {
      key: 'altro',
      label: c?.motivAltro ? `Altro: ${c.motivAltro}` : 'Altro',
      checked: !!c?.motivAltro,
    },
  ];

  return (
    <div className="fm contenzione-modulo">
      <div className="fm-title">Consenso informato contenzione/protezione</div>

      <div className="fm-patient-header cols-4">
        <div className="fm-patient-field" style={{ gridColumn: '1 / 3' }}>
          <span className="fm-patient-field__lbl">Nome e Cognome</span>
          <span className="fm-patient-field__val">
            {paziente.lastName} {paziente.firstName}
          </span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Camera</span>
          <span className="fm-patient-field__val">{c?.camera ?? ''}</span>
        </div>
        <div className="fm-patient-field">
          <span className="fm-patient-field__lbl">Letto</span>
          <span className="fm-patient-field__val">{c?.letto ?? ''}</span>
        </div>
      </div>

      <div className="fm-inline" style={{ marginBottom: 6 }}>
        <div className="fm-inline__item">
          <span className="fm-inline__lbl">Data inizio contenzione/protezione:</span>
          <span className="fm-inline__val">
            {c ? `${c.dataInizio.split('-').reverse().join('/')} ${c.oraInizio}` : ''}
          </span>
        </div>
        <div className="fm-inline__item">
          <span className="fm-inline__lbl">firma medico</span>
          <span className="fm-inline__val fm-inline__val--wide">{c?.firmaMedicoInizio ?? ''}</span>
        </div>
      </div>
      <div className="fm-inline" style={{ marginBottom: 10 }}>
        <div className="fm-inline__item">
          <span className="fm-inline__lbl">Data fine contenzione/protezione:</span>
          <span className="fm-inline__val">
            {c?.dataFine ? `${c.dataFine.split('-').reverse().join('/')} ${c.oraFine}` : ''}
          </span>
        </div>
        <div className="fm-inline__item">
          <span className="fm-inline__lbl">firma medico</span>
          <span className="fm-inline__val fm-inline__val--wide">{c?.firmaMedicoFine ?? ''}</span>
        </div>
      </div>

      {/* Protezione — Sponde */}
      <div
        className="fm-cb-section"
        style={{ border: '1px solid #999', padding: '6px 10px', marginBottom: 8 }}
      >
        <div
          className="fm-cb-section__title"
          style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: 6, fontSize: '9pt' }}
        >
          Mezzo di protezione prescritto
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '9pt', minWidth: 120 }}>Sponde al letto</span>
          {FREQ_OPTIONS.map((f) => (
            <Cb
              key={f}
              checked={
                (c?.spondineAttive ?? c?.tipo === 'spondina') &&
                (c?.spondineFrequenza ?? 'sempre') === f
              }
              label={FREQ_LABEL[f]}
            />
          ))}
        </div>
      </div>

      {/* Contenzione — tipologie */}
      <div
        className="fm-cb-section"
        style={{ border: '1px solid #999', padding: '6px 10px', marginBottom: 8 }}
      >
        <div
          className="fm-cb-section__title"
          style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: 6, fontSize: '9pt' }}
        >
          Mezzo di contenzione prescritto
        </div>
        {(
          [
            {
              label: 'Cintura carrozzina',
              active: c?.cinturaCarrozzina ?? false,
              freq: c?.cinturaCarrozzinaFreq ?? ('sempre' as FrequenzaContenzione),
            },
            {
              label: 'Cintura poltrona',
              active: c?.cinturaPoltrona ?? false,
              freq: c?.cinturaPoltronaFreq ?? ('sempre' as FrequenzaContenzione),
            },
            {
              label: 'Cintura sedia',
              active: c?.cinturaSedia ?? false,
              freq: c?.cinturaSediaFreq ?? ('sempre' as FrequenzaContenzione),
            },
            {
              label: 'Cintura letto',
              active: c?.cinturaLetto ?? false,
              freq: c?.cinturaLettoFreq ?? ('sempre' as FrequenzaContenzione),
            },
            {
              label: 'Carrozzina con tavolino',
              active: c?.carrozzinaConTavolino ?? false,
              freq: 'sempre' as FrequenzaContenzione,
            },
          ] as { label: string; active: boolean; freq: FrequenzaContenzione }[]
        ).map(({ label, active, freq }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              marginBottom: 4,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '9pt', minWidth: 160 }}>{label}</span>
            {FREQ_OPTIONS.map((f) => (
              <Cb key={f} checked={active && freq === f} label={FREQ_LABEL[f]} />
            ))}
          </div>
        ))}
        <div className="fm-inline" style={{ marginTop: 6 }}>
          <span style={{ fontSize: '9pt', fontWeight: 600, minWidth: 100 }}>Altri presidi</span>
          <span
            style={{
              marginLeft: 8,
              fontSize: '9pt',
              borderBottom: '1px dotted #999',
              flex: 1,
              minWidth: 200,
              minHeight: 16,
              display: 'inline-block',
            }}
          >
            {c?.altriPresidi ?? ''}
          </span>
        </div>
      </div>

      {/* Note */}
      <div className="fm-row">
        <span className="fm-row__lbl">Note</span>
        <span className="fm-row__val">{c?.note ?? ''}</span>
      </div>

      {/* Motivazioni */}
      <div style={{ margin: '10px 0', border: '1px solid #999', padding: '8px 10px' }}>
        <div
          style={{ fontWeight: 700, fontSize: '9pt', textDecoration: 'underline', marginBottom: 8 }}
        >
          Motivazioni:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
          {motivazioni.map((m) => (
            <Cb key={m.key} checked={m.checked} label={m.label} />
          ))}
        </div>
      </div>

      {/* Motivo clinico */}
      {c?.motivoClinico && (
        <div className="fm-notes">
          <span className="fm-notes__lbl">Descrizione clinica</span>
          {c.motivoClinico}
        </div>
      )}

      {/* Declaration */}
      <div
        className="declaration-text"
        style={{
          fontSize: '8.5pt',
          lineHeight: 1.7,
          border: '1px solid #ccc',
          padding: 10,
          marginTop: 12,
          background: '#fafafa',
        }}
      >
        Il sottoscritto{' '}
        <span className="fm-fill-line" style={{ minWidth: 180, display: 'inline-block' }}></span>{' '}
        dichiara di essere stato informato e di aver compreso e condiviso le necessità e le
        conseguenze di tale pratica e presta il consenso
        <span className="fm-cb" style={{ margin: '0 8px' }}>
          <span className="fm-cb__box"></span> Paziente
        </span>
        <span className="fm-cb">
          <span className="fm-cb__box"></span> Tutore legale/amministratore di sostegno con poteri
          specifici
        </span>
      </div>

      <div className="fm-signature-row" style={{ marginTop: 16 }}>
        <div className="fm-signature">
          <span className="fm-signature__lbl">Firma paziente / referente</span>
          <div className="fm-signature__line">{c?.firmaPazienteReferente ?? ''}</div>
        </div>
        <div className="fm-signature">
          <span className="fm-signature__lbl">Eventuale firma parente (presa visione)</span>
          <div className="fm-signature__line">{c?.firmaParente ?? ''}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: '8.5pt',
          fontStyle: 'italic',
          borderTop: '1px solid #ccc',
          paddingTop: 10,
        }}
      >
        Io sottoscritto medico proponente dichiaro di aver informato il paziente e il parente sulla
        necessità e sulle conseguenze di tale pratica.
      </div>
      <div className="fm-signature-row">
        <div className="fm-signature">
          <span className="fm-signature__lbl">Firma medico responsabile</span>
          <div className="fm-signature__line"></div>
        </div>
        <div className="fm-signature">
          <span className="fm-signature__lbl">Data</span>
          <div className="fm-signature__line"></div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function ContenzioniTab({ cartella, paziente, onUpdate, operatoreNome }: Props) {
  const list = cartella.contenzioni ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [modulo, setModulo] = useState(false);
  const [moduloTarget, setModuloTarget] = useState<string | null>(null);

  function set(f: Partial<typeof form>) {
    setForm((p) => ({ ...p, ...f }));
  }

  function handleSave() {
    if (!form.motivoClinico) return;
    const c: Contenzione = {
      id: editId ?? uid(),
      dataInizio: form.dataInizio,
      oraInizio: form.oraInizio,
      tipo: form.tipo,
      motivoClinico: form.motivoClinico,
      autorizzazioneMedico: form.autorizzazioneMedico,
      autorizzazioneTutore: form.autorizzazioneTutore,
      dataFine: form.dataFine,
      oraFine: form.oraFine,
      attiva: !form.dataFine,
      operatore: operatoreNome,
      note: form.note,
      createdAt: nowISO(),
      camera: form.camera,
      letto: form.letto,
      firmaMedicoInizio: form.firmaMedicoInizio,
      firmaMedicoFine: form.firmaMedicoFine,
      spondineAttive: form.spondineAttive,
      spondineFrequenza: form.spondineFrequenza,
      spondineAltro: form.spondineAltro,
      cinturaCarrozzina: form.cinturaCarrozzina,
      cinturaCarrozzinaFreq: form.cinturaCarrozzinaFreq,
      cinturaPoltrona: form.cinturaPoltrona,
      cinturaPoltronaFreq: form.cinturaPoltronaFreq,
      cinturaSedia: form.cinturaSedia,
      cinturaSediaFreq: form.cinturaSediaFreq,
      cinturaLetto: form.cinturaLetto,
      cinturaLettoFreq: form.cinturaLettoFreq,
      carrozzinaConTavolino: form.carrozzinaConTavolino,
      altriPresidi: form.altriPresidi,
      motivAgitazione: form.motivAgitazione,
      motivConfusionale: form.motivConfusionale,
      motivCadute: form.motivCadute,
      motivAutoEtero: form.motivAutoEtero,
      motivInconsapevolezza: form.motivInconsapevolezza,
      motivAltro: form.motivAltro,
      firmaPazienteReferente: form.firmaPazienteReferente,
      firmaParente: form.firmaParente,
    };
    onUpdate({ contenzioni: editId ? list.map((x) => (x.id === editId ? c : x)) : [c, ...list] });
    setShowAdd(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
  }

  function startEdit(c: Contenzione) {
    setForm({
      dataInizio: c.dataInizio,
      oraInizio: c.oraInizio,
      tipo: c.tipo,
      motivoClinico: c.motivoClinico,
      autorizzazioneMedico: c.autorizzazioneMedico,
      autorizzazioneTutore: c.autorizzazioneTutore,
      dataFine: c.dataFine,
      oraFine: c.oraFine,
      note: c.note,
      camera: c.camera ?? '',
      letto: c.letto ?? '',
      firmaMedicoInizio: c.firmaMedicoInizio ?? '',
      firmaMedicoFine: c.firmaMedicoFine ?? '',
      spondineAttive: c.spondineAttive ?? false,
      spondineFrequenza: c.spondineFrequenza ?? 'sempre',
      spondineAltro: c.spondineAltro ?? '',
      cinturaCarrozzina: c.cinturaCarrozzina ?? false,
      cinturaCarrozzinaFreq: c.cinturaCarrozzinaFreq ?? 'sempre',
      cinturaPoltrona: c.cinturaPoltrona ?? false,
      cinturaPoltronaFreq: c.cinturaPoltronaFreq ?? 'sempre',
      cinturaSedia: c.cinturaSedia ?? false,
      cinturaSediaFreq: c.cinturaSediaFreq ?? 'sempre',
      cinturaLetto: c.cinturaLetto ?? false,
      cinturaLettoFreq: c.cinturaLettoFreq ?? 'sempre',
      carrozzinaConTavolino: c.carrozzinaConTavolino ?? false,
      altriPresidi: c.altriPresidi ?? '',
      motivAgitazione: c.motivAgitazione ?? false,
      motivConfusionale: c.motivConfusionale ?? false,
      motivCadute: c.motivCadute ?? false,
      motivAutoEtero: c.motivAutoEtero ?? false,
      motivInconsapevolezza: c.motivInconsapevolezza ?? false,
      motivAltro: c.motivAltro ?? '',
      firmaPazienteReferente: c.firmaPazienteReferente ?? '',
      firmaParente: c.firmaParente ?? '',
    });
    setEditId(c.id);
    setShowAdd(true);
  }

  function terminaContenzione(id: string) {
    onUpdate({
      contenzioni: list.map((c) =>
        c.id === id ? { ...c, dataFine: todayStr(), oraFine: nowTime(), attiva: false } : c,
      ),
    });
  }

  const moduloData = moduloTarget
    ? (list.find((c) => c.id === moduloTarget) ?? null)
    : (list[0] ?? null);
  const attive = list.filter((c) => c.attiva);
  const storiche = list.filter((c) => !c.attiva);

  return (
    <div className={`cr-tab-content${modulo ? ' mode-modulo' : ''}`}>
      {/* ── Modulo view ── */}
      <div className="modulo-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }} className="no-print">
          <button className="btn-secondary btn-sm" onClick={() => setModulo(false)}>
            ← Vista operativa
          </button>
          <PrintButton label="Stampa modulo" />
        </div>
        <ContenzioneModulo c={moduloData} paziente={paziente} />
      </div>

      {/* ── Web view ── */}
      <div className="web-content">
        <ClinicalTableSection
          title="Contenzioni / Protezioni"
          count={list.length}
          countLabel="contenzioni"
          actions={
            <>
              <button
                className="btn-sm"
                onClick={() => {
                  setModuloTarget(null);
                  setModulo(true);
                }}
              >
                Vista modulo
              </button>
              <button
                className="btn-sm"
                onClick={() => {
                  setEditId(null);
                  setForm({ ...EMPTY_FORM });
                  setShowAdd(true);
                }}
              >
                + Aggiungi
              </button>
            </>
          }
        >
          <div className="cts__body--padded">
            {showAdd && (
              <div className="cr-inline-form">
                <div className="cr-form-section__title">
                  {editId ? 'Modifica' : 'Nuova contenzione / protezione'}
                </div>

                {/* Date + camera/letto */}
                <div className="form-row-3col">
                  <div className="form-row">
                    <label className="form-label">Data inizio</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.dataInizio}
                      onChange={(e) => set({ dataInizio: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Ora inizio</label>
                    <input
                      type="time"
                      className="form-input"
                      value={form.oraInizio}
                      onChange={(e) => set({ oraInizio: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Firma medico inizio</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.firmaMedicoInizio}
                      onChange={(e) => set({ firmaMedicoInizio: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row-3col">
                  <div className="form-row">
                    <label className="form-label">Camera</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.camera}
                      onChange={(e) => set({ camera: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Letto</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.letto}
                      onChange={(e) => set({ letto: e.target.value })}
                    />
                  </div>
                </div>

                {/* Sponde al letto */}
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: 8 }}>
                    Sponde al letto
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={form.spondineAttive}
                        onChange={(e) => set({ spondineAttive: e.target.checked })}
                      />
                      <span style={{ fontSize: '13px' }}>Attive</span>
                    </label>
                    {form.spondineAttive && (
                      <select
                        className="form-input"
                        style={{ width: 'auto' }}
                        value={form.spondineFrequenza}
                        onChange={(e) =>
                          set({ spondineFrequenza: e.target.value as FrequenzaContenzione })
                        }
                      >
                        {FREQ_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {FREQ_LABEL[f]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Contenzioni specifiche */}
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: 8 }}>
                    Mezzi di contenzione
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(
                      [
                        {
                          key: 'cinturaCarrozzina',
                          freqKey: 'cinturaCarrozzinaFreq',
                          label: 'Cintura carrozzina',
                        },
                        {
                          key: 'cinturaPoltrona',
                          freqKey: 'cinturaPoltronaFreq',
                          label: 'Cintura poltrona',
                        },
                        {
                          key: 'cinturaSedia',
                          freqKey: 'cinturaSediaFreq',
                          label: 'Cintura sedia',
                        },
                        {
                          key: 'cinturaLetto',
                          freqKey: 'cinturaLettoFreq',
                          label: 'Cintura letto',
                        },
                      ] as { key: keyof typeof form; freqKey: keyof typeof form; label: string }[]
                    ).map(({ key, freqKey, label }) => (
                      <div
                        key={String(key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            minWidth: 160,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={form[key] as boolean}
                            onChange={(e) =>
                              set({ [key]: e.target.checked } as Partial<typeof form>)
                            }
                          />
                          <span style={{ fontSize: '13px' }}>{label}</span>
                        </label>
                        {form[key] && (
                          <select
                            className="form-input"
                            style={{ width: 'auto', fontSize: '12px' }}
                            value={form[freqKey] as string}
                            onChange={(e) =>
                              set({ [freqKey]: e.target.value } as Partial<typeof form>)
                            }
                          >
                            {FREQ_OPTIONS.map((f) => (
                              <option key={f} value={f}>
                                {FREQ_LABEL[f]}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={form.carrozzinaConTavolino}
                        onChange={(e) => set({ carrozzinaConTavolino: e.target.checked })}
                      />
                      <span style={{ fontSize: '13px' }}>Carrozzina con tavolino</span>
                    </label>
                  </div>
                  <div className="form-row" style={{ marginTop: 10 }}>
                    <label className="form-label">Altri presidi</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.altriPresidi}
                      onChange={(e) => set({ altriPresidi: e.target.value })}
                      placeholder="descrizione presidi aggiuntivi"
                    />
                  </div>
                </div>

                {/* Motivazioni */}
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: 8 }}>
                    Motivazioni
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(
                      [
                        { key: 'motivAgitazione', label: 'Agitazione psicomotoria' },
                        { key: 'motivConfusionale', label: 'Stato confusionale' },
                        { key: 'motivCadute', label: 'Cadute ricorrenti / Instabilità posturale' },
                        { key: 'motivAutoEtero', label: 'Auto/eterolesionismo' },
                        {
                          key: 'motivInconsapevolezza',
                          label: 'Inconsapevolezza dei propri limiti',
                        },
                      ] as { key: keyof typeof form; label: string }[]
                    ).map(({ key, label }) => (
                      <label
                        key={String(key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={form[key] as boolean}
                          onChange={(e) => set({ [key]: e.target.checked } as Partial<typeof form>)}
                        />
                        <span style={{ fontSize: '13px' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="form-row" style={{ marginTop: 10 }}>
                    <label className="form-label">Altro (specificare)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.motivAltro}
                      onChange={(e) => set({ motivAltro: e.target.value })}
                    />
                  </div>
                </div>

                {/* Motivo clinico */}
                <div className="form-row">
                  <label className="form-label">Descrizione clinica</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={form.motivoClinico}
                    onChange={(e) => set({ motivoClinico: e.target.value })}
                    placeholder="Descrizione del motivo clinico per l'applicazione…"
                  />
                </div>

                <div className="form-row-2col">
                  <div className="form-row" style={{ paddingTop: 8 }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        marginBottom: 8,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.autorizzazioneMedico}
                        onChange={(e) => set({ autorizzazioneMedico: e.target.checked })}
                      />
                      <span className="form-label" style={{ margin: 0 }}>
                        Autorizzata dal medico
                      </span>
                    </label>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={form.autorizzazioneTutore}
                        onChange={(e) => set({ autorizzazioneTutore: e.target.checked })}
                      />
                      <span className="form-label" style={{ margin: 0 }}>
                        Autorizzata da tutore/familiare
                      </span>
                    </label>
                  </div>
                </div>

                {/* Consenso */}
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: 8 }}>Consenso</div>
                  <div className="form-row-2col">
                    <div className="form-row">
                      <label className="form-label">Firma paziente / referente</label>
                      <input
                        type="text"
                        className="form-input"
                        value={form.firmaPazienteReferente}
                        onChange={(e) => set({ firmaPazienteReferente: e.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Firma parente (presa visione)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={form.firmaParente}
                        onChange={(e) => set({ firmaParente: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="form-row">
                    <label className="form-label">Data fine (se applicabile)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.dataFine}
                      onChange={(e) => set({ dataFine: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Ora fine</label>
                    <input
                      type="time"
                      className="form-input"
                      value={form.oraFine}
                      onChange={(e) => set({ oraFine: e.target.value })}
                    />
                  </div>
                </div>
                {form.dataFine && (
                  <div className="form-row">
                    <label className="form-label">Firma medico fine</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.firmaMedicoFine}
                      onChange={(e) => set({ firmaMedicoFine: e.target.value })}
                    />
                  </div>
                )}
                <div className="form-row">
                  <label className="form-label">Note</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={form.note}
                    onChange={(e) => set({ note: e.target.value })}
                  />
                </div>
                <div className="cr-inline-form__actions">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setShowAdd(false);
                      setEditId(null);
                    }}
                  >
                    Annulla
                  </button>
                  <button className="btn-primary btn-sm" onClick={handleSave}>
                    <IcoCheck /> Salva
                  </button>
                </div>
              </div>
            )}

            {list.length === 0 ? (
              <p className="cr-empty">Nessuna contenzione/protezione registrata.</p>
            ) : (
              <>
                {attive.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div className="cr-section-title" style={{ marginBottom: 12 }}>
                      Attive ({attive.length})
                    </div>
                    {attive.map((c) => (
                      <ContenzioneCard
                        key={c.id}
                        c={c}
                        onEdit={() => startEdit(c)}
                        onDelete={() =>
                          onUpdate({ contenzioni: list.filter((x) => x.id !== c.id) })
                        }
                        onTermina={() => terminaContenzione(c.id)}
                        onModulo={() => {
                          setModuloTarget(c.id);
                          setModulo(true);
                        }}
                      />
                    ))}
                  </div>
                )}
                {storiche.length > 0 && (
                  <div>
                    <div
                      className="cr-section-title"
                      style={{ marginBottom: 12, color: 'var(--text-muted)' }}
                    >
                      Storico ({storiche.length})
                    </div>
                    {storiche.map((c) => (
                      <ContenzioneCard
                        key={c.id}
                        c={c}
                        onEdit={() => startEdit(c)}
                        onDelete={() =>
                          onUpdate({ contenzioni: list.filter((x) => x.id !== c.id) })
                        }
                        onModulo={() => {
                          setModuloTarget(c.id);
                          setModulo(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ClinicalTableSection>
      </div>
    </div>
  );
}

function ContenzioneCard({
  c,
  onEdit,
  onDelete,
  onTermina,
  onModulo,
}: {
  c: Contenzione;
  onEdit: () => void;
  onDelete: () => void;
  onTermina?: () => void;
  onModulo: () => void;
}) {
  return (
    <div className={`contenzione-card${c.attiva ? ' contenzione-card--attiva' : ''}`}>
      <div className="contenzione-card__header">
        <span className={`badge ${c.attiva ? 'badge--red' : 'badge--gray'}`}>
          {c.attiva ? 'ATTIVA' : 'CONCLUSA'}
        </span>
        <span className="badge badge--blue">{TIPO_LABEL[c.tipo] ?? c.tipo}</span>
        <span className="cr-meta">
          Inizio: {fmtDate(c.dataInizio)} {c.oraInizio}
        </span>
        {c.dataFine && (
          <span className="cr-meta">
            Fine: {fmtDate(c.dataFine)} {c.oraFine}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="icon-btn icon-btn--sm" onClick={onModulo} title="Vista modulo">
            📋
          </button>
          {onTermina && c.attiva && (
            <button className="btn-secondary btn-sm" onClick={onTermina}>
              Termina
            </button>
          )}
          <button className="icon-btn icon-btn--sm" onClick={onEdit} title="Modifica">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="icon-btn icon-btn--sm icon-btn--danger"
            onClick={onDelete}
            title="Elimina"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div className="contenzione-card__body">
        <div>
          <strong>Motivo:</strong> {c.motivoClinico}
        </div>
        <div className="cr-meta" style={{ marginTop: 6 }}>
          {c.autorizzazioneMedico && ' Autorizzata dal medico ·'}
          {c.autorizzazioneTutore && ' Autorizzata da tutore ·'}
          Operatore: {c.operatore}
        </div>
        {c.note && <div className="cr-meta">{c.note}</div>}
      </div>
    </div>
  );
}
