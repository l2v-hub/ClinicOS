import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const artifact=dirname(fileURLToPath(import.meta.url)), qa=resolve(artifact,'pdf-qa');
const tests=JSON.parse(await readFile(resolve(artifact,'focused-tests.json'),'utf8'));
const definition=JSON.parse(await readFile(resolve(artifact,'definition-snapshot.json'),'utf8'));
assert(tests.databaseClosed && tests.sourceUnchanged && tests.results.every(row=>row.exitCode===0));
const pdfinfo='C:/Users/Claudio/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdfinfo.exe';
const pdftotext='C:/Program Files/Git/mingw64/bin/pdftotext.exe';
const specs=[['tinetti-normal.pdf','tinetti-normal',2],['tinetti-long.pdf','tinetti-long',6],
  ['painad-regression/painad-normal.pdf','painad-normal',1],['painad-regression/painad-long.pdf','painad-long',2],
  ['transfers-regression/transfers-normal.pdf','transfers-normal',2],['transfers-regression/transfers-long.pdf','transfers-long',5]];
const outputs=await readdir(resolve(qa,'final'));
for(const [pdf,name,pages] of specs) {
  const info=execFileSync(pdfinfo,[resolve(qa,pdf)],{encoding:'utf8',windowsHide:true});
  assert.equal(Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]),pages);
  assert.equal(outputs.filter(file=>file.startsWith(`${name}-`) && file.endsWith('.png')).length,pages);
  const text=execFileSync(pdftotext,['-enc','UTF-8','-layout',resolve(qa,pdf),'-'],{encoding:'utf8',windowsHide:true});
  assert.equal(text.replace(/\r\n/g,'\n'),(await readFile(resolve(qa,'final',`${name}.txt`),'utf8')).replace(/\r\n/g,'\n'));
  if(name.startsWith('tinetti')) {
    for(const item of definition.groups.flatMap(group=>group.items)) {
      assert(text.includes(item.label),item.id);
      assert(text.includes(item.options.at(-1).description),item.id);
    }
    for(const value of ['Equilibrio: 16 / 16','Andatura: 12 / 12','Totale Tinetti: 28 / 28 - Basso rischio']) assert(text.includes(value),value);
    assert(text.replace(/\s+/g,' ').includes(definition.provenance));
    assert(!text.includes('Totale PAINAD'));
    if(name.endsWith('long')) assert(/Prima riga àèìòù e Ω\.\r?\nSeconda riga conservata\./.test(text));
  } else if(name.startsWith('painad')) assert(text.includes('Totale PAINAD: 0 / 10'));
  else {
    for(const label of ['Contesto','Mobilizzazione','Assistenza','Ausili','Note','Firma Fisioterapista','Firma Operatori']) assert(text.includes(label));
    assert(!/PAINAD|punteggio/i.test(text));
  }
}
const files=await Promise.all([...specs.map(row=>row[0]),...outputs.filter(file=>/\.(png|txt)$/.test(file)).map(file=>`final/${file}`)]
  .sort().map(async path=>{const bytes=await readFile(resolve(qa,path));return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}));
assert.equal(files.length,30);
await writeFile(resolve(qa,'visual-qa.json'),JSON.stringify({sourceTreeSha256:tests.sourceTreeSha256,
  recordedAt:new Date().toISOString(),allPagesInspected:true,noClippingOrOverlap:true,
  pages:{tinettiNormal:2,tinettiLong:6,painadNormal:1,painadLong:2,transfersNormal:2,transfersLong:5},
  observations:[
    'All 18 final PNG pages were inspected with view_image; headers/identity/body/footer remain readable without clipping or overlap.',
    'Tinetti normal contains all 20 item labels/descriptions, 16/12/28 totals and low-risk label on two pages.',
    'Tinetti long preserves accented Unicode and explicit note newlines across six pages, with final source provenance fully visible.',
    'PAINAD and Transfers retain their prior readable layouts, sources/scores or signature spaces on 1/2 and 2/5 pages respectively.',
    'Fresh UTF-8 text extraction matches all stored extracts and verifies frozen Tinetti labels, selected descriptions and provenance.',
  ],files},null,2)+'\n');
console.log(JSON.stringify({visualQaRecorded:true,pages:18,files:files.length,sourceTreeSha256:tests.sourceTreeSha256}));
