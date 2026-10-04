import type { CartellaPaziente, Paziente } from '../../types';
export function PatientContacts({
  patient,
  chart,
  onEdit,
}: {
  patient: Paziente;
  chart: CartellaPaziente;
  onEdit: () => void;
}) {
  const rows = [
    ['Email', patient.email?.trim()],
    ['Telefono', patient.phone?.trim()],
    ['Indirizzo', chart.indirizzo?.trim() || patient.address?.trim()],
    [
      'Referente',
      [
        patient.emergencyContactName?.trim() || chart.contattoEmergenzaNome?.trim(),
        chart.contattoEmergenzaRel?.trim(),
      ]
        .filter(Boolean)
        .join(' · '),
    ],
    [
      'Telefono referente',
      patient.emergencyContactPhone?.trim() || chart.contattoEmergenzaTel?.trim(),
    ],
    ['Altro contatto', chart.contattoEmergenzaAltro?.trim()],
  ];
  return (
    <section className="patient-contacts" aria-label="Contatti">
      <div className="patient-contacts__header">
        <h4>Contatti</h4>
        <button type="button" className="btn-secondary btn-sm" onClick={onEdit}>
          Modifica contatti
        </button>
      </div>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || 'Non indicato'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
