#!/usr/bin/env python3
"""video_strip.py <video> <out.png> [--every s (seconds)] [--h 300] [--crop x0,y0,x1,y1] — frames sampled every s seconds, labelled with time."""
import argparse, cv2
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--every', type=float, default=0.5); ap.add_argument('--h', type=int, default=300); ap.add_argument('--cols', type=int, default=10); ap.add_argument('--crop', default='')
a = ap.parse_args(); cap = cv2.VideoCapture(a.src); fps = cap.get(cv2.CAP_PROP_FPS); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
tiles = []; i = 0; step = max(1, round(a.every * fps))
while True:
    ok, bgr = cap.read()
    if not ok: break
    if i % step == 0:
        im = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        if a.crop:
            x0, y0, x1, y1 = map(float, a.crop.split(',')); W, H = im.size; im = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
        im = im.resize((int(im.size[0] * a.h / im.size[1]), a.h)); ImageDraw.Draw(im).text((3, 2), f'{i / fps:.2f}s', fill='#c00', font=F); tiles.append(im)
    i += 1
w = tiles[0].size[0]; cols = min(a.cols, len(tiles)); rows = (len(tiles) + cols - 1) // cols
s = Image.new('RGB', (cols * w, rows * a.h), 'white')
for k, t in enumerate(tiles): s.paste(t, ((k % cols) * w, (k // cols) * a.h))
s.save(a.out); print(a.src, f'{n} frames @ {fps:.2f} fps = {n / fps:.2f}s', tiles[0].size)
