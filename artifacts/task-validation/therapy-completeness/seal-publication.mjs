import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
const root='artifacts/task-validation/therapy-completeness', app=process.argv[2];
assert.ok(/^[a-f0-9]{40}$/.test(app || ''), 'Explicit application commit required');
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8',windowsHide:true,maxBuffer:10e6});assert.equal(r.status,0);return r.stdout.trim();};
const paths=git(['ls-files','--',root]).split('\n').filter(p=>p&&!p.endsWith('/publication-manifest.json'));
assert.equal(git(['diff', '--name-only', app, '--', 'frontend/src', 'backend/src']), '', 'Application source must match candidate');
// The original independently sealed151 artifacts include their compiled qa-dist evidence.
// Preserve that historical seal; exclude fresh root build scratch directories from publication.
assert.ok(paths.every(p=>!p.slice(root.length+1).split('/')[0].endsWith('-dist')), 'Root build scratch directories are not publication artifacts');
assert.ok(paths.length>20);
const env=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const privateValues=Object.entries(env).filter(([k,v])=>/token|key|secret|password|connection/i.test(k)&&typeof v==='string'&&v.length>=12).map(([,v])=>Buffer.from(v));
let zipMembers=0,embeddedReports=0;
const scan=(bytes,path)=>{
  assert.ok(privateValues.every(v=>!bytes.includes(v)),'Configured credential detected in '+path);
  const text=bytes.toString('utf8');
  assert.equal(/(?:sk-proj-|ghp_|github_pat_)[A-Za-z0-9_-]{20,}/.test(text),false,'Credential-shaped value in '+path);
  assert.equal(new RegExp(['FRANCE'+'SCHELLI','FRNNGL39'+'D17D360R'].join('|'),'i').test(text),false,'Real source identity in '+path);
  for(const m of text.matchAll(/data:application\/zip;base64,([A-Za-z0-9+/=]+)/g)){embeddedReports++;zip(Buffer.from(m[1],'base64'),path+'!report');}
};
const zip=(bytes,path)=>{
  let end=-1;
  for(let at=bytes.length-22;at>=Math.max(0,bytes.length-65558);at--)if(bytes.readUInt32LE(at)===0x06054b50){end=at;break;}
  assert.ok(end>=0,'Invalid ZIP '+path);let at=bytes.readUInt32LE(end+16);
  for(let i=0,count=bytes.readUInt16LE(end+10);i<count;i++){
    assert.equal(bytes.readUInt32LE(at),0x02014b50);
    const method=bytes.readUInt16LE(at+10),size=bytes.readUInt32LE(at+20),length=bytes.readUInt16LE(at+28),extra=bytes.readUInt16LE(at+30),comment=bytes.readUInt16LE(at+32),offset=bytes.readUInt32LE(at+42);
    const name=bytes.subarray(at+46,at+46+length).toString('utf8');assert.ok(!name.startsWith('/')&&!name.split('/').includes('..'));
    assert.equal(bytes.readUInt32LE(offset),0x04034b50);const start=offset+30+bytes.readUInt16LE(offset+26)+bytes.readUInt16LE(offset+28);
    const compressed=bytes.subarray(start,start+size);assert.ok(method===0||method===8);
    scan(method===0?compressed:inflateRawSync(compressed,{maxOutputLength:100e6}),path+'!'+name);zipMembers++;at+=46+length+extra+comment;
  }
};
const stream=spawnSync('git',['cat-file','--batch'],{input:paths.map(p=>':'+p).join('\n')+'\n',windowsHide:true,maxBuffer:400e6});assert.equal(stream.status,0);
const hash=b=>createHash('sha256').update(b).digest('hex');
let offset=0;const files=[];
for(const path of paths){const end=stream.stdout.indexOf(10,offset),header=stream.stdout.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob');
  const length=Number(header[2]);offset=end+1;const bytes=stream.stdout.subarray(offset,offset+length);offset+=length;assert.equal(stream.stdout[offset++],10);
  scan(bytes,path);if(path.endsWith('.zip'))zip(bytes,path);
  files.push({path,bytes:length,gitBlobSha256:hash(bytes),localSha256:hash(readFileSync(path))});
}
assert.equal(offset,stream.stdout.length);
writeFileSync(root+'/publication-manifest.json',JSON.stringify({applicationCommit:app,decision:'SYNTHETIC PARTIAL EVIDENCE ONLY; NO PRODUCTION RELEASE',
  files,configuredCredentialExactChecks:privateValues.length,zipMembers,embeddedReports,findings:[],syntheticOnly:true,
  canonicalIndexBytesScanned:true,visualReviewRequired:true,at:new Date().toISOString()},null,2));
console.log(JSON.stringify({files:files.length,zipMembers,embeddedReports,findings:0}));
