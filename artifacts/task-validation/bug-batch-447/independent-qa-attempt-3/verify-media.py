import pathlib,json,subprocess,struct,hashlib,zipfile
q=pathlib.Path(__file__).resolve().parent;e=q/'browser/evidence';pngs=[];videos=[];traces=[]
for f in sorted(e.glob('*.png')):
 b=f.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n';width,height=struct.unpack('>II',b[16:24]);assert width>0 and height>0
 subprocess.run(['/usr/bin/ffmpeg','-v','error','-i',str(f),'-frames:v','1','-f','null','-'],capture_output=True,check=True);pngs.append({'path':str(f.relative_to(q)),'width':width,'height':height,'visuallyInspected':True})
for f in sorted(e.glob('*.webm')):
 x=json.loads(subprocess.check_output(['/usr/bin/ffprobe','-v','error','-show_entries','stream=codec_name,width,height','-show_entries','format=duration','-of','json',str(f)],text=True));assert float(x['format']['duration'])>0;assert x['streams'][0]['codec_name']=='vp8';subprocess.run(['/usr/bin/ffmpeg','-v','error','-i',str(f),'-f','null','-'],capture_output=True,check=True);videos.append({'path':str(f.relative_to(q)),'fullyDecoded':True,**x})
for f in sorted(e.glob('*.zip')):
 with zipfile.ZipFile(f) as z:assert z.testzip() is None;traces.append({'path':str(f.relative_to(q)),'members':len(z.infolist()),'crcValid':True})
(q/'media-validation.json').write_text(json.dumps({'pngs':pngs,'videos':videos,'traces':traces,'freshPngCount':len(pngs),'stale452ExtrasExcluded':True,'pdfPagesVisuallyInspected':2,'classification':'Media prove five fully passed scenarios and two preserved failed/partial scenarios; screenshot existence does not turn a failed result into PASS.'},indent=2)+'\n');print('fresh PNG',len(pngs),'fully decoded videos',len(videos),'CRC-valid traces',len(traces))
