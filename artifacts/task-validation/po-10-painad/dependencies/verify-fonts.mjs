import {readFile,writeFile} from 'node:fs/promises';
import {createHash,} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(resolve('backend/package.json'));
const fontkit=require('@pdf-lib/fontkit');
const sample=(await readFile('artifacts/task-validation/po-10-painad/source-text/painad.txt','utf8'))+' Dall’Acqua — François, Ionescu, Åsa, Ω, ½, O₂';
const files=[];
for(const filename of ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','OFL.txt']){
 const path=`backend/src/assessments/fonts/${filename}`,bytes=await readFile(path);
 const missing=filename.endsWith('.ttf')?[...new Set([...sample].filter(c=>!/[\r\n\t]/.test(c)&&!fontkit.create(bytes).hasGlyphForCodePoint(c.codePointAt(0))))]:[];
 if(missing.length) throw new Error(`Missing glyphs in ${filename}: ${missing.join(' ')}`);
 files.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),testedMissingGlyphs:missing});
}
await writeFile('artifacts/task-validation/po-10-painad/dependencies/font-provenance.json',JSON.stringify({source:'https://github.com/notofonts/noto-fonts',sourceCommit:'ffebf8c1ee449e544955a7e813c54f9b73848eac',license:'SIL Open Font License 1.1; unmodified assets, copyright/license bundled',fontkit:{version:'1.1.1',license:'MIT'},files},null,2));
console.log('PAINAD source and representative Latin/Greek clinical glyphs supported by both fonts.');
