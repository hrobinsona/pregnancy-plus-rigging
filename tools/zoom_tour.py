#!/usr/bin/env python3
"""zoom_tour.py <char> [pose] [--px 2400]
One sharp render of the whole figure, cropped into a tour of every region a design lead inspects up close:
head, neck & collars, both shoulders, bust/bump notch, hem & crotch, both hands, knees, both feet.
Crops are centred on POSED joints, so the tour follows any pose. Writes out/<char>_<pose>_tour.png.
Why: a full-figure still at phone/1080 size hides construction faults (the lumpy neck, teeth at the lapel, slivers)
that are obvious at 3–4×. Every critic round and every self-check looks at this sheet, not just the still."""
import sys, json, subprocess, argparse
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('pose', nargs='?', default='stand'); ap.add_argument('--px', type=int, default=2400)
a = ap.parse_args()
meta = json.loads(subprocess.run(['node', '-e', f"import('./characters/{a.char}/character.js').then(m=>console.log(JSON.stringify({{bbox:m.default.frame.bbox,ref:m.default.ref}})))"],
                                 check=True, capture_output=True, text=True).stdout)
Hpx, G = meta['ref']['Hpx'], meta['ref']['groundPx']
x0, y0, x1, y1 = map(float, subprocess.run(['node', 'tools/char_bounds.mjs', a.char, a.pose], check=True, capture_output=True, text=True).stdout.split(','))   # posed bounds: nothing cropped
src = f'out/{a.char}_{a.pose}_tour_src.png'
subprocess.run(['node', 'tools/char_still.mjs', '--char', a.char, '--pose', a.pose, '--box', f'{x0},{y0},{x1},{y1}', '--px', str(a.px), '--out', src], check=True, capture_output=True)
J = json.loads(subprocess.run(['node', 'tools/char_joints.mjs', a.char, a.pose], check=True, capture_output=True, text=True).stdout)
jH = {k: ((v[0] - G[0]) / Hpx, (v[1] - G[1]) / Hpx) for k, v in J.items()}   # joint → H
im0 = Image.open(src).convert('RGB'); ppH = a.px / (x1 - x0); PAD = int(0.6 * ppH)
im = Image.new('RGB', (im0.width + 2 * PAD, im0.height + 2 * PAD), 'white'); im.paste(im0, (PAD, PAD))   # crops may run past the frame
toPx = lambda p: ((p[0] - x0) * ppH + PAD, (p[1] - y0) * ppH + PAD)
g = lambda k: jH.get(k, (0, 0))
mid = lambda p, q, t=0.5: (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
# (label, centre in H, half-size in H)
R = [('head', (g('head')[0] + 0.1, g('head')[1] - 0.45), 0.6), ('neck & collars', (g('neck')[0] + 0.05, g('neck')[1] + 0.05), 0.42),
     ('near shoulder', g('upperArm.near'), 0.4), ('far shoulder', g('upperArm.far'), 0.4),
     ('bust → bump', (g('belly')[0] + 0.2, g('chest')[1] + 0.35), 0.5), ('hem & crotch', (g('pelvis')[0] + 0.1, g('pelvis')[1] + 0.35), 0.55),
     ('near hand', mid(g('hand.near'), g('hand.near.f2b'), 0.6), 0.4), ('far hand', mid(g('hand.far'), g('hand.far.f2b'), 0.6), 0.4),
     ('knees', mid(g('shin.near'), g('shin.far')), 0.5), ('near foot', mid(g('foot.near'), g('toe.near')), 0.4), ('far foot', mid(g('foot.far'), g('toe.far')), 0.4),
     ('full figure', ((x0 + x1) / 2, (y0 + y1) / 2), (y1 - y0) / 2)]
T = 420; F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
cols = 4; rows = (len(R) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (T + 8), rows * (T + 8)), '#dddddd')
for i, (lab, c, h) in enumerate(R):
    cx, cy = toPx(c); r = h * ppH
    tile = im.crop((int(cx - r), int(cy - r), int(cx + r), int(cy + r))).resize((T, T), Image.LANCZOS)
    ImageDraw.Draw(tile).text((6, 4), lab, fill='#c00000', font=F)
    sheet.paste(tile, ((i % cols) * (T + 8) + 4, (i // cols) * (T + 8) + 4))
sheet.save(f'out/{a.char}_{a.pose}_tour.png'); print('wrote', f'out/{a.char}_{a.pose}_tour.png')
