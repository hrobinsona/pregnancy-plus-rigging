#!/usr/bin/env python3
"""detail_audit.py <char> [pose] [--px 2400] [--thin 0.012]
Pixel-level detail audit of the composited figure — the faults that only appear where parts overlap, and that an eye
skims past at full-figure scale:
  • pinholes / gaps   enclosed background specks (a seam between two parts that should overlap)
  • slivers / specks  tiny islands of one colour (a part poking out from under another by a hair)
  • spurs / teeth     thin protrusions that vanish under a morphological opening of radius --thin H (accidental sharp
                      corners, needle tips, hairline strips between two edges that nearly touch = tangents)
Renders the figure's frame box at --px wide, quantises to the character palette, and writes
  out/<char>_<pose>_audit.txt  (findings in H coordinates, with colour names)
  out/<char>_<pose>_audit.png  (numbered zoom crops of every finding, for review)
Intentional thin features (hair strands, mouth, brows, finger crease, sock band) show up as spurs too; list them in
--ignore as palette colour names, or read the crops. Pinholes and specks are always bugs."""
import sys, json, subprocess, argparse, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('pose', nargs='?', default='stand')
ap.add_argument('--px', type=int, default=1800); ap.add_argument('--thin', type=float, default=0.012)
ap.add_argument('--ignore', default='hair,hairShade,mouth,eye,skinLine,sockShade')
a = ap.parse_args()
meta = json.loads(subprocess.run(['node', '-e', f"import('./characters/{a.char}/character.js').then(m=>console.log(JSON.stringify({{bbox:m.default.frame.bbox,palette:m.default.palette}})))"],
                                 check=True, capture_output=True, text=True).stdout)
pal = {k: v for k, v in meta['palette'].items() if isinstance(v, str) and v.startswith('#')}
x0, y0, x1, y1 = map(float, subprocess.run(['node', 'tools/char_bounds.mjs', a.char, a.pose], check=True, capture_output=True, text=True).stdout.split(','))   # posed bounds: nothing cropped
a.px = int(a.px * (x1 - x0) / 2.6)   # keep ~the same px/H whatever the pose's width
out_png = f'out/{a.char}_{a.pose}_audit_src.png'
subprocess.run(['node', 'tools/char_still.mjs', '--char', a.char, '--pose', a.pose, '--box', f'{x0},{y0},{x1},{y1}', '--px', str(a.px), '--out', out_png], check=True, capture_output=True)
im = np.asarray(Image.open(out_png).convert('RGB')); Hh, Ww = im.shape[:2]
ppH = a.px / (x1 - x0)                                     # pixels per H
toH = lambda cx, cy: (x0 + cx / ppH, y0 + cy / ppH)
names = ['bg'] + list(pal); cols = np.array([[255, 255, 255]] + [[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in pal.values()])
im = im.astype(np.int32); best = np.full(im.shape[:2], 1 << 30, np.int32); lab = np.zeros(im.shape[:2], np.int16)
for k, c in enumerate(cols):                                 # nearest palette colour, one colour at a time (memory-light)
    dk = ((im - c.astype(np.int32)) ** 2).sum(-1, dtype=np.int32); upd = dk < best; best[upd] = dk[upd]; lab[upd] = k
core = best < 14 ** 2                                        # core pixels only (antialiased edges are ambiguous)
findings = []
A_speck = (0.02 * ppH) ** 2                                  # islands smaller than a 0.02 H square
# 1. pinholes: enclosed background components
bg = lab == 0
bl, n = ndi.label(bg)
border = set(np.unique(np.concatenate([bl[0], bl[-1], bl[:, 0], bl[:, -1]])))
for i, sl in enumerate(ndi.find_objects(bl), 1):
    if i in border: continue
    area = (bl[sl] == i).sum()
    if 2 < area < (0.06 * ppH) ** 2: findings.append(('pinhole/gap', 'bg', sl, area))
# 2. specks + 3. spurs, per colour
r = max(2, int(round(a.thin * ppH))); yy, xx = np.ogrid[-r:r + 1, -r:r + 1]; disk = xx * xx + yy * yy <= r * r
ign = set(a.ignore.split(','))
for k, nm in enumerate(names[1:], 1):
    m = (lab == k) & core
    if not m.any(): continue
    ml, n = ndi.label(m)
    for i, sl in enumerate(ndi.find_objects(ml), 1):
        area = (ml[sl] == i).sum()
        h_, w_ = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if area < A_speck and area > 12 and min(h_, w_) > 2: findings.append(('speck/sliver', nm, sl, area))   # ≤2 px wide = antialias blend of two neighbours
    if nm in ign: continue
    full = lab == k                                           # include AA so edges don't read as spurs
    thin = full & ~ndi.binary_opening(full, structure=disk)
    thin = ndi.binary_opening(thin, structure=np.ones((2, 2)))  # drop 1-px edge noise
    tl, n = ndi.label(thin)
    for i, sl in enumerate(ndi.find_objects(tl), 1):
        area = (tl[sl] == i).sum(); h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if not (area > (0.006 * ppH) ** 2 * 4 and max(h, w) > 0.02 * ppH): continue
        # what surrounds it? a thin shape lying on ONE other colour (a finger-separation rim, the nose wedge, a fold) is a
        # deliberate drawn line — governed by the detail budget, not a fault. A thin shape between two different colours
        # or against the background is a sliver/spur/tangent: a construction fault.
        pad = 4; y0_, y1_ = max(0, sl[0].start - pad), min(Hh, sl[0].stop + pad); x0_, x1_ = max(0, sl[1].start - pad), min(Ww, sl[1].stop + pad)
        comp = np.zeros((y1_ - y0_, x1_ - x0_), bool); comp[sl[0].start - y0_:sl[0].stop - y0_, sl[1].start - x0_:sl[1].stop - x0_] = tl[sl] == i
        ring = ndi.binary_dilation(comp, iterations=3) & ~ndi.binary_dilation(comp, iterations=1)
        labs, cnt = np.unique(lab[y0_:y1_, x0_:x1_][ring & core[y0_:y1_, x0_:x1_]], return_counts=True)
        nb = {int(l): c for l, c in zip(labs, cnt) if l != k and c > 3}
        if len(nb) == 1 and 0 not in nb: continue
        # a SHADE line (e.g. a finger-separation rim) lying on its own base colour and running out to the silhouette
        base = names.index(nm[:-5]) if nm.endswith('Shade') and nm[:-5] in names else None
        if base is not None and set(nb) <= {base, 0} and base in nb: continue
        findings.append(('spur/thin', nm, sl, area))
# allowlist: characters/<char>/audit_allow.json = [{"colour": name, "at": [x, y], "r": H, "why": "..."}] — intentional thin features
import os
allow = json.load(open(f'characters/{a.char}/audit_allow.json')) if os.path.exists(f'characters/{a.char}/audit_allow.json') else []
def allowed(nm, sl):
    cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2; hx, hy = toH(cx, cy)
    return next((w['why'] for w in allow if w['colour'] == nm and (hx - w['at'][0]) ** 2 + (hy - w['at'][1]) ** 2 <= w.get('r', 0.05) ** 2), None)
kept = [f for f in findings if not allowed(f[1], f[2])]; n_allowed = len(findings) - len(kept); findings = kept
# report
lines = [f'detail audit {a.char}/{a.pose}: {len(findings)} findings ({n_allowed} allowed by audit_allow.json) (render {Ww}x{Hh}, {ppH:.0f} px/H, thin < {2 * a.thin:.3f} H)']
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
crops = []
src = Image.open(out_png).convert('RGB')
for j, (kind, nm, sl, area) in enumerate(findings, 1):
    cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
    hx, hy = toH(cx, cy)
    lines.append(f'{j:3d} {kind:13s} {nm:13s} at ({hx:+.3f}, {hy:+.3f}) H  size {(sl[1].stop - sl[1].start) / ppH:.3f}×{(sl[0].stop - sl[0].start) / ppH:.3f} H  area {area} px')
    R = int(0.12 * ppH); bx = (int(cx) - R, int(cy) - R, int(cx) + R, int(cy) + R)
    c = src.crop(bx).resize((220, 220), Image.NEAREST); dd = ImageDraw.Draw(c)
    s = 220 / (2 * R); dd.rectangle([(sl[1].start - bx[0]) * s - 3, (sl[0].start - bx[1]) * s - 3, (sl[1].stop - bx[0]) * s + 3, (sl[0].stop - bx[1]) * s + 3], outline='#e00000', width=2)
    dd.text((4, 2), f'{j} {kind.split("/")[0]} {nm}', fill='#e00000', font=F); crops.append(c)
open(f'out/{a.char}_{a.pose}_audit.txt', 'w').write('\n'.join(lines) + '\n'); print('\n'.join(lines))
if crops:
    cols_n = 8; rows = (len(crops) + cols_n - 1) // cols_n
    sheet = Image.new('RGB', (cols_n * 224, rows * 224), 'white')
    for j, c in enumerate(crops): sheet.paste(c, ((j % cols_n) * 224, (j // cols_n) * 224))
    sheet.save(f'out/{a.char}_{a.pose}_audit.png')
