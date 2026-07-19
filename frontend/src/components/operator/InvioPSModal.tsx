import { useState, useEffect } from 'react';
import type {
  Paziente,
  CartellaPaziente,
  DimissioneInfermieristica,
  PatientTherapyAPI,
} from '../../types';
import { formatFraction, computeEquivalent } from './cartella/therapyDose';
import { cachedGetJson } from '../../lib/cachedFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── FASCE labels (mirrors TerapiaFarmacologicaTab) ────────────────────────────

const FASCE_LABELS: { boolKey: keyof PatientTherapyAPI; label: string }[] = [
  { boolKey: 'fasceMattina', label: 'Mattina' },
  { boolKey: 'fascePranzo', label: 'Pranzo' },
  { boolKey: 'fascePomeriggio', label: 'Pomeriggio' },
  { boolKey: 'fasceSera', label: 'Sera' },
  { boolKey: 'fasceNotte', label: 'Notte' },
];

// ── Model types ────────────────────────────────────────────────────────────────

export interface InvioPSAllergia {
  testo: string;
  grave: boolean;
}

export interface InvioPSPatient {
  cognomeNome: string;
  mrn: string;
  dataNascita: string;
  sesso: string;
  dataStampa: string;
  allergie: InvioPSAllergia[];
  diagnosi: string[];
  condizioniCroniche: string[];
  patologiaIngresso: string;
}

export interface InvioPSDimissione {
  data: string;
  ora: string;
  condizioni: string;
  destinazione: string;
  autonomiaResidua: string;
  istruzioni: string;
  controlliProgrammati: string;
  personaAccompagna: string;
  mezzoTrasporto: string;
  materialeConsegnato: string;
  note: string;
}

export interface InvioPSTerapia {
  id: string;
  farmaco: string;
  dose: string;
  via: string;
  fasce: string;
  stato: string;
}

export interface InvioPSModel {
  patient: InvioPSPatient;
  dimissione: InvioPSDimissione | null;
  terapie: InvioPSTerapia[];
}

// ── Pure model builder (exported for unit testing) ────────────────────────────

function calcAge(dob: string): string {
  if (!dob) return '';
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  return years > 0 ? `${years} anni` : '';
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT');
}

export function buildInvioPSModel(
  paziente: Paziente,
  cartella: CartellaPaziente,
  therapies: PatientTherapyAPI[],
): InvioPSModel {
  const cognomeNome = `${paziente.lastName} ${paziente.firstName}`.trim();

  const allergie: InvioPSAllergia[] = (cartella.allergie || [])
    .map((a) => {
      const reazione = a.reazione ? ` (${a.reazione})` : '';
      return { testo: `${a.allergene}${reazione}`.trim(), grave: a.gravita === 'grave' };
    })
    .filter((a) => a.testo);

  const diagnosi: string[] = (cartella.diagnosi || [])
    .filter((d) => d.stato === 'attiva' || d.stato === 'monitoraggio')
    .map((d) => d.descrizione)
    .filter(Boolean);

  const condizioniCroniche: string[] = [];
  if (cartella.diabetico) condizioniCroniche.push('Diabete');
  if (cartella.ipertensione) condizioniCroniche.push('Ipertensione');
  if (cartella.terapiaTriturata) condizioniCroniche.push('Terapia triturata');

  const patient: InvioPSPatient = {
    cognomeNome,
    mrn: paziente.medicalRecordNumber || '—',
    dataNascita: fmtDate(paziente.dateOfBirth || ''),
    sesso: paziente.sex || '—',
    dataStampa: new Date().toLocaleDateString('it-IT'),
    allergie,
    diagnosi,
    condizioniCroniche,
    patologiaIngresso: cartella.patologiaIngresso || '',
  };

  // Age appended to sesso line for compactness
  const age = calcAge(paziente.dateOfBirth || '');
  if (age) {
    patient.sesso = `${patient.sesso} · ${age}`;
  }

  let dimissione: InvioPSDimissione | null = null;
  if (cartella.dimissione) {
    const d: DimissioneInfermieristica = cartella.dimissione;
    const DEST_LABELS: Record<string, string> = {
      domicilio: 'Domicilio',
      altra_struttura: 'Altra struttura',
      hospice: 'Hospice',
      ospedale: 'Ospedale',
    };
    dimissione = {
      data: fmtDate(d.data),
      ora: d.ora || '—',
      condizioni: d.condizioni || '—',
      destinazione: DEST_LABELS[d.destinazione] ?? d.destinazione ?? '—',
      autonomiaResidua: d.autonomiaResidua || '—',
      istruzioni: d.istruzioni || '—',
      controlliProgrammati: d.controlliProgrammati || '—',
      personaAccompagna: d.personaAccompagna || '—',
      mezzoTrasporto: d.mezzoTrasporto || '—',
      materialeConsegnato: d.materialeConsegnato || '—',
      note: d.note || '',
    };
  }

  const terapie: InvioPSTerapia[] = therapies
    .filter((t) => t.stato === 'attiva')
    .map((t) => {
      // REQ-093: prefer structured schedules → "08:00 (1/2 compressa, 50 mg)" per time.
      let fasce: string;
      if (t.schedules && t.schedules.length) {
        fasce = t.schedules
          .slice()
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((s) => {
            const frac = formatFraction(s.quantityNumerator, s.quantityDenominator);
            const eq = computeEquivalent(
              s.quantityNumerator,
              s.quantityDenominator,
              t.commercialStrengthValue,
              t.commercialStrengthUnit,
            );
            return `${s.time} (${frac} ${s.administrationUnit}${eq ? `, ${eq}` : ''})`;
          })
          .join('; ');
      } else {
        const fasceLabelList = FASCE_LABELS.filter((f) => t[f.boolKey] === true).map(
          (f) => f.label,
        );
        fasce = t.orarioSpecifico
          ? t.orarioSpecifico
          : fasceLabelList.length > 0
            ? fasceLabelList.join(', ')
            : '—';
      }
      const dose =
        t.commercialStrengthValue != null && t.commercialStrengthUnit
          ? `${t.commercialStrengthValue} ${t.commercialStrengthUnit}${t.pharmaceuticalForm ? ' ' + t.pharmaceuticalForm : ''}`
          : t.dosaggio;
      return {
        id: t.id,
        farmaco: t.farmacoNome,
        dose,
        via: t.viaSomministrazione,
        fasce,
        stato: t.stato,
      };
    });

  return { patient, dimissione, terapie };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface InvioPSModalProps {
  paziente: Paziente;
  cartella: CartellaPaziente;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function InvioPSModal({ paziente, cartella, onClose }: InvioPSModalProps) {
  const [therapies, setTherapies] = useState<PatientTherapyAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError('');
    cachedGetJson<PatientTherapyAPI[]>(`${API_URL}/patients/${paziente.id}/therapies`)
      .then((data) => {
        if (!cancelled) {
          setTherapies(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : 'Errore caricamento terapie');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [paziente.id]);

  const model = buildInvioPSModel(paziente, cartella, therapies);

  return (
    <div
      className="modal-overlay invio-ps-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Invio in Pronto Soccorso"
    >
      <div className="modal-box invio-ps-box">
        {/* ── Toolbar (no-print) ── */}
        <div className="modal-header no-print">
          <div>
            <p className="modal-title">Invio in Pronto Soccorso</p>
            <p className="modal-subtitle">
              {model.patient.cognomeNome} · {model.patient.mrn}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {loading && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Caricamento terapie…</span>
            )}
            <button
              className="btn-primary btn-sm"
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Stampa / PDF
            </button>
            <button className="btn-secondary btn-sm" onClick={onClose}>
              Chiudi
            </button>
          </div>
        </div>

        {/* ── Printable document ── */}
        <div className="modal-body invio-ps-body">
          {fetchError && (
            <div
              className="no-print"
              style={{ color: 'var(--red, #DC2626)', fontSize: 12, marginBottom: 8 }}
            >
              {fetchError} — i dati di terapia potrebbero essere incompleti.
            </div>
          )}

          <div className="fm invio-ps-doc">
            {/* Title */}
            <div className="fm-title">Invio in Pronto Soccorso</div>

            {/* Patient header */}
            <div className="fm-patient-header cols-4">
              <div className="fm-patient-field">
                <span className="fm-patient-field__lbl">Cognome e Nome</span>
                <span className="fm-patient-field__val">{model.patient.cognomeNome}</span>
              </div>
              <div className="fm-patient-field">
                <span className="fm-patient-field__lbl">Scheda / MRN</span>
                <span className="fm-patient-field__val">{model.patient.mrn}</span>
              </div>
              <div className="fm-patient-field">
                <span className="fm-patient-field__lbl">Data nascita</span>
                <span className="fm-patient-field__val">{model.patient.dataNascita}</span>
              </div>
              <div className="fm-patient-field">
                <span className="fm-patient-field__lbl">Sesso / Età</span>
                <span className="fm-patient-field__val">{model.patient.sesso}</span>
              </div>
            </div>
            <div className="fm-patient-header" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="fm-patient-field">
                <span className="fm-patient-field__lbl">
                  Diagnosi principale / Patologia di ingresso
                </span>
                <span className="fm-patient-field__val">
                  {model.patient.diagnosi[0] || model.patient.patologiaIngresso || '—'}
                </span>
              </div>
              <div className="fm-patient-field">
                <span className="fm-patient-field__lbl">Data stampa</span>
                <span className="fm-patient-field__val">{model.patient.dataStampa}</span>
              </div>
            </div>

            {/* ── Allergie (alert clinico) ── */}
            <div
              className={`fm-allergie-box${model.patient.allergie.some((a) => a.grave) ? ' fm-allergie-box--grave' : ''}`}
            >
              <span className="fm-allergie-box__lbl">⚠ Allergie</span>
              {model.patient.allergie.length === 0 ? (
                <span className="fm-allergie-box__val">Nessuna allergia nota</span>
              ) : (
                <span className="fm-allergie-box__val">
                  {model.patient.allergie.map((a, i) => (
                    <span key={i} className={a.grave ? 'fm-allergene--grave' : undefined}>
                      {a.testo}
                      {i < model.patient.allergie.length - 1 ? '  ·  ' : ''}
                    </span>
                  ))}
                </span>
              )}
            </div>

            {/* ── Quadro clinico ── */}
            {(model.patient.diagnosi.length > 0 ||
              model.patient.condizioniCroniche.length > 0 ||
              model.patient.patologiaIngresso) && (
              <div className="fm-section">
                <div className="fm-section-title">Quadro Clinico</div>
                {model.patient.diagnosi.length > 0 && (
                  <div className="fm-row">
                    <span className="fm-row__lbl">Diagnosi attive:</span>
                    <span className="fm-row__val">{model.patient.diagnosi.join('  ·  ')}</span>
                  </div>
                )}
                {model.patient.patologiaIngresso && (
                  <div className="fm-row">
                    <span className="fm-row__lbl">Patologia di ingresso:</span>
                    <span className="fm-row__val">{model.patient.patologiaIngresso}</span>
                  </div>
                )}
                {model.patient.condizioniCroniche.length > 0 && (
                  <div className="fm-row">
                    <span className="fm-row__lbl">Condizioni croniche / note:</span>
                    <span className="fm-row__val">
                      {model.patient.condizioniCroniche.join('  ·  ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Sezione Dimissione ── */}
            <div className="fm-section">
              <div className="fm-section-title">Dimissione Infermieristica</div>
              {model.dimissione === null ? (
                <div className="fm-row">
                  <span className="fm-row__val" style={{ fontStyle: 'italic', color: '#666' }}>
                    Nessuna dimissione registrata
                  </span>
                </div>
              ) : (
                <>
                  <div className="fm-row">
                    <span className="fm-row__lbl">Data:</span>
                    <span className="fm-row__val">{model.dimissione.data}</span>
                    <span className="fm-row__lbl" style={{ marginLeft: 16 }}>
                      Ora:
                    </span>
                    <span className="fm-row__val" style={{ maxWidth: 80 }}>
                      {model.dimissione.ora}
                    </span>
                  </div>
                  <div className="fm-row">
                    <span className="fm-row__lbl">Condizioni:</span>
                    <span className="fm-row__val">{model.dimissione.condizioni}</span>
                    <span className="fm-row__lbl" style={{ marginLeft: 16 }}>
                      Destinazione:
                    </span>
                    <span className="fm-row__val">{model.dimissione.destinazione}</span>
                  </div>
                  <div className="fm-row">
                    <span className="fm-row__lbl">Autonomia residua:</span>
                    <span className="fm-row__val">{model.dimissione.autonomiaResidua}</span>
                  </div>
                  <div className="fm-row">
                    <span className="fm-row__lbl">Istruzioni:</span>
                    <span className="fm-row__val">{model.dimissione.istruzioni}</span>
                  </div>
                  <div className="fm-row">
                    <span className="fm-row__lbl">Controlli programmati:</span>
                    <span className="fm-row__val">{model.dimissione.controlliProgrammati}</span>
                  </div>
                  <div className="fm-row">
                    <span className="fm-row__lbl">Accompagna:</span>
                    <span className="fm-row__val">{model.dimissione.personaAccompagna}</span>
                    <span className="fm-row__lbl" style={{ marginLeft: 16 }}>
                      Mezzo:
                    </span>
                    <span className="fm-row__val">{model.dimissione.mezzoTrasporto}</span>
                  </div>
                  <div className="fm-row">
                    <span className="fm-row__lbl">Materiale consegnato:</span>
                    <span className="fm-row__val">{model.dimissione.materialeConsegnato}</span>
                  </div>
                  {model.dimissione.note && (
                    <div className="fm-notes" style={{ marginTop: 6 }}>
                      <span className="fm-notes__lbl">Note</span>
                      {model.dimissione.note}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Sezione Terapia ── */}
            <div className="fm-section">
              <div className="fm-section-title">Terapia Farmacologica Attiva</div>
              {loading ? (
                <div className="fm-row no-print">
                  <span className="fm-row__val" style={{ fontStyle: 'italic', color: '#666' }}>
                    Caricamento in corso…
                  </span>
                </div>
              ) : model.terapie.length === 0 ? (
                <div className="fm-row">
                  <span className="fm-row__val" style={{ fontStyle: 'italic', color: '#666' }}>
                    Nessuna terapia attiva registrata
                  </span>
                </div>
              ) : (
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Farmaco</th>
                      <th>Dose</th>
                      <th>Via</th>
                      <th>Fasce / Orario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.terapie.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600 }}>{t.farmaco}</td>
                        <td style={{ textAlign: 'center' }}>{t.dose}</td>
                        <td style={{ textAlign: 'center' }}>{t.via}</td>
                        <td>{t.fasce}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Signature row */}
            <div className="fm-signature-row">
              <div className="fm-signature">
                <span className="fm-signature__lbl">Operatore</span>
                <div className="fm-signature__line"></div>
              </div>
              <div className="fm-signature">
                <span className="fm-signature__lbl">Data e Ora</span>
                <div className="fm-signature__line"></div>
              </div>
              <div className="fm-signature">
                <span className="fm-signature__lbl">Timbro / Firma</span>
                <div className="fm-signature__line"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
