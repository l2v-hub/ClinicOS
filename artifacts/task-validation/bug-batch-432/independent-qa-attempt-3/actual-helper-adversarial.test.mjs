import test from 'node:test';
import assert from 'node:assert/strict';
for (const name of ['backend','browser']) {
 const {withHeldCorrection}=await import(`./actual-${name}-helper.mjs`);
 const fixture=(failure)=>{let resolve;let released=false,settled=false;const held=new Promise(r=>resolve=r);return {promise:held.then(()=>{settled=true;if(failure)throw failure}),release(){released=true;resolve()},check(){assert.equal(released,true);assert.equal(settled,true)}}};
 test(`${name}: never-settling confirmation reaches release and settled cleanup`,{timeout:1000},async()=>{const f=fixture(); await assert.rejects(withHeldCorrection(f.promise,Promise.resolve(),()=>f.release(),()=>new Promise(()=>{}),15),/Confirmation callback did not complete/);f.check()});
 test(`${name}: timeout then late callback rejection is observed`,{timeout:1000},async()=>{const f=fixture();let reject;const late=new Promise((_,r)=>reject=r);await assert.rejects(withHeldCorrection(f.promise,Promise.resolve(),()=>f.release(),()=>late,15),/Confirmation callback did not complete/);f.check();reject(new Error('late synthetic failure'));await new Promise(r=>setImmediate(r))});
 test(`${name}: failed callback and failed cleanup preserve both exact errors`,{timeout:1000},async()=>{const primary=new Error('synthetic primary'),secondary=new Error('synthetic cleanup'),f=fixture(secondary);await assert.rejects(withHeldCorrection(f.promise,Promise.resolve(),()=>f.release(),async()=>{throw primary},15),e=>e instanceof AggregateError&&e.cause===primary&&e.errors[0]===primary&&e.errors[1]===secondary);f.check()});
 test(`${name}: entry failure still releases`,{timeout:1000},async()=>{const f=fixture();await assert.rejects(withHeldCorrection(f.promise,new Promise(()=>{}),()=>f.release(),async()=>assert.fail('callback must not run'),15),/Correction did not reach interpreter entry/);f.check()});
 test(`${name}: successful callback releases exactly once`,{timeout:1000},async()=>{const f=fixture();let calls=0;await withHeldCorrection(f.promise,Promise.resolve(),()=>{calls++;f.release()},async()=>{},15);f.check();assert.equal(calls,1)});
}
