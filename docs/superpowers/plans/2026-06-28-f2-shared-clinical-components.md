# F2 — Shared Clinical Components (#123) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the patient-chart clinical section editors into mode-aware, presentational, reusable components driven by a canonical registry, so the chart, intake workspace (#122) and import review (#124) all render the same editors.

**Architecture:** Each editor becomes a **controlled** component (`value` + `onChange`, pure UI — no internal fetch/persist). A canonical registry `patientSections.ts` lists every section with intake/import/permission metadata. A thin per-section wrapper resolves the data source by `mode`: `patient-chart` (read/write `Cartella` via the existing `onUpdate`), `intake`/`review` (read/write a plain `IntakeSectionData` object the parent owns). F2 wires only the `patient-chart` mode (refactor the chart, prove no regression); `intake`/`review` value/onChange are supplied later by F3/F4. No `New*` / `Imported*` / `Chart*` copies.

**Tech Stack:** React + TypeScript + Vite. Pure-logic tests via node test runner (`tsx --test`, same as existing `frontend/src/**/__tests__/*.test.ts`). Visual verification via `.claude/skills/run-clinicos/driver.mjs`.

## Global Constraints

- Do NOT change backend, Prisma schema, API routes, or `VITE_API_URL` (CLAUDE.md).
- Reuse the unified nav/components; no parallel components; medical-blue palette, no red as brand.
- Local heavy builds OOM — run `node ../node_modules/vite/bin/vite.js build` from `frontend/` (not `npx`, which a shell hook rewrites to `npm`); authoritative `tsc -b` runs on Vercel deploy. Type-check a single file locally with `node ../node_modules/typescript/bin/tsc --noEmit <file>` only if needed.
- Run unit tests with: `node node_modules/tsx/dist/cli.mjs --test frontend/src/<path>.test.ts` from repo root.
- Each editor's existing visual output and chart behaviour MUST be unchanged after extraction (no regression).
- Commit after every task.

---

### Task 1: Shared section types

**Files:**
- Create: `frontend/src/components/operator/sections/types.ts`

**Interfaces:**
- Produces:
  - `type SectionMode = 'patient-chart' | 'intake' | 'review'`
  - `interface SectionProps<T> { mode: SectionMode; value: T; onChange: (next: T) => void; readOnly?: boolean; operatoreNome?: string }`
  - `interface PatientSectionDefinition { sectionKey: string; title: string; component: React.ComponentType<SectionProps<unknown>>; availableDuringIntake: boolean; requiredDuringIntake: boolean; supportedByDocumentImport: boolean; permissions: string[] }`

- [ ] **Step 1: Write the types file**

```ts
// frontend/src/components/operator/sections/types.ts
import type { ComponentType } from 'react';

export type SectionMode = 'patient-chart' | 'intake' | 'review';

/** Every clinical editor is controlled: it renders `value` and reports edits via `onChange`.
 *  It never fetches or persists — the parent (chart / intake workspace / import review) owns that. */
export interface SectionProps<T = unknown> {
  mode: SectionMode;
  value: T;
  onChange: (next: T) => void;
  readOnly?: boolean;
  operatoreNome?: string;
}

export interface PatientSectionDefinition {
  sectionKey: string;
  title: string;
  component: ComponentType<SectionProps<never>>;
  availableDuringIntake: boolean;
  requiredDuringIntake: boolean;
  supportedByDocumentImport: boolean;
  permissions: string[];
}
```

- [ ] **Step 2: Type-check the file**

Run: `cd frontend && node ../node_modules/typescript/bin/tsc --noEmit --jsx react-jsx src/components/operator/sections/types.ts`
Expected: no output (passes).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/operator/sections/types.ts
git commit -m "feat(sections): shared SectionProps + PatientSectionDefinition types (#123)"
```

---

### Task 2: Canonical section registry

**Files:**
- Create: `frontend/src/components/operator/sections/patientSections.ts`
- Create: `frontend/src/components/operator/sections/__tests__/patientSections.test.ts`

**Interfaces:**
- Consumes: `PatientSectionDefinition` from Task 1.
- Produces:
  - `const PATIENT_SECTIONS: PatientSectionDefinition[]`
  - `function intakeSections(): PatientSectionDefinition[]` (filter `availableDuringIntake`)
  - `function getSection(sectionKey: string): PatientSectionDefinition | undefined`

Registry rows derived from the gap analysis (`docs/patient-intake/patient-chart-intake-gap-analysis.md` §3–4). `component` is filled in as each editor is extracted (Tasks 3+); until then point to a placeholder that throws if rendered, so the registry compiles but unimplemented sections fail loudly rather than silently.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/components/operator/sections/__tests__/patientSections.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATIENT_SECTIONS, intakeSections, getSection } from '../patientSections.js';

test('registry lists the core clinical sections', () => {
  const keys = PATIENT_SECTIONS.map(s => s.sectionKey);
  for (const k of ['allergie', 'diagnosi', 'terapia', 'parametri', 'dolore', 'anamnesi']) {
    assert.ok(keys.includes(k), `missing section ${k}`);
  }
});

test('intakeSections returns only intake-available sections', () => {
  assert.ok(intakeSections().every(s => s.availableDuringIntake));
});

test('getSection resolves by key', () => {
  assert.equal(getSection('allergie')?.sectionKey, 'allergie');
  assert.equal(getSection('nope'), undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/tsx/dist/cli.mjs --test frontend/src/components/operator/sections/__tests__/patientSections.test.ts`
Expected: FAIL — cannot find `../patientSections.js`.

- [ ] **Step 3: Write the registry**

```ts
// frontend/src/components/operator/sections/patientSections.ts
import type { ComponentType } from 'react';
import type { PatientSectionDefinition, SectionProps } from './types.js';

const TODO: ComponentType<SectionProps<never>> = () => { throw new Error('section component not yet extracted'); };

export const PATIENT_SECTIONS: PatientSectionDefinition[] = [
  { sectionKey: 'allergie',   title: 'Allergie',            component: TODO, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: true,  permissions: ['operatore'] },
  { sectionKey: 'anamnesi',   title: 'Anamnesi',            component: TODO, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: true,  permissions: ['operatore'] },
  { sectionKey: 'diagnosi',   title: 'Diagnosi',            component: TODO, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: true,  permissions: ['operatore'] },
  { sectionKey: 'terapia',    title: 'Terapia Farmacologica', component: TODO, availableDuringIntake: true, requiredDuringIntake: false, supportedByDocumentImport: true, permissions: ['operatore'] },
  { sectionKey: 'parametri',  title: 'Parametri Vitali',    component: TODO, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: false, permissions: ['operatore'] },
  { sectionKey: 'dolore',     title: 'Dolore (NRS)',        component: TODO, availableDuringIntake: true,  requiredDuringIntake: false, supportedByDocumentImport: false, permissions: ['operatore'] },
];

export function intakeSections(): PatientSectionDefinition[] {
  return PATIENT_SECTIONS.filter(s => s.availableDuringIntake);
}

export function getSection(sectionKey: string): PatientSectionDefinition | undefined {
  return PATIENT_SECTIONS.find(s => s.sectionKey === sectionKey);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules/tsx/dist/cli.mjs --test frontend/src/components/operator/sections/__tests__/patientSections.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/operator/sections/patientSections.ts frontend/src/components/operator/sections/__tests__/patientSections.test.ts
git commit -m "feat(sections): canonical patient-section registry (#123)"
```

---

### Task 3: Extract AllergiesEditor (template — controlled, presentational)

This is the **template** every later editor extraction follows: lift the current chart editor's JSX into a controlled component that takes `value`/`onChange`, and re-wire the chart to render it through the section wrapper with `mode="patient-chart"`.

**Files:**
- Create: `frontend/src/components/operator/sections/AllergiesEditor.tsx`
- Modify: `frontend/src/components/operator/PatientDetail.tsx` (replace the inline allergie editor — currently `saveAllergie`/`addAllergia` near `PatientDetail.tsx:385` — with `<AllergiesEditor mode="patient-chart" value={cartella.allergie ?? []} onChange={list => upd({ allergie: list })} />`)
- Modify: `frontend/src/components/operator/sections/patientSections.ts` (set `allergie.component = AllergiesEditor`)

**Interfaces:**
- Consumes: `SectionProps` (Task 1); `AllergiaItem` (from `../../../types`).
- Produces: `function AllergiesEditor(props: SectionProps<AllergiaItem[]>): JSX.Element`

- [ ] **Step 1: Read the current allergie editor** in `PatientDetail.tsx` (the `allergiaForm` state, `addAllergia`, `saveAllergie`, and the JSX list/form that renders `cartella.allergie`). Copy its markup + local form state verbatim.

- [ ] **Step 2: Write `AllergiesEditor.tsx`** — same markup, but read from `props.value` and emit via `props.onChange` instead of `cartella.allergie`/`upd`:

```tsx
// frontend/src/components/operator/sections/AllergiesEditor.tsx
import { useState } from 'react';
import type { AllergiaItem } from '../../../types';
import type { SectionProps } from './types';
import { IcoCheck, IcoTrash } from '../../../icons';

export function AllergiesEditor({ value, onChange, readOnly }: SectionProps<AllergiaItem[]>) {
  const list = value ?? [];
  const [form, setForm] = useState<Partial<AllergiaItem>>({});

  function add() {
    if (!form.allergene) return;
    onChange([...list, { allergene: form.allergene, reazione: form.reazione ?? '', gravita: form.gravita ?? 'lieve' } as AllergiaItem]);
    setForm({});
  }
  function remove(i: number) { onChange(list.filter((_, idx) => idx !== i)); }

  return (
    <div className="alg-editor">
      {list.length === 0 && <p className="cr-empty">Nessuna allergia registrata.</p>}
      {list.map((a, i) => (
        <div key={i} className="alg-row">
          <span>{a.allergene}{a.reazione ? ` — ${a.reazione}` : ''}{a.gravita ? ` (${a.gravita})` : ''}</span>
          {!readOnly && <button className="icon-btn icon-btn--sm icon-btn--danger" title="Elimina" onClick={() => remove(i)}><IcoTrash /></button>}
        </div>
      ))}
      {!readOnly && (
        <div className="alg-form">
          <input className="form-input" placeholder="Allergene" value={form.allergene ?? ''} onChange={e => setForm(f => ({ ...f, allergene: e.target.value }))} />
          <input className="form-input" placeholder="Reazione" value={form.reazione ?? ''} onChange={e => setForm(f => ({ ...f, reazione: e.target.value }))} />
          <select className="form-input" value={form.gravita ?? 'lieve'} onChange={e => setForm(f => ({ ...f, gravita: e.target.value as AllergiaItem['gravita'] }))}>
            <option value="lieve">Lieve</option><option value="moderata">Moderata</option><option value="grave">Grave</option>
          </select>
          <button className="btn-primary btn-sm" onClick={add}><IcoCheck /> Aggiungi</button>
        </div>
      )}
    </div>
  );
}
```

> Match the exact class names + fields the current chart uses (read in Step 1) so styling is identical. The block above is the shape; align field names (`gravita` values, etc.) to `AllergiaItem` in `types.ts`.

- [ ] **Step 3: Wire it into the chart** — in `PatientDetail.tsx`, replace the inline allergie editor JSX with:

```tsx
<AllergiesEditor mode="patient-chart" value={cartella.allergie ?? []} onChange={list => upd({ allergie: list })} />
```
and add the import `import { AllergiesEditor } from './sections/AllergiesEditor';`. Remove the now-dead local `allergiaForm`/`addAllergia`/`saveAllergie` if no longer referenced.

- [ ] **Step 4: Point the registry at it** — in `patientSections.ts`, `import { AllergiesEditor }` and set the `allergie` row's `component: AllergiesEditor as ...`.

- [ ] **Step 5: Build + visual verify (no regression)**

```bash
cd frontend && node ../node_modules/vite/bin/vite.js build   # must succeed
# start app per run-clinicos skill, then:
MSYS_NO_PATHCONV=1 node .claude/skills/run-clinicos/driver.mjs shot / /tmp/allergie.png desktop operatore "Pazienti>>Moretti, Elena>>Clinica>>Allergie"
```
Expected: build OK; the Allergie section in the chart renders + add/remove works identically to before. Read the PNG to confirm.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/operator/sections/AllergiesEditor.tsx frontend/src/components/operator/sections/patientSections.ts frontend/src/components/operator/PatientDetail.tsx
git commit -m "refactor(sections): extract controlled AllergiesEditor, wire chart via registry (#123)"
```

---

### Tasks 4–8: Extract the remaining core editors (same template as Task 3)

For each, follow Task 3's six steps exactly (read current editor → write controlled `*Editor.tsx` consuming `SectionProps<T>` → re-wire the chart with `mode="patient-chart" value=… onChange=…` → set the registry `component` → build + driver visual verify the chart section unchanged → commit). Each is its own task/commit.

- [ ] **Task 4 — DiagnosisEditor** · `value: Diagnosi[]` · current source: `PatientDetail.renderDiagnosi` · chart wiring `value={cartella.diagnosi ?? []} onChange={list => upd({ diagnosi: list })}`.
- [ ] **Task 5 — TherapyEditor** · current source: `cartella/TerapiaFarmacologicaTab.tsx` (uses the `PatientTherapy`/`TherapySchedule` API, not `cartella`) — in `patient-chart` mode keep its existing API calls behind the controlled boundary by passing `patientId` through `SectionProps` extension `{ patientId?: string }`; `value`/`onChange` carry the in-progress structured therapy list for `intake` mode. Verify Terapia tab unchanged.
- [ ] **Task 6 — VitalSignsEditor** · `value: Cartella['parametriVitali']` · source: `cartella/ParametriTab.tsx` · chart wiring `value={cartella.parametriVitali ?? []} onChange={list => upd({ parametriVitali: list })}`.
- [ ] **Task 7 — PainAssessmentEditor (NRS)** · source: `cartella/ScalaNRSTab.tsx` · chart wiring via the NRS module data in `cartella`.
- [ ] **Task 8 — AnamnesisEditor** · `value: Cartella['anamnesi']` · source: `PatientDetail.renderAnamnesi` (the `patologicaProssima`/`patologicaRemota`/`fisiologica`/`abitudini`/`note` textareas) · chart wiring `value={cartella.anamnesi ?? {}} onChange={a => upd({ anamnesi: a })}`.

After each task: `node node_modules/tsx/dist/cli.mjs --test frontend/src/components/operator/sections/__tests__/patientSections.test.ts` still passes (registry intact).

---

### Task 9: Section wrapper + registry-driven render helper

**Files:**
- Create: `frontend/src/components/operator/sections/PatientSection.tsx`
- Create: `frontend/src/components/operator/sections/__tests__/sectionResolve.test.ts`

**Interfaces:**
- Consumes: `getSection` (Task 2), `SectionProps` (Task 1).
- Produces: `function PatientSection(props: { sectionKey: string } & SectionProps<never>): JSX.Element | null` — looks up the registry component by key and renders it, or `null` + a console.warn if unknown/unimplemented.

- [ ] **Step 1: Write the failing test** (pure resolver split out so it is testable without React):

```ts
// frontend/src/components/operator/sections/__tests__/sectionResolve.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSectionComponent } from '../PatientSection.js';
test('resolves a registered, implemented section', () => {
  assert.ok(resolveSectionComponent('allergie'));
});
test('returns null for unknown section', () => {
  assert.equal(resolveSectionComponent('nope'), null);
});
```

- [ ] **Step 2: Run test → fails** (`resolveSectionComponent` undefined).

- [ ] **Step 3: Implement**

```tsx
// frontend/src/components/operator/sections/PatientSection.tsx
import type { ComponentType } from 'react';
import type { SectionProps } from './types';
import { getSection } from './patientSections';

export function resolveSectionComponent(sectionKey: string): ComponentType<SectionProps<never>> | null {
  return getSection(sectionKey)?.component ?? null;
}

export function PatientSection({ sectionKey, ...rest }: { sectionKey: string } & SectionProps<never>) {
  const Cmp = resolveSectionComponent(sectionKey);
  if (!Cmp) { console.warn(`PatientSection: unknown section ${sectionKey}`); return null; }
  return <Cmp {...rest} />;
}
```

- [ ] **Step 4: Run test → passes.**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/operator/sections/PatientSection.tsx frontend/src/components/operator/sections/__tests__/sectionResolve.test.ts
git commit -m "feat(sections): registry-driven PatientSection render helper (#123)"
```

---

### Task 10: Verify, deploy, close #123

- [ ] **Step 1:** Run all section tests: `node node_modules/tsx/dist/cli.mjs --test frontend/src/components/operator/sections/__tests__/*.test.ts` → all pass.
- [ ] **Step 2:** `cd frontend && node ../node_modules/vite/bin/vite.js build` → succeeds.
- [ ] **Step 3:** Driver visual check of each extracted chart section (Allergie, Diagnosi, Terapia, Parametri, Dolore, Anamnesi) → unchanged vs before. Save shots under `requirements/evidence/BUG-071/`.
- [ ] **Step 4:** Push → `vercel deploy --prod --archive=tgz --yes` (Vercel runs authoritative `tsc -b && vite build`).
- [ ] **Step 5:** Comment on #123 with before/after shots proving the chart is unchanged + the registry/shared-editor architecture; close #123.

## Self-Review

**Spec coverage (spec §2):** controlled presentational editors ✅ (Tasks 3–8); per-mode wiring ✅ (`patient-chart` now; `intake`/`review` consume the same controlled components in F3/F4 by supplying value/onChange); registry `patientSections.ts` ✅ (Task 2); no `New*/Imported*/Chart*` copies ✅; incremental core-first migration ✅. Editors deferred to later phases (Medicazioni, Contenzioni, Esami, Note, ClinicalModuleRenderer, Documents) are intentionally out of F2's core slice — add them as follow-up tasks once the pattern is proven.
**Placeholder scan:** the registry `TODO` component is intentional (throws loudly until each editor is wired in Tasks 3–8) — not a plan placeholder.
**Type consistency:** `SectionProps<T>`, `PatientSectionDefinition`, `resolveSectionComponent`, `getSection`, `intakeSections` used consistently across tasks.
