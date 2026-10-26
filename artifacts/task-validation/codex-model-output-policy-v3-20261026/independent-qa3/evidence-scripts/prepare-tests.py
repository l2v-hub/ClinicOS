import pathlib,subprocess,shutil
p=pathlib.Path('/tmp/clinicos-output-policy-qa3');out='/workspace/.clinicos-cloud/cloud-review-activation-20261025/codex-execution-diagnostics/runtime-output-policy-qa3'
shutil.copytree(p/'snapshot/agent-team/src',p/'baseline/agent-team/src',dirs_exist_ok=True)
for f in ['process.mjs','models.mjs']:
 (p/'baseline/agent-team/src/bug-pipeline'/f).write_bytes(subprocess.check_output(['git','-C','/workspace/ClinicOS','show','b868e72ceb2d2e29fdaf077b3d7144c34481e176:agent-team/src/bug-pipeline/'+f]))
s=pathlib.Path('/tmp/clinicos-output-policy-qa2/independent.mjs').read_text().replace('clinicos-output-policy-qa2','clinicos-output-policy-qa3').replace('runtime-output-policy-qa2','runtime-output-policy-qa3').replace('80*1024','3*1024*1024').replace('80 KiB','3 MiB').replace('3f1311dbdf2bc17d2ae5a1ec42e8adb4ea9ba94b','31b11f09331249a93468bf00d8cc3d1313004a72').replace('e26aaa1a-0d6a-4cea-a582-ab66a5a9cdda','e224a4fd-aebb-4679-af5e-7d1d6eb061e5')
s=s.replace("fixtures/child.mjs","fixtures/fakecodex.mjs")
# Record actual baseline cause and capture; source code remains untouched.
s=s.replace("const run=oldRunner({runtimeRoot,env});", "let observed; const raw=oldRunner({runtimeRoot,env});const run=async call=>{observed=await raw(call);return observed;};")
s=s.replace("return {expectedFailure:true,progressBytes:3*1024*1024};", "assert.equal(observed.error,'output-limit');return {expectedFailure:true,runnerError:observed.error,rawStdoutBytes:observed.stdoutBytes,progressPayloadBytes:3*1024*1024};")
# Candidate result proves non-fatal 3MiB stdout and successful separate typed channel.
(p/'independent.mjs').write_text(s)
for f in ['memory-extra.mjs','classifier-extra.mjs']:
 s=pathlib.Path('/tmp/clinicos-output-policy-qa2/'+f).read_text().replace('clinicos-output-policy-qa2','clinicos-output-policy-qa3').replace('runtime-output-policy-qa2','runtime-output-policy-qa3')
 if f=='memory-extra.mjs':s=s.replace('2097152','3145728').replace('maxOutputBytes:2129920','maxOutputBytes:65536,limitStdout:false')
 (p/f).write_text(s)
