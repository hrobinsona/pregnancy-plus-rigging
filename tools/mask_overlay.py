#!/usr/bin/env python3
"""mask_overlay.py <char> <pose> --still <name> --box x0,y0,x1,y1 [--scale 5] [--rgb 253,184,136] [--tol 45]
   [--rgb2 r,g,b] [--hands near=cradle,far=hold] [--out out/mask_<pose>.png]

Overlay one colour's mask (default: skin) of a pose and of its still, in the same box of the still's pixels: grey where
both have it, RED where only the still does, BLUE where only the render does; prints both areas in the still's px. Then
the render and the still side by side above it.
  --rgb   the still's colour (sample it on the still); --rgb2 the render's (default: the character's palette skin)
  --tol   RGB distance counted as that colour
Why: mum3q look-up v13's lower hand was fitted to its keys and read "a stub thumb, tips stacked in a column" (natural
lens). Side by side the two hands looked alike; overlaid, the thumb was ~8 px short, the fingers fat and fanned past the
bump's edge, 1682 px of mismatch. Each fix (a longer slimmer thumb, slimmer fingers, the fan tightened, the tips refit)
showed in the two numbers at once: 1166 (lesson 56). Overlay before tuning anything a reviewer names; rows and points
can match while a thumb's length, a tip's spacing or a curve between them doesn't."""
import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('pose')
ap.add_argument('--still', required=True); ap.add_argument('--box', required=True)
ap.add_argument('--scale', type=float, default=5); ap.add_argument('--rgb', default='253,184,136'); ap.add_argument('--rgb2')
ap.add_argument('--tol', type=float, default=45); ap.add_argument('--hands'); ap.add_argument('--out')
a = ap.parse_args()
os.chdir(R)
D = f'characters/{a.char}'
info = json.loads(subprocess.run(['node', '-e', f"import('./{D}/character.js').then((m) => console.log(JSON.stringify({{ref: m.default.ref, skin: m.default.palette?.skin}})))"],
                                 capture_output=True, text=True, check=True).stdout)
G, Hpx = info['ref']['groundPx'], info['ref']['Hpx']
bx = [int(v) for v in a.box.split(',')]
boxH = [(bx[0] - G[0]) / Hpx, (bx[1] - G[1]) / Hpx, (bx[2] - G[0]) / Hpx, (bx[3] - G[1]) / Hpx]
W0, H0 = round((bx[2] - bx[0]) * a.scale), round((bx[3] - bx[1]) * a.scale)
pose = json.load(open(f'{D}/poses/{a.pose}.json'))
if a.hands: pose['hands'] = {**pose.get('hands', {}), **dict(kv.split('=') for kv in a.hands.split(','))}
os.makedirs('out', exist_ok=True)
tmp = f'out/_mask_{a.pose}.png'
srv = subprocess.Popen(['node', 'tools/still_server.mjs', '--char', a.char, '--box', ','.join(map(str, boxH)), '--px', str(W0)],
                       stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
srv.stdin.write(json.dumps({'pose': pose, 'out': tmp}) + '\n'); srv.stdin.flush()
r = srv.stdout.readline().strip(); srv.stdin.close(); srv.wait()
if r != 'ok': sys.exit(f'render failed: {r}')
ours = Image.open(tmp).convert('RGB').resize((W0, H0))
still = Image.open(f'{D}/refs/images/{a.still}.png').convert('RGB').crop(bx).resize((W0, H0), Image.LANCZOS)
hexrgb = lambda h: [int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)]
c1 = np.array([int(v) for v in a.rgb.split(',')])
c2 = np.array([int(v) for v in a.rgb2.split(',')] if a.rgb2 else hexrgb(info['skin']) if info.get('skin') else c1)
mask = lambda im, c: np.linalg.norm(np.asarray(im).astype(float) - c, axis=2) < a.tol
A, B = mask(still, c1), mask(ours, c2)
o = np.full(A.shape + (3,), 255, np.uint8); o[A & B] = (200, 200, 200); o[A & ~B] = (230, 60, 60); o[~A & B] = (60, 60, 230)
k2 = a.scale * a.scale; so, oo = int((A & ~B).sum() / k2), int((~A & B).sum() / k2)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
sheet = Image.new('RGB', (W0 * 2 + 6, H0 * 2 + 50), 'white'); d = ImageDraw.Draw(sheet)
sheet.paste(still, (0, 22)); sheet.paste(ours, (W0 + 6, 22)); sheet.paste(Image.fromarray(o), (0, H0 + 50))
d.text((4, 2), f'still {a.still}', fill=(200, 0, 0), font=F); d.text((W0 + 10, 2), a.pose, fill=(200, 0, 0), font=F)
d.text((4, H0 + 28), f'still only (red) {so} px   render only (blue) {oo} px', fill=(200, 0, 0), font=F)
out = a.out or f'out/mask_{a.pose}.png'; sheet.save(out); os.remove(tmp)
print(f'{out}: still only {so} px, render only {oo} px, total {so + oo}')
