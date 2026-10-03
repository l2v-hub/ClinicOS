// DB tests of the paper versions on a fresh database: create/patch/finalize/replay, correction,
// current/history, SQL CHECK validators, PDF text, and v1 records that stay valid and readable.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../../lib/prisma.js';
import {
  createAssessment,
  finalizeAssessment,
  getAssessment,
  patchAssessment,
} from '../service.js';
import { currentAssessment } from '../current.js';
import { listAssessments } from '../history.js';
import { assessmentRendererVersion, renderAssessmentPdf } from '../pdf-renderer.js';
import { retryAssessmentPdf } from '../pdf-service.js';
import { paperSnapshotHash } from '../paper/assessment.js';
import { PAPER_VERSIONS, type PaperSnapshot, type PaperType } from '../paper/types.js';
import { paperScale } from '../paper/engine.js';
import { actor, manager, patient, seed, input as painadInput } from './fixture.js';
import { tinettiAnswers, tinettiInput } from './tinetti-fixture.js';
import { gds15Input } from './gds15-fixture.js';
import { mnaInput } from './mna-fixture.js';
before(seed);
after(() => prisma.$disconnect());

const evidence = resolve(
  process.env.PAPER_PDF_EVIDENCE_DIRECTORY ??
    '../artifacts/task-validation/ux-direct-access-cycle/w3/pdf-unit',
);
async function pdfText(bytes: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false })
    .promise;
  const parts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    parts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return parts.join('\n').replace(/\s+/g, ' ');
}
const paperInput = (
  type: PaperType,
  answers: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) => ({
  requestId: randomUUID(),
  type,
  formVersion: PAPER_VERSIONS[type],
  assessedAt: '2026-03-28T23:30:00.000Z',
  answers,
  ...extra,
});
const barthel = (value: 0 | 'max' = 'max') => ({
  alimentazione: value === 0 ? 0 : 10,
  igiene: value === 0 ? 0 : 5,
  curaPersona: value === 0 ? 0 : 5,
  abbigliamento: value === 0 ? 0 : 10,
  intestino: value === 0 ? 0 : 10,
  vescica: value === 0 ? 0 : 10,
  gabinetto: value === 0 ? 0 : 5,
  trasferimenti: value === 0 ? 0 : 15,
  deambulazione: value === 0 ? 0 : 10,
  scale: value === 0 ? 0 : 5,
});
const mnaSf = (extra: Record<string, unknown> = {}) => ({
  a: 1,
  b: 2,
  c: 1,
  d: 2,
  e: 1,
  f1: null,
  f2: null,
  weightKg: null,
  heightM: null,
  calfCm: null,
  ...extra,
});
const gdsV2 = (answer: boolean) => ({
  ...Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`q${i + 1}`, answer])),
  notes: '',
});
const CASES: Array<{
  type: PaperType;
  draft: Record<string, unknown>;
  final: Record<string, unknown>;
  total: number;
  band: string;
  label: string;
  printed: string[];
}> = [
  {
    type: 'barthel',
    draft: { ...barthel(), scale: null },
    final: barthel(),
    total: 85,
    band: 'moderate',
    label: 'Dipendenza moderata',
    printed: [
      'INDICE DI BARTHEL',
      'PUNTEGGIO TOTALE BARTHEL: 85 / 100',
      "Firma dell'Operatore / Valutatore:",
      'Piccolo aiuto (supervisione verbale o leggero supporto)',
    ],
  },
  {
    type: 'tinetti',
    draft: { ...tinettiAnswers('maximum'), cammino: null },
    final: { ...tinettiAnswers('maximum'), sedersi: 0, traiettoria: 1 },
    total: 25,
    band: 'low',
    label: 'Rischio caduta basso / normale',
    printed: [
      'SCALA DI TINETTI',
      'Punteggio Equilibrio: 14 / 16',
      'Punteggio Andatura: 11 / 12',
      'PUNTEGGIO TOTALE: 25 / 28',
      'Lunghezza passo DX',
    ],
  },
  {
    type: 'gds15',
    draft: { ...gdsV2(true), q1: null },
    final: gdsV2(false),
    total: 5,
    band: 'none',
    label: 'Normalità',
    printed: [
      'Geriatric Depression Scale (GDS-15)',
      'È fondamentalmente soddisfatto/a della Sua vita?',
      'Punteggio: 5 / 15',
      'Intervento consigliato',
    ],
  },
  {
    type: 'mna',
    draft: mnaSf(),
    final: mnaSf({ calfCm: 29.5, f2: 0 }),
    total: 7,
    band: 'malnourished',
    label: 'Malnutrito',
    printed: [
      'Scala MNA®-SF',
      'PUNTEGGIO TOTALE (Massimo 14 punti): 7 / 14',
      'Circonferenza polpaccio minore di 31 cm',
      'Circonferenza polpaccio: 29,5 cm',
    ],
  },
  {
    type: 'ucla_npi_sleep',
    draft: { frequency: 3, severity: null, distress: null },
    final: { frequency: 3, severity: 2, distress: 4 },
    total: 6,
    band: 'present',
    label: 'Disturbo del sonno presente',
    printed: [
      'Scale Cliniche UCLA per il Ritmo Sonno-Veglia',
      'Moltiplicazione (Frequenza × Gravità) = 6 / 12',
      'Stress del caregiver: 4 / 5',
    ],
  },
];

for (const scenario of CASES)
  test(`${scenario.type} paper version: draft → patch → finalize → replay → correction → current/history → PDF`, async () => {
    const scale = paperScale(scenario.type, PAPER_VERSIONS[scenario.type])!;
    const created = (
      await createAssessment(patient, paperInput(scenario.type, scenario.draft), actor)
    ).assessment;
    assert.equal(created.formVersion, PAPER_VERSIONS[scenario.type]);
    assert.equal('layout' in created && created.layout, 'paper');
    assert.equal(created.result, null);
    const incomplete = await finalizeAssessment(
      patient,
      created.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    ).catch((e) => e);
    assert.equal(incomplete.status, 422);
    assert(incomplete.details.missingPaths.length > 0);
    const patched = await patchAssessment(
      patient,
      created.id,
      { expectedVersion: 1, assessedAt: created.assessedAt, answers: scenario.final },
      actor,
    );
    assert.equal(patched.version, 2);
    assert.equal(patched.result!.total, scenario.total);
    const request = { requestId: randomUUID(), expectedVersion: 2 };
    const final = await finalizeAssessment(patient, created.id, request, actor);
    assert.equal(final.replayed, false);
    const replay = await finalizeAssessment(patient, created.id, request, actor);
    assert.equal(replay.replayed, true);
    const dto = final.assessment;
    assert.deepEqual(
      {
        total: dto.result!.total,
        band: (dto.result as { band: string }).band,
        label: (dto.result as { label: string }).label,
      },
      { total: scenario.total, band: scenario.band, label: scenario.label },
    );
    const snapshot = dto.finalSnapshot as PaperSnapshot;
    assert.equal(snapshot.layout, 'paper');
    assert.equal(snapshot.form.sourceSha256, scale.sourceSha256);
    assert.equal(paperSnapshotHash(snapshot), dto.snapshotSha256);
    assert.equal(snapshot.result.maximum, scale.maximum);
    // a colleague sees the final, never the draft
    assert.equal((await getAssessment(patient, dto.id, manager)).id, dto.id);
    // correction keeps the original; current/history show the latest
    const correction = (
      await createAssessment(
        patient,
        paperInput(scenario.type, scenario.final, {
          predecessorId: dto.id,
          correctionReason: 'Rettifica di prova',
        }),
        actor,
      )
    ).assessment;
    const corrected = (
      await finalizeAssessment(
        patient,
        correction.id,
        { requestId: randomUUID(), expectedVersion: 1 },
        actor,
      )
    ).assessment;
    assert.equal((corrected.finalSnapshot as PaperSnapshot).predecessor?.id, dto.id);
    assert.equal(
      (await currentAssessment(patient, { type: scenario.type }, actor))!.id,
      corrected.id,
    );
    const history = await listAssessments(patient, { type: scenario.type }, actor);
    assert(history.items.some((item) => item.id === dto.id && item.correctedById === corrected.id));
    // tampering with the frozen result is rejected by the DB CHECK
    await assert.rejects(
      prisma.$executeRaw`UPDATE "PatientAssessment" SET "finalSnapshot" = jsonb_set("finalSnapshot", '{result,total}', '99') WHERE id = ${dto.id}`,
    );
    // PDF: paper layout with every chosen text, total and signature where the paper has one
    const bytes = await renderAssessmentPdf(snapshot);
    const text = await pdfText(bytes);
    for (const fragment of scenario.printed)
      assert(
        text.includes(fragment),
        `${scenario.type}: missing «${fragment}» in ${text.slice(0, 400)}`,
      );
    assert(text.includes('Élodie Παπαδόπουλος'), 'author name printed');
    assert(!/AI responses may include mistakes|risposte dell'IA/i.test(text));
    const loaded = await PDFDocument.load(bytes, { updateMetadata: false });
    assert.equal(loaded.getProducer(), `ClinicOS ${scenario.type}-paper-a4-v1`);
    assert.equal(assessmentRendererVersion(snapshot), `${scenario.type}-paper-a4-v1`);
    const correctedText = await pdfText(await renderAssessmentPdf(corrected.finalSnapshot!));
    assert(correctedText.includes('Motivo: Rettifica di prova'));
    const archived = await retryAssessmentPdf(patient, dto.id, actor);
    assert.equal(archived.pdf!.status, 'ready');
    await mkdir(evidence, { recursive: true });
    await writeFile(resolve(evidence, `${scenario.type}-paper.pdf`), bytes);
  });

test('SQL validators reject malformed answers for the new versions and keep v1 shapes valid', async () => {
  const valid = async (fn: string, answers: unknown, complete = false) =>
    (
      await prisma.$queryRawUnsafe<Array<{ ok: boolean }>>(
        `SELECT ${fn}($1::jsonb, $2) AS ok`,
        JSON.stringify(answers),
        complete,
      )
    )[0].ok;
  assert(await valid('barthel_answers_valid', barthel(), true));
  assert.equal(await valid('barthel_answers_valid', { ...barthel(), igiene: 10 }), false);
  assert.equal(await valid('barthel_answers_valid', { ...barthel(), scale: null }, true), false);
  assert.equal(await valid('barthel_answers_valid', { ...barthel(), extra: 0 }), false);
  assert(
    await valid(
      'ucla_npi_sleep_answers_valid',
      { frequency: 0, severity: null, distress: null },
      true,
    ),
  );
  assert.equal(
    await valid('ucla_npi_sleep_answers_valid', { frequency: 0, severity: 1, distress: null }),
    false,
  );
  assert.equal(
    await valid(
      'ucla_npi_sleep_answers_valid',
      { frequency: 2, severity: null, distress: 1 },
      true,
    ),
    false,
  );
  assert.equal(
    await valid('ucla_npi_sleep_answers_valid', { frequency: 5, severity: 1, distress: 1 }),
    false,
  );
  assert(await valid('mna_sf_answers_valid', mnaSf({ f1: 1 }), true));
  assert(await valid('mna_sf_answers_valid', mnaSf({ weightKg: 50, heightM: 1.7, f1: 0 }), true));
  assert.equal(
    await valid('mna_sf_answers_valid', mnaSf({ weightKg: 50, heightM: 1.7, f1: 3 })),
    false,
  );
  assert.equal(
    await valid('mna_sf_answers_valid', mnaSf({ weightKg: 50, heightM: 1.7, f2: 3 })),
    false,
  );
  assert.equal(await valid('mna_sf_answers_valid', mnaSf({ f1: 1, f2: 3 })), false);
  assert.equal(await valid('mna_sf_answers_valid', mnaSf(), true), false);
  assert.equal(await valid('mna_sf_answers_valid', mnaSf({ calfCm: 30, f2: 3 })), false);
  assert.equal(await valid('mna_sf_answers_valid', mnaSf({ heightM: 170 })), false);
  // the type CHECK accepts only the registered pairs
  const draft = (await createAssessment(patient, paperInput('barthel', barthel()), actor))
    .assessment;
  await assert.rejects(
    prisma.$executeRaw`UPDATE "PatientAssessment" SET "formVersion" = 'barthel-it-2026-10-03-v9' WHERE id = ${draft.id}`,
  );
  await assert.rejects(
    prisma.$executeRaw`UPDATE "PatientAssessment" SET answers = '{"a":0}'::jsonb WHERE id = ${draft.id}`,
  );
  // MNA v1 shape is refused under the v2 version and vice versa
  const v2 = (await createAssessment(patient, paperInput('mna', mnaSf()), actor)).assessment;
  const v1 = (await createAssessment(patient, mnaInput(), actor)).assessment;
  await assert.rejects(
    prisma.$executeRaw`UPDATE "PatientAssessment" SET "formVersion" = 'mna-it-2026-09-22-q-corrected-v1' WHERE id = ${v2.id}`,
  );
  await assert.rejects(
    prisma.$executeRaw`UPDATE "PatientAssessment" SET "formVersion" = 'mna-sf-it-2026-10-03-v2' WHERE id = ${v1.id}`,
  );
  await assert.rejects(
    createAssessment(patient, paperInput('barthel', { ...barthel(), igiene: 10 }), actor),
    (e: any) => e.status === 400,
  );
});

test('v1 Tinetti, GDS-15, MNA and PAINAD records still finalize, keep their wording and render with the legacy/PAINAD renderer', async () => {
  for (const [factory, renderer] of [
    [tinettiInput, 'tinetti-a4-v1'],
    [gds15Input, 'gds15-a4-v1'],
    [mnaInput, 'mna-a4-v2'],
    [painadInput, 'painad-paper-a4-v2'],
  ] as const) {
    const created = (await createAssessment(patient, factory(), actor)).assessment;
    const final = (
      await finalizeAssessment(
        patient,
        created.id,
        { requestId: randomUUID(), expectedVersion: 1 },
        actor,
      )
    ).assessment;
    assert(!('layout' in final), `${final.type} v1 keeps the legacy DTO`);
    assert.equal(assessmentRendererVersion(final.finalSnapshot!), renderer);
    const bytes = await renderAssessmentPdf(final.finalSnapshot!);
    assert.equal((await PDFDocument.load(bytes, { updateMetadata: false })).getProducer(), `ClinicOS ${renderer}`);
    const reread = await getAssessment(patient, final.id, actor);
    assert.deepEqual(reread.finalSnapshot, final.finalSnapshot);
    if (final.type === 'tinetti')
      assert.equal(
        (final.finalSnapshot as { items: Array<{ label: string }> }).items[0].label,
        'Equilibrio seduto',
      );
    if (final.type === 'painad') {
      const text = await pdfText(bytes);
      assert(text.includes('Scala PAINAD — Scheda di Valutazione'));
      assert(text.includes('PUNTEGGIO TOTALE PAINAD (0 - 10):'));
      assert(text.includes('Impossibile da rassicurare, distrarre o consolare.'));
      await mkdir(evidence, { recursive: true });
      await writeFile(resolve(evidence, 'painad-paper.pdf'), bytes);
    }
    // a correction of a v1 MNA is compiled on the MNA-SF v2 form
    if (final.type === 'mna') {
      const correction = (
        await createAssessment(
          patient,
          paperInput('mna', mnaSf({ f1: 2 }), {
            predecessorId: final.id,
            correctionReason: 'Passaggio a MNA-SF',
          }),
          actor,
        )
      ).assessment;
      const corrected = (
        await finalizeAssessment(
          patient,
          correction.id,
          { requestId: randomUUID(), expectedVersion: 1 },
          actor,
        )
      ).assessment;
      assert.equal(corrected.formVersion, PAPER_VERSIONS.mna);
      assert.equal(corrected.result!.total, 9);
      assert.equal((await getAssessment(patient, final.id, actor)).correctedById, corrected.id);
    }
  }
});
