import { parseDischargeTherapy } from '../../../../backend/src/intake/parse-discharge-therapy.ts';
import { TABLE, IMOLA } from './texts.mjs';
for (const [n, t] of [['TABLE', TABLE], ['IMOLA', IMOLA], ['TABLE_OCR_11', TABLE.replace('111-120', '11-120')]] as const) {
  console.log('=== ' + n);
  console.log(JSON.stringify(parseDischargeTherapy(t), null, 1));
}
