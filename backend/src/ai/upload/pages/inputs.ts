import { loadAiConfig, loadExtractionPrompt, loadOutputSchema } from '../../config.js';
import { hash, orderPages, type Manifest, type Page } from './model.js';
export const OCR_PROMPT =
  'Trascrivi integralmente la pagina, mantenendo ordine e righe. Non riassumere né dedurre. Usa [ILLEGGIBILE] per parti non leggibili. Conserva i titoli delle sezioni; se riconosci un titolo clinico usa ## ANAMNESI, DIAGNOSI, DECORSO_OSPEDALIERO, TERAPIA, ALLERGIE, CONSIGLI_E_CONTROLLI. Rispondi solo con JSON {"rawText":"testo integrale"}.';
export const OCR_SCHEMA = {
  type: 'object',
  properties: { rawText: { type: 'string' } },
  required: ['rawText'],
  additionalProperties: false,
};
export const pageHash = (page: Page, sha: string) =>
  hash(['ocr-page-v1', sha, page.sourcePageNumber, OCR_PROMPT, OCR_SCHEMA]);
export function extractionConfig() {
  const cfg = loadAiConfig();
  const schema = loadOutputSchema(cfg);
  const prompt = loadExtractionPrompt(cfg);
  return { cfg, schema, prompt, digest: hash([schema, prompt, 'group-extraction-v1']) };
}
export function groupHash(
  m: Manifest,
  groupId: string,
  shas: Map<string, string>,
  configHash: string,
  outputs: Map<string, string> = new Map(),
) {
  return hash([
    configHash,
    groupId,
    orderPages(m, groupId).map((p) => [
      p.id,
      pageHash(p, shas.get(p.documentId) ?? ''),
      outputs.get(p.id) ?? null,
    ]),
  ]);
}
type UnitRef = { kind: string; unitKey: string; inputHash: string; outputHash: string | null };
/**
 * Current processing units of a manifest: a unit counts only when its input hash matches the
 * present pages, documents and extraction config. Shared by the job view and the AI draft merge.
 */
export function currentGroupUnits<U extends UnitRef>(
  m: Manifest,
  shas: Map<string, string>,
  units: U[],
  configHash: string,
) {
  const state = (kind: string, key: string, inputHash: string) =>
    units.find((u) => u.kind === kind && u.unitKey === key && u.inputHash === inputHash);
  const pages = new Map(
    m.pages.map((p) => [p.id, state('ocr', p.id, pageHash(p, shas.get(p.documentId) ?? ''))]),
  );
  const outputs = new Map(m.pages.map((p) => [p.id, pages.get(p.id)?.outputHash ?? '']));
  const groups = new Map(
    m.groups.map((g) => {
      const inputHash = groupHash(m, g.id, shas, configHash, outputs);
      return [g.id, { inputHash, unit: state('extraction', g.id, inputHash) }];
    }),
  );
  return { pages, groups };
}
