import assert from 'node:assert/strict';
import http from 'node:http';
import { runtimeSttStatus } from '/workspace/clinicos-voice-393/backend/src/voice/stt.ts';
let requests=0;
const server=http.createServer((_req,res)=>{requests++;res.setHeader('Content-Type','application/json');res.end('{"available":true,"realtime":{"enabled":false,"available":false}}');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const env=(i)=>({AI_RUNTIME_URL:base,AI_RUNTIME_SERVICE_TOKEN:`synthetic-partition-${i}`});
try {
 for(let i=0;i<65;i++) await runtimeSttStatus(env(i),1000);
 assert.equal(requests,65);
 await runtimeSttStatus(env(64),2000);assert.equal(requests,65,'newest cached partition retained');
 await runtimeSttStatus(env(0),2000);assert.equal(requests,66,'65th partition evicted oldest at bounded capacity');
 await runtimeSttStatus(env(64),62000);assert.equal(requests,67,'expired retained partition refreshes');
 console.log(JSON.stringify({status:'PASS',checks:3,requests,boundedEntries:64,network:'loopback only',clock:'deterministic milliseconds'}));
} finally {await new Promise(r=>server.close(r));}
