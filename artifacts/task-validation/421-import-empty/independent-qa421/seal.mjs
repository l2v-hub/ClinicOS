import {readFileSync,writeFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const base=resolve('artifacts/task-validation/421-import-empty/independent-qa421');
const manifest=base+'/immutable-manifest.json';if(existsSync(manifest))throw Error('Already sealed; no overwrite');
const hash=v=>createHash('sha256').update(v).digest('hex');
const JSZip=createRequire('C:/Users/Claudio/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/_anchor.cjs')('jszip');
const config=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const secrets=Object.entries(config).filter(([key,value])=>/TOKEN|SECRET|PASSWORD|API_KEY|DATABASE_URL/.test(key)&&typeof value==='string'&&value.length>=12).map(([,v])=>v);
let archiveEntries=0,scanned=0;const findings=[];
const files=[];function walk(dir){for(const n of readdirSync(dir)){if(n==='runtime-cache')continue;const p=resolve(dir,n);if(statSync(p).isDirectory())walk(p);else files.push(p);}}walk(base);
function scan(bytes,path){scanned++;for(let i=0;i<secrets.length;i++)if(bytes.includes(Buffer.from(secrets[i])))findings.push({path,rule:'configured-secret',slot:i});const text=bytes.toString('utf8');for(const [rule,re]of Object.entries({'private-key':/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,'github-token':/\bgh[pousr]_[0-9A-Za-z]{20,}\b/,'openai-key':/\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/,'jwt':/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/}))if(re.test(text))findings.push({path,rule});}
for(const file of files){const raw=readFileSync(file),path=relative(base,file).replaceAll('\\','/');scan(raw,path);if(file.endsWith('.zip')){const zip=await JSZip.loadAsync(raw);for(const e of Object.values(zip.files))if(!e.dir){archiveEntries++;scan(await e.async('nodebuffer'),path+'!/'+e.name);}}}
const scanReceipt={outcome:findings.length?'FAIL':'PASS',configuredCredentialValuesChecked:secrets.length,filesScanned:files.length,archiveEntries,scanned,findings,policy:'No credential values or matched bytes printed. Synthetic fixtures only; visual PHI review is separate.'};
writeFileSync(base+'/privacy-secret-scan.json',JSON.stringify(scanReceipt,null,2));if(findings.length)throw Error('Evidence secret scan failed safely');
files.push(base+'/privacy-secret-scan.json');files.sort();
const records=files.map(file=>{const raw=readFileSync(file);return {path:relative(base,file).replaceAll('\\','/'),bytes:raw.length,sha256:hash(raw)};});
const payload={application:'80b313227a9a2b9fefc0441c718b259d0d901cae',baseline:'c00bff678dfc9845c31742bc5d0d750fbbb9603e',excluded:['**/runtime-cache/**','immutable-manifest.json (self)'],fileCount:records.length,files:records};
writeFileSync(manifest,JSON.stringify(payload,null,2));console.log(JSON.stringify({manifest,fileCount:records.length,manifestSHA256:hash(readFileSync(manifest)),privacy:scanReceipt}));

