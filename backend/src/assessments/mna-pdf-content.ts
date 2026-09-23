import type { MnaSnapshot } from './mna-types.js';

export interface MnaPdfBlock {
  text: string;
  bold?: boolean;
  size?: number;
  gap?: number;
  keepSpace?: number;
}
const score = (value: number) => String(value).replace('.', ',');
export function mnaPdfBlocks(snapshot: MnaSnapshot): MnaPdfBlock[] {
  const blocks: MnaPdfBlock[] = [];
  const rawBlock = (text: string, bold = false, size = 10, keepSpace = 50) =>
    blocks.push({ text, bold, size, keepSpace });
  // Apply equivalent typography only to source/editorial text. Free text and
  // patient data must reach the renderer unchanged, including unsupported glyphs.
  const block = (text: string, bold = false, size = 10, keepSpace = 50) =>
    rawBlock(
      text.replaceAll('≤', '<=').replaceAll('≥', '>=').replaceAll('→', 'diventa'),
      bold,
      size,
      keepSpace,
    );
  rawBlock(
    'Sesso: ' +
      (snapshot.demographics.sex ?? 'Non disponibile') +
      ' | Età alla valutazione: ' +
      (snapshot.demographics.ageAtAssessment === null
        ? 'Non disponibile'
        : snapshot.demographics.ageAtAssessment + ' anni') +
      '\nData di riferimento età: ' +
      snapshot.demographics.ageOnDate +
      ' (Europe/Rome)',
  );
  for (const group of ['screening', 'global'] as const) {
    block(
      group === 'screening'
        ? 'Screening A–F (massimo 14 punti)'
        : snapshot.extent === 'screening'
          ? 'Dati globali aggiuntivi conservati — non inclusi nel totale'
          : 'Valutazione globale G–R (massimo 16 punti)',
      true,
      12,
      100,
    );
    const progress = snapshot.completion[group];
    block('Voci complete: ' + progress.answeredCount + ' / ' + progress.requiredCount, false, 9);
    for (const item of snapshot.items.filter((item) => item.group === group)) {
      block(
        item.id +
          '. ' +
          item.label +
          ' — ' +
          (item.score === null ? 'Non compilato' : score(item.score) + ' punti'),
        true,
        10,
        85,
      );
      if (item.id === 'K') {
        for (const subitem of item.subitems ?? [])
          block(
            subitem.label +
              ': ' +
              (subitem.answer === null ? 'Non compilato' : subitem.answer ? 'Sì' : 'No'),
            false,
            9,
          );
      } else block(item.description ?? 'Risposta non compilata', false, 10);
      if (item.id === 'F' || item.id === 'Q' || item.id === 'R') {
        const answer = snapshot.answers[item.id];
        block(
          'Metodo: ' +
            (answer.method === 'measured' ? 'Calcolo da misure' : 'Categoria dichiarata'),
          false,
          9,
        );
        const ids =
          item.id === 'F'
            ? ['weightKg', 'heightCm']
            : item.id === 'Q'
              ? ['armCircumferenceCm']
              : ['calfCircumferenceCm'];
        for (const measurement of snapshot.measurements.filter((measurement) =>
          ids.includes(measurement.id),
        )) {
          block(
            measurement.label +
              ': ' +
              (measurement.value === null
                ? 'Non disponibile'
                : score(measurement.value) + ' ' + measurement.unit) +
              ' | Data misura: ' +
              (measurement.measuredOn ?? 'Non disponibile') +
              '\nDato inserito manualmente nella valutazione',
            false,
            9,
          );
        }
        if (item.id === 'F')
          block(
            'IMC: ' +
              (snapshot.bmi === null ? 'Non disponibile' : score(snapshot.bmi) + ' kg/m²') +
              (snapshot.bmi === null ? '' : ' (soglie applicate al valore non arrotondato)'),
            false,
            9,
          );
      }
    }
    const result = snapshot.result[group];
    block(
      (group === 'screening' ? 'Screening' : 'Subtotale globale') +
        ': ' +
        (result === null
          ? 'Non disponibile — sezione incompleta'
          : score(result.score) +
            ' / ' +
            result.maximum +
            ('label' in result ? ' — ' + result.label : '')),
      true,
      11,
      75,
    );
  }
  if (snapshot.extent === 'full') {
    const result = snapshot.result.total;
    block(
      'Totale MNA: ' +
        (result === null
          ? 'Non disponibile — valutazione incompleta'
          : score(result.score) + ' / 30 — ' + result.label),
      true,
      12,
      90,
    );
    block(
      'Fasce: meno di 17 cattivo stato nutrizionale; 17–23,5 rischio di malnutrizione; 24–30 stato nutrizionale normale.',
      false,
      9,
    );
  } else
    block(
      'Finalizzata come Screening MNA®. I dati G–R conservati non costituiscono una valutazione completa; nessun totale a 30.',
      false,
      10,
    );
  block(
    'Screening: 0–7 malnutrito; 8–11 a rischio di malnutrizione; 12–14 stato nutrizionale normale. Con screening ≤ 11 è indicato completare la valutazione globale, sempre disponibile.',
    false,
    9,
  );
  block(
    'Le fasce sono interpretazioni dello strumento: nessuna diagnosi o trattamento automatico.',
    false,
    9,
  );
  if (snapshot.notes) {
    block('Note', true, 12, 80);
    rawBlock(snapshot.notes);
  }
  block('Fonte e versione: ' + snapshot.form.version, true, 10, 75);
  block(snapshot.provenance, false, 9);
  block('Riferimenti bibliografici', true, 10, 75);
  for (const reference of snapshot.references) block(reference, false, 8);
  block(snapshot.copyright, false, 8, 65);
  return blocks;
}
