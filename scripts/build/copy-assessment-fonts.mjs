import {copyFile,mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=resolve(root,'backend/src/assessments/fonts');
const destination=resolve(root,'backend/dist/assessments/fonts');
await mkdir(destination,{recursive:true});
for(const filename of ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','OFL.txt']){
  const from=resolve(source,filename),to=resolve(destination,filename);
  await copyFile(from,to);
  if(!(await readFile(from)).equals(await readFile(to))) throw new Error(`Font asset differs: ${filename}`);
}
console.log('Assessment PDF fonts and license copied into backend build.');
