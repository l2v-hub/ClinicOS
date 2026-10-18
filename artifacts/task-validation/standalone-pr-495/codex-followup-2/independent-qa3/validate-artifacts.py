import pathlib,struct,zlib,zipfile,json,re
root=pathlib.Path('/workspace/.clinicos-cloud/495-continuation3-independent-qa-20261018')
b=(root/'public/qa-result.png').read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n';i=8;ids=[];data=b'';width=height=None
while i<len(b):
 n=struct.unpack('>I',b[i:i+4])[0];typ=b[i+4:i+8];chunk=b[i+8:i+8+n];crc=struct.unpack('>I',b[i+8+n:i+12+n])[0];assert zlib.crc32(typ+chunk)&0xffffffff==crc
 if typ==b'IHDR':width,height,depth,color,_,_,interlace=struct.unpack('>IIBBBBB',chunk);assert depth==8 and color in(2,6) and interlace==0
 if typ==b'IDAT':data+=chunk
 ids.append(typ.decode());i+=12+n
assert ids[-1]=='IEND' and i==len(b);raw=zlib.decompress(data);channels={2:3,6:4}[color];assert len(raw)==height*(1+width*channels)
# Fully reverse PNG filters for each pixel row.
stride=width*channels;prev=bytearray(stride)
for y in range(height):
 row=bytearray(raw[y*(stride+1)+1:(y+1)*(stride+1)]);f=raw[y*(stride+1)];assert f in range(5)
 for x in range(stride):
  a=row[x-channels] if x>=channels else 0;bb=prev[x];c=prev[x-channels] if x>=channels else 0
  if f==1:v=a
  elif f==2:v=bb
  elif f==3:v=(a+bb)//2
  elif f==4:
   p=a+bb-c;pa,pb,pc=abs(p-a),abs(p-bb),abs(p-c);v=a if pa<=pb and pa<=pc else bb if pb<=pc else c
  else:v=0
  row[x]=(row[x]+v)&255
 prev=row
patterns=[rb'gh[pousr]_[A-Za-z0-9]{8,}',rb'github_pat_',rb'sk-ant-',rb'qa-fake-bearer-only',rb'qa-fake-main-only',rb'fake-user:fake-pass',rb'qa-identity-discard']
with zipfile.ZipFile(root/'private-trace.zip') as z:
 assert z.testzip() is None
 entries=z.namelist();assert any(x.endswith('.trace') for x in entries);sentinel=False
 for name in entries:
  assert not name.startswith('/') and '..' not in pathlib.PurePosixPath(name).parts
  contents=z.read(name)
  if b'QA495_FRESH_SYNTHETIC_ONLY_889f5d9f' in contents:sentinel=True
  for pattern in patterns:assert not re.search(pattern,contents),name
 assert sentinel
out={'png':{'crcVerified':True,'decodedAllRows':True,'width':width,'height':height,'bytes':len(b)},'trace':{'zipCrcVerified':True,'allEntriesScanned':len(entries),'textAndResourcesScanned':True,'freshSentinelFound':True,'forbiddenSyntheticValuesAbsent':True,'publication':'private only'},'clinicalProviderDeployProof':False}
(root/'artifact-validation.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
