import type { Paziente, CartellaPaziente } from '../../types';

interface PatientCompactHeaderProps {
  paziente: Paziente;
  cartella: CartellaPaziente | null;
  onBack: () => void;
}

function calcAge(dob: string): string {
  if (!dob) return '';
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  return `${years}a`;
}

export default function PatientCompactHeader({ paziente, cartella, onBack }: PatientCompactHeaderProps) {
  const fullName = `${paziente.lastName}, ${paziente.firstName}`.trim().replace(/^,\s*/, '');
  const age = calcAge(paziente.dateOfBirth || '');
  const sex = paziente.sex === 'M' ? 'M' : paziente.sex === 'F' ? 'F' : '';
  const hasAllergie = cartella?.allergie && Array.isArray(cartella.allergie) && cartella.allergie.length > 0;

  return (
    <div className="patient-compact-header">
      <div className="patient-compact-header__back" onClick={onBack} title="Torna alla lista">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </div>

      <span className="patient-compact-header__name">{fullName}</span>

      {paziente.medicalRecordNumber && (
        <>
          <span className="patient-compact-header__sep">·</span>
          <span className="patient-compact-header__meta">MRN: {paziente.medicalRecordNumber}</span>
        </>
      )}

      {age && (
        <>
          <span className="patient-compact-header__sep">·</span>
          <span className="patient-compact-header__meta">{age}</span>
        </>
      )}

      {sex && (
        <>
          <span className="patient-compact-header__sep">·</span>
          <span className="patient-compact-header__meta">{sex}</span>
        </>
      )}

      {hasAllergie && (
        <span className="patient-compact-header__badge patient-compact-header__badge--allergy">
          ⚠ Allergie
        </span>
      )}
    </div>
  );
}
