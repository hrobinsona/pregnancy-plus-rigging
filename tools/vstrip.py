#!/usr/bin/env python3
"""vstrip.py <out.png> <video>... [--n 14] [--h 220] [--crop x0,y0,x1,y1] [--t0 s] [--t1 s] — one row per video, n frames
evenly spread over [t0, t1] (default the whole clip), labelled; for comparing motion references side by side."""
import argparse, cv2
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('vids', nargs='+'); ap.add_argument('--n', type=int, default=14); ap.add_argument('--h', type=int, default=220)
ap.add_argument('--crop', default='0,0,1,1'); ap.add_argument('--t0', type=float, default=0); ap.add_argument('--t1', type=float, default=-1)
a = ap.parse_args(); F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 12); rows = []
for v in a.vids:
    cap = cv2.VideoCapture(v); fps = cap.get(cv2.CAP_PROP_FPS); N = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); frames = []
    while True:
        ok, fr = cap.read()
        if not ok: break
        frames.append(fr)
    N = len(frames); t1 = a.t1 if a.t1 > 0 else (N - 1) / fps; idx = [min(N - 1, int(round((a.t0 + (t1 - a.t0) * k / (a.n - 1)) * fps))) for k in range(a.n)]
    tiles = []
    for i in idx:
        im = Image.fromarray(cv2.cvtColor(frames[i], cv2.COLOR_BGR2RGB)); W, H = im.size; x0, y0, x1, y1 = map(float, a.crop.split(','))
        im = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H))); im = im.resize((int(im.size[0] * a.h / im.size[1]), a.h)); ImageDraw.Draw(im).text((3, 2), f'{i / fps:.2f}', fill='#c00', font=F); tiles.append(im)
    w = tiles[0].size[0]; r = Image.new('RGB', (w * len(tiles) + 160, a.h), 'white'); ImageDraw.Draw(r).text((4, a.h // 2), v.split('/')[-1][:-4], fill='#000', font=F)
    for k, t in enumerate(tiles): r.paste(t, (160 + k * w, 0))
    rows.append(r)
W = max(r.size[0] for r in rows); s = Image.new('RGB', (W, sum(r.size[1] for r in rows)), 'white'); y = 0
for r in rows: s.paste(r, (0, y)); y += r.size[1]
s.save(a.out); print(a.out, s.size)
