import type { Consegna, Paziente, TherapySlot } from '../../../types';
import type { PatientLocationData } from '../../../lib/patientIdentity';

export const assignedLocation: PatientLocationData = {
  status: 'assigned',
  source: 'assignment',
  room: '201',
  bed: 'B',
  asOf: '2026-09-23',
};
export const identityPatient: Paziente = {
  id: 'synthetic-po06-patient-1',
  firstName: 'Mario',
  lastName: 'Rossi',
  codiceFiscale: 'RSSMRA80A01H501U',
  dateOfBirth: '1980-01-01',
  medicalRecordNumber: 'MRN-NEVER-RENDER',
  sex: null,
  email: null,
  phone: null,
  location: assignedLocation,
};
export const identityHomonym: Paziente = {
  ...identityPatient,
  id: 'synthetic-po06-patient-2',
  codiceFiscale: null,
  dateOfBirth: '1975-06-15',
  location: { status: 'assigned', source: 'cartella', room: '307', bed: null, asOf: '2026-09-23' },
};
export const identityHandover: Consegna = {
  id: 'synthetic-po06-handover',
  pazienteId: identityPatient.id,
  pazienteNome: 'Mario Rossi',
  identity: identityPatient,
  priorita: 'normale',
  stato: 'aperta',
  tipo: 'Monitoraggio',
  note: 'Solo dati sintetici',
  scadenza: '2026-09-23',
  operatoreAssegnato: 'Operatore test',
  creatoDA: 'Autore test',
  creatoDaId: 'other',
  createdAt: '2026-09-23T08:00:00Z',
};
export const identityTherapySlot: TherapySlot = {
  id: 'ts-mattina',
  fascia: 'mattina',
  label: 'Terapia Mattina',
  ora: '09:00',
  summary: { total: 2, administered: 0, notAdministered: 0, pending: 2 },
  patients: [identityPatient, identityHomonym].map((patient, index) => ({
    ...patient,
    patientId: patient.id,
    room: 'STALE-ROOM',
    bed: 'STALE-BED',
    administrations: [
      {
        administrationId: null,
        therapyId: `synthetic-therapy-${index}`,
        drugName: 'Farmaco sintetico',
        dosage: '1 mg',
        route: 'orale',
        scheduledTime: '09:00',
        status: 'pending',
        administeredAt: null,
        administeredBy: null,
        notAdministeredReason: null,
      },
    ],
  })),
};
