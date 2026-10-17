import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const sourceFile = 'agent-team/src/bug-pipeline/demo-deployment.mjs';
const schemaFile = '/tmp/clinicos-railway-cli-source/src/gql/schema.json';
const { buildClientSchema, parse, validate } = await import(pathToFileURL('/tmp/clinicos-schema-check/node_modules/graphql/index.mjs'));
const source = await readFile(sourceFile, 'utf8');
const schemaBytes = await readFile(schemaFile);
const schemaJson = JSON.parse(schemaBytes.toString('utf8'));
const schema = buildClientSchema(schemaJson.data ?? schemaJson);
const documents = [...source.matchAll(/`((?:query|mutation)\([\s\S]*?)`/g)].map(match => match[1]);
assert.equal(documents.length, 3, 'All actual static release queries/mutation must be validated');
const result = documents.map((document, index) => {
  const errors = validate(schema, parse(document));
  assert.deepEqual(errors.map(error => error.message), []);
  return { index: index + 1, sha256: createHash('sha256').update(document).digest('hex'), valid: true };
});
await writeFile('artifacts/task-validation/demo-release-guard/independent-qa-attempt-4/railway-schema-qa.json', JSON.stringify({
  sourceFile, sourceSha256: createHash('sha256').update(source).digest('hex'),
  officialSchema: 'https://github.com/railwayapp/cli/blob/v5.66.0/src/gql/schema.json',
  schemaSha256: createHash('sha256').update(schemaBytes).digest('hex'), graphqlVersion: '16.11.0', documents: result,
  actualRailwayRequestPerformed: false,
}, null, 2) + '\n');
console.log(`GraphQL AST validation: all ${documents.length} actual Railway release documents valid against official CLI v5.66.0 schema.`);
