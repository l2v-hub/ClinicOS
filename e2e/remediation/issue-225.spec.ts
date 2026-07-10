import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Issue #225 — "Preparazione futuro backend Azure" is a docs-only deliverable
// (docs/azure-backend-config-principles.md, 85 lines, no UI/API/schema touched).
// Per the parallel-evidence-remediation QA-surface rule ("never refuse a screenshot for
// internal features without UI — build a safe QA/test-only render"), this spec builds a
// minimal, non-production render of the actual committed doc and asserts the three
// acceptance-criteria section headings are present, readable and visible — objective,
// automatable proof the deliverable exists and covers AC1/AC2/AC3, without inventing a
// fake product screen or claiming a UI that does not exist for this issue.

const DOC_PATH = path.resolve(__dirname, '../../docs/azure-backend-config-principles.md');
const SCREENSHOT_PATH = path.resolve(
  __dirname,
  '../../artifacts/task-validation/225-preparazione-futuro-backend-azure/screenshots/result.png'
);

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Minimal, dependency-free markdown -> HTML so the real committed doc content (not a
// paraphrase) drives what gets asserted and screenshotted.
function mdToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  let html = '';
  let inList = false;
  for (const line of lines) {
    const h4 = /^####\s+(.*)$/.exec(line);
    const h3 = /^###\s+(.*)$/.exec(line);
    const h2 = /^##\s+(.*)$/.exec(line);
    const h1 = /^#\s+(.*)$/.exec(line);
    const li = /^-\s+(.*)$/.exec(line);
    if (h4) { if (inList) { html += '</ul>'; inList = false; } html += `<h4>${escapeHtml(h4[1])}</h4>`; continue; }
    if (h3) { if (inList) { html += '</ul>'; inList = false; } html += `<h3>${escapeHtml(h3[1])}</h3>`; continue; }
    if (h2) { if (inList) { html += '</ul>'; inList = false; } html += `<h2>${escapeHtml(h2[1])}</h2>`; continue; }
    if (h1) { if (inList) { html += '</ul>'; inList = false; } html += `<h1>${escapeHtml(h1[1])}</h1>`; continue; }
    if (li) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${escapeHtml(li[1])}</li>`;
      continue;
    }
    if (inList) { html += '</ul>'; inList = false; }
    if (line.trim() === '') continue;
    html += `<p>${escapeHtml(line)}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}

function renderPage(bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>QA render — issue #225 doc</title>
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 860px; margin: 2rem auto;
         color: #101828; background: #fff; line-height: 1.5; padding: 0 1.5rem; }
  h1 { font-size: 1.6rem; border-bottom: 2px solid #0F5FD7; padding-bottom: .5rem; }
  h2 { font-size: 1.25rem; color: #0F5FD7; margin-top: 2rem; }
  h3 { font-size: 1.05rem; }
  code { background: #E9EDF2; padding: .1rem .3rem; border-radius: 3px; }
</style>
</head>
<body data-qa-surface="issue-225-doc-render">
${bodyHtml}
</body>
</html>`;
}

test.describe('issue #225 — Azure backend config principles (docs-only evidence)', () => {
  test('renders committed doc and shows AC1/AC2/AC3 sections', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const badResponses: string[] = [];
    page.on('response', (res) => {
      if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`);
    });

    // The doc must exist and be non-trivial (concrete value assertion, not just "file exists").
    expect(fs.existsSync(DOC_PATH), `doc not found at ${DOC_PATH}`).toBe(true);
    const md = fs.readFileSync(DOC_PATH, 'utf-8');
    expect(md.length).toBeGreaterThan(2000);

    const html = renderPage(mdToHtml(md));
    await page.setContent(html, { waitUntil: 'load' });

    // Title / identity of the deliverable.
    await expect(page.locator('h1')).toHaveText(
      'Backend configuration principles for a future Azure deployment (#225)'
    );

    // AC1 — env/secret model documented.
    const ac1 = page.locator('h2', { hasText: '1. Env / secret model (AC1)' });
    await expect(ac1).toBeVisible();

    // AC2 — provider dependencies remain swappable.
    const ac2 = page.locator('h2', { hasText: '2. Provider dependencies remain swappable (AC2)' });
    await expect(ac2).toBeVisible();

    // AC3 — no production deploy performed (checklist section explicitly says "no action now").
    const ac3 = page.locator('h2', {
      hasText: '4. Future Azure migration checklist (no action now — AC3)',
    });
    await expect(ac3).toBeVisible();

    // Concrete value check: the explicit "no deploy" statement must be present verbatim
    // (this is a single source line in the doc, so it renders inside one element).
    await expect(
      page.getByText('No production deployment is performed by this document')
    ).toBeVisible();

    // Re-render after a reload to prove the QA surface is stable/reproducible across
    // navigations (this issue writes no data, so there is nothing to persist — this
    // instead demonstrates the render is deterministic, not a one-shot fluke).
    await page.reload();
    await page.setContent(html, { waitUntil: 'load' });
    await expect(page.locator('h1')).toHaveText(
      'Backend configuration principles for a future Azure deployment (#225)'
    );
    await expect(ac1).toBeVisible();
    await expect(ac2).toBeVisible();
    await expect(ac3).toBeVisible();

    // No console errors and no 4xx/5xx responses (a static setContent render should have none).
    expect(consoleErrors, `unexpected console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(badResponses, `unexpected HTTP errors: ${badResponses.join(' | ')}`).toEqual([]);

    // Final full-page screenshot into the canonical evidence dir.
    fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true });
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  });
});
