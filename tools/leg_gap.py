#!/usr/bin/env python3
"""leg_gap.py <char> <pose> — silhouette runs (in H) at fixed heights, ref vs render: the gap between the legs and the
outer extents. Used to tune P.leg numerically against the reference's measured wedge (no eyeballing)."""
import sys, json, subprocess
from PIL import Image
c, pose = sys.argv[1], sys.argv[2]
L = json.load(open(f'characters/{c}/ref/landmarks.json')); G = L['ground']; H = L['Hpx']
subprocess.run(['node', 'tools/char_still.mjs', '--char', c, '--pose', pose, '--frame', 'ref', '--sil', '1', '--out', f'out/{c}_{pose}_refsil.png'], check=True, capture_output=True)
ren = Image.open(f'out/{c}_{pose}_refsil.png').convert('L'); ref = Image.open(f'characters/{c}/ref/{L["image"]}').convert('L')
def runs(im, yh, thr, dark):
    y = int(G[1] + yh * H); row = [(im.getpixel((x, y)) < thr) == dark for x in range(300, 1300)]
    out, s = [], None
    for i, v in enumerate(row + [False]):
        if v and s is None: s = i
        if not v and s is not None:
            if i - s > 3: out.append(((300 + s - G[0]) / H, (300 + i - G[0]) / H))
            s = None
    return out
print(f'{"y(H)":>6} | {"ref gap":>14} | {"render gap":>14} | ref outer L/R | render outer L/R')
for yh in [-2.3, -2.2, -2.1, -2.0, -1.8, -1.6, -1.4, -1.2, -1.0, -0.8]:
    a, b = runs(ref, yh, 235, True), runs(ren, yh, 128, True)
    gap = lambda r: f'{r[0][1]:+.3f}..{r[1][0]:+.3f} ({r[1][0]-r[0][1]:.3f})' if len(r) >= 2 else 'closed'
    ext = lambda r: f'{r[0][0]:+.3f}/{r[-1][1]:+.3f}' if r else '-'
    print(f'{yh:6.2f} | {gap(a):>14} | {gap(b):>14} | {ext(a)} | {ext(b)}')
