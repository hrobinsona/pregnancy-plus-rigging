#!/usr/bin/env python3
"""hand_lab.py <char> [--px 420] [--pose stand|rest]
Large close-ups of every hand-library pose on both hands (rest arms), plus both hands in a body pose: the sheet to
judge hand construction and joint direction at the size a lead would. Crops are centred on the POSED wrist and
the hand's own length, so nothing is cut. Writes out/<char>_hand_lab.png"""
import sys, json, subprocess, argparse, os
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('--px', type=int, default=420); ap.add_argument('--pose', default=None)
a = ap.parse_args(); c = a.char
if a.pose is None:   # mum2's standing pose is 'stand'; a character made by new_char.py has 'rest'
    a.pose = 'stand' if os.path.exists(f'characters/{c}/poses/stand.json') else 'rest'
meta = json.loads(subprocess.run(['node', '-e', f"import('./characters/{c}/character.js').then(m=>console.log(JSON.stringify({{lib:m.default.handLibrary,ref:m.default.ref,spec:Object.fromEntries(Object.entries(m.default.params.handSpecs).map(([k,v])=>[k,v.length]))}})))"], check=True, capture_output=True, text=True).stdout)
Hpx, G = meta['ref']['Hpx'], meta['ref']['groundPx']; tmp = f'out/tmp_handlab'; os.makedirs(tmp, exist_ok=True)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
def joints(posefile):
    return json.loads(subprocess.run(['node', 'tools/char_joints.mjs', c, posefile], check=True, capture_output=True, text=True).stdout)
def shot(posename, inline, side, J):
    w = J[f'hand.{side}']; t = J[f'hand.{side}.f2c']   # wrist and middle-finger DIP (posed)
    cx = ((w[0] + t[0]) / 2 - G[0]) / Hpx; cy = ((w[1] + t[1]) / 2 - G[1]) / Hpx; h = meta['spec'][side] * 0.75
    out = f'{tmp}/{posename}_{side}.png'
    args = ['node', 'tools/char_still.mjs', '--char', c, '--box', f'{cx-h},{cy-h},{cx+h},{cy+h}', '--px', str(a.px), '--out', out]
    if inline: args += ['--inline', inline]
    else: args += ['--pose', posename]
    subprocess.run(args, check=True, capture_output=True); return Image.open(out).convert('RGB')
cols = []
for h in meta['lib']:
    pf = f'{tmp}/_{h}.json'; json.dump({'name': h, 'hands': {'near': h, 'far': h}}, open(f'characters/{c}/poses/_lab_{h}.json', 'w'))
    J = joints(f'_lab_{h}')
    cols.append((h, [shot(f'_lab_{h}', None, s, J) for s in ('near', 'far')]))
    os.remove(f'characters/{c}/poses/_lab_{h}.json')
J = joints(a.pose); cols.append((a.pose + ' pose', [shot(a.pose, None, s, J) for s in ('near', 'far')]))
P = a.px; sheet = Image.new('RGB', (len(cols) * (P + 6), 30 + 2 * (P + 6)), 'white'); d = ImageDraw.Draw(sheet)
for i, (n, ims) in enumerate(cols):
    d.text((i * (P + 6) + 6, 4), n, fill='#111', font=F)
    for r, im in enumerate(ims): sheet.paste(im, (i * (P + 6), 30 + r * (P + 6)))
sheet.save(f'out/{c}_hand_lab.png'); print('wrote', f'out/{c}_hand_lab.png')
