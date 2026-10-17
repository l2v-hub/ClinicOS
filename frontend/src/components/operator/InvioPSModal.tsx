import { useState, useEffect } from 'react';
import type { Paziente, CartellaPaziente } from '../../types';
import { useCan } from '../../lib/capabilities';
import { getCurrentOperator } from '../../lib/operatorSession';
import {
  loadEmergencyTransferSources,
  type EmergencyTransferSources,
} from '../../lib/emergencyTransferContext';
import { formatFacilityLocalMinute } from '../../lib/facilityTime';
import { buildInvioPSModel } from './invioPSModel';
// ── Props ──────────────────────────────────────────────────────────────────────

interface InvioPSModalProps {
  paziente: Paziente;
  cartella: CartellaPaziente;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function InvioPSModal(props: InvioPSModalProps) {
  if (props.cartella.pazienteId !== props.paziente.id)
    return (
      <div role="alert">
        Contesto clinico non coerente con il paziente.{' '}
        <button type="button" onClick={props.onClose}>
          Chiudi
        </button>
      </div>
    );
  return (
    <InvioPSContent
      key={`${props.paziente.id}:${getCurrentOperator()?.id ?? 'unknown'}`}
      {...props}
    />
  );
}

function InvioPSContent({ paziente, cartella, onClose }: InvioPSModalProps) {
  const [sources, setSources] = useState<EmergencyTransferSources | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [loadRevision, setLoadRevision] = useState(0);
  const [reasonOverride, setReasonOverride] = useState<string | null>(null);
  const [contactOverride, setContactOverride] = useState<string | null>(null);
  const [allergyNote, setAllergyNote] = useState('');
  const [vitalNote, setVitalNote] = useState('');
  const [riskNote, setRiskNote] = useState('');
  const [doseNote, setDoseNote] = useState('');
  const canTherapy = useCan('therapy.list_page');
  const canHistory = useCan('administration.history_page');
  const canPrn = useCan('administration.list_slots');
  const canReadings = useCan('parameters.list_readings');
  const canDiary = useCan('diary.list');
  const authorized = canTherapy && canHistory && canPrn && canReadings && canDiary;

  useEffect(() => {
    const controller = new AbortController();
    setSources(null);
    setLoading(true);
    setFetchError('');
    if (!authorized) {
      setFetchError('Il tuo ruolo non può consultare tutte le fonti necessarie alla scheda PS.');
      setLoading(false);
      return () => controller.abort();
    }
    void loadEmergencyTransferSources(paziente.id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setSources(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFetchError('Contesto clinico non disponibile o incompleto.');
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [paziente.id, loadRevision, authorized]);

  const model = buildInvioPSModel(paziente, cartella, sources?.therapies ?? [], sources);
  const reason = reasonOverride ?? model.emergency.reason;
  const contact = contactOverride ?? model.emergency.contact;
  const allergyUnknown =
    model.patient.allergie.length === 0 &&
    !['assenti', 'paziente_nega'].includes(cartella.allergieStatus ?? '');
  const missingVitals =
    model.emergency.vitals.every((row) => row.value === null) &&
    model.emergency.legacyVitals.length === 0;
  const printBlocked =
    loading ||
    Boolean(fetchError) ||
    !authorized ||
    !sources ||
    !reason.trim() ||
    (allergyUnknown && !allergyNote.trim()) ||
    (missingVitals && !vitalNote.trim());

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {loading && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Caricamento contesto clinico…
              </span>
            )}
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                if (!printBlocked) window.print();
              }}
              disabled={printBlocked}
              data-invio-ps-print
              title={
                printBlocked
                  ? 'Carica tutte le fonti e completa motivo, stato allergie e parametri mancanti prima della stampa'
                  : undefined
              }
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
              className="alert alert--error no-print"
              role="alert"
              style={{ color: 'var(--red, #DC2626)', fontSize: 12, marginBottom: 8 }}
            >
              {fetchError}. La stampa è bloccata finché tutte le fonti cliniche non sono complete.{' '}
              <button
                className="btn-secondary btn-sm"
                onClick={() => setLoadRevision((v) => v + 1)}
              >
                Riprova
              </button>
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
                <span className="fm-patient-field__lbl">Data stampa</span>
                <span className="fm-patient-field__val">{model.patient.dataStampa}</span>
              </div>
            </div>

            <section className="fm-section" data-invio-ps-reason-section>
              <h2 className="fm-section-title">Motivo dell'invio</h2>
              <label className="no-print" htmlFor="invio-ps-reason">
                Motivo dell'invio (modificabile)
              </label>
              <textarea
                id="invio-ps-reason"
                className="form-input no-print"
                data-invio-ps-reason
                rows={4}
                value={reason}
                onChange={(event) => setReasonOverride(event.target.value)}
                maxLength={10000}
                placeholder="Descrivi il motivo dell'invio e le condizioni osservate"
              />
              <p
                className="fm-row__val"
                style={{ whiteSpace: 'pre-wrap' }}
                data-invio-ps-reason-print
              >
                {reason || 'Motivo da completare prima della stampa.'}
              </p>
              {model.emergency.urgentNote && (
                <p>
                  <strong>Ultima nota urgente nelle 24 ore:</strong>{' '}
                  {model.emergency.urgentNote.content} ·{' '}
                  {formatFacilityLocalMinute(model.emergency.urgentNote.at)}
                </p>
              )}
            </section>

            {/* ── Allergie (alert clinico) ── */}
            <div
              className={`fm-allergie-box${model.patient.allergie.some((a) => a.grave) ? ' fm-allergie-box--grave' : ''}`}
            >
              <span className="fm-allergie-box__lbl">⚠ Allergie</span>
              {model.patient.allergie.length === 0 ? (
                <span className="fm-allergie-box__val">{model.patient.allergieStato}</span>
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

            {allergyUnknown && (
              <section className="fm-section">
                <label className="no-print" htmlFor="invio-ps-allergy-note">
                  Stato allergie da verificare prima dell'invio
                </label>
                <textarea
                  id="invio-ps-allergy-note"
                  className="form-input no-print"
                  rows={2}
                  value={allergyNote}
                  onChange={(event) => setAllergyNote(event.target.value)}
                  placeholder="Documenta la verifica o l'impossibilità di raccogliere il dato"
                />
                <p>
                  {allergyNote
                    ? `Integrazione manuale allergie: ${allergyNote}`
                    : 'Stato allergie da completare prima della stampa.'}
                </p>
              </section>
            )}
            <section className="fm-section" data-invio-ps-vitals>
              <h2 className="fm-section-title">Ultimi parametri rilevati</h2>
              <table className="fm-table">
                <thead>
                  <tr>
                    <th>Parametro</th>
                    <th>Valore</th>
                    <th>Data e ora rilevazione</th>
                  </tr>
                </thead>
                <tbody>
                  {model.emergency.vitals.map((row) => (
                    <tr key={row.key} data-ps-vital={row.key}>
                      <td>{row.label}</td>
                      <td>
                        {row.value === null ? 'Non rilevato' : `${row.value} ${row.unit}`.trim()}
                      </td>
                      <td>
                        {row.measuredAt
                          ? formatFacilityLocalMinute(row.measuredAt)
                          : 'Da rilevare o completare'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {model.emergency.legacyVitals.length > 0 && (
                <div data-invio-ps-legacy-vitals>
                  <h3>Osservazioni registrate nella cartella</h3>
                  <ul>
                    {model.emergency.legacyVitals.map((row, index) => (
                      <li key={index}>
                        {row.label}: {row.value} {row.unit} · {row.recordedAt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <label className="no-print" htmlFor="invio-ps-vital-note">
                Integrazioni sui parametri mancanti (valore, data e ora osservati)
              </label>
              <textarea
                id="invio-ps-vital-note"
                className="form-input no-print"
                rows={2}
                value={vitalNote}
                onChange={(event) => setVitalNote(event.target.value)}
                placeholder="Completa i dati mancanti o documenta perché non sono rilevabili"
              />
              {vitalNote && (
                <p style={{ whiteSpace: 'pre-wrap' }}>
                  Integrazione manuale parametri: {vitalNote}
                </p>
              )}
            </section>
            <section className="fm-section" data-invio-ps-given>
              <h2 className="fm-section-title">Ultime dosi effettivamente somministrate</h2>
              <p>
                Registrazioni con orario effettivo nelle ultime 24 ore. Eventuali dati storici senza
                ora sono indicati separatamente e non confermano l’orario della dose.
              </p>
              {model.emergency.given.length > 0 ? (
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th>Farmaco / dose / via</th>
                      <th>Somministrazione registrata</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.emergency.given.map((row) => (
                      <tr key={row.id} data-ps-given={row.id}>
                        <td>
                          {row.drug} · {row.dose} · {row.route}
                        </td>
                        <td>
                          {row.at
                            ? formatFacilityLocalMinute(row.at)
                            : `${row.date} · orario effettivo non registrato (dato storico)`}
                        </td>
                        <td>{row.kind}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>
                  {loading
                    ? 'Caricamento delle somministrazioni…'
                    : fetchError
                      ? 'Dosi non verificabili: stampa bloccata.'
                      : 'Nessuna dose effettivamente somministrata risulta nelle fonti lette per le ultime 24 ore.'}
                </p>
              )}
              <label className="no-print" htmlFor="invio-ps-dose-note">
                Integrazioni sulle somministrazioni
              </label>
              <textarea
                id="invio-ps-dose-note"
                className="form-input no-print"
                rows={2}
                value={doseNote}
                onChange={(event) => setDoseNote(event.target.value)}
                placeholder="Eventuali somministrazioni da documentare separatamente"
              />
              {doseNote && (
                <p style={{ whiteSpace: 'pre-wrap' }}>
                  Integrazione manuale somministrazioni: {doseNote}
                </p>
              )}
            </section>
            <section className="fm-section" data-invio-ps-risks>
              <h2 className="fm-section-title">Rischi documentati</h2>
              {model.emergency.risks.length ? (
                <ul>
                  {model.emergency.risks.map((risk, index) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              ) : (
                <>
                  <label className="no-print" htmlFor="invio-ps-risk-note">
                    Rischi da verificare
                  </label>
                  <textarea
                    id="invio-ps-risk-note"
                    className="form-input no-print"
                    rows={2}
                    value={riskNote}
                    onChange={(event) => setRiskNote(event.target.value)}
                    placeholder="Completa i rischi rilevati o documenta la verifica"
                  />
                  <p>
                    {riskNote
                      ? `Integrazione manuale rischi: ${riskNote}`
                      : 'Nessun rischio documentato nella cartella; verifica da completare.'}
                  </p>
                </>
              )}
            </section>
            <section className="fm-section" data-invio-ps-contact>
              <h2 className="fm-section-title">Familiare / contatto da avvisare</h2>
              <label className="no-print" htmlFor="invio-ps-contact">
                Nome, relazione e telefono
              </label>
              <input
                id="invio-ps-contact"
                className="form-input no-print"
                value={contact}
                onChange={(event) => setContactOverride(event.target.value)}
                placeholder="Contatto da completare"
              />
              <p>{contact || 'Contatto non documentato: da completare prima dell’invio.'}</p>
            </section>

            {/* ── Quadro clinico ── */}
            {(model.patient.diagnosi.length > 0 ||
              model.patient.condizioniCroniche.length > 0 ||
              model.patient.patologiePregresse.length > 0 ||
              model.patient.noteAssistenziali.length > 0 ||
              model.patient.patologiaIngresso) && (
              <div className="fm-section">
                <div className="fm-section-title">Quadro Clinico</div>
                {model.patient.diagnosi.length > 0 && (
                  <div className="fm-row">
                    <span className="fm-row__lbl">Diagnosi attuali / di dimissione:</span>
                    <span className="fm-row__val" style={{ whiteSpace: 'pre-wrap' }}>
                      {model.patient.diagnosi.join('\n\n')}
                    </span>
                  </div>
                )}
                {model.patient.patologiaIngresso && (
                  <div className="fm-row">
                    <span className="fm-row__lbl">Patologia di ingresso:</span>
                    <span className="fm-row__val">{model.patient.patologiaIngresso}</span>
                  </div>
                )}
                {model.patient.patologiePregresse.length > 0 && (
                  <div className="fm-row">
                    <span className="fm-row__lbl">Patologie note e interventi pregressi:</span>
                    <span className="fm-row__val" style={{ whiteSpace: 'pre-wrap' }}>
                      {model.patient.patologiePregresse.join('\n\n')}
                    </span>
                  </div>
                )}
                {model.patient.condizioniCroniche.length > 0 && (
                  <div className="fm-row">
                    <span className="fm-row__lbl">Altre condizioni registrate:</span>
                    <span className="fm-row__val">
                      {model.patient.condizioniCroniche.join('  ·  ')}
                    </span>
                  </div>
                )}
                {model.patient.noteAssistenziali.length > 0 && (
                  <div className="fm-row">
                    <span className="fm-row__lbl">Note assistenziali:</span>
                    <span className="fm-row__val" style={{ whiteSpace: 'pre-wrap' }}>
                      {model.patient.noteAssistenziali.join('\n\n')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Historical discharge context, when actually recorded. */}
            {model.dimissione !== null && (
              <div className="fm-section">
                <div className="fm-section-title">Dimissione Infermieristica</div>

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
              </div>
            )}

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
                    {fetchError
                      ? 'Prescrizioni non verificabili: stampa bloccata.'
                      : 'Nessuna terapia attiva registrata nelle fonti lette.'}
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
