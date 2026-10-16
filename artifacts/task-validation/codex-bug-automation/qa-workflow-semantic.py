"""Independent semantic probes; uses existing host PyYAML, never executes workflows."""
from pathlib import Path
import yaml
root=Path(__file__).resolve().parents[3]
load=lambda name:yaml.safe_load((root/'.github/workflows'/name).read_text())
pipeline=load('codex-bug-pipeline.yml');release=load('codex-bug-release.yml');ci=load('bug-pipeline-tests.yml')
assert pipeline['concurrency']==release['concurrency']
assert release['jobs']['release']['environment']=='production'
steps=release['jobs']['release']['steps']
checkouts=[s for s in steps if str(s.get('uses','')).startswith('actions/checkout@')]
assert len(checkouts)==2
assert [s.get('with',{}).get('path','.') for s in checkouts]==['control','deployment']
assert checkouts[0]['with']['ref']=='${{ github.event.repository.default_branch }}'
assert checkouts[1]['with']['ref']=='${{ steps.release.outputs.merge_sha }}'
assert all(s['with']['persist-credentials'] is False for s in checkouts)
vercel=next(s for s in steps if s.get('id')=='vercel')
assert vercel['working-directory']=='deployment'
assert "steps.release.outputs.status == 'merged'" in vercel['if']
for step_id,workflow in [('railway','deploy-backend.yml'),('runtime','deploy-runtime.yml')]:
 step=next(s for s in steps if s.get('id')==step_id)
 assert f'--workflow {workflow} --commit "$MERGE_SHA"' in step['run']
 assert step['env']['MERGE_SHA']=='${{ steps.release.outputs.merge_sha }}'
 assert 'conclusion' in step['run'] and 'success' in step['run']
record=next(s for s in steps if s.get('name')=='Record confirmed deployments on source issues')
assert record['run']=='node control/agent-team/src/bug-pipeline/release.mjs'
assert "steps.release.outputs.status == 'merged'" in record['if']
assert "steps.release.outputs.status == 'deployed'" in record['if']
controller=next(s for s in pipeline['jobs']['process']['steps'] if s.get('name')=='Run serialized issue and review controller')
assert 'VERCEL_TOKEN' not in controller.get('env',{}) and 'RAILWAY_TOKEN' not in controller.get('env',{})
assert ci['permissions']=={'contents':'read'}
assert '${{ secrets.' not in (root/'.github/workflows/bug-pipeline-tests.yml').read_text()
for document in [pipeline,release,ci]:
 for job in document['jobs'].values():
  for step in job['steps']:
   if 'uses' in step:
    assert len(step['uses'].split('@')[-1])==40,step['uses']
print('PASS: 3 workflow documents parsed; secret-free read-only regression CI; shared serialized lock; production environment; separate trusted/exact-merge checkouts; deployment uses exact merge SHA; backend/runtime success monitoring; guarded record step; production credentials absent from model controller; immutable action refs')
