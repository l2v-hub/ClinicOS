import type { PatientTherapyAPI } from '../../../types';
import { administrationUnitForForm, type ScheduleRow } from './therapyDose';

// Prefer saved quantities/units; legacy rows can derive a unit only from their saved form.
export function schedulesFromTherapy(t: PatientTherapyAPI): ScheduleRow[] {
  const unit = administrationUnitForForm(t.pharmaceuticalForm ?? '') || 'compressa';
  if (t.schedules && t.schedules.length) {
    return t.schedules
      .map((s) => ({
        time: s.time,
        quantityNumerator: s.quantityNumerator,
        quantityDenominator: s.quantityDenominator,
        administrationUnit: s.administrationUnit || unit,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }
  const times: string[] = [];
  if (t.orarioSpecifico)
    times.push(
      ...t.orarioSpecifico
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  if (!times.length) {
    if (t.fasceMattina) times.push('08:00');
    if (t.fascePranzo) times.push('12:00');
    if (t.fascePomeriggio) times.push('16:00');
    if (t.fasceSera) times.push('20:00');
    if (t.fasceNotte) times.push('22:00');
  }
  if (!times.length) times.push('08:00');
  return times.map((time) => ({
    time,
    quantityNumerator: 1,
    quantityDenominator: 1,
    administrationUnit: unit,
  }));
}
