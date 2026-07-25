import type { PatientDto } from './routes/patients.js';

const API_URL = import.meta.env.VITE_API_URL;

export function PatientCard({ patientId }: { patientId: string }) {
  async function loadPatient(): Promise<PatientDto> {
    const response = await fetch(`${API_URL}/patients/${patientId}`);
    return response.json();
  }

  return <button onClick={loadPatient}>Load patient</button>;
}
