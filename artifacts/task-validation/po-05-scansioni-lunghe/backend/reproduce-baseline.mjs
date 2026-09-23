import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root=process.cwd(), here=dirname(fileURLToPath(import.meta.url));
const base='ef562bf51f296153ff0ec51ed6ab620da8e2dc1a';
const absolute=(source,file,overrides={})=>source.replace(/(from\s*|import\()(['"])(\.{1,2}\/[^'"]+)\2/g,(all,prefix,q,spec)=>{
  if(overrides[spec])return `${prefix}${q}${pathToFileURL(overrides[spec]).href}${q}`;
  const target=resolve(root,dirname(file),spec);
  return `${prefix}${q}${pathToFileURL(target).href}${q}`;
});
const confirm=resolve(here,'baseline-confirm.mts'),route=resolve(here,'baseline-route.mts');
writeFileSync(confirm,absolute(execFileSync('git',['show',`${base}:backend/src/ai/upload/confirm-service.ts`],{encoding:'utf8'}),'backend/src/ai/upload/confirm-service.ts'));
writeFileSync(route,absolute(execFileSync('git',['show',`${base}:backend/src/routes/intake-drafts.ts`],{encoding:'utf8'}),'backend/src/routes/intake-drafts.ts',{'../ai/upload/confirm-service.js':confirm}));
writeFileSync(resolve(here,'baseline-confirm-tests.mts'),absolute(readFileSync('backend/src/intake/__tests__/confirm-therapy-validation.test.ts','utf8'),'backend/src/intake/__tests__/confirm-therapy-validation.test.ts',{'../../routes/intake-drafts.js':route}));
const diagnostic=readFileSync('tests/integration/progressive-intake-db.test.mts','utf8').replace('api = await startParameterApi();',`api = await startParameterApi();
    const originalTransaction=prisma.$transaction.bind(prisma);
    (prisma as any).$transaction=(fn:any,...args:any[])=>originalTransaction(async(tx:any)=>{
      try { return await fn(tx); } catch(error:any){console.error('SYNTHETIC-TRANSACTION-ERROR',error.code,error.meta,error.message.slice(0,1400));throw error;}
    },...args);`);
writeFileSync(resolve(here,'race-tests.mts'),absolute(diagnostic,'tests/integration/progressive-intake-db.test.mts'));
