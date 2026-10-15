// Use the application's normal simulator login and supported patient DELETE API.
// No tokens or patient payloads are printed. A disabled DELETE is respected.
const backend='https://clinicos-backend-demo.up.railway.app';
let token,deleted=0,phase='readiness';
async function request(path,options={}) {
 return fetch(backend+path,{...options,headers:{...(token?{Authorization:'Bearer '+token}:{}),...options.headers},signal:AbortSignal.timeout(30000)});
}
async function json(path,options={}) {
 const r=await request(path,options);
 if(!r.ok)throw new Error('APPLICATION_REQUEST_REJECTED_'+r.status);
 return r.json();
}
try {
 const status=await json('/auth/status');
 if(status.mode!=='demo'||!status.simulator)throw new Error('UNEXPECTED_AUTHENTICATION_MODE');
 const identities=await json('/auth/simulator/identities');
 if(!identities.identities?.some(i=>i.id==='SIM-ADMIN'))throw new Error('SERVER_ADMIN_PROFILE_UNAVAILABLE');
 phase='normal-simulator-login';
 const session=await json('/auth/simulator/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identityId:'SIM-ADMIN'})});
 token=session.token;if(!token)throw new Error('SESSION_TOKEN_MISSING');
 const me=await json('/auth/me');if(!me.id)throw new Error('SESSION_IDENTITY_UNVERIFIED');
 phase='supported-patient-deletion';
 for(let i=0;i<1000;i++) {
  const page=await json('/patients/page?limit=1');
  if(!Array.isArray(page.items))throw new Error('PATIENT_PAGE_INVALID');
  if(page.items.length===0) {
   console.log(JSON.stringify({onlinePatientCleanup:true,backend,deleted,patientListEmpty:true,orphanClinicalDataVerified:false}));
   break;
  }
  const id=page.items[0].id;if(typeof id!=='string'||!id)throw new Error('PATIENT_ID_INVALID');
  const response=await request('/patients/'+encodeURIComponent(id),{method:'DELETE'});
  if(response.status!==200)throw new Error('SUPPORTED_PATIENT_DELETE_REJECTED_'+response.status);
  await response.arrayBuffer();deleted++;
  if(i===999)throw new Error('PATIENT_CLEANUP_LIMIT_REACHED');
 }
} catch(error) {console.error(JSON.stringify({onlinePatientCleanupFailed:true,phase,deleted,code:/^[A-Z0-9_]+$/.test(error.message??'')?error.message:'ONLINE_PATIENT_CLEANUP_FAILED'}));process.exitCode=1;
} finally {
 if(token)try {const r=await request('/auth/simulator/logout',{method:'POST'});console.log(JSON.stringify({maintenanceSessionRevoked:r.status===204}));if(r.status!==204)process.exitCode=1;}catch{console.error(JSON.stringify({maintenanceSessionRevoked:false}));process.exitCode=1;}
}
