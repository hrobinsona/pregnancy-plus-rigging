#!/usr/bin/env python3
"""grid_still.py <still.png>[,<still2.png>...] <x0,y0,x1,y1> [--scale 1] [--pose refs/pose/<still>.json] [--out out/grid.png]

A still cropped to a box with a pixel grid (labels every 50 px, lines every 10), to READ landmarks off it where the
estimator failed (fit_pose.mjs --set kneeR:x:y). --pose draws the estimator's landmarks on it (L blue, R red, with
names), so the wrong ones show. Side-on, MediaPipe mixes the legs up when one passes the other (a walk's passing
position: the front knee joined to the back ankle) and puts a squat's hips at the back of the skirt (side-on library,
lesson 62). The still is measurement only."""
import argparse, json
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('stills'); ap.add_argument('box'); ap.add_argument('--scale', type=int, default=1)
ap.add_argument('--pose'); ap.add_argument('--out', default='out/grid.png')
a = ap.parse_args()
x0, y0, x1, y1 = map(int, a.box.split(',')); sc = a.scale
tiles = []
for f in a.stills.split(','):
    im = Image.open(f).convert('RGB').crop((x0, y0, x1, y1)).resize(((x1 - x0) * sc, (y1 - y0) * sc), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for x in range(x0 - x0 % 10 + 10, x1, 10):
        d.line([((x - x0) * sc, 0), ((x - x0) * sc, im.height)], fill=(0, 120, 255) if x % 50 == 0 else (190, 190, 255))
        if x % 50 == 0: d.text(((x - x0) * sc + 2, 2), str(x), fill=(0, 0, 160))
    for y in range(y0 - y0 % 10 + 10, y1, 10):
        d.line([(0, (y - y0) * sc), (im.width, (y - y0) * sc)], fill=(0, 120, 255) if y % 50 == 0 else (190, 190, 255))
        if y % 50 == 0: d.text((2, (y - y0) * sc + 2), str(y), fill=(0, 0, 160))
    if a.pose:
        for n, p in json.load(open(a.pose))['pose'].items():
            if n[-1] not in 'LR' or not (x0 <= p[0] <= x1 and y0 <= p[1] <= y1): continue
            c = (220, 30, 30) if n[-1] == 'R' else (30, 60, 220); q = ((p[0] - x0) * sc, (p[1] - y0) * sc)
            d.ellipse([q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4], fill=c); d.text((q[0] + 6, q[1] - 6), n, fill=c)
    tiles.append(im)
o = Image.new('RGB', (sum(t.width for t in tiles) + 10 * len(tiles), tiles[0].height), 'white'); x = 0
for t in tiles: o.paste(t, (x, 0)); x += t.width + 10
o.save(a.out); print(a.out, o.size)
