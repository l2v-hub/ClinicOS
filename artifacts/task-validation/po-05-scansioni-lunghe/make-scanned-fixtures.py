"""Deterministic, rasterized synthetic documents for memory/byte measurement."""
from pathlib import Path
import json
import random
from PIL import Image, ImageDraw, ImageFont

output = Path(__file__).parent / 'fixtures' / 'scanned'
output.mkdir(parents=True, exist_ok=True)
rng = random.Random(23092026)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 35)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24)
files = []
for number in range(1, 31):
    # Paper grain and camera-like variation keep bytes representative without PHI.
    noise = bytes(rng.randrange(215, 256) for _ in range(1500 * 2100))
    page = Image.frombytes('L', (1500, 2100), noise).convert('RGB')
    draw = ImageDraw.Draw(page)
    draw.text((100, 90), f'CLINICOS - DOCUMENTO SINTETICO - PAGINA {number}', font=font, fill='#18354b')
    draw.text((100, 155), 'Nessun dato personale o prescrizione reale.', font=small, fill='#18354b')
    for row in range(26):
        draw.text((100, 260 + row * 62), f'{number:02d}.{row + 1:02d}  Osservazione sintetica per verifica acquisizione e archivio.', font=small, fill='#24343d')
    draw.text((100, 1980), f'FINE PAGINA {number}', font=font, fill='#18354b')
    path = output / f'pagina-{number:02d}.jpg'
    page.save(path, 'JPEG', quality=64, optimize=True)
    files.append({'name': path.name, 'bytes': path.stat().st_size})
(output / 'images.json').write_text(json.dumps({'files': files, 'totalBytes': sum(f['bytes'] for f in files)}, indent=2))
print(json.dumps({'count': len(files), 'totalBytes': sum(f['bytes'] for f in files)}))
