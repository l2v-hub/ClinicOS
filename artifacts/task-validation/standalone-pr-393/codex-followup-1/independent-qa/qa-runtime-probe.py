import asyncio,os,sys,json,unittest
from pathlib import Path
from unittest import mock
sys.path.insert(0,'/workspace/clinicos-voice-393/clinicos-ai-runtime')
from clinicos_ai.voice import realtime,azure_realtime as azure
from clinicos_ai.models.contract import BUDGET,Usage
from clinicos_ai.voice.stt import SttError
ENV={'AI_ENABLED':'true','STT_PROVIDER':'azure','STT_MODEL':'synthetic-batch','STT_REALTIME_ENABLED':'true','STT_REALTIME_MODEL':'synthetic-live','AZURE_OPENAI_ENDPOINT':'https://synthetic.openai.azure.com','AZURE_OPENAI_API_KEY':'synthetic-secret','AI_RUNTIME_SERVICE_TOKEN':'synthetic-service'}
class IndependentBoundaries(unittest.IsolatedAsyncioTestCase):
 async def test_real_exhausted_token_budget_prevents_provider_http(self):
  BUDGET.reset();BUDGET.add(Usage(input_tokens=1,output_tokens=0))
  try:
   with mock.patch.dict(os.environ,{**ENV,'AI_DAILY_TOKEN_BUDGET':'1'},clear=True),mock.patch.object(azure,'_http') as http:
    with self.assertRaises(SttError) as c:await realtime.negotiate('v=0')
    self.assertEqual((c.exception.status,c.exception.kind),(503,'budget_exceeded'));http.assert_not_called()
  finally:BUDGET.reset()
 async def test_authenticated_real_route_explicit_opt_in_is_fail_closed(self):
  from clinicos_ai.api.app import voice_stt_status,voice_realtime_call
  from fastapi import HTTPException
  class Request:
   async def stream(self):yield b'{"sdp":"v=0"}'
  with mock.patch.dict(os.environ,ENV,clear=True),mock.patch.object(azure,'_http') as http:
   s=voice_stt_status('Bearer synthetic-service')
   self.assertTrue(s['realtime']['enabled']);self.assertFalse(s['realtime']['available']);self.assertEqual(s['realtime']['transports'],[])
   with self.assertRaises(HTTPException) as c:await voice_realtime_call(Request(),'Bearer synthetic-service')
   self.assertEqual(c.exception.status_code,503);self.assertEqual(c.exception.detail['kind'],'not_configured');http.assert_not_called()
 async def test_matrix_is_generated_truthfully(self):
  from tools.capability_matrix import build
  checked=json.loads(Path('/workspace/clinicos-voice-393/.ai-architecture/phase-9-production/PROVIDER_CAPABILITY_MATRIX.json').read_text())
  self.assertEqual(checked,build());self.assertFalse(checked['providers']['azure']['capabilities']['realtime']);self.assertTrue(checked['providers']['azure']['capabilities']['stt'])
if __name__=='__main__':unittest.main(verbosity=2)
