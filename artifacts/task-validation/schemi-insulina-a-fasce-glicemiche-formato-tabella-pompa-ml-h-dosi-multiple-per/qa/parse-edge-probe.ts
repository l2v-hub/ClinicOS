// Edge probes of the deterministic parser (QA diff review). Synthetic text only.
import { parseDischargeTherapy } from '../../../../backend/src/intake/parse-discharge-therapy.ts';
const cases: Record<string, string> = {
  mixedUnits: 'Terapia\nInsulina rapida secondo schema:\n150-200 2 U\n201-250 3 ml/h\n>250 4 ml/h',
  noBoloTwoDoses:
    'Terapia\nInsulina rapida secondo schema:\n150-200 2 U.I\n>200 5 U.I e.v. + 15 U.I s.c',
  ocr10: 'Terapia\nInsulina rapida secondo schema:\n10-120 2 U.I\n121-140 4 U.I',
  pump: 'Terapia\nInsulina in pompa ev secondo schema:\nGLICEMIA VELOCITA\n140-150 1 ml/h\n151-200 2 ml/h\n>350 6 ML/H + 6 U.I in bolo',
};
for (const [name, text] of Object.entries(cases)) {
  const rows = parseDischargeTherapy(text).map((r) => ({
    farmacoNome: r.farmacoNome,
    stato: r.stato,
    doseMode: r.doseMode,
    glucoseDoseUnit: r.glucoseDoseUnit,
    glucoseScale: r.glucoseScale,
    glucoseScaleWarnings: r.glucoseScaleWarnings,
  }));
  console.log(`=== ${name}\n${JSON.stringify(rows)}`);
}
