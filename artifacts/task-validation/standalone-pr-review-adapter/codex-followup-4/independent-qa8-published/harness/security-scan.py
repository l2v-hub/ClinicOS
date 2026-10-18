import zipfile,pathlib,json,re,hashlib
root=pathlib.Path('/workspace/.clinicos-cloud/492-continuation8-independent-qa-20261018')
z=zipfile.ZipFile(root/'trace.zip');assert z.testzip() is None
texts=[];images=0;total=0
for entry in z.infolist():
 b=z.read(entry);total+=len(b)
 if entry.filename.endswith(('.trace','.network','.json','.html','.txt','.css','.js')) or (entry.filename.startswith('resources/') and not b.startswith((b'\x89PNG',b'\xff\xd8',b'RIFF'))):
  texts.append((entry.filename,b.decode('utf8','strict')))
 if b.startswith(b'\x89PNG'):images+=1
patterns=[r'(?i)gh[pousr]_[A-Za-z0-9]{20,}',r'(?i)github_pat_[A-Za-z0-9_]{20,}',r'(?i)sk-ant-[A-Za-z0-9_-]{12,}',r'(?i)Bearer\s+[A-Za-z0-9_.-]{15,}',r'(?i)-----BEGIN [A-Z ]*PRIVATE KEY',r'SECRET_SENTINEL_QA8',r'patient-data']
findings=[]
for name,t in texts:
 for p in patterns:
  if re.search(p,t):findings.append({'entry':name,'pattern':p})
assert not findings
joined='\n'.join(t for n,t in texts)
for sentinel in ['Standalone review','qaOnly','retainedHistoryDigest','default-four','comment-requested','comment-running','published']:
 assert sentinel in joined,sentinel
result={'zipCRCAllEntries':'PASS','entries':len(z.infolist()),'decodedTextResources':len(texts),'tracePNGResources':images,'uncompressedBytes':total,'sensitivePatternFindings':len(findings),'syntheticSentinels':'PASS','rawTracePublication':False,'maxPublicFileBytes':25*1024*1024}
(root/'trace-security-scan.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
