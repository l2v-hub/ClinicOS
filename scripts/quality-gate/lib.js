'use strict';
// Quality Gate — helper condivisi (Node puro, nessuna dipendenza).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TASK_ROOT = path.join(ROOT, 'artifacts', 'task-validation');

const ALLOWED_DECISIONS = [
  'CLOSED — VERIFIED',
  'IMPLEMENTED — NOT VERIFIED',
  'FAILED VALIDATION',
  'BLOCKED',
  'PARTIAL',
];

// Parole che dichiarano un task concluso (usate dall'hook di closure).
const COMPLETION_WORDS = [
  'done',
  'fatto',
  'completato',
  'completed',
  'fixed',
  'resolved',
  'risolto',
  'chiuso',
  'closed',
];

function slugify(title) {
  return (
    String(title || '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'task'
  );
}

function taskDir(slug) {
  return path.join(TASK_ROOT, slug);
}

// Risolve un argomento (slug oppure path a una cartella/file) alla cartella del task.
function resolveTaskDir(arg) {
  if (!arg) return null;
  const p = path.resolve(String(arg));
  if (fs.existsSync(p)) {
    const st = fs.statSync(p);
    if (st.isDirectory()) return p;
    if (st.isFile()) return path.dirname(p);
  }
  return taskDir(slugify(arg));
}

function contractPath(dir) {
  return path.join(dir, 'task-contract.md');
}
function reportPath(dir) {
  return path.join(dir, 'validation-report.md');
}

// Verifica che il testo contenga tutte le sezioni (case-insensitive, come heading o label).
function missingSections(text, sections) {
  const hay = String(text).toLowerCase();
  return sections.filter((s) => !hay.includes(s.toLowerCase()));
}

module.exports = {
  ROOT,
  TASK_ROOT,
  ALLOWED_DECISIONS,
  COMPLETION_WORDS,
  slugify,
  taskDir,
  resolveTaskDir,
  contractPath,
  reportPath,
  missingSections,
};
