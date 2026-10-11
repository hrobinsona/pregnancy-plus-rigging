#!/usr/bin/env python3
"""char_pose_sheet.py <char> <out.png> pose1 pose2 ... [--px 520]
Each pose rendered in colour (fitted to its posed bounds, common scale) with its solid silhouette underneath — the
silhouette test for stress poses and key poses. Writes <out.png>."""
import sys, subprocess, argparse, os
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('out'); ap.add_argument('poses', nargs='+'); ap.add_argument('--px', type=int, default=520)
a = ap.parse_args(); os.makedirs('out/tmp_poses', exist_ok=True)
B = [tuple(map(float, subprocess.run(['node', 'tools/char_bounds.mjs', a.char, p], check=True, capture_output=True, text=True).stdout.split(','))) for p in a.poses]
hmax = max(b[3] - b[1] for b in B); wmax = max(b[2] - b[0] for b in B); s = a.px / wmax   # px per H, common to all poses
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
cols = []
for p, (x0, y0, x1, y1) in zip(a.poses, B):
    cx = (x0 + x1) / 2; box = (cx - wmax / 2, y1 - hmax, cx + wmax / 2, y1)
    ims = []
    for sil in (0, 1):
        o = f'out/tmp_poses/{p}_{sil}.png'
        args = ['node', 'tools/char_still.mjs', '--char', a.char, '--pose', p, '--box', ','.join(map(str, box)), '--px', str(a.px), '--out', o] + (['--sil', '1'] if sil else [])
        subprocess.run(args, check=True, capture_output=True); ims.append(Image.open(o).convert('RGB'))
    cols.append((p, ims))
W, Hh = cols[0][1][0].size
sheet = Image.new('RGB', (len(cols) * (W + 10), 2 * Hh + 40), 'white'); d = ImageDraw.Draw(sheet)
for i, (p, ims) in enumerate(cols):
    d.text((i * (W + 10) + 8, 6), p, fill='#111', font=F)
    for r, im in enumerate(ims): sheet.paste(im, (i * (W + 10), 36 + r * Hh))
sheet.save(a.out); print('wrote', a.out)
