import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire('/workspace/ClinicOS/package.json');
const ts=require('typescript');
const yaml=require('yaml');
const {buildClientSchema,parse,validate}=await import(pathToFileURL('/tmp/clinicos-schema-check/node_modules/graphql/index.mjs'));
const dir='artifacts/task-validation/demo-source-configuration/independent-qa-1/test-results/';
const sourceFiles=['.github/workflows/configure-demo-source.yml','scripts/automation/configure-demo-source.mjs','scripts/automation/configure-demo-source.test.mjs'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=await Promise.all(sourceFiles.map(p=>readFile(p)));
const sourceHashes=Object.fromEntries(sourceFiles.map((p,i)=>[p,sha(bytes[i])]));
const ast=sourceFiles.slice(1).map((file,i)=>{
 const sf=ts.createSourceFile(file,bytes[i+1].toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.deepEqual(sf.parseDiagnostics,[]);
 return {file,parseErrors:0};
});
const y=yaml.parseDocument(bytes[0].toString(),{uniqueKeys:true});assert.deepEqual(y.errors,[]);
const workflow=y.toJS();
assert.deepEqual(Object.keys(workflow.on),['workflow_dispatch']);
assert.equal(workflow.on.workflow_dispatch.inputs.operation.default,'inspect');
assert.deepEqual(workflow.on.workflow_dispatch.inputs.operation.options,['inspect','set-main']);
assert.deepEqual(workflow.permissions,{contents:'read'});
assert.deepEqual(workflow.concurrency,{group:'railway-backend','cancel-in-progress':false});
assert.deepEqual(Object.keys(workflow.jobs),['configuration']);
const job=workflow.jobs.configuration;
assert.equal(job.environment,'glistening-friendship / demo');
assert.equal(job['timeout-minutes'],5);
for(const condition of ["github.event_name == 'workflow_dispatch'","github.repository == 'l2v-hub/ClinicOS'","github.ref == 'refs/heads/main'",'inputs.reviewed_sha == github.sha'])assert.ok(job.if.includes(condition));
assert.deepEqual(job.steps[0].with,{ref:'${{ github.sha }}','persist-credentials':false});
assert.ok(job.steps.every(s=>!s.uses||/@[a-f0-9]{40}$/.test(s.uses)));
assert.equal(job.steps[2].env,undefined);
assert.deepEqual(job.steps[3].env,{
 RAILWAY_TOKEN:'${{ secrets.RAILWAY_DEMO_TOKEN }}',
 CONFIGURE_DEMO_OPERATION:'${{ inputs.operation }}',
 CONFIGURE_DEMO_REVIEWED_SHA:'${{ inputs.reviewed_sha }}',
 CONFIGURE_DEMO_EXPECTED_DIGEST:'${{ inputs.expected_inventory_digest }}',
});
assert.equal(job.steps[4].with.path,'demo-source-configuration-receipt.json');
const schemaBytes=await readFile('/workspace/ClinicOS/agent-team/.runtime/all-open-issues/railway-schema-v5.66.0.json');
const schema=buildClientSchema(JSON.parse(schemaBytes.toString()).data);
const module=await import(pathToFileURL(process.cwd()+'/scripts/automation/configure-demo-source.mjs'));
const documents=[['INVENTORY_QUERY',module.INVENTORY_QUERY],['UPDATE_BRANCH',module.UPDATE_BRANCH]].map(([name,document])=>{
 const doc=parse(document);assert.deepEqual(validate(schema,doc).map(e=>e.message),[]);
 return{name,sha256:sha(document),valid:true};
});
await writeFile(dir+'static-validation.json',JSON.stringify({node:process.version,sourceHashes,typescriptAst:ast,yaml:{valid:true,manualOnly:true,exactMainSha:true,pinnedActions:true,soleSecret:'RAILWAY_DEMO_TOKEN',protectedEnvironment:job.environment},officialSchema:{url:'https://github.com/railwayapp/cli/blob/v5.66.0/src/gql/schema.json',sha256:sha(schemaBytes)},graphql:documents,actualProviderCallPerformed:false},null,2)+'\n');
console.log('PASS: 2 source ASTs, manual protected workflow YAML, 2 actual GraphQL documents against official schema; no provider call.');
