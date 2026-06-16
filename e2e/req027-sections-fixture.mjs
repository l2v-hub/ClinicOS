// Synthetic Imola discharge-letter `_sections` fixture (REQ-027 screenshots/tests).
// Model-independent: the same shape REQ-026's backend pass produces. Annotation offsets
// are computed from the rawText so they are always exact.

function ann(rawText, text, tag) {
  const i = rawText.indexOf(text);
  return { tag, text, startOffset: i, endOffset: i + text.length };
}
const FILE_ID = 'doc-1';
const sr = (page) => [{ fileId: FILE_ID, pageNumber: page }];

const diagnosi = 'Scompenso cardiaco congestizio in classe NYHA III.\n\nIpertensione arteriosa di vecchia data.\nDiabete mellito tipo 2 in trattamento.';
const anamnesi = 'Anamnesi patologica remota: pregresso infarto miocardico nel 12/03/2018.\nAnamnesi familiare: padre deceduto per cardiopatia ischemica.';
const decorso = 'Il 12/03/2025 ingresso in reparto per dispnea. Il 15/03/2025 stabilizzazione emodinamica. Dimesso il 18/03/2025 in condizioni cliniche stabili.';
const consulenze = 'Consulenza cardiologica del 13/03/2025: si conferma terapia.\nConsulenza diabetologica del 16/03/2025: ottimizzazione terapia ipoglicemizzante.';
const imaging = 'Rx torace del 12/03/2025: segni di congestione polmonare.\nEcocardiogramma del 14/03/2025: FE 35%.';
const procedure = 'Posizionamento di catetere venoso centrale il 12/03/2025.\nToracentesi evacuativa il 13/03/2025.';
const hospTherapy = 'Furosemide 250 mg ev in infusione continua.\nEnoxaparina 4000 UI sc 1 volta al giorno.';
const homeTherapy = 'Ramipril 5 mg 1 compressa al mattino.\nFurosemide 25 mg 1-0-0.\n[ILLEGGIBILE] 1-0-1 secondo schema.';
const advice = 'Controllo cardiologico tra 30 giorni. Dieta iposodica. Misurazione quotidiana del peso corporeo. Rivolgersi al PS in caso di dispnea ingravescente.';
const unmapped = 'Timbro del reparto e firma del medico (parzialmente leggibile).';

export const SECTIONS_FIXTURE = {
  demographics: {
    firstName: 'Mario', lastName: 'Bianchi', dateOfBirth: '23/07/1948', sex: 'M',
    codiceFiscale: 'BNCMRA48L23A944K', address: 'Via Roma 10, Imola', phone: '0542 000000', email: '',
  },
  allergies: {
    status: 'present',
    rawText: 'Allergia nota a Penicillina (reazione cutanea grave).',
    sourceFileId: FILE_ID, sourcePage: 1,
    warnings: [],
  },
  sections: [
    { sectionKey: 'PATIENT_DEMOGRAPHICS', detectedHeading: 'Dati anagrafici', rawText: 'Mario Bianchi, nato il 23/07/1948 a Imola. C.F. BNCMRA48L23A944K.', sourceRanges: sr(1),
      annotations: [ann('Mario Bianchi, nato il 23/07/1948 a Imola. C.F. BNCMRA48L23A944K.', '23/07/1948', 'DATE')] },
    { sectionKey: 'ALLERGIES', detectedHeading: 'Allergie', rawText: 'Allergia nota a Penicillina (reazione cutanea grave).', sourceRanges: sr(1),
      annotations: [ann('Allergia nota a Penicillina (reazione cutanea grave).', 'Penicillina', 'ALLERGY_CRITICAL')] },
    { sectionKey: 'DISCHARGE_DIAGNOSIS', detectedHeading: 'Diagnosi di dimissione', rawText: diagnosi, sourceRanges: sr(1),
      annotations: [] },
    { sectionKey: 'ANAMNESIS', detectedHeading: 'Anamnesi patologica remota', rawText: anamnesi, sourceRanges: sr(2),
      annotations: [ann(anamnesi, 'Anamnesi patologica remota', 'SUBSECTION_TITLE'), ann(anamnesi, 'Anamnesi familiare', 'SUBSECTION_TITLE'), ann(anamnesi, '12/03/2018', 'DATE')] },
    { sectionKey: 'HOSPITAL_COURSE', detectedHeading: 'Decorso ospedaliero', rawText: decorso, sourceRanges: sr(2),
      annotations: [ann(decorso, '12/03/2025', 'DATE'), ann(decorso, '15/03/2025', 'DATE'), ann(decorso, '18/03/2025', 'DATE')] },
    { sectionKey: 'CONSULTATIONS', detectedHeading: 'Consulenze', rawText: consulenze, sourceRanges: sr(2),
      annotations: [ann(consulenze, '13/03/2025', 'DATE'), ann(consulenze, '16/03/2025', 'DATE')] },
    { sectionKey: 'IMAGING_DIAGNOSTICS', detectedHeading: 'Diagnostica per immagini', rawText: imaging, sourceRanges: sr(3),
      annotations: [ann(imaging, '12/03/2025', 'DATE'), ann(imaging, '14/03/2025', 'DATE')] },
    { sectionKey: 'PROCEDURES_AND_INTERVENTIONS', detectedHeading: 'Prestazioni e interventi', rawText: procedure, sourceRanges: sr(3),
      annotations: [ann(procedure, '12/03/2025', 'DATE'), ann(procedure, '13/03/2025', 'DATE')] },
    { sectionKey: 'HOSPITAL_THERAPY', detectedHeading: 'Terapia ospedaliera', rawText: hospTherapy, sourceRanges: sr(3),
      annotations: [ann(hospTherapy, 'Furosemide', 'MEDICATION_NAME'), ann(hospTherapy, 'Enoxaparina', 'MEDICATION_NAME')],
      medications: [
        { medicationName: 'Furosemide', dose: '250 mg', schedule: '', frequency: 'infusione continua', route: 'ev', duration: '', exactText: 'Furosemide 250 mg ev in infusione continua.' },
        { medicationName: 'Enoxaparina', dose: '4000 UI', schedule: '', frequency: '1 volta al giorno', route: 'sc', duration: '', exactText: 'Enoxaparina 4000 UI sc 1 volta al giorno.' },
      ] },
    { sectionKey: 'DISCHARGE_HOME_THERAPY', detectedHeading: 'Terapia domiciliare', rawText: homeTherapy, sourceRanges: sr(4),
      annotations: [ann(homeTherapy, 'Ramipril', 'MEDICATION_NAME'), ann(homeTherapy, 'Furosemide', 'MEDICATION_NAME')],
      medications: [
        { medicationName: 'Ramipril', dose: '5 mg', schedule: 'mattino', frequency: '1 cp', route: 'orale', duration: '', exactText: 'Ramipril 5 mg 1 compressa al mattino.' },
        { medicationName: 'Furosemide', dose: '25 mg', schedule: '1-0-0', frequency: '1 cp', route: 'orale', duration: '', exactText: 'Furosemide 25 mg 1-0-0.' },
        { medicationName: '', dose: '', schedule: '', frequency: '', route: '', duration: '', exactText: '[ILLEGGIBILE] 1-0-1 secondo schema.', warnings: ['MEDICATION_COMPONENTS_NOT_FULLY_IDENTIFIED'] },
      ] },
    { sectionKey: 'ADVICE_AND_FOLLOW_UP', detectedHeading: 'Consigli e controlli', rawText: advice, sourceRanges: sr(4),
      annotations: [ann(advice, '30 giorni', 'TEMPORAL_MARKER')] },
    { sectionKey: 'UNMAPPED_CONTENT', rawText: unmapped, sourceRanges: sr(4), annotations: [] },
  ],
};

export const SHOTS = [
  ['PATIENT_DEMOGRAPHICS', 'imola-patient-demographics'],
  ['ALLERGIES', 'imola-allergy-critical'],
  ['DISCHARGE_DIAGNOSIS', 'imola-discharge-diagnosis'],
  ['ANAMNESIS', 'imola-anamnesis-bold-tags'],
  ['HOSPITAL_COURSE', 'imola-hospital-course'],
  ['CONSULTATIONS', 'imola-consultations'],
  ['IMAGING_DIAGNOSTICS', 'imola-imaging'],
  ['PROCEDURES_AND_INTERVENTIONS', 'imola-procedures'],
  ['DISCHARGE_HOME_THERAPY', 'imola-home-therapy'],
  ['ADVICE_AND_FOLLOW_UP', 'imola-advice-follow-up'],
];
