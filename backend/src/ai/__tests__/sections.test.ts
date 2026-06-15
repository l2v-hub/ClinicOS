import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSectionsRequest,
  loadProfile,
  postProcessSections,
  validateSectionsSchema,
  isConfirmBlocked,
  SECTION_KEYS,
  type Annotation,
} from '../sections/index.js';

// Helper: build an annotation whose offsets are computed from rawText (model-faithful).
function ann(rawText: string, text: string, tag: Annotation['tag']): Annotation {
  const i = rawText.indexOf(text);
  return { tag, text, startOffset: i, endOffset: i + text.length };
}

function pp(data: unknown) {
  return postProcessSections(data);
}

// ── Profile / request contract ───────────────────────────────────────────────

test('profile exposes the 12 canonical sections and configurable aliases', () => {
  const p = loadProfile(true);
  assert.equal(p.sections.length, 12);
  for (const k of SECTION_KEYS) assert.ok(p.sections.some((s) => s.key === k), `missing ${k}`);
  const anamnesi = p.sections.find((s) => s.key === 'ANAMNESIS')!;
  assert.ok(anamnesi.aliases.includes('Anamnesi patologica remota'));
});

test('buildSectionsRequest returns schema + a profile-derived prompt (no HTML, lists aliases)', () => {
  const { schema, prompt } = buildSectionsRequest();
  assert.equal(typeof schema, 'object');
  assert.match(prompt, /Diagnosi di dimissione/); // alias from profile reached the prompt
  assert.match(prompt, /VIETATO inserire HTML/);
  assert.match(prompt, /UN UNICO blocco/);
});

// ── Schema validation ─────────────────────────────────────────────────────────

test('schema rejects an unknown sectionKey and unknown tag', () => {
  assert.equal(validateSectionsSchema({ sections: [{ sectionKey: 'NOPE', rawText: 'x' }] }).valid, false);
  assert.equal(validateSectionsSchema({ sections: [{ sectionKey: 'ANAMNESIS', rawText: 'x', annotations: [{ tag: 'BOLD', text: 'x', startOffset: 0, endOffset: 1 }] }] }).valid, false);
});

// ── Faithful single-block sections ─────────────────────────────────────────────

test('discharge diagnosis: multi-paragraph text stays one faithful block', () => {
  const rawText = 'Diagnosi di dimissione\nScompenso cardiaco.\n\nIpertensione arteriosa.\nDiabete mellito tipo 2.';
  const r = pp({ sections: [{ sectionKey: 'DISCHARGE_DIAGNOSIS', rawText }] });
  const s = r.sections.find((x) => x.sectionKey === 'DISCHARGE_DIAGNOSIS')!;
  assert.equal(s.rawText, rawText); // not summarised, not rewritten, not reordered
});

test('anamnesis: subtitles annotated, kept in one block', () => {
  const rawText = 'Anamnesi patologica remota: pregresso IMA. Anamnesi familiare: padre diabetico.';
  const r = pp({
    sections: [{
      sectionKey: 'ANAMNESIS',
      rawText,
      annotations: [ann(rawText, 'Anamnesi patologica remota', 'SUBSECTION_TITLE'), ann(rawText, 'Anamnesi familiare', 'SUBSECTION_TITLE')],
    }],
  });
  const s = r.sections[0];
  assert.equal(s.rawText, rawText);
  assert.equal(s.annotations!.length, 2);
  for (const a of s.annotations!) assert.equal(s.rawText.slice(a.startOffset, a.endOffset), a.text);
});

test('hospital course: multiple dates annotated, sequence preserved', () => {
  const rawText = 'Il 12/03/2025 ingresso in reparto. Il 15/03/2025 stabilizzazione. Dimesso il 18/03/2025.';
  const r = pp({
    sections: [{
      sectionKey: 'HOSPITAL_COURSE',
      rawText,
      annotations: [ann(rawText, '12/03/2025', 'DATE'), ann(rawText, '15/03/2025', 'DATE'), ann(rawText, '18/03/2025', 'DATE')],
    }],
  });
  assert.equal(r.sections[0].annotations!.length, 3);
  assert.equal(r.sections[0].rawText, rawText);
});

test('consultations / imaging / procedures / advice each stay a single block', () => {
  for (const key of ['CONSULTATIONS', 'IMAGING_DIAGNOSTICS', 'PROCEDURES_AND_INTERVENTIONS', 'ADVICE_AND_FOLLOW_UP'] as const) {
    const rawText = `${key} riga1.\nriga2 con data 01/02/2025.\nriga3.`;
    const r = pp({ sections: [{ sectionKey: key, rawText }] });
    assert.equal(r.sections[0].rawText, rawText);
  }
});

// ── Therapy ─────────────────────────────────────────────────────────────────

test('home therapy keeps medication name/dose/frequency when readable', () => {
  const rawText = 'Terapia domiciliare:\nRamipril 5 mg 1 cp al giorno.';
  const r = pp({
    sections: [{
      sectionKey: 'DISCHARGE_HOME_THERAPY',
      rawText,
      medications: [{ medicationName: 'Ramipril', dose: '5 mg', schedule: '1 cp', frequency: 'al giorno', exactText: 'Ramipril 5 mg 1 cp al giorno.' }],
    }],
  });
  const m = r.sections[0].medications![0];
  assert.equal(m.medicationName, 'Ramipril');
  assert.deepEqual(m.warnings, []); // fully identified -> no warning
  assert.ok(r.sections[0].rawText.includes(m.exactText));
});

test('partially unreadable therapy line keeps exactText and warns', () => {
  const rawText = 'Terapia domiciliare:\n[ILLEGGIBILE] 1-0-1.';
  const r = pp({
    sections: [{
      sectionKey: 'DISCHARGE_HOME_THERAPY',
      rawText,
      medications: [{ medicationName: '', dose: '', schedule: '', frequency: '', exactText: '[ILLEGGIBILE] 1-0-1.' }],
    }],
  });
  const m = r.sections[0].medications![0];
  assert.equal(m.exactText, '[ILLEGGIBILE] 1-0-1.'); // text never dropped
  assert.ok(m.warnings!.includes('MEDICATION_COMPONENTS_NOT_FULLY_IDENTIFIED'));
});

test('home therapy is a distinct section from hospital therapy', () => {
  const r = pp({
    sections: [
      { sectionKey: 'HOSPITAL_THERAPY', rawText: 'In reparto: eparina.' },
      { sectionKey: 'DISCHARGE_HOME_THERAPY', rawText: 'A domicilio: ramipril.' },
    ],
  });
  assert.ok(r.sections.find((s) => s.sectionKey === 'HOSPITAL_THERAPY'));
  assert.ok(r.sections.find((s) => s.sectionKey === 'DISCHARGE_HOME_THERAPY'));
  assert.notEqual(r.sections[0].rawText, r.sections[1].rawText);
});

// ── Allergies (top priority) ───────────────────────────────────────────────────

test('explicit allergy -> present', () => {
  const r = pp({ sections: [{ sectionKey: 'ALLERGIES', rawText: 'Allergia a Penicillina.' }], allergies: { status: 'present', rawText: 'Allergia a Penicillina.' } });
  assert.equal(r.allergies.status, 'present');
  assert.equal(isConfirmBlocked(r), false);
});

test('explicitly declared absence -> explicitly_absent', () => {
  const r = pp({ sections: [{ sectionKey: 'ALLERGIES', rawText: 'Allergie: nessuna nota.' }], allergies: { status: 'explicitly_absent' } });
  assert.equal(r.allergies.status, 'explicitly_absent');
});

test('no allergy block -> not_documented (absence of text != absence of allergies)', () => {
  const r = pp({ sections: [{ sectionKey: 'DISCHARGE_DIAGNOSIS', rawText: 'x' }] });
  assert.equal(r.allergies.status, 'not_documented');
});

test('illegible allergy -> unclear, text not interpreted', () => {
  const raw = 'Allergia a [ILLEGGIBILE]';
  const r = pp({ sections: [{ sectionKey: 'ALLERGIES', rawText: raw }], allergies: { status: 'unclear', rawText: raw, warnings: ['ALLERGY_TEXT_PARTIALLY_UNREADABLE'] } });
  assert.equal(r.allergies.status, 'unclear');
  assert.equal(r.allergies.rawText, raw);
});

test('conflicting allergy info blocks confirmation', () => {
  const r = pp({ sections: [{ sectionKey: 'ALLERGIES', rawText: 'Allergia a Penicillina. Nessuna allergia nota.' }], allergies: { status: 'conflicting' } });
  assert.equal(r.allergies.status, 'conflicting');
  assert.equal(isConfirmBlocked(r), true);
});

// ── Unmapped content + tag integrity ────────────────────────────────────────────

test('unmapped content is preserved, never dropped', () => {
  const rawText = 'Timbro reparto e firma illeggibile.';
  const r = pp({ sections: [{ sectionKey: 'UNMAPPED_CONTENT', rawText }] });
  assert.equal(r.sections.find((s) => s.sectionKey === 'UNMAPPED_CONTENT')!.rawText, rawText);
});

test('annotation with wrong offsets is relocated to the exact substring', () => {
  const rawText = 'Controllo il 09/09/2025 in ambulatorio.';
  const r = pp({ sections: [{ sectionKey: 'ADVICE_AND_FOLLOW_UP', rawText, annotations: [{ tag: 'DATE', text: '09/09/2025', startOffset: 0, endOffset: 3 }] }] });
  const a = r.sections[0].annotations![0];
  assert.equal(rawText.slice(a.startOffset, a.endOffset), '09/09/2025');
  assert.ok(r.sections[0].warnings!.includes('ANNOTATION_OFFSET_CORRECTED'));
});

test('annotation whose text is absent from rawText is dropped (rawText never mutated)', () => {
  const rawText = 'Decorso regolare.';
  const r = pp({ sections: [{ sectionKey: 'HOSPITAL_COURSE', rawText, annotations: [{ tag: 'DATE', text: '01/01/2099', startOffset: 0, endOffset: 10 }] }] });
  assert.equal(r.sections[0].annotations!.length, 0);
  assert.equal(r.sections[0].rawText, rawText);
  assert.ok(r.sections[0].warnings!.includes('ANNOTATION_OFFSET_MISMATCH'));
});

test('HTML inside an annotation is stripped out (tags carry no HTML)', () => {
  const rawText = 'Diagnosi: BPCO.';
  const r = pp({ sections: [{ sectionKey: 'DISCHARGE_DIAGNOSIS', rawText, annotations: [{ tag: 'SECTION_TITLE', text: '<b>Diagnosi</b>', startOffset: 0, endOffset: 15 }] }] });
  assert.equal(r.sections[0].annotations!.length, 0);
  assert.ok(r.sections[0].warnings!.includes('ANNOTATION_HTML_REMOVED'));
});

test('duplicate section keys collapse into one block with shifted annotation offsets', () => {
  const r = pp({
    sections: [
      { sectionKey: 'ANAMNESIS', rawText: 'Parte A.', annotations: [ann('Parte A.', 'Parte A.', 'SUBSECTION_TITLE')] },
      { sectionKey: 'ANAMNESIS', rawText: 'Parte B.', annotations: [ann('Parte B.', 'Parte B.', 'SUBSECTION_TITLE')] },
    ],
  });
  const merged = r.sections.filter((s) => s.sectionKey === 'ANAMNESIS');
  assert.equal(merged.length, 1); // single block
  const s = merged[0];
  assert.equal(s.rawText, 'Parte A.\nParte B.');
  for (const a of s.annotations!) assert.equal(s.rawText.slice(a.startOffset, a.endOffset), a.text);
});
