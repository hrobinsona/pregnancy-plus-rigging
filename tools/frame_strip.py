#!/usr/bin/env python3
"""frame_strip.py <framesDir> <out.png> <f0> <f1> [--step 1] [--box x0,y0,x1,y1 (px of the 1080x1920 frame)] [--w 260] [--cols 10] [--fps 30]
Zoomed strip of rendered frames (a detail look at one move: the hand on its way up, a swap, a contact)."""
import sys, glob, argparse
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('dir'); ap.add_argument('out'); ap.add_argument('f0', type=int); ap.add_argument('f1', type=int)
ap.add_argument('--step', type=int, default=1); ap.add_argument('--box', default='250,250,850,1000'); ap.add_argument('--w', type=int, default=260); ap.add_argument('--cols', type=int, default=10); ap.add_argument('--fps', type=float, default=30)
a = ap.parse_args(); F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
bx = tuple(map(int, a.box.split(','))); h = int(a.w * (bx[3] - bx[1]) / (bx[2] - bx[0])); fr = list(range(a.f0, a.f1 + 1, a.step))
cols = min(a.cols, len(fr)); rows = (len(fr) + cols - 1) // cols; S = Image.new('RGB', (cols * a.w, rows * (h + 18)), 'white'); d = ImageDraw.Draw(S)
for k, i in enumerate(fr):
    im = Image.open(f'{a.dir}/f{i:04d}.png').convert('RGB').crop(bx).resize((a.w, h), Image.LANCZOS)
    x, y = (k % cols) * a.w, (k // cols) * (h + 18); S.paste(im, (x, y + 18)); d.text((x + 3, y + 1), f'f{i} {i / a.fps:.2f}s', fill='#c00', font=F)
S.save(a.out); print(a.out, S.size)
