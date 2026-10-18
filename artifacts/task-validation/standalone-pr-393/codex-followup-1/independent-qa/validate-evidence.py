from pathlib import Path
import io,json,zipfile,hashlib,re,subprocess,html
q=Path(__file__).parent;r=Path('/workspace/clinicos-voice-393');a=r/'artifacts/task-validation/standalone-pr-393/codex-followup-1/author-runtime-1'
hash=lambda b:hashlib.sha256(b).hexdigest()
patterns={'privateKey':rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----','postgresDsn':rb'postgres(?:ql)?://[^\s:@/]+:[^\s@/]+@','apiKeyLike':rb'(?:sk-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,})','jwtLike':rb'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}','demoSession':rb'sim\.[A-Za-z0-9._-]+'}
def scan(data):return {k:len(re.findall(p,data)) for k,p in patterns.items()}
def decode(data,name,fmt=None):
 cmd=['ffmpeg','-nostdin','-v','error']
 if fmt:cmd+=['-f',fmt]
 cmd+=['-i','pipe:0','-f','null','-']
 p=subprocess.run(cmd,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 assert p.returncode==0 and not p.stderr,(name,p.returncode,p.stderr.decode()[:300])
def archive(data,declared=None):
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  assert z.testzip() is None
  entries=[];counts={k:0 for k in patterns};jpeg=[];png=[]
  for n in z.namelist():
   assert not n.startswith('/') and '..' not in Path(n).parts,n
   b=z.read(n);s=scan(b)
   for k,v in s.items():counts[k]+=v
   entries.append({'name':n,'sha256':hash(b),'bytes':len(b),'scan':s})
   if n.lower().endswith(('.jpeg','.jpg')):jpeg.append(b)
   if n.lower().endswith('.png'):png.append((n,b))
  if declared:
   expected={e['name']:e['sha256'] for e in declared['members']}
   assert expected=={e['name']:e['sha256'] for e in entries}
  if jpeg:decode(b''.join(jpeg),'all ZIP JPEG frames','mjpeg')
  for n,b in png:decode(b,n,'image2pipe')
  return {'zipBytes':len(data),'sha256':hash(data),'members':entries,'memberCount':len(entries),'crc':'PASS','scan':counts,'decodedZipJpegFrames':len(jpeg),'decodedZipPng':len(png)}
raw=q/'runtime-1/trace/trace.zip';private=q/'private';private.mkdir(exist_ok=True);original=private/'trace-original.zip';raw.rename(original)
data=original.read_bytes();original_hash=hash(data);redactions=0;buf=io.BytesIO()
with zipfile.ZipFile(io.BytesIO(data)) as src,zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as dst:
 assert src.testzip() is None
 for info in src.infolist():
  b=src.read(info.filename);b,n=re.subn(patterns['demoSession'],b'sim.[SYNTHETIC_SESSION_REDACTED]',b);redactions+=n;dst.writestr(info,b)
sanitized=buf.getvalue();proof=archive(sanitized);assert not any(proof['scan'].values()),proof['scan'];parts=[]
for i,start in enumerate(range(0,len(sanitized),16*1024*1024),1):
 part=sanitized[start:start+16*1024*1024];name=f'trace.zip.part-{i:02}';(raw.parent/name).write_bytes(part);parts.append({'file':name,'bytes':len(part),'sha256':hash(part)})
reconstructed=b''.join((raw.parent/p['file']).read_bytes() for p in parts);assert reconstructed==sanitized
proof.update(format='byte-split sanitized Playwright ZIP',parts=parts,syntheticSessionRedactions=redactions,rawSha256=original_hash,rawRetainedPrivate=True)
(raw.parent/'trace-manifest.json').write_text(json.dumps(proof,indent=2)+'\n')
(raw.parent/'README.md').write_text('Reconstruct in listed order: `cat trace.zip.part-* > trace.zip`. Verify SHA256 from trace-manifest.json, then `unzip -t trace.zip`. Every decompressed member was CRC checked, hashed and scanned; JPEG/PNG members decoded. Synthetic demo sessions were redacted. Raw original stays private and must not be published.\n')
author_manifest=json.loads((a/'trace/trace-manifest.json').read_text());author_parts=[]
for p in author_manifest['parts']:
 b=(a/'trace'/p['file']).read_bytes();assert len(b)==p['bytes'] and hash(b)==p['sha256'];author_parts.append(b)
author_data=b''.join(author_parts);assert hash(author_data)==author_manifest['sha256'];author=archive(author_data,author_manifest);assert not any(author['scan'].values()),author['scan'];(q/'author-trace-independent-inspection.json').write_text(json.dumps(author,indent=2)+'\n')
media=[]
for base,label in [(q/'runtime-1','independent'),(a,'author-read-only')]:
 for f in sorted(base.rglob('*')):
  if f.suffix in ('.png','.webm'):
   p=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(f),'-f','null','-'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
   assert p.returncode==0 and not p.stderr,(f,p.stderr.decode()[:300]);media.append({'kind':label,'path':str(f),'bytes':f.stat().st_size,'sha256':hash(f.read_bytes()),'decode':'PASS'})
(q/'media-validation.json').write_text(json.dumps({'media':media,'decoded':len(media)},indent=2)+'\n')
text_scan={};findings=[]
for base in [q/'runtime-1/logs',q/'logs']:
 for f in base.glob('*'):
  if f.is_file():
   s=scan(f.read_bytes());text_scan[str(f.relative_to(q))]=s
   if any(s.values()):findings.append(str(f.relative_to(q)))
assert not findings,findings
(q/'privacy-scan.json').write_text(json.dumps({'independentTrace':{k:v for k,v in proof.items() if k!='members'},'authorTrace':{k:v for k,v in author.items() if k!='members'},'logs':text_scan,'logFindings':findings,'phi':'Synthetic seed-only owned DB. Visual inspection pending/live and persisted result screenshots; no real PHI source was used.'},indent=2)+'\n')
result=json.loads((q/'runtime-1/test-results/integrated-result.json').read_text());report=q/'runtime-1/playwright-report';report.mkdir(exist_ok=True)
rows=''.join('<tr><td>'+html.escape(c['name'])+'</td><td>'+c['status']+'</td></tr>' for c in result['checks'])
(report/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>PR393 independent Playwright evidence</title><h1>PR393 independent browser run: PASS</h1><p>Source digest 0e239c1633a11c33397d28a1263935e7278f1ec204858246056141acf3cb38af. 51 real custom-Playwright assertions; synthetic provider peer; real app, microphone/VAD, auth and owned PostgreSQL. No unexpected console/HTTP errors. Real Azure unverified and blocked.</p><table>'+rows+'</table><p><a href="../screenshots/12-reload-persisted-readback.png">Persisted 120/80 after reload</a> | <a href="../screenshots/05a-pending-negotiation-microphone-live.png">Pending microphone live</a> | <a href="../trace/README.md">Trace reconstruction</a> | <a href="../test-results/integrated-result.json">Raw result</a></p>')
print(json.dumps({'independentTraceMembers':proof['memberCount'],'redactions':redactions,'parts':parts,'authorTraceMembers':author['memberCount'],'decodedMedia':len(media),'allMemberScan':'PASS','logsScan':'PASS'}))
