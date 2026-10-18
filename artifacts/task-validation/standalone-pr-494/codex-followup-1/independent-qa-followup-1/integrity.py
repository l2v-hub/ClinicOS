import pathlib,json,hashlib,subprocess,sys
r=pathlib.Path('/workspace/clinicos-topology-receipt'); out=pathlib.Path(__file__).parent
p=r/'artifacts/task-validation/standalone-pr-494/codex-followup-1'; f=json.loads((p/'source-freeze.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
checks={}
for name,x in f['sources'].items():checks[name]={'expected':x['sha256'],'actual':sha((r/name).read_bytes())}
for name,x in f['evidence'].items():checks[str((p/name).relative_to(r))]={'expected':x['sha256'],'actual':sha((p/name).read_bytes())}
checks[str((p/'source-freeze.json').relative_to(r))]={'expected':'6d75012656ecb0d21261927a626790ec985a652cf6050f19b773d090cf70761f','actual':sha((p/'source-freeze.json').read_bytes())}
prior=json.loads((p/'prior-proof-manifest.json').read_text())
for name,x in prior.items():checks[name]={'expected':x,'actual':sha((r/name).read_bytes())}
head=subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()
status=subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True)
result={'head':head,'headMatchesReservation':head=='9ec1c16fcb061f14cdab47c699087d504d8f2305','workingTreeStatus':status,'checks':checks,'sourceCount':3,'frozenMetadataCount':8,'priorProofCount':len(prior),'allHashesMatch':all(x['actual']==x['expected'] for x in checks.values())}
(out/('integrity-'+sys.argv[1]+'.json')).write_text(json.dumps(result,indent=2)+'\n')
assert result['allHashesMatch'] and result['headMatchesReservation'] and status == '?? artifacts/task-validation/standalone-pr-494/\n'
print('Integrity PASS: 3 source + 8 frozen metadata +',len(prior),'prior proof files; reserved HEAD',head)
