from pathlib import Path
import os,subprocess,json,sys,time
q=Path(__file__).parent;r=Path('/workspace/clinicos-voice-393')
env={k:v for k,v in os.environ.items() if k in ('PATH','HOME','LANG','LC_ALL','TMPDIR','TZ','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR','REQUESTS_CA_BUNDLE')}
env.update(PYTHONDONTWRITEBYTECODE='1',NODE_OPTIONS='--max-old-space-size=4096')
commands={
 'runtime-full':(['/workspace/.venvs/clinicos-ai/bin/python','-m','unittest','discover','-s','tests','-v'],r/'clinicos-ai-runtime'),
 'frontend-focused':(['node','--import','tsx','--test','frontend/src/components/assistant/voice/__tests__/voice.test.ts','frontend/src/components/assistant/voice/__tests__/realtime.test.ts','frontend/src/components/assistant/voice/__tests__/readback.test.ts'],r),
 'frontend-app-types':(['node','node_modules/typescript/bin/tsc','-p','frontend/tsconfig.app.json','--noEmit','--tsBuildInfoFile',str(q/'frontend-app.tsbuildinfo')],r),
 'frontend-node-types':(['node','node_modules/typescript/bin/tsc','-p','frontend/tsconfig.node.json','--noEmit','--tsBuildInfoFile',str(q/'frontend-node.tsbuildinfo')],r),
 'frontend-build':(['node','../node_modules/vite/bin/vite.js','build','--outDir',str(q/'build/frontend')],r/'frontend'),
 'backend-build':(['node','node_modules/typescript/bin/tsc','-p','backend/tsconfig.json','--outDir',str(q/'build/backend')],r),
 'frontend-security':(['node','scripts/security/scan-frontend-secrets.mjs','frontend/src','frontend/index.html'],r),
 'diff-check':(['git','diff','--check'],r),
}
for name in sys.argv[1:]:
 cmd,cwd=commands[name];start=time.time()
 with (q/'logs'/f'{name}.log').open('w') as f:
  result=subprocess.run(cmd,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT)
 info={'name':name,'command':cmd,'cwd':str(cwd),'exitCode':result.returncode,'durationSeconds':round(time.time()-start,2)}
 (q/'logs'/f'{name}.result.json').write_text(json.dumps(info,indent=2)+'\n');print(json.dumps(info),flush=True)
