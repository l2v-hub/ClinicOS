import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectProxyRequest, inspectConnect, metadataRoute, officialForwardOptions } from '../../src/bug-pipeline/native-guard-proxy.mjs';
const headers=['Host','api.anthropic.com','Authorization','Bearer synthetic-only-token','Content-Type','application/json','Content-Length','2'];
test('CONNECT authority is exact and never an open tunnel',()=>{
 assert.equal(inspectConnect({method:'CONNECT',url:'api.anthropic.com:443',rawHeaders:['Host','api.anthropic.com:443']}),true);
 for(const url of ['api.anthropic.com.evil:443','127.0.0.1:443','api.anthropic.com:80','api.anthropic.com:443/'])assert.throws(()=>inspectConnect({method:'CONNECT',url,rawHeaders:['Host',url]}));
});
test('raw duplicate framing/auth/host and alternate authentication fail closed',()=>{
 assert.equal(inspectProxyRequest({method:'POST',url:'/v1/messages',rawHeaders:headers},'synthetic-only-token').contentLength,2);
 for(const h of [['HOST','other'],['Authorization','Bearer second'],['Transfer-Encoding','chunked'],['X-Api-Key','bad'],['Content-Length','2'],['Connection','upgrade']])assert.throws(()=>inspectProxyRequest({method:'POST',url:'/v1/messages',rawHeaders:[...headers,...h]},'synthetic-only-token'));
 assert.throws(()=>inspectProxyRequest({method:'POST',url:'/v1/messages',rawHeaders:headers},'different-token'));
});
test('only fixed inference and policy metadata endpoints are allowed',()=>{
 for(const url of ['/api/claude_code/settings','/api/claude_code/policy_limits'])assert.equal(metadataRoute('GET',url),true);
 for(const url of ['/api/claude_code/settings?code=secret','/api/claude_code/metrics','/v1/messages/batches','https://api.anthropic.com/v1/messages'])assert.throws(()=>inspectProxyRequest({method:'POST',url,rawHeaders:headers},'synthetic-only-token'));
 assert.equal(metadataRoute('POST','/api/claude_code/settings'),false);
});
test('upstream TLS cannot inherit local CA/proxy or route to alternate host',()=>{
 const o=officialForwardOptions();assert.equal(o.hostname,'api.anthropic.com');assert.equal(o.port,443);assert.equal(o.servername,'api.anthropic.com');assert.equal(o.rejectUnauthorized,true);assert.equal(o.agent,false);assert.equal(o.ca,undefined);assert.equal(o.proxy,undefined);
});
