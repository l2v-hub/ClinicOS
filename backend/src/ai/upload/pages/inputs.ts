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
