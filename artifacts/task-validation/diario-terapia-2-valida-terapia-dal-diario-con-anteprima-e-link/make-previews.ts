// Genera le risposte di anteprima con l'interprete reale del backend (PR 1), per l'evidence.
//   npx tsx <questo file>
import { writeFileSync } from 'node:fs';
import { parseDiaryTherapyText } from '../../../backend/src/therapies/diary-therapy-parse';

const DIR =
  'artifacts/task-validation/diario-terapia-2-valida-terapia-dal-diario-con-anteprima-e-link';
const TEXTS = [
  'Ramipril 5 mg 1 cpr per os ore 8',
  'Febbre Tachipirina 1000 mg 1 cpr per os ore 8',
  'Ramipril 5 mg 1 cpr per os ore 8 e 10',
  'Sospendere Ramipril',
];
const today = new Date().toISOString().slice(0, 10);
const out: Record<string, unknown> = {};
for (const t of TEXTS) out[t] = { ...parseDiaryTherapyText(t, today), source: 'deterministic' };
writeFileSync(`${DIR}/previews.json`, JSON.stringify(out, null, 2));
console.log(Object.keys(out).length, 'anteprime');
