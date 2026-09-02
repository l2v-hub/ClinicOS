export const PATIENT_RECORD_PRINT_SECTIONS = [
  { id: 'profilo', label: 'Profilo e degenza', description: 'Anagrafica, contatti e collocazione' },
  { id: 'clinica', label: 'Quadro clinico', description: 'Diagnosi, rischi e piano di cura' },
  { id: 'terapie', label: 'Terapie e allergie', description: 'Farmaci, terapie e sicurezza' },
  { id: 'parametri', label: 'Parametri vitali', description: 'Rilevazioni cliniche disponibili' },
  {
    id: 'diario',
    label: 'Diario e consegne',
    description: 'Note, visite e attività assistenziali',
  },
  {
    id: 'documenti',
    label: 'Documenti e moduli',
    description: 'Documenti e moduli clinici registrati',
  },
] as const;

export type PatientRecordPrintSectionId = (typeof PATIENT_RECORD_PRINT_SECTIONS)[number]['id'];
