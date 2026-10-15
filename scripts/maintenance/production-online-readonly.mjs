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
 if(auth.mode==='demo') {
  let headers,sessionToken;
  const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  let blockedWrites=0,blockedNonclinicalWrites=0,pageErrors=0;
  const clinicalOrigins=new Set();
  await context.route('**/*',async route=>{
   const request=route.request();
   if(!['GET','HEAD','OPTIONS'].includes(request.method())) {
    const sessionUrl=request.url()===backend+'/auth/simulator/session';
    if(sessionUrl&&request.method()==='POST'&&process.env.EXISTING_SIMULATOR_ID&&request.postDataJSON()?.identityId===process.env.EXISTING_SIMULATOR_ID) {await route.continue();return;}
    if(new URL(request.url()).origin===backend)blockedWrites++;else blockedNonclinicalWrites++;await route.abort();return;
   }
   if(request.url().includes('/patients/page'))clinicalOrigins.add(new URL(request.url()).origin);
   await route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',()=>{pageErrors++;});
  await page.goto(frontend+'/#/pazienti',{waitUntil:'networkidle'});
  if(auth.simulator) {
   if(!process.env.EXISTING_SIMULATOR_ID)throw new Error('EXISTING_PROFILE_REQUIRED');
   const list=await read('/auth/simulator/identities');
   const profile=list.identities.find(p=>p.id===process.env.EXISTING_SIMULATOR_ID);
   assert.ok(profile);
   const sessionPromise=page.waitForResponse(r=>r.url()===backend+'/auth/simulator/session'&&r.status()===201);
   await page.getByRole('button',{name:new RegExp('^'+profile.name+' ')}).click();
   const session=await (await sessionPromise).json();sessionToken=session.token;assert.ok(sessionToken);
   headers={Authorization:'Bearer '+sessionToken};
  } else {
   await page.getByRole('button',{name:/Amministratore/}).click();
   headers={'X-Operator-Id':'admin1','X-Operator-Role':'admin'};
  }
  const me=await read('/auth/me',headers);assert.ok(me.id);
  const patients=await read('/patients/page?limit=1',headers);
  assert.ok(Array.isArray(patients.items));assert.equal(patients.items.length,0);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
  const therapy=await read('/therapy-slots/page?date='+today+'&limit=1',headers);
  assert.ok(Array.isArray(therapy.slots));assert.equal(therapy.slots.length,0);
  checks.push({name:'preserved-user-access',pass:true},{name:'live-patient-api-empty',pass:true,patients:0},{name:'live-therapy-api-empty',pass:true,slots:0});
  await page.waitForFunction(()=>!document.querySelector('.login-screen'));
  await page.goto(frontend+'/#/pazienti',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Nessun paziente presente',exact:true}).waitFor();
  assert.ok(clinicalOrigins.has(backend));assert.equal(pageErrors,0);assert.equal(blockedWrites,0);
  checks.push({name:'live-browser-empty-patient-list',pass:true,clinicalBackendVerified:true,pageErrors,blockedWrites,blockedNonclinicalWrites});
  if(sessionToken) {
   const logout=await fetch(backend+'/auth/simulator/logout',{method:'POST',headers,signal:AbortSignal.timeout(15000)});
   assert.equal(logout.status,204);
   checks.push({name:'test-session-revoked',pass:true});
  }
 } else {
  checks.push({name:'authenticated-ui',executed:false,reason:'EXISTING_INTERACTIVE_AUTHENTICATION_REQUIRED'});
 }
 console.log(JSON.stringify({onlineReadonlyVerification:report}));
} catch(error) {
 console.error(JSON.stringify({onlineReadonlyFailed:true,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:error.code??'ONLINE_VERIFICATION_FAILED',completedChecks:checks}));process.exitCode=1;
} finally {if(browser)await browser.close();}
