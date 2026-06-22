import type { Paziente, CartellaPaziente } from '../../types';

interface PatientCompactHeaderProps {
  paziente: Paziente;
  cartella: CartellaPaziente | null;
  onBack: () => void;
  onInvioPS?: () => void;
}

function calcAge(dob: string): string {
  if (!dob) return '';
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  return years > 0 ? `${years}a` : '';
}

export default function PatientCompactHeader({ paziente, cartella, onBack, onInvioPS }: PatientCompactHeaderProps) {
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
          <span className="patient-compact-header__meta">Scheda: {paziente.medicalRecordNumber}</span>
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

      {onInvioPS && (
        <button
          className="btn-primary btn-sm no-print"
          onClick={onInvioPS}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          title="Invio in Pronto Soccorso"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Invio in PS
        </button>
      )}
    </div>
  );
}
