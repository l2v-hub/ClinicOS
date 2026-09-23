import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const qa=resolve('artifacts/task-validation/po-13-mna/backend/pdf-qa');
const output=resolve(qa,'final');
await mkdir(output,{recursive:true});
const bin='C:/Users/Claudio/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin';
const pdftotext='C:/Program Files/Git/mingw64/bin/pdftotext.exe';
const specs=[
 ['mna-full-normal.pdf','mna-full-normal'],['mna-full-long.pdf','mna-full-long'],['mna-screening-partial.pdf','mna-screening-partial'],
 ['painad-regression/painad-normal.pdf','painad-normal'],['painad-regression/painad-long.pdf','painad-long'],
 ['transfers-regression/transfers-normal.pdf','transfers-normal'],['transfers-regression/transfers-long.pdf','transfers-long'],
 ['tinetti-regression/tinetti-normal.pdf','tinetti-normal'],['tinetti-regression/tinetti-long.pdf','tinetti-long'],
];
const rendered=[];
for(const [file,name] of specs){
 const input=resolve(qa,file);
 const info=execFileSync(resolve(bin,'pdfinfo.exe'),[input],{encoding:'utf8',windowsHide:true});
 const pages=Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]);
 if(!pages)throw new Error('PDF page count missing: '+file);
 const text=execFileSync(pdftotext,['-enc','UTF-8','-layout',input,'-'],{encoding:'utf8',windowsHide:true});
 await writeFile(resolve(output,name+'.txt'),text);
 execFileSync(resolve(bin,'pdftoppm.exe'),['-r','110','-png',input,resolve(output,name)],{windowsHide:true});
 rendered.push({file,name,pages});
}
await writeFile(resolve(qa,'rendered-pages.json'),JSON.stringify({renderedAt:new Date().toISOString(),specs:rendered},null,2)+'\n');
console.log(JSON.stringify({rendered:rendered.length,pages:rendered.reduce((n,row)=>n+row.pages,0),specs:rendered}));
