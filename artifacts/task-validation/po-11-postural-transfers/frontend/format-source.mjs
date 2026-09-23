import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
const git = (...args) => execFileSync('git', args, {encoding:'utf8'}).trim().split('\n');
const files = [...new Set([...git('diff','--name-only','--','frontend/src'), ...git('ls-files','--others','--exclude-standard','frontend/src')])];
const excluded = /(?:App|PatientDetail|DocumentiTab)\.tsx$|\/types\.ts$/;
for (const file of files.filter(file => /\.(?:tsx?|css)$/.test(file) && !excluded.test(file))) {
  const options = await resolveConfig(file);
  const result = await format(readFileSync(file,'utf8'), {...options, filepath:file});
  writeFileSync(file, result);
  console.log(`${result.trimEnd().split('\n').length} ${file}`);
}
