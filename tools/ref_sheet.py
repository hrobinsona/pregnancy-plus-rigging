#!/usr/bin/env python3
"""ref_sheet.py <out.png> <img>... [--h 560] [--crop x0,y0,x1,y1 (fractions)] — contact sheet of reference images with labels."""
import sys, argparse
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('imgs', nargs='+'); ap.add_argument('--h', type=int, default=560); ap.add_argument('--crop', default=''); ap.add_argument('--cols', type=int, default=8)
a = ap.parse_args(); F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15); tiles = []
for p in a.imgs:
    im = Image.open(p).convert('RGB')
    if a.crop:
        x0, y0, x1, y1 = map(float, a.crop.split(',')); W, H = im.size; im = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    im = im.resize((int(im.size[0] * a.h / im.size[1]), a.h)); ImageDraw.Draw(im).text((4, 3), p.split('/')[-1][:-4], fill='#c00', font=F); tiles.append(im)
w = max(t.size[0] for t in tiles); cols = min(a.cols, len(tiles)); rows = (len(tiles) + cols - 1) // cols
s = Image.new('RGB', (cols * w, rows * a.h), 'white')
for i, t in enumerate(tiles): s.paste(t, ((i % cols) * w, (i // cols) * a.h))
s.save(a.out); print(a.out, s.size)
