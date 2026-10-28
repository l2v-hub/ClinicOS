from pathlib import Path
import json,subprocess,struct,hashlib,zipfile
import fitz
q=Path(__file__).resolve().parent;e=q/'browser/evidence';pngs=[];videos=[];traces=[]
for f in sorted(e.glob('*.png')):
 b=f.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n';w,h=struct.unpack('>II',b[16:24]);assert w>0 and h>0
 subprocess.run(['/usr/bin/ffmpeg','-v','error','-i',str(f),'-frames:v','1','-f','null','-'],capture_output=True,check=True);pngs.append({'path':str(f.relative_to(q)),'width':w,'height':h,'decoded':True,'visuallyInspected':False})
for f in sorted(e.glob('*.webm')):
 x=json.loads(subprocess.check_output(['/usr/bin/ffprobe','-v','error','-show_entries','stream=codec_name,width,height','-show_entries','format=duration','-of','json',str(f)],text=True));assert float(x['format']['duration'])>0 and x['streams'][0]['codec_name']=='vp8';subprocess.run(['/usr/bin/ffmpeg','-v','error','-i',str(f),'-f','null','-'],capture_output=True,check=True);videos.append({'path':str(f.relative_to(q)),'fullyDecoded':True,**x})
for f in sorted(e.glob('*.zip')):
 with zipfile.ZipFile(f) as z:assert z.testzip() is None;traces.append({'path':str(f.relative_to(q)),'members':len(z.infolist()),'crcValid':True})
pdf=e/'issue-457-print.pdf';doc=fitz.open(pdf);text='\n'.join(page.get_text() for page in doc);(q/'print-text-independent.txt').write_text(text);required=['INVIO IN PRONTO SOCCORSO','QA motivo verificato e modificato','ULTIMI PARAMETRI RILEVATI','125/80','97 %','78 bpm','18 atti/min','36.8','ULTIME DOSI EFFETTIVAMENTE SOMMINISTRATE','QA PRN457','QA PS prior457','QA Prescription447','QA Contact','0000000000','TERAPIA FARMACOLOGICA ATTIVA']
for value in required:assert value in text,value
assert len(doc)==2
for i,page in enumerate(doc):page.get_pixmap(matrix=fitz.Matrix(1,1)).save(q/f'print-page-{i+1}.png')
(q/'print-inspection.json').write_text(json.dumps({'pdf':'browser/evidence/issue-457-print.pdf','sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'pages':len(doc),'bytes':pdf.stat().st_size,'requiredActualValues':required,'allRequiredAssertionsPass':True,'visuallyInspected':False,'classification':'Independent actual fresh PDF text extraction; full457 scenario acceptance separately asserted by canonical results.'},indent=2)+'\n')
(q/'media-validation.json').write_text(json.dumps({'pngs':pngs,'videos':videos,'traces':traces,'freshPngCount':len(pngs),'pdfPages':2,'classification':'Fresh original canonical captures; scenario outcomes remain authoritative.'},indent=2)+'\n');print('Decoded PNG',len(pngs),'fully decoded VP8',len(videos),'CRC-valid traces',len(traces),'actualPDF pages',len(doc),'requiredvalues',len(required))
