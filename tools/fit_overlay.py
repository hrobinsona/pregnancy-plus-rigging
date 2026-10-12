#!/usr/bin/env python3
"""fit_overlay.py <char> <pose> <refImage> [--out png] [--box x0,y0,x1,y1 (H)] [--px 700]
Side by side: reference (mapped into rig units with the fit's similarity) | render | overlay (ref 50% + render outline),
with the fit's targets (green) and the rig's points (red). Reads out/fit_<pose>_targets.json."""
import json, subprocess, argparse, numpy as np
from PIL import Image, ImageDraw, ImageFilter
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('pose'); ap.add_argument('ref'); ap.add_argument('--out'); ap.add_argument('--box', default='-1.8,-6.6,1.8,0.2'); ap.add_argument('--px', type=int, default=700)
a = ap.parse_args(); T = json.load(open(f'out/fit_{a.pose}_targets.json')); X = T['xf']
x0, y0, x1, y1 = map(float, a.box.split(',')); W = a.px; H = int(W * (y1 - y0) / (x1 - x0))
rend = f'out/fit_{a.pose}_render.png'
subprocess.run(['node', 'tools/char_still.mjs', '--char', a.char, '--pose', a.pose, '--box', a.box, '--px', str(W), '--out', rend], check=True, capture_output=True)
R = Image.open(rend).convert('RGB').resize((W, H)); ref = Image.open(a.ref).convert('RGB')
# rig (X,Y) -> calibration px -> ref normalised px -> ref image px ; sample the ref for every output pixel
ys, xs = np.mgrid[0:H, 0:W]; Xr = x0 + (xs + 0.5) / W * (x1 - x0); Yr = y0 + (ys + 0.5) / H * (y1 - y0)
cpx = Xr * X['Hpx'] + X['ground'][0]; cpy = Yr * X['Hpx'] + X['ground'][1]
nx = (cpx - X['cx']) / X['s'] + X['sx']; ny = (cpy - X['cy']) / X['s'] + X['sy']
rx = nx * X['W'] / X['sizePx'][0]; ry = ny * X['H'] / X['sizePx'][1]
A = np.asarray(ref); ok = (rx >= 0) & (rx < A.shape[1] - 1) & (ry >= 0) & (ry < A.shape[0] - 1)
M = np.full((H, W, 3), 255, np.uint8); M[ok] = A[ry[ok].astype(int), rx[ok].astype(int)]
refm = Image.fromarray(M)
edge = np.asarray(R.convert('L').filter(ImageFilter.FIND_EDGES)) > 40
ov = (np.asarray(refm).astype(float) * 0.55 + 255 * 0.45).astype(np.uint8); ov[edge] = (20, 20, 160); ov = Image.fromarray(ov)
toPx = lambda p: ((p[0] - x0) / (x1 - x0) * W, (p[1] - y0) / (y1 - y0) * H)
for im in (refm, ov):
    d = ImageDraw.Draw(im)
    for t in T['targets']:
        a_, b_ = toPx(t['to']), toPx(t['got'])
        d.line([a_, b_], fill='#e00000', width=1); d.ellipse([a_[0] - 3, a_[1] - 3, a_[0] + 3, a_[1] + 3], fill='#00b000'); d.ellipse([b_[0] - 2, b_[1] - 2, b_[0] + 2, b_[1] + 2], fill='#e00000')
s = Image.new('RGB', (W * 3 + 12, H), 'white'); s.paste(refm, (0, 0)); s.paste(R, (W + 6, 0)); s.paste(ov, (2 * W + 12, 0))
out = a.out or f'out/fit_{a.pose}_overlay.png'; s.save(out); print(out)
