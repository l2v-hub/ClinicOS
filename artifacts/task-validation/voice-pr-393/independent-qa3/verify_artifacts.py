"""Validate owned QA artifacts; redact only transient synthetic session/QA DSNs."""
from pathlib import Path
import hashlib, io, json, re, stat, subprocess, zipfile
from PIL import Image

ROOT=Path(__file__).resolve().parent
SHA=lambda b: hashlib.sha256(b).hexdigest()
TOKEN=re.compile(rb'sim[.][A-Za-z0-9_-]+(?:[.][A-Za-z0-9_-]+)*')
DSN=re.compile(rb'postgres(?:ql)?://[^:\s\x22\x27]+:[^@\s\x22\x27]+@[^\s\x22\x27]+')
SECRET=re.compile(rb'(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{25,}|sk-(?:ant-|proj-)[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')
# Fail before any writes if a public artifact is oversized.
for candidate in ROOT.rglob('*'):
    if candidate.is_file(): assert candidate.stat().st_size<=25*1024*1024,'preflight per-file size: '+str(candidate.relative_to(ROOT))
previous=json.loads((ROOT/'privacy-media-validation.json').read_text()) if (ROOT/'privacy-media-validation.json').exists() else {}
changes=previous.get('transientSyntheticRedactions', []); visits=0; files=0; pngs=[]; videos=[]; zips=[]; violations=[]; embedded_images=[]

def checkpoint():
    (ROOT/'privacy-media-validation.json').write_text(json.dumps({'scope':'independent-qa3 owned packet only','status':'IN_PROGRESS','transientSyntheticRedactions':changes},indent=2)+'\n')

def redact(data):
    try: data.decode('utf-8')
    except UnicodeDecodeError: return data,0
    out,n=TOKEN.subn(b'sim.[SYNTHETIC_SESSION]',data)
    out,n2=DSN.subn(b'[OWNED_QA_DATABASE]',out)
    return out,n+n2

def zip_clean(data,name,depth=0):
    global visits
    assert depth<6,'ZIP recursion bound'
    members=[]; touched=[]
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        assert z.testzip() is None,name+' CRC'
        for item in z.infolist():
            visits+=1
            assert not (item.flag_bits&1),'encrypted ZIP not auditable'
            assert not stat.S_ISLNK(item.external_attr>>16),'ZIP symlink'
            assert item.file_size<50*1024*1024,'ZIP member size bound'
            raw=z.read(item)
            if raw.startswith(b'PK\x03\x04'):
                updated,sub=zip_clean(raw,name+'!'+item.filename,depth+1)
                n=len(sub)
            else: updated,n=redact(raw)
            if updated.startswith((b'\x89PNG', b'\xff\xd8\xff')):
                with Image.open(io.BytesIO(updated)) as im:
                    im.load()
                    embedded_images.append({'archive':name,'member':item.filename,'width':im.width,'height':im.height,'decode':'PASS'})
            if SECRET.search(updated): violations.append(name+'!'+item.filename+': credential-pattern')
            if TOKEN.search(updated): violations.append(name+'!'+item.filename+': unredacted session')
            if n:
                touched.append({'member':item.filename,'redactions':n,'beforeSha256':SHA(raw),'afterSha256':SHA(updated)})
            members.append((item,updated))
    if not touched: return data,[]
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w') as z:
        for item,raw in members: z.writestr(item,raw)
    result=out.getvalue()
    with zipfile.ZipFile(io.BytesIO(result)) as z: assert z.testzip() is None
    return result,touched

for p in sorted(ROOT.rglob('*')):
    if p.is_dir() or p.name=='privacy-media-validation.json': continue
    assert not p.is_symlink(),'owned evidence cannot symlink'
    raw=p.read_bytes(); files+=1
    assert len(raw)<=25*1024*1024,'public per-file artifact limit: '+str(p.relative_to(ROOT))
    if raw.startswith(b'PK\x03\x04'):
        updated,members=zip_clean(raw,str(p.relative_to(ROOT)))
        zips.append({'path':str(p.relative_to(ROOT)),'crc':'PASS'})
        if members:
            changes.append({'path':str(p.relative_to(ROOT)),'beforeSha256':SHA(raw),'afterSha256':SHA(updated),'redactedMembers':members})
            p.write_bytes(updated)
            checkpoint()
    else:
        updated,n=redact(raw) if p.suffix in ('.log','.json','.txt','.network') else (raw,0)
        if n:
            p.write_bytes(updated)
            changes.append({'path':str(p.relative_to(ROOT)),'beforeSha256':SHA(raw),'afterSha256':SHA(updated),'redactions':n})
            checkpoint()
        if SECRET.search(updated): violations.append(str(p.relative_to(ROOT))+': credential-pattern')
    if p.suffix=='.png':
        with Image.open(p) as im:
            im.load(); assert im.width>=100 and im.height>=100
            pngs.append({'path':str(p.relative_to(ROOT)),'width':im.width,'height':im.height,'decode':'PASS'})
    if p.suffix=='.webm':
        run=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(p),'-f','null','-'],capture_output=True)
        assert run.returncode==0 and not run.stderr,'full video decode failure'
        probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',str(p)],capture_output=True,check=True)
        videos.append({'path':str(p.relative_to(ROOT)),'fullDecode':'PASS',**json.loads(probe.stdout)})
assert not violations, violations
report={'scope':'independent-qa3 owned packet only','filesChecked':files,'zipMemberVisits':visits,'zips':zips,'pngs':pngs,'videos':videos,'embeddedImages':embedded_images,'credentialPatternFindings':0,'realPatientDataUsed':False,'transientSyntheticRedactions':changes,'note':'Synthetic bearer and QA DSN redaction only. ZIP CRC validated before/after. Existing member resource names are retained as identifiers; modified payload digests are explicitly recorded, not asserted unchanged. No executable source or assertions modified.'}
(ROOT/'privacy-media-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'files':files,'zipMembers':visits,'pngs':len(pngs),'videosFullyDecoded':len(videos),'zips':len(zips),'redactedArtifacts':len(changes),'findings':0}))
