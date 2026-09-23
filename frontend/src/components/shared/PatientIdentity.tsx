import {
  parsePatientLocation,
  patientIdentifier,
  patientIdentityIncomplete,
  patientIdentityName,
  patientLocationLabel,
  type PatientIdentityData,
} from '../../lib/patientIdentity';
import { facilityLocalMinute } from '../../lib/facilityTime';
import './PatientIdentity.css';

export function PatientIdentifier({ patient }: { patient: PatientIdentityData }) {
  return <span className="patient-identity__identifier">{patientIdentifier(patient)}</span>;
}

/** Presentational only: no requests, navigation, or permission inference. */
export function PatientIdentity({
  patient,
  fallbackName = '',
  showIdentifier = true,
  locationLoading = false,
}: {
  patient: PatientIdentityData | null;
  fallbackName?: string;
  showIdentifier?: boolean;
  locationLoading?: boolean;
}) {
  if (!patient) return <span className="patient-identity__name">{fallbackName}</span>;
  const location = parsePatientLocation(patient.location);
  const showDate = location && location.asOf !== facilityLocalMinute().slice(0, 10);
  const fromChart = location?.status === 'assigned' && location.source === 'cartella';
  return (
    <span className="patient-identity">
      <strong className="patient-identity__name">{patientIdentityName(patient)}</strong>
      {showIdentifier && <PatientIdentifier patient={patient} />}
      {patientIdentityIncomplete(patient) && (
        <span className="patient-identity__incomplete">Anagrafica da completare</span>
      )}
      <span className="patient-identity__location">
        {patientLocationLabel(location, locationLoading)}
      </span>
      {!locationLoading && location && (showDate || fromChart) && (
        <span className="patient-identity__context">
          {fromChart && 'Dalla cartella'}
          {fromChart && showDate && ' · '}
          {showDate && (
            <>
              Al{' '}
              <time dateTime={location.asOf}>{location.asOf.split('-').reverse().join('/')}</time>
            </>
          )}
        </span>
      )}
    </span>
  );
}
