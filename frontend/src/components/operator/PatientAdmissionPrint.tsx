import type { CartellaPaziente, Paziente } from '../../types';
const labels: Record<string, string> = {
  dataIngresso: 'Data ingresso',
  oraIngresso: 'Ora ingresso',
  provenienza: 'Provenienza',
  centroInviante: 'Centro inviante',
  tipoIngresso: 'Tipo ingresso',
  modalitaIngresso: 'Modalità ingresso',
  accompagnatoDa: 'Accompagnato da',
  motivoIngresso: 'Motivo ingresso',
  operatoreResponsabile: 'Responsabile',
  condizioniGenerali: 'Condizioni generali',
  condizioniIniziali: 'Condizioni iniziali',
  noteIniziali: 'Note iniziali',
  camera: 'Camera',
  letto: 'Letto',
  documentiRicevuti: 'Documenti ricevuti',
  documentiMancanti: 'Documenti mancanti',
  sigla: 'Sigla',
  statoCoscienza: 'Stato di coscienza',
  orientamento: 'Orientamento',
  autonomia: 'Autonomia',
  comunicazione: 'Comunicazione',
  udito: 'Udito',
  vista: 'Vista',
  dentizione: 'Dentizione',
  alimentazione: 'Alimentazione',
  eliminazioneUrinaria: 'Eliminazione urinaria',
  eliminazioneIntestinale: 'Eliminazione intestinale',
  mobilita: 'Mobilità',
  cuteIntegrita: 'Integrità cute',
  dolore: 'Dolore',
  doloreLivello: 'Livello dolore',
  materialeConsegnato: 'Materiale consegnato',
  operatore: 'Compilatore',
  note: 'Note',
  compilatoAt: 'Compilato il',
};
function valueText(value: unknown): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.map(valueText).join(' · ');
  if (typeof value === 'object')
    return Object.entries(value)
      .map(([k, v]) => `${labels[k] ?? k}: ${valueText(v)}`)
      .join(' · ');
  if (typeof value === 'boolean') return value ? 'Sì' : 'No';
  return String(value).replaceAll('_', ' ');
}
export function PatientAdmissionPrint({
  patient,
  chart,
}: {
  patient: Paziente;
  chart: CartellaPaziente;
}) {
  const contacts = [
    ['Referente', patient.emergencyContactName?.trim() || chart.contattoEmergenzaNome],
    ['Relazione referente', chart.contattoEmergenzaRel],
    ['Telefono referente', patient.emergencyContactPhone?.trim() || chart.contattoEmergenzaTel],
    ['Altro contatto di emergenza', chart.contattoEmergenzaAltro],
    ['Note generali', chart.noteGenerali],
  ];
  return (
    <>
      <dl className="patient-record-print__facts">
        {contacts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{valueText(value)}</dd>
          </div>
        ))}
      </dl>
      <h3>Ingresso, condizioni iniziali, valutazione funzionale e documenti</h3>
      {chart.presaInCarico ? (
        <dl className="patient-record-print__facts">
          {Object.entries(chart.presaInCarico).map(([key, value]) => (
            <div key={key}>
              <dt>{labels[key] ?? key.replace(/([A-Z])/g, ' $1')}</dt>
              <dd>{valueText(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>Dati di ingresso non compilati.</p>
      )}
    </>
  );
}
