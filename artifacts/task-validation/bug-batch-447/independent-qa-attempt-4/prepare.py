from pathlib import Path
import json,hashlib,subprocess,difflib,shutil,datetime
r=Path.cwd();p=r/'artifacts/task-validation/bug-batch-447';q=p/'independent-qa-attempt-4';old=p/'independent-qa-attempt-3';h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
s=json.loads((p/'implementation-cycle-4/source-and-contract-seal.json').read_text());assert h(p/'implementation-cycle-4/source-and-contract-seal.json')=='87043836f6d1650c3da3ce693d2277354cdafe5008c4cfb2428918aedfed5e31'
assert len(s['source'])==94 and len(s['contracts'])==27
for n,v in s['source'].items():assert h(r/n)==v,n
for n,v in s['contracts'].items():assert h(p/n)==v,n
prev=json.loads((old/'initial-integrity.json').read_text());changed=[n for n,v in s['source'].items() if prev['source'].get(n)!=v];assert changed==['e2e/qa-bug-batch-447-browser.mjs'];assert all(v==s['contracts'][n] for n,v in prev['contracts'].items())
a=(p/'implementation-cycle-4/browser-before-cycle4.mjs').read_text();b=(r/changed[0]).read_text();assert hashlib.sha256(a.encode()).hexdigest()==prev['source'][changed[0]]
assert b==a.replace("page.locator('.patient-roster tbody tr').first().waitFor()", "page.locator('.patient-roster tbody tr.patient-roster__row').first().waitFor()"),'Only exact selector replacement allowed'
(q/'selector-only.diff').write_text(''.join(difflib.unified_diff(a.splitlines(True),b.splitlines(True),fromfile='qa3-browser',tofile='qa4-browser')))
sealed={}
for folder,count in [('independent-qa-attempt-2',806),('independent-qa-attempt-3',262)]:
 d=json.loads((p/folder/'final-seal.json').read_text());assert len(d['files'])==count
 for n,v in d['files'].items():assert h(p/folder/n)==v,(folder,n)
 sealed[folder]=len(d['files'])
refs=json.loads((old/'preserved-pre-qa/relocation-provenance.json').read_text())['files']
for n,v in refs.items():assert h(old/v['object'])==v['sha256'],n
canonical=json.loads((old/'canonical-current-hashes.json').read_text());assert h(old/'canonical-current-hashes.json')=='dbe1e647756ab109e18409238f1c1b52c6527917830d96feb122d429ed1b1dad'
# Every canonical path is hash checked; only overwritten proof needs relocation. Existing immutable QA3 copies are reused.
overwrite_names={'browser-native-clear-scope.txt','database-provenance.json','temporary-ps-database-tests.txt','stack-result.json','native-adapter-result.json','native-adapter-failure.json','postgres-native-emulator.log','backend.local.log','frontend.local.log'}
reloc={}
for n,v in canonical['files'].items():
 assert h(p/n)==v,n
 if n.startswith('evidence/') or n.startswith('test-results/') and Path(n).name in overwrite_names:
  candidate=old/'browser'/n
  if candidate.is_file() and h(candidate)==v:dest=candidate
  else:
   dest=q/'preserved-pre-qa/objects'/v
   dest.parent.mkdir(parents=True,exist_ok=True)
   if not dest.exists():shutil.copyfile(p/n,dest)
   assert h(dest)==v
  reloc[n]={'sha256':v,'object':str(dest.relative_to(p)),'usesExistingImmutableQa3Copy':str(dest).startswith(str(old))}
(q/'preserved-pre-qa').mkdir(exist_ok=True)
(q/'preserved-pre-qa/relocation-provenance.json').write_text(json.dumps({'canonicalManifestSha256':h(old/'canonical-current-hashes.json'),'canonicalFilesVerified':len(canonical['files']),'overwritableFilesRelocated':len(reloc),'files':reloc,'noHardlinks':True},indent=2)+'\n')
contracts=[]
for n,v in s['contracts'].items():
 data=(p/n).read_text();row={'path':n,'sha256':v,'bytesRead':len(data.encode())}
 if n.endswith('.json'):
  obj=json.loads(data);plan=obj.get('plan',obj);row.update(topLevelKeys=list(obj),scopeCount=len(plan.get('scope',[])),issues=plan.get('issues'),structuredSteps=plan.get('steps',[]))
 contracts.append(row)
(q/'contract-read-receipt.json').write_text(json.dumps({'all27ReadAndParsed':True,'contracts':contracts},indent=2)+'\n')
initial={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'source':s['source'],'contracts':s['contracts'],'changedSinceQa3':changed,'allOther93SourceBytesUnchanged':True,'qa3Old26ContractsUnchanged':True,'sealedHistoricalFilesVerified':sealed,'author2038HistoricalArtifactsResolved':len(refs),'canonicalFilesVerified':len(canonical['files']),'overwritableRelocations':len(reloc),'author4SealSha256':h(p/'implementation-cycle-4/source-and-contract-seal.json')}
(q/'initial-integrity.json').write_text(json.dumps(initial,indent=2)+'\n');print(json.dumps({k:v for k,v in initial.items() if k not in ['source','contracts']}))
