import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const require=createRequire('/workspace/ClinicOS/package.json');
const ts=require('typescript'),yaml=require('yaml');
const {buildClientSchema,parse,validate}=await import(pathToFileURL('/tmp/clinicos-schema-check/node_modules/graphql/index.mjs'));
const dir='artifacts/task-validation/demo-source-configuration/attempt-2/';
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
assert.deepEqual(workflow.on.workflow_dispatch.inputs.operation.options,['inspect','set-main','create-main']);
assert.deepEqual(workflow.permissions,{contents:'read'});
assert.deepEqual(workflow.concurrency,{group:'railway-backend','cancel-in-progress':false});
assert.deepEqual(Object.keys(workflow.jobs),['configuration']);
const job=workflow.jobs.configuration;
assert.equal(job.environment,'glistening-friendship / demo');assert.equal(job['timeout-minutes'],5);
for(const condition of ["github.event_name == 'workflow_dispatch'","github.repository == 'l2v-hub/ClinicOS'","github.ref == 'refs/heads/main'",'inputs.reviewed_sha == github.sha'])assert.ok(job.if.includes(condition));
assert.deepEqual(job.steps[0].with,{ref:'${{ github.sha }}','persist-credentials':false});
assert.ok(job.steps.every(s=>!s.uses||/@[a-f0-9]{40}$/.test(s.uses)));
assert.equal(job.steps[2].env,undefined);
assert.deepEqual(job.steps[3].env,{
 RAILWAY_TOKEN:'${{ secrets.RAILWAY_DEMO_TOKEN }}', GITHUB_TOKEN:'${{ github.token }}',
 CONFIGURE_DEMO_OPERATION:'${{ inputs.operation }}', CONFIGURE_DEMO_REVIEWED_SHA:'${{ inputs.reviewed_sha }}',
 CONFIGURE_DEMO_EXPECTED_DIGEST:'${{ inputs.expected_inventory_digest }}',
});
assert.equal(job.steps[4].with.path,'demo-source-configuration-receipt.json');
const schemaBytes=await readFile('/workspace/ClinicOS/agent-team/.runtime/all-open-issues/railway-schema-v5.66.0.json');
const schema=buildClientSchema(JSON.parse(schemaBytes.toString()).data);
const module=await import(pathToFileURL(process.cwd()+'/scripts/automation/configure-demo-source.mjs'));
const documents=[['INVENTORY_QUERY',module.INVENTORY_QUERY],['UPDATE_BRANCH',module.UPDATE_BRANCH],['CREATE_MAIN',module.CREATE_MAIN]].map(([name,document])=>{
 const doc=parse(document);assert.deepEqual(validate(schema,doc).map(e=>e.message),[]);
 return{name,sha256:sha(document),valid:true};
});
const originalText=execFileSync('git',['show','44e2aaeabcc0583ff89b655774a5026546283f70:scripts/automation/configure-demo-source.test.mjs'],{encoding:'utf8'});
const oldAst=ts.createSourceFile('original.mjs',originalText,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const newAst=ts.createSourceFile('candidate.mjs',bytes[2].toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const nonImports=sf=>sf.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(sf));
const originalStatements=nonImports(oldAst),candidateStatements=nonImports(newAst);
assert.deepEqual(candidateStatements.slice(0,originalStatements.length),originalStatements);
assert.deepEqual(execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim().split('\n').sort(),sourceFiles.toSorted());
assert.equal(execFileSync('git',['diff','--name-only','HEAD','--','artifacts/task-validation/demo-source-configuration'],{encoding:'utf8'}),'');
const contracts=['operational-contract.md','operational-addendum-2-create-missing-trigger.md','provider-constraint-clarification.md'];
const contractHashes=Object.fromEntries(await Promise.all(contracts.map(async name=>[name,sha(await readFile('artifacts/task-validation/demo-source-configuration/'+name))])));
await writeFile(dir+'static-validation.json',JSON.stringify({node:process.version,sourceHashes,contractHashes,typescriptAst:ast,yaml:{valid:true,manualOnly:true,exactMainSha:true,pinnedActions:true,soleRepositorySecret:'RAILWAY_DEMO_TOKEN',automaticReadOnlyGitHubToken:true,protectedEnvironment:job.environment},officialSchema:{url:'https://github.com/railwayapp/cli/blob/v5.66.0/src/gql/schema.json',sha256:sha(schemaBytes)},graphql:documents,originalTestsPreserved:{sourceSha:sha(originalText),topLevelNonImportStatements:originalStatements.length,originalTestCount:57,unchanged:true},historicalTrackedEvidenceUnchanged:true,actualProviderCallPerformed:false},null,2)+'\n');
console.log('PASS: 2 source ASTs, protected workflow YAML, 3 official-schema GraphQL documents, all original57 test statements and historical evidence unchanged; no provider call.');
