import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const artifact=dirname(fileURLToPath(import.meta.url)), qa=resolve(artifact,'pdf-qa');
const json=async name=>JSON.parse(await readFile(resolve(artifact,name),'utf8'));
const tests=await json('focused-tests.json'), manifest=await json('source-manifest.json');
assert.equal(tests.sourceTreeSha256,manifest.inputTreeSha256);
assert(tests.databaseClosed && tests.sourceUnchanged && tests.results.every(row=>row.exitCode===0));
const pdfinfo='C:/Users/Claudio/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdfinfo.exe';
const pdftotext='C:/Program Files/Git/mingw64/bin/pdftotext.exe';
const specs=[['mna-full-normal.pdf','mna-full-normal',3],['mna-full-long.pdf','mna-full-long',7],['mna-screening-partial.pdf','mna-screening-partial',3],
 ['painad-regression/painad-normal.pdf','painad-normal',1],['painad-regression/painad-long.pdf','painad-long',2],
 ['transfers-regression/transfers-normal.pdf','transfers-normal',2],['transfers-regression/transfers-long.pdf','transfers-long',5],
 ['tinetti-regression/tinetti-normal.pdf','tinetti-normal',2],['tinetti-regression/tinetti-long.pdf','tinetti-long',6]];
const outputs=await readdir(resolve(qa,'final'));
const squash=value=>value.replace(/\s+/gu,' ').trim();
const editorial=value=>value.replaceAll('≤','<=').replaceAll('≥','>=').replaceAll('→','diventa');
for(const [pdf,name,pages] of specs) {
 const info=execFileSync(pdfinfo,[resolve(qa,pdf)],{encoding:'utf8',windowsHide:true});
 assert.equal(Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]),pages);
 assert.equal(outputs.filter(file=>file.startsWith(`${name}-`) && file.endsWith('.png')).length,pages);
 const text=execFileSync(pdftotext,['-enc','UTF-8','-layout',resolve(qa,pdf),'-'],{encoding:'utf8',windowsHide:true});
 assert.equal(text.replace(/\r\n/g,'\n'),(await readFile(resolve(qa,'final',name+'.txt'),'utf8')).replace(/\r\n/g,'\n'));
 for(let page=1;page<=pages;page++) assert(text.includes(`Pagina ${page} di ${pages}`));
 assert(!text.includes('\uFFFD'));
 if(name.startsWith('mna')) {
  const snapshot=await json('pdf-qa/'+name+'.snapshot.json');
  const normalized=squash(text);
  assert.equal(snapshot.items.length,18);
  for(const item of snapshot.items) {
   assert(normalized.includes(squash(editorial(item.label))),name+': '+item.id);
   if(item.description) assert(normalized.includes(squash(editorial(item.description))),name+': description '+item.id);
   for(const subitem of item.subitems??[]) assert(normalized.includes(squash(editorial(subitem.label)+': '+(subitem.answer===null?'Non compilato':subitem.answer?'Sì':'No'))));
  }
  for(const value of [snapshot.provenance,...snapshot.references,snapshot.copyright]) assert(normalized.includes(squash(editorial(value))),name+': provenance');
  assert(normalized.includes('21 <= CB <= 22 cm = 0,5'));
  assert(normalized.includes('Sesso: F | Età alla valutazione: 86 anni'));
  assert(normalized.includes('Data di riferimento età: 2026-03-29 (Europe/Rome)'));
  assert(normalized.includes('Data di nascita: 02/01/1940'));
  assert(normalized.includes('Screening: 14 / 14 — Stato nutrizionale normale'));
  assert(!/[≤≥→]/u.test(text));
  if(name==='mna-screening-partial') {
   assert.equal(snapshot.result.total,null);
   assert.equal(snapshot.items[10].score,null);
   for(const value of ['non inclusi nel totale','Voci complete: 2 / 12','Subtotale globale: Non disponibile','nessun totale a 30','21 <= CB <= 22 cm']) assert(normalized.includes(value));
   assert(!normalized.includes('Totale MNA:'));
  } else {
   for(const value of ['Subtotale globale: 16 / 16','Totale MNA: 30 / 30','Peso: 64 kg','Altezza: 160 cm','Circonferenza brachiale: 23 cm','Circonferenza del polpaccio: 31 cm','24,999999999999996 kg/m²']) assert(normalized.includes(value),value);
  }
  if(snapshot.notes) {
   const withoutFurniture=text.split(/\r?\n/).filter(line=>{
    const value=line.trim();
    return value!==snapshot.title && value!==`${snapshot.patient.lastName} ${snapshot.patient.firstName}` && !value.startsWith('Valutazione:') && !value.startsWith('Valutazione finalizzata |');
   }).join('\n');
   assert(squash(withoutFurniture).includes(squash(snapshot.notes)),name+': complete notes retained');
   assert(snapshot.notes.split('\n').filter(Boolean).every(line=>text.includes(line)),name+': note newlines');
  }
 } else if(name.startsWith('tinetti')) {
  for(const value of ['Equilibrio: 16 / 16','Andatura: 12 / 12','Totale Tinetti: 28 / 28 - Basso rischio']) assert(text.includes(value));
  assert(!text.includes('Totale PAINAD'));
 } else if(name.startsWith('painad')) assert(text.includes('Totale PAINAD: 0 / 10'));
 else {
  for(const value of ['Contesto','Mobilizzazione','Assistenza','Ausili','Note','Firma Fisioterapista','Firma Operatori']) assert(text.includes(value));
  assert(!/PAINAD|punteggio/i.test(text));
 }
}
const names=[...specs.map(row=>row[0]),...specs.filter(row=>row[1].startsWith('mna')).map(row=>row[1]+'.snapshot.json'),
 ...outputs.filter(file=>/\.(png|txt)$/.test(file)).map(file=>'final/'+file)].sort();
const files=await Promise.all(names.map(async path=>{const bytes=await readFile(resolve(qa,path));return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}));
assert.equal(files.length,52);
await writeFile(resolve(qa,'visual-qa.json'),JSON.stringify({sourceTreeSha256:tests.sourceTreeSha256,recordedAt:new Date().toISOString(),
 allPagesInspected:true,noClippingOrOverlap:true,totalPages:31,pages:specs.map(([file,name,pages])=>({file,name,pages})),
 observations:[
  'All 31 final PNG pages were individually inspected with view_image: headers, identity, body, source text and page numbering remain readable without clipping or overlap.',
  'MNA full normal: three pages, all A–R responses, three frozen K questions, measured values/units/dates, 14/16/30 totals, unrounded BMI and age/sex metadata visible.',
  'MNA full long: seven pages, all 4000 note codepoints retained including supported accented Unicode and explicit newlines, followed by complete source, references and copyright.',
  'MNA screening: three pages, partial G–R retained, K false/null/true distinctions and Q inclusive threshold visible; no 30-point total.',
  'Editorial source glyphs use approved <=, >= and diventa typography only. Unsupported glyphs in free text are covered by the explicit failure-path test; notes are not silently rewritten.',
  'PAINAD one/two pages, Transfers two/five pages and Tinetti two/six pages retain readable previous layouts, scores or signature spaces and source notices.',
  'Fresh UTF-8 extracts match stored text. MNA content checks are against saved immutable snapshots, including every item, K subitem, bibliographic reference, source notice and complete notes.'
 ],files},null,2)+'\n');
console.log(JSON.stringify({visualQaRecorded:true,pages:31,files:files.length,sourceTreeSha256:tests.sourceTreeSha256}));
