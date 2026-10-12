#!/usr/bin/env python3
"""anim_audit.py <char> <anim> [--every 2] [--from 0] [--to N] [--thin 0.012] [--ppH 252.09]
BLEED audit of a rendered shot (run after tools/char_anim.mjs): the overlap faults that flicker past at speed — a
sliver of sleeve showing through a hand, skin poking out from under a cuff, a hairline of cardigan between two limbs,
a background pinhole where two parts should overlap. The same pixel tests as tools/detail_audit.py (one pose), applied
to every Nth frame of the animation, with two additions:
  · every finding records what SURROUNDS it, and is classed BLEED when one material lies on another where neither
    belongs (clothing on skin, skin on clothing, a part's own colour showing through a gap in another);
  · findings at the same place in consecutive frames are merged into one TRACK (frames a–b), so a fault that lives for
    20 frames is one line, ranked by how long and how big it is.
Writes out/<char>_<anim>_bleed.txt (tracks, worst first) and out/<char>_<anim>_bleed.png (a zoom crop of each track at
its biggest frame, with the frame number). Intentional thin features (hair strands, mouth, brows, finger lines) are
ignored by colour; characters/<char>/audit_allow.json allowlists the rest (same format as detail_audit)."""
import sys, os, json, glob, subprocess, argparse, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('anim')
ap.add_argument('--every', type=int, default=2); ap.add_argument('--from', dest='f0', type=int, default=0); ap.add_argument('--to', dest='f1', type=int, default=10 ** 6)
ap.add_argument('--thin', type=float, default=0.012); ap.add_argument('--ppH', type=float, default=252.09)
ap.add_argument('--ignore', default='hair,hairShade,mouth,eye,skinLine,sockShade,brow,cheek,cheekSick')
a = ap.parse_args()
meta = json.loads(subprocess.run(['node', '-e', f"import('./characters/{a.char}/character.js').then(m=>console.log(JSON.stringify({{palette:m.default.palette}})))"], check=True, capture_output=True, text=True).stdout)
pal = {k: v for k, v in meta['palette'].items() if isinstance(v, str) and v.startswith('#')}
names = ['bg'] + list(pal); cols = np.array([[255, 255, 255]] + [[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in pal.values()], np.int32)
SKIN = {n for n in names if n.startswith('skin')}
CLOTH = {n for n in names if any(n.startswith(p) for p in ('cardigan', 'top', 'bottoms', 'sock', 'jogger', 'shirt', 'sleeve'))}
ppH = a.ppH; ign = set(a.ignore.split(','))
allow = json.load(open(f'characters/{a.char}/audit_allow.json')) if os.path.exists(f'characters/{a.char}/audit_allow.json') else []
r = max(2, int(round(a.thin * ppH))); yy, xx = np.ogrid[-r:r + 1, -r:r + 1]; disk = xx * xx + yy * yy <= r * r
A_speck = (0.02 * ppH) ** 2

def label(im):
    best = np.full(im.shape[:2], 1 << 30, np.int32); lab = np.zeros(im.shape[:2], np.int16)
    for k, c in enumerate(cols):
        dk = ((im - c) ** 2).sum(-1, dtype=np.int32); upd = dk < best; best[upd] = dk[upd]; lab[upd] = k
    return lab, best < 14 ** 2

def neighbours(lab, core, sl, comp_mask, k):
    Hh, Ww = lab.shape; pad = 4
    y0, y1 = max(0, sl[0].start - pad), min(Hh, sl[0].stop + pad); x0, x1 = max(0, sl[1].start - pad), min(Ww, sl[1].stop + pad)
    comp = np.zeros((y1 - y0, x1 - x0), bool); comp[sl[0].start - y0:sl[0].stop - y0, sl[1].start - x0:sl[1].stop - x0] = comp_mask
    ring = ndi.binary_dilation(comp, iterations=3) & ~ndi.binary_dilation(comp, iterations=1)
    labs, cnt = np.unique(lab[y0:y1, x0:x1][ring & core[y0:y1, x0:x1]], return_counts=True)
    return {names[int(l)]: int(c) for l, c in zip(labs, cnt) if l != k and c > 3}

def classify(nm, nb):
    """BLEED = one material showing on/through another where it should not: clothing inside skin, skin inside clothing."""
    others = set(nb)
    if nm in CLOTH and others & SKIN: return 'bleed:cloth-on-skin'
    if nm in SKIN and others & CLOTH and not (others - CLOTH - {'bg'}): return 'bleed:skin-in-cloth'
    if nm == 'bg': return 'gap'
    return 'sliver'

def audit(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.int32); Hh, Ww = im.shape[:2]
    lab, core = label(im); out = []
    bl, _ = ndi.label(lab == 0); border = set(np.unique(np.concatenate([bl[0], bl[-1], bl[:, 0], bl[:, -1]])))
    for i, sl in enumerate(ndi.find_objects(bl), 1):
        if i in border or sl is None: continue
        m = bl[sl] == i; area = int(m.sum())
        if 4 < area < (0.06 * ppH) ** 2: out.append(('gap', 'bg', sl, area, neighbours(lab, core, sl, m, 0)))
    for k, nm in enumerate(names[1:], 1):
        if nm in ign: continue
        full = lab == k
        if not full.any(): continue
        ml, _ = ndi.label(full & core)
        for i, sl in enumerate(ndi.find_objects(ml), 1):
            if sl is None: continue
            m = ml[sl] == i; area = int(m.sum()); h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if 12 < area < A_speck and min(h, w) > 2:
                nb = neighbours(lab, core, sl, m, k); out.append((classify(nm, nb), nm, sl, area, nb))
        thin = full & ~ndi.binary_opening(full, structure=disk); thin = ndi.binary_opening(thin, structure=np.ones((2, 2)))
        tl, _ = ndi.label(thin)
        for i, sl in enumerate(ndi.find_objects(tl), 1):
            if sl is None: continue
            m = tl[sl] == i; area = int(m.sum()); h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if not (area > (0.006 * ppH) ** 2 * 4 and max(h, w) > 0.02 * ppH): continue
            nb = neighbours(lab, core, sl, m, k)
            if len(nb) == 1 and 'bg' not in nb: continue              # a drawn line lying on one colour: deliberate
            base = nm[:-5] if nm.endswith('Shade') else None
            if base and set(nb) <= {base, 'bg'} and base in nb: continue
            if nm + 'Line' in names and set(nb) <= {nm + 'Line', 'bg'} and max(h, w) <= 0.035 * ppH: continue
            out.append((classify(nm, nb) if classify(nm, nb) != 'sliver' else 'spur', nm, sl, area, nb))
    return out

frames = sorted(glob.glob(f'out/frames/{a.char}_{a.anim}/f*.png'))
frames = [f for f in frames if a.f0 <= int(os.path.basename(f)[1:5]) <= a.f1][::a.every]
tracks = []                                                   # merge findings at ~the same place and colour across frames
for fp in frames:
    fi = int(os.path.basename(fp)[1:5])
    for kind, nm, sl, area, nb in audit(fp):
        cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
        if any(w['colour'] == nm and (cx / ppH - w['at'][0]) ** 2 + (cy / ppH - w['at'][1]) ** 2 <= w.get('r', 0.05) ** 2 for w in allow): continue
        t = next((t for t in tracks if t['nm'] == nm and t['kind'] == kind and fi - t['f1'] <= 2 * a.every and abs(t['cx'] - cx) < 0.08 * ppH and abs(t['cy'] - cy) < 0.08 * ppH), None)
        if t is None: t = {'nm': nm, 'kind': kind, 'f0': fi, 'f1': fi, 'cx': cx, 'cy': cy, 'n': 0, 'amax': 0, 'best': None, 'nb': {}}; tracks.append(t)
        t['f1'] = fi; t['cx'], t['cy'] = cx, cy; t['n'] += 1
        for k_, v in nb.items(): t['nb'][k_] = t['nb'].get(k_, 0) + v
        if area > t['amax']: t['amax'] = area; t['best'] = (fp, fi, sl)
score = lambda t: (t['kind'].startswith('bleed') * 3 + (t['kind'] == 'gap') * 2 + 1) * t['n'] * np.sqrt(t['amax'])
tracks.sort(key=score, reverse=True)
lines = [f'bleed audit {a.char}/{a.anim}: {len(frames)} frames (every {a.every}), {len(tracks)} tracks — kind, colour, frames, '
         f'size, what surrounds it']
for j, t in enumerate(tracks, 1):
    nb = ', '.join(k for k, _ in sorted(t['nb'].items(), key=lambda x: -x[1])[:3])
    lines.append(f"{j:3d} {t['kind']:20s} {t['nm']:14s} f{t['f0']:03d}–f{t['f1']:03d} ({t['n']}×)  max {t['amax']:5d} px  at {t['cx']:.0f},{t['cy']:.0f}  on: {nb}")
open(f'out/{a.char}_{a.anim}_bleed.txt', 'w').write('\n'.join(lines) + '\n'); print('\n'.join(lines[:60]))
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16); crops = []
for j, t in enumerate(tracks[:48], 1):
    fp, fi, sl = t['best']; src = Image.open(fp).convert('RGB'); cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
    R = int(0.14 * ppH); bx = (int(cx) - R, int(cy) - R, int(cx) + R, int(cy) + R); c = src.crop(bx).resize((220, 220), Image.NEAREST); d = ImageDraw.Draw(c); s = 220 / (2 * R)
    d.rectangle([(sl[1].start - bx[0]) * s - 3, (sl[0].start - bx[1]) * s - 3, (sl[1].stop - bx[0]) * s + 3, (sl[0].stop - bx[1]) * s + 3], outline='#e00000', width=2)
    d.text((4, 2), f"{j} f{fi} {t['kind'].replace('bleed:', '')}", fill='#e00000', font=F); d.text((4, 200), t['nm'], fill='#e00000', font=F); crops.append(c)
if crops:
    cn = 8; rows = (len(crops) + cn - 1) // cn; sh = Image.new('RGB', (cn * 224, rows * 224), 'white')
    for j, c in enumerate(crops): sh.paste(c, ((j % cn) * 224, (j // cn) * 224))
    sh.save(f'out/{a.char}_{a.anim}_bleed.png')
