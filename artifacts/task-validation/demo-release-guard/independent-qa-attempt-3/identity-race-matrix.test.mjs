import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,probe} from './identity-race-probes.mjs';
for(const name of cases)test(`fresh identity rejects ${name} before a merge or closure`,async()=>{
 const r=await probe(name);
 assert.equal(r.changeDone,true,'The mutation must actually occur during the targeted await');
 assert.equal(r.implementationRounds,1);assert.equal(r.reviewRounds,1);
 console.log(JSON.stringify(r));
 assert.deepEqual(r.actualMerges,[],`Unexpected merge after ${name}`);
 assert.deepEqual(r.actualClosures,[],`Unexpected closure after ${name}`);
 assert.equal(r.decision,'BLOCKED');
});
