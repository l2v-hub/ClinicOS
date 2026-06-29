import { useState } from 'react';
import {
  FRACTION_PRESETS, ADMIN_UNITS, DIVISIBLE_UNITS, PHARMA_FORMS, STRENGTH_UNITS,
  formatFraction, parseQuantity, computeEquivalent,
  type ScheduleRow,
} from './therapyDose';

// ── Constants ─────────────────────────────────────────────────────────────────

const VIA_OPTIONS = ['orale', 'IM', 'SC', 'IV', 'sublinguale', 'topico', 'al bisogno'];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TherapyFormValue {
  farmacoNome: string;
  pharmaceuticalForm: string;
  commercialStrengthValue: string;
  commercialStrengthUnit: string;
  allowedFractions: string[];
  viaSomministrazione: string;
  tipo: 'periodica' | 'una_tantum' | 'al_bisogno';
  stato: 'attiva' | 'sospesa' | 'conclusa';
  dataInizio: string;
  dataFine: string;
  schedules: ScheduleRow[];
  prescrittore: string;
  note: string;
  dataSomministrazione: string;
  orarioSomministrazione: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string { return new Date().toISOString().slice(0, 10); }

export function emptyTherapyForm(): TherapyFormValue {
  return {
    farmacoNome: '', pharmaceuticalForm: 'compressa',
    commercialStrengthValue: '', commercialStrengthUnit: 'mg',
    allowedFractions: ['1'],
    viaSomministrazione: 'orale',
    tipo: 'periodica', stato: 'attiva', dataInizio: todayStr(), dataFine: '',
    schedules: [{ time: '08:00', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' }],
    prescrittore: '', note: '',
    dataSomministrazione: todayStr(), orarioSomministrazione: '',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TherapyFormFieldsProps {
  value: TherapyFormValue;
  onChange: (next: TherapyFormValue) => void;
  operatoreNome?: string;
}

export function TherapyFormFields({ value, onChange }: TherapyFormFieldsProps) {
  const [customQty, setCustomQty] = useState<Record<number, string>>({});

  const update = (patch: Partial<TherapyFormValue>) => onChange({ ...value, ...patch });

  const strengthNum = value.commercialStrengthValue.trim() ? Number(value.commercialStrengthValue) : null;

  const updateSchedule = (idx: number, patch: Partial<ScheduleRow>) =>
    onChange({ ...value, schedules: value.schedules.map((s, i) => i === idx ? { ...s, ...patch } : s) });

  const addSchedule = () =>
    onChange({
      ...value,
      schedules: [...value.schedules, {
        time: '18:00', quantityNumerator: 1, quantityDenominator: 1,
        administrationUnit: value.pharmaceuticalForm && ADMIN_UNITS.includes(value.pharmaceuticalForm) ? value.pharmaceuticalForm : 'compressa',
      }],
    });

  const removeSchedule = (idx: number) =>
    onChange({ ...value, schedules: value.schedules.filter((_, i) => i !== idx) });

  const toggleAllowedFraction = (key: string) => {
    if (key === '1') return;
    const has = value.allowedFractions.includes(key);
    update({ allowedFractions: has ? value.allowedFractions.filter(k => k !== key) : [...value.allowedFractions, key] });
  };

  return (
    <>
      <div className="form-group">
        <label>Prodotto medicinale *</label>
        <input className="form-input" value={value.farmacoNome} placeholder="es. Kanrenol"
          onChange={e => update({ farmacoNome: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Forma farmaceutica</label>
        <select className="form-select" value={value.pharmaceuticalForm}
          onChange={e => {
            const pf = e.target.value;
            update({
              pharmaceuticalForm: pf,
              schedules: value.schedules.map(s =>
                ADMIN_UNITS.includes(s.administrationUnit) && PHARMA_FORMS.includes(s.administrationUnit)
                  ? { ...s, administrationUnit: ADMIN_UNITS.includes(pf) ? pf : s.administrationUnit }
                  : s
              ),
            });
          }}>
          {PHARMA_FORMS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Dosaggio commerciale</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="form-input" type="number" min="0" step="any" style={{ flex: 1 }}
            value={value.commercialStrengthValue} placeholder="es. 100"
            onChange={e => update({ commercialStrengthValue: e.target.value })} />
          <select className="form-select" style={{ width: 90 }} value={value.commercialStrengthUnit}
            onChange={e => update({ commercialStrengthUnit: e.target.value })}>
            {STRENGTH_UNITS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group form-group--full">
        <label>Frazioni consentite <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(la divisibilità va abilitata dall'operatore)</span></label>
        <div className="fraction-allow">
          {FRACTION_PRESETS.map(p => {
            const active = value.allowedFractions.includes(p.key);
            const isWhole = p.key === '1';
            return (
              <button key={p.key} type="button"
                className={`frac-toggle${active ? ' frac-toggle--on' : ''}${isWhole ? ' frac-toggle--locked' : ''}`}
                disabled={isWhole}
                title={isWhole ? 'Dose intera sempre disponibile' : `${active ? 'Disabilita' : 'Abilita'} ${p.key}`}
                onClick={() => toggleAllowedFraction(p.key)}>
                {p.label} <span className="frac-toggle__sub">{p.key}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="form-group">
        <label>Via somministrazione</label>
        <select className="form-select" value={value.viaSomministrazione}
          onChange={e => update({ viaSomministrazione: e.target.value })}>
          {VIA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Stato</label>
        <select className="form-select" value={value.stato}
          onChange={e => update({ stato: e.target.value as TherapyFormValue['stato'] })}>
          <option value="attiva">Attiva</option>
          <option value="sospesa">Sospesa</option>
          <option value="conclusa">Conclusa</option>
        </select>
      </div>
      <div className="form-group">
        <label>Tipo terapia</label>
        <div className="tipo-radio">
          <label><input type="radio" name="tf-tipo" value="periodica" checked={value.tipo === 'periodica'} onChange={() => update({ tipo: 'periodica' })} /> Periodica</label>
          <label><input type="radio" name="tf-tipo" value="una_tantum" checked={value.tipo === 'una_tantum'} onChange={() => update({ tipo: 'una_tantum' })} /> Una tantum</label>
          <label><input type="radio" name="tf-tipo" value="al_bisogno" checked={value.tipo === 'al_bisogno'} onChange={() => update({ tipo: 'al_bisogno' })} /> Al bisogno</label>
        </div>
      </div>
      <div className="form-group">
        <label>Data inizio *</label>
        <input className="form-input" type="date" value={value.dataInizio}
          onChange={e => update({ dataInizio: e.target.value })} />
      </div>
      {value.tipo === 'periodica' && (
        <div className="form-group">
          <label>Data fine</label>
          <input className="form-input" type="date" value={value.dataFine}
            onChange={e => update({ dataFine: e.target.value })} />
        </div>
      )}
      {value.tipo === 'una_tantum' && (
        <>
          <div className="form-group">
            <label>Data somministrazione</label>
            <input className="form-input" type="date" value={value.dataSomministrazione}
              onChange={e => update({ dataSomministrazione: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Orario</label>
            <input className="form-input" type="time" value={value.orarioSomministrazione}
              onChange={e => update({ orarioSomministrazione: e.target.value })} />
          </div>
        </>
      )}
      {value.tipo === 'periodica' && (
        <div className="form-group form-group--full">
          <label>Orari e quantità per somministrazione</label>
          <div className="sched-editor">
            {value.schedules.map((s, i) => {
              const divisible = DIVISIBLE_UNITS.has(s.administrationUnit);
              const eq = computeEquivalent(s.quantityNumerator, s.quantityDenominator, strengthNum, value.commercialStrengthUnit);
              const presetActive = (num: number, den: number) =>
                s.quantityNumerator === num && s.quantityDenominator === den;
              return (
                <div key={i} className="sched-row">
                  <div className="sched-row__head">
                    <input className="form-input sched-row__time" type="time" value={s.time}
                      onChange={e => updateSchedule(i, { time: e.target.value })} />
                    <select className="form-select sched-row__unit" value={s.administrationUnit}
                      onChange={e => updateSchedule(i, { administrationUnit: e.target.value })}>
                      {ADMIN_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button type="button" className="btn-secondary btn-sm" title="Rimuovi orario"
                      onClick={() => removeSchedule(i)}>✕</button>
                  </div>
                  <div className="sched-row__qty">
                    {divisible ? (
                      <>
                        {FRACTION_PRESETS.filter(p => value.allowedFractions.includes(p.key)).map(p => (
                          <button key={p.key} type="button"
                            className={`qty-chip${presetActive(p.num, p.den) ? ' qty-chip--on' : ''}`}
                            onClick={() => { updateSchedule(i, { quantityNumerator: p.num, quantityDenominator: p.den }); setCustomQty(c => ({ ...c, [i]: '' })); }}>
                            {p.label}
                          </button>
                        ))}
                        <input className="form-input qty-chip__other" placeholder="Altro (es. 1/3, 0.5)"
                          value={customQty[i] ?? ''}
                          onChange={e => setCustomQty(c => ({ ...c, [i]: e.target.value }))}
                          onBlur={e => {
                            const parsed = parseQuantity(e.target.value);
                            if (parsed) updateSchedule(i, { quantityNumerator: parsed.num, quantityDenominator: parsed.den });
                          }} />
                      </>
                    ) : (
                      <input className="form-input qty-chip__other" type="number" min="0" step="any"
                        placeholder="Quantità"
                        value={s.quantityDenominator === 1 ? String(s.quantityNumerator) : (s.quantityNumerator / s.quantityDenominator)}
                        onChange={e => {
                          const parsed = parseQuantity(e.target.value);
                          if (parsed) updateSchedule(i, { quantityNumerator: parsed.num, quantityDenominator: parsed.den });
                        }} />
                    )}
                  </div>
                  <div className="sched-row__resolved">
                    {s.time} — {formatFraction(s.quantityNumerator, s.quantityDenominator)} {s.administrationUnit}
                    {eq && <> — <strong>equivalente a {eq}</strong></>}
                  </div>
                </div>
              );
            })}
            <button type="button" className="btn-secondary btn-sm" onClick={addSchedule}>+ Aggiungi orario</button>
          </div>
        </div>
      )}
      <div className="form-group">
        <label>Prescrittore</label>
        <input className="form-input" value={value.prescrittore} placeholder="Dr. ..."
          onChange={e => update({ prescrittore: e.target.value })} />
      </div>
      <div className="form-group form-group--full">
        <label>Note</label>
        <textarea className="form-input" rows={2} value={value.note}
          onChange={e => update({ note: e.target.value })} />
      </div>
    </>
  );
}
