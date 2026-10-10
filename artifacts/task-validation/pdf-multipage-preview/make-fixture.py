"""Synthetic four-page PDF: vector cover then distinct CCITT Group4 scans."""
from pathlib import Path
from io import BytesIO
from reportlab.pdfgen import canvas
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DictionaryObject, NameObject, NumberObject, BooleanObject, StreamObject

out = Path(__file__).parent / 'fixtures'
out.mkdir(exist_ok=True)
cover = BytesIO()
c = canvas.Canvas(cover, pagesize=(600, 780))
c.setFont('Helvetica', 36)
c.drawString(50, 650, 'SYNTHETIC PAGE 1')
c.rect(60, 400, 120, 120, fill=1)
c.showPage()
c.save()
writer = PdfWriter()
writer.add_page(PdfReader(cover).pages[0])
for number in range(2, 5):
    image = Image.new('1', (600, 780), 1)
    draw = ImageDraw.Draw(image)
    draw.text((50, 90), f'SYNTHETIC SCAN PAGE {number}', fill=0, font_size=36)
    draw.rectangle((60 + 130 * (number - 2), 260, 160 + 130 * (number - 2), 360), fill=0)
    for row in range(5):
        draw.rectangle((50, 430 + row * 35, 200 + number * 50, 442 + row * 35), fill=0)
    tiff = BytesIO()
    image.save(tiff, format='TIFF', compression='group4')
    tiff.seek(0)
    encoded = Image.open(tiff)
    offsets, lengths = encoded.tag_v2[273], encoded.tag_v2[279]
    assert len(offsets) == 1
    data = tiff.getvalue()[offsets[0]:offsets[0] + lengths[0]]
    stream = StreamObject()
    stream._data = data
    stream.update({NameObject('/Type'): NameObject('/XObject'), NameObject('/Subtype'): NameObject('/Image'),
        NameObject('/Width'): NumberObject(600), NameObject('/Height'): NumberObject(780),
        NameObject('/ColorSpace'): NameObject('/DeviceGray'), NameObject('/BitsPerComponent'): NumberObject(1),
        NameObject('/Filter'): NameObject('/CCITTFaxDecode'), NameObject('/DecodeParms'): DictionaryObject({
            NameObject('/K'): NumberObject(-1), NameObject('/Columns'): NumberObject(600), NameObject('/Rows'): NumberObject(780),
            NameObject('/BlackIs1'): BooleanObject(False)})})
    page = writer.add_blank_page(600, 780)
    page[NameObject('/Resources')] = DictionaryObject({NameObject('/XObject'): DictionaryObject({NameObject('/Scan'): writer._add_object(stream)})})
    content = StreamObject()
    content._data = b'q 600 0 0 780 0 0 cm /Scan Do Q'
    page[NameObject('/Contents')] = writer._add_object(content)
with (out / 'four-pages-synthetic.pdf').open('wb') as target:
    writer.write(target)
print('Synthetic fixture: 4 pages, vector plus CCITT scans, no patient data')
