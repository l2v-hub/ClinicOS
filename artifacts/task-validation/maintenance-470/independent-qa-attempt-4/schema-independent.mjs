import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ts from '/workspace/ClinicOS/node_modules/typescript/lib/typescript.js';
import graphql from '/tmp/clinicos-schema-check/node_modules/graphql/index.js';
const schemaFile='/tmp/clinicos-railway-cli-source/src/gql/schema.json',bytes=fs.readFileSync(schemaFile),schemaSha256=createHash('sha256').update(bytes).digest('hex');
assert.equal(schemaSha256,'3c3d1448f2a746d6e5977ba3aa205889f959c427be5cfe37c72e79b1fa65f2be');
const schema=graphql.buildClientSchema(JSON.parse(bytes).data),operations=[];
for(const file of ['scripts/maintenance/demo-storage-backups.mjs','scripts/maintenance/demo-patient-inventory.mjs','scripts/maintenance/demo-patient-cleanup-authorized.mjs']){
 const text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 function visit(node){if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)){const query=node.text;if(/^(query|mutation)\s*[( {]/.test(query)){const parsed=graphql.parse(query),errors=graphql.validate(schema,parsed);operations.push({file,line:ast.getLineAndCharacterOfPosition(node.getStart()).line+1,operation:parsed.definitions[0].operation,errors:errors.map(e=>e.message)});assert.deepEqual(errors,[]);}}ts.forEachChild(node,visit);}visit(ast);
}
assert.equal(operations.length,11);
const enumValues={VolumeState:['READY'],DeploymentInstanceStatus:['RUNNING','CRASHED','EXITED','REMOVED','SKIPPED','STOPPED'],DeploymentStatus:['SUCCESS']};
for(const [type,values]of Object.entries(enumValues)){const known=schema.getType(type).getValues().map(x=>x.name);for(const value of values)assert.ok(known.includes(value),type+'.'+value);}
const result={officialSchema:'railwayapp/cli v5.66.0 src/gql/schema.json',schemaSha256,graphqlVersion:graphql.version,extractor:'TypeScript AST string literals; every query/mutation in all three source modules',operations,enumValues,allValid:true};fs.writeFileSync(new URL('./schema-independent-result.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({operationCount:operations.length,allValid:true,schemaSha256}));
