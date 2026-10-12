#!/usr/bin/env python3
"""sil_view.py <out/sil/<pose>_maps.json> [out.png] — reference classes | ours before | ours after | mismatch (after).
Mismatch colours: red = we draw a material where the reference has another; grey = edge / ignored."""
import sys, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
d = json.load(open(sys.argv[1])); w, h = d['w'], d['h']
cols = np.array([[255, 255, 255], [212, 128, 85], [94, 52, 36], [185, 157, 215], [156, 127, 181], [254, 184, 195], [224, 192, 121], [40, 40, 40]], np.uint8)
def im(a):
    a = np.array(a, np.int32).reshape(h, w); o = np.full((h, w, 3), 200, np.uint8); ok = a < 8; o[ok] = cols[a[ok]]; return o
R, B, A = (np.array(d[k], np.int32).reshape(h, w) for k in ('ref', 'before', 'after'))
mis = np.full((h, w, 3), 255, np.uint8); m = (A < 8) & (R < 7) & (A != R); mis[m] = [220, 30, 30]; mis[(A == 255)] = [200, 200, 200]
mis[(~m) & (A < 8) & (A > 0)] = (cols[A[(~m) & (A < 8) & (A > 0)]] * 0.35 + 255 * 0.65).astype(np.uint8)
tiles = [im(d['ref']), im(d['before']), im(d['after']), mis]
s = Image.new('RGB', (w * 4 + 30, h + 24), 'white'); dr = ImageDraw.Draw(s); F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
for i, (t, lab) in enumerate(zip(tiles, ['reference', 'before', 'after', 'mismatch (after)'])):
    s.paste(Image.fromarray(t), (i * (w + 10), 24)); dr.text((i * (w + 10) + 4, 4), lab, fill='#c00', font=F)
out = sys.argv[2] if len(sys.argv) > 2 else sys.argv[1].replace('_maps.json', '_sil.png'); s.save(out); print(out)
