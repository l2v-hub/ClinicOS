// Builds the before/after table for the validation report from two measure.mjs outputs.
//   node compare.mjs baseline-preview.json final-preview.json
import { readFileSync } from 'node:fs';

const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const nz = (v) => v ?? 20000;
const stats = (rs) => {
  const c = rs.map((r) => nz(r.contentMs)).sort((x, y) => x - y);
  return {
    n: c.length,
    p50: c[Math.floor(c.length / 2)],
    avg: Math.round(c.reduce((s, x) => s + x, 0) / c.length),
    max: c[c.length - 1],
    over300: c.filter((x) => x > 300).length,
    chunks: rs.reduce((s, r) => s + r.chunks, 0),
  };
};
const isRevisit = (rs, i) => {
  const r = rs[i];
  const key = r.label.replace(/\(\d\w+\)$/, '');
  return rs.slice(0, i).some((p) => p.label.replace(/\(\d\w+\)$/, '') === key);
};
const split = (rs) => ({
  all: stats(rs),
  first: stats(rs.filter((_, i) => !isRevisit(rs, i))),
  revisit: stats(rs.filter((_, i) => isRevisit(rs, i))),
});
const A = split(a.results);
const B = split(b.results);
const row = (name, ka, kb) => `| ${name} | ${ka} | ${kb} |`;
console.log(`| Metrica (tempo "contenuto visibile") | ${a.label} | ${b.label} |`);
console.log('|---|---:|---:|');
for (const [k, label] of [
  ['all', 'tutte le navigazioni'],
  ['first', 'prime visite'],
  ['revisit', 'visite successive'],
]) {
  console.log(row(`${label} — mediana`, `${A[k].p50} ms`, `${B[k].p50} ms`));
  console.log(row(`${label} — media`, `${A[k].avg} ms`, `${B[k].avg} ms`));
  console.log(row(`${label} — massimo`, `${A[k].max} ms`, `${B[k].max} ms`));
  console.log(
    row(`${label} — oltre 300 ms`, `${A[k].over300}/${A[k].n}`, `${B[k].over300}/${B[k].n}`),
  );
}
console.log(row('chunk JS scaricati durante le navigazioni', A.all.chunks, B.all.chunks));
console.log('');
console.log('| Navigazione | prima | dopo |');
console.log('|---|---:|---:|');
for (let i = 0; i < a.results.length; i++) {
  const x = a.results[i];
  const y = b.results[i];
  console.log(`| ${x.label} | ${nz(x.contentMs)} ms | ${nz(y.contentMs)} ms |`);
}
