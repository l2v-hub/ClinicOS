import pathlib,json,hashlib,shutil,re
r=pathlib.Path.cwd();p=r/'artifacts/task-validation/bug-batch-447';q=p/'independent-qa-attempt-3';dst=q/'full-backend/test-results'
if (q/'legacy-after-restoration.json').exists(): raise SystemExit('Single-use restoration already complete; refusing overwrite')
dst.mkdir(parents=True)
for n in ['full-backend-tests.txt','full-backend-native-lifecycle.txt','database-provenance.json','stack-result.json','native-backend-suite-result.json','postgres-native-backend-emulator.log','native-backend-suite-failure.json']:
 f=p/'test-results'/n
 if f.exists():
  old=json.loads((p/'author-cycle-3-final-seal.json').read_text())['files'].get('test-results/'+n)
  if n.endswith('failure.json') and old==hashlib.sha256(f.read_bytes()).hexdigest():continue
  shutil.copy2(f,dst/n)
txt=(dst/'full-backend-tests.txt').read_text();counts={k:sum(map(int,re.findall(r'^ℹ '+k+r' (\d+)',txt,re.M))) for k in ['tests','pass','fail','cancelled','skipped','todo']};(q/'full-backend-counts.json').write_text(json.dumps(counts,indent=2)+'\n');print('ACTUAL BACKEND',counts)
before=json.loads((q/'legacy-before.json').read_text());generated={};generatedDir=q/'legacy-generated-by-this-run';generatedDir.mkdir()
sha=lambda b:hashlib.sha256(b).hexdigest()
for path,old in before.items():
 f=r/path;b=f.read_bytes() if f.exists() else None;new=sha(b) if b is not None else None;generated[path]=new
 if new and new!=old:(generatedDir/new).write_bytes(b)
(q/'legacy-generated.json').write_text(json.dumps(generated,indent=2)+'\n')
for path,old in before.items():
 f=r/path;new=sha(f.read_bytes()) if f.exists() else None;assert new==generated[path],path
 if new==old:continue
 if old:f.write_bytes((q/'legacy-before-bytes'/old).read_bytes())
 elif f.exists():f.unlink()
after={path:sha((r/path).read_bytes()) if (r/path).exists() else None for path in before};assert after==before
(q/'legacy-after-restoration.json').write_text(json.dumps({'restored25':True,'onlyOwnChangedBytesRestored':True,'before':before,'after':after,'generated':generated},indent=2)+'\n')
