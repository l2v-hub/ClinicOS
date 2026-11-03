import test from 'node:test';
import assert from 'node:assert/strict';
import { certificateCommands, validatePublicCertificate, collectOpenSSL } from '../../src/bug-pipeline/native-guard-certificates.mjs';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
test('certificate commands keep all private material in FD pipes, no key filename',()=>{
 const c=certificateCommands('0123456789abcdef0123456789abcdef');assert.equal(c.length,2);
 for(const args of c){assert.ok(args.includes('/dev/null'));assert.ok(!args.some(x=>/BEGIN|PRIVATE KEY|\.key$|serial\.srl/.test(x)));assert.equal(args[args.indexOf('-out')+1],'/dev/stdout');}
 assert.equal(c[1][c[1].indexOf('-CAkey')+1],'/dev/fd/5');
});
test('public CA rejects private keys and extra PEM objects before any mount',()=>{
 assert.throws(()=>validatePublicCertificate(Buffer.from('-----BEGIN PRIVATE KEY-----\nsecret')));
 assert.throws(()=>validatePublicCertificate(Buffer.from('-----BEGIN CERTIFICATE-----\nmalformed\n-----END CERTIFICATE-----')));
});
test('OpenSSL failure never leaks raw stderr or supplied key into errors',async()=>{
 const spawnImpl=()=>{const p=new EventEmitter();p.stdout=new PassThrough();p.stderr=new PassThrough();p.stdio=[null,p.stdout,p.stderr,new PassThrough(),new PassThrough(),new PassThrough()];p.kill=()=>{};queueMicrotask(()=>{p.stderr.end('private-key-provider-error');p.emit('close',1);});return p;};
 await assert.rejects(collectOpenSSL(['req'],[Buffer.from('synthetic-private')],{spawnImpl}),e=>e.message==='native-certificate-generation-failed'&&!JSON.stringify(e).includes('private'));
});
