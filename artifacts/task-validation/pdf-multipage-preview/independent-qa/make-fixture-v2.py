"""Four-page CCITT fixture with original raster oracle, using Pillow's PDF encoder."""
from pathlib import Path
from io import BytesIO
import json
import hashlib
from reportlab.pdfgen import canvas
from PIL import Image, ImageDraw, features
from pypdf import PdfReader, PdfWriter

out = Path(__file__).parent / 'fixture-v2'
out.mkdir(exist_ok=True)
assert features.check('libtiff')
cover = BytesIO()
c = canvas.Canvas(cover, pagesize=(600, 780), invariant=1)
c.setFont('Helvetica', 36)
c.drawString(50, 650, 'SYNTHETIC PAGE 1')
c.rect(60, 400, 120, 120, fill=1)
c.showPage()
c.save()
writer = PdfWriter()
writer.add_page(PdfReader(cover).pages[0])
checks = []
for number in range(2, 5):
    image = Image.new('1', (600, 780), 1)
    draw = ImageDraw.Draw(image)
    draw.text((50, 90), f'SYNTHETIC SCAN PAGE {number}', fill=0, font_size=36)
    draw.rectangle((60 + 130 * (number - 2), 260, 160 + 130 * (number - 2), 360), fill=0)
    for row in range(5):
        draw.rectangle((50, 430 + row * 35, 200 + number * 50, 442 + row * 35), fill=0)
    image.convert('RGB').save(out / f'oracle-page-{number}.png')
    tiff = BytesIO()
    image.save(tiff, format='TIFF', compression='group4')
    tiff.seek(0)
    decoded = Image.open(tiff)
    assert decoded.tobytes() == image.tobytes()
    checks.append({'page': number, 'tiffPhotometric': decoded.tag_v2[262], 'compression': decoded.tag_v2[259], 'rasterSha256': hashlib.sha256(image.tobytes()).hexdigest()})
    encoded_pdf = BytesIO()
    image.save(encoded_pdf, format='PDF', resolution=72.0)
    encoded_pdf.seek(0)
    page = PdfReader(encoded_pdf).pages[0]
    image_object = list(page['/Resources']['/XObject'].values())[0].get_object()
    assert '/CCITTFaxDecode' in image_object['/Filter']
    assert image_object['/DecodeParms'][0]['/BlackIs1'] == True
    writer.add_page(page)
with (out / 'four-pages-v2.pdf').open('wb') as target:
    writer.write(target)
(out / 'oracle.json').write_text(json.dumps(checks, indent=2), encoding='utf8')
print('Synthetic V2 fixture: Pillow CCITT encoder, TIFF roundtrip and raster oracle verified')
