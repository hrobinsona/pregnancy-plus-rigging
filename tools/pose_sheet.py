#!/usr/bin/env python3
"""Pose sheet: each pose in colour with its solid-black silhouette underneath (silhouette test).
usage: python3 tools/pose_sheet.py out.png pose1 pose2 ..."""
import sys, os, subprocess
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def font(sz):
    p = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    return ImageFont.truetype(p, sz) if os.path.exists(p) else ImageFont.load_default()
out, poses = sys.argv[1], sys.argv[2:]
tmp = os.path.join(ROOT, 'out', 'tmp_poses'); os.makedirs(tmp, exist_ok=True)
tiles = []
for p in poses:
    c, s = os.path.join(tmp, p + '.png'), os.path.join(tmp, p + '_sil.png')
    subprocess.run(['node', 'tools/still.mjs', '--pose', p, '--frame', 'ref', '--out', c], cwd=ROOT, check=True, capture_output=True)
    subprocess.run(['node', 'tools/still.mjs', '--pose', p, '--frame', 'ref', '--sil', '--out', s], cwd=ROOT, check=True, capture_output=True)
    box = (330, 10, 910, 1220)
    a = Image.open(c).convert('RGB').crop(box); b = Image.open(s).convert('RGB').crop(box)
    sc = 0.5
    a = a.resize((int(a.width * sc), int(a.height * sc)), Image.LANCZOS); b = b.resize((int(b.width * sc * 0.6), int(b.height * sc * 0.6)), Image.LANCZOS)
    tiles.append((p, a, b))
W = sum(t[1].width for t in tiles) + 20 * (len(tiles) + 1); Hh = max(t[1].height + t[2].height for t in tiles) + 90
sheet = Image.new('RGB', (W, Hh), 'white'); d = ImageDraw.Draw(sheet); F = font(22)
x = 20
for p, a, b in tiles:
    d.text((x, 10), p, fill=(20, 20, 20), font=F)
    sheet.paste(a, (x, 45)); sheet.paste(b, (x + (a.width - b.width) // 2, 55 + a.height))
    x += a.width + 20
sheet.save(out); print('wrote', out)
