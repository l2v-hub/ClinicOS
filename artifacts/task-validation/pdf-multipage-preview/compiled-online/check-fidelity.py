"""Full-page and region fidelity; markers alone do not prove scanned-text visibility."""
from pathlib import Path
from PIL import Image, ImageChops, ImageOps
import json
import hashlib

root = Path(__file__).parent
results = []
regions = {'whole': (0, 0, 600, 780), 'title': (40, 80, 490, 160), 'marker': (40, 245, 450, 375), 'bars': (40, 420, 450, 610)}
for variant, oracle_path, inverted in [('legacy', root / 'fixture-v2', True), ('v2', root / 'fixture-v2', False)]:
    for viewport in ['desktop', 'mobile']:
        for number in range(2, 5):
            oracle = Image.open(oracle_path / f'oracle-page-{number}.png').convert('L')
            if inverted:
                oracle = ImageOps.invert(oracle)
            for kind in ['page', 'thumbnail']:
                file = root / f'browser-{variant}-fidelity' / f'{viewport}-{kind}-{number}-raw.png'
                actual = Image.open(file).convert('L')
                expected = oracle.resize(actual.size, Image.Resampling.BILINEAR)
                binary = lambda im: im.point(lambda p: 255 if p >= 128 else 0)
                a, e = binary(actual), binary(expected)
                measurements = {}
                for name, rect in regions.items():
                    box = tuple(round(v * (actual.width / 600 if i % 2 == 0 else actual.height / 780)) for i, v in enumerate(rect))
                    ar, er = a.crop(box), e.crop(box)
                    mismatch = sum(ImageChops.difference(ar, er).histogram()[1:]) / (ar.width * ar.height)
                    # Foreground is white in original negative fixture and black in positive V2.
                    foreground = lambda im: im.histogram()[255 if inverted else 0]
                    retained = foreground(ar) / max(1, foreground(er))
                    measurements[name] = {'mismatchFraction': mismatch, 'foregroundRetention': retained, 'actualForeground': foreground(ar), 'oracleForeground': foreground(er)}
                results.append({'variant': variant, 'viewport': viewport, 'page': number, 'kind': kind, 'imageSha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'size': list(actual.size), 'regions': measurements})
(root / 'fidelity-measurements.json').write_text(json.dumps(results, indent=2), encoding='utf8')
for r in results:
    assert r['regions']['whole']['mismatchFraction'] < 0.025, r
    assert r['regions']['title']['mismatchFraction'] < 0.12, r
    assert 0.70 < r['regions']['title']['foregroundRetention'] < 1.30, r
    assert r['regions']['marker']['mismatchFraction'] < 0.035, r
    assert r['regions']['bars']['mismatchFraction'] < 0.075, r
print('PASS full-page, title glyph retention, marker and all five bars fidelity for both polarities, desktop/mobile, thumbnails/full preview')
