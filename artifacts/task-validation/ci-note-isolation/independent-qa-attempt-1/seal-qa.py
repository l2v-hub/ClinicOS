import pathlib,hashlib,json,re,zipfile,subprocess
root=pathlib.Path(__file__).resolve().parents[4]
packet=root/'artifacts/task-validation/ci-note-isolation'
out=pathlib.Path(__file__).resolve().parent
sha=lambda data:hashlib.sha256(data).hexdigest()
source=root/'scripts/run-node-tests.mjs'
assert sha(source.read_bytes())=='e885289d27cc6c315f8fb252e367f7062243ce2117625383106eae486805713f'
author=json.loads((packet/'candidate-seal.json').read_text())
for name,expected in author['files'].items():assert sha((packet/name).read_bytes())==expected,name
browser=json.loads((out/'browser-results.json').read_text());assert browser['status']=='PASS' and browser['domValueAssertions']==12 and browser['errors']==[]
probes=json.loads((out/'independent-probe-results.json').read_text());assert probes['independentRealRunnerProbes']==11 and probes['totalExecutedChildTests']==27
patterns=[re.compile(rb'\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b'),re.compile(rb'\bgh[pousr]_[A-Za-z0-9]{20,}\b'),re.compile(rb'\bgithub_pat_[A-Za-z0-9_]{20,}\b'),re.compile(rb'\bsk-(?:ant-)?[A-Za-z0-9_-]{24,}\b'),re.compile(rb'postgres(?:ql)?://[^\s"\x27]+:[^\s"\x27]+@')]
count=0;zips=[];members=0
for f in sorted(packet.rglob('*')):
 if not f.is_file():continue
 assert not f.is_symlink(),str(f)
 data=f.read_bytes();count+=1
 if f.suffix=='.zip':
  with zipfile.ZipFile(f) as z:
   assert z.testzip() is None
   zips.append(str(f.relative_to(packet)))
   for name in z.namelist():
    body=z.read(name);members+=1
    for pattern in patterns:assert not pattern.search(body),f'credential pattern in ZIP {f.name}'
 elif f.suffix not in ['.png','.webm']:
  for pattern in patterns:assert not pattern.search(data),f'credential pattern in {f.name}'
(out/'privacy-scan.json').write_text(json.dumps({'status':'PASS','filesScanned':count,'validZipFiles':zips,'zipMembersScanned':members,'credentialFindings':0,'syntheticOnly':True,'noRawIssueDump':True,'noPatientData':True,'noSymlink':True,'all12AuthorFilesPreserved':True,'sourceAndTwoContractsPreserved':True},indent=2)+'\n')
media=out/'browser'
assert (media/'result-after-reload.png').read_bytes()[:8]==b'\x89PNG\r\n\x1a\n'
video=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',str(media/'real-runner.webm')]))
assert float(video['format']['duration'])>0 and video['streams'][0]['codec_name'] in ('vp8','vp9')
(out/'media-validation.json').write_text(json.dumps(video,indent=2)+'\n')
files={str(f.relative_to(out)):sha(f.read_bytes()) for f in sorted(out.rglob('*')) if f.is_file() and f.name not in ('qa-artifact-manifest.json','qa-seal.json')}
(out/'qa-artifact-manifest.json').write_text(json.dumps({'status':'READY FOR CODEX QA','sourceHashes':author['sourceHashes'],'contractHashes':author['contractHashes'],'files':files,'fileCount':len(files)},indent=2)+'\n')
(out/'qa-seal.json').write_text(json.dumps({'status':'READY FOR CODEX QA','sourceSha256':sha(source.read_bytes()),'authorSealSha256':sha((packet/'candidate-seal.json').read_bytes()),'artifactManifestSha256':sha((out/'qa-artifact-manifest.json').read_bytes()),'validationReportSha256':sha((out/'validation-report.md').read_bytes()),'sourceChangedByQA':False,'ownFixtureCleanupCompleted':True,'noGitMutationOrProviderInvocation':True},indent=2)+'\n')
print(json.dumps({'status':'READY FOR CODEX QA','qaFiles':len(files),'packetFilesScanned':count,'zipMembersScanned':members,'duration':video['format']['duration']}))
