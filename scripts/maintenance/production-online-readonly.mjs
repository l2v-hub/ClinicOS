import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const backend='https://clinicos-backend-production-df88.up.railway.app';
const frontend='https://clinicos-eosin.vercel.app';
const checks=[];
async function read(path,headers={}) {
 const r=await fetch(backend+path,{headers,signal:AbortSignal.timeout(15000)});
 if(r.status!==200)throw new Error('ONLINE_READ_FAILED');
 return r.json();
}
let browser;
try {
 const auth=await read('/auth/status');
 await read('/ready');
 checks.push({name:'online-ready',pass:true});
 const report={authenticationMode:auth.mode,simulator:Boolean(auth.simulator),checks};
 if(auth.mode==='demo'&&!auth.simulator) {
  const headers={'X-Operator-Id':'admin1','X-Operator-Role':'admin'};
  const me=await read('/auth/me',headers);
  assert.ok(me.id);
  const patients=await read('/patients/page?limit=1',headers);
  assert.ok(Array.isArray(patients.items));assert.equal(patients.items.length,0);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
  const therapy=await read('/therapy-slots/page?date='+today+'&limit=1',headers);
  assert.ok(Array.isArray(therapy.slots));assert.equal(therapy.slots.length,0);
  checks.push({name:'preserved-admin-access',pass:true},{name:'live-patient-api-empty',pass:true,patients:0},{name:'live-therapy-api-empty',pass:true,slots:0});
  const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  let blockedWrites=0,blockedNonclinicalWrites=0,pageErrors=0;
  const clinicalOrigins=new Set();
  await context.route('**/*',async route=>{
   const request=route.request();
   if(!['GET','HEAD','OPTIONS'].includes(request.method())) {if(new URL(request.url()).origin===backend)blockedWrites++;else blockedNonclinicalWrites++;await route.abort();return;}
   if(request.url().includes('/patients/page'))clinicalOrigins.add(new URL(request.url()).origin);
   await route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',()=>{pageErrors++;});
  await page.goto(frontend+'/#/pazienti',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/Amministratore/}).click();
  await page.waitForFunction(()=>!document.querySelector('.login-screen'));
  await page.goto(frontend+'/#/pazienti',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Nessun paziente presente',exact:true}).waitFor();
  assert.ok(clinicalOrigins.has(backend));assert.equal(pageErrors,0);assert.equal(blockedWrites,0);
  checks.push({name:'live-browser-empty-patient-list',pass:true,clinicalBackendVerified:true,pageErrors,blockedWrites,blockedNonclinicalWrites});
 } else {
  checks.push({name:'authenticated-ui',executed:false,reason:'EXISTING_INTERACTIVE_AUTHENTICATION_REQUIRED'});
 }
 console.log(JSON.stringify({onlineReadonlyVerification:report}));
} catch(error) {
 console.error(JSON.stringify({onlineReadonlyFailed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:error.code??'ONLINE_VERIFICATION_FAILED',completedChecks:checks}));process.exitCode=1;
} finally {if(browser)await browser.close();}
