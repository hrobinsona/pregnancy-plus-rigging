#!/usr/bin/env python3
"""leg_widths.py <char> <pose> [<pose> ...] [--px 120] [--side near|far|both] [--json out.json]

How THICK each leg is, ours against the reference still's, measured across the bone at stations down the thigh and the
shin (H units, front and back of the bone's axis). The still is mapped into rig units with the pose's fit (as
tools/side_match.py does), so its widths are in the same units as ours; its axis is its own landmarks (hip, knee, ankle),
ours the posed joints. A station counts only where the axis point is bare skin and both edges are real (the background or
the other leg, not the dress or a hand over it). Why: the side-on critics read our legs as "posts on hinges" round after
round (thighs 0.6-0.7 of the stills', no calf belly); measured, a profile can be corrected, not guessed (lesson 62).
Prints a table per pose and the mean still/ours ratio per station."""
import argparse, json, os, subprocess
import numpy as np
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('poses', nargs='+'); ap.add_argument('--px', type=float, default=120)
ap.add_argument('--side', default='near'); ap.add_argument('--json')
a = ap.parse_args()
os.chdir(R)
D = f'characters/{a.char}'
pal = json.loads(subprocess.run(['node', '-e', f"import('./{D}/character.js').then((m) => console.log(JSON.stringify(m.default.palette)))"], capture_output=True, text=True, check=True).stdout)
hexrgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]
# labels: 0 background, 1 near skin, 2 far skin, 3 dress, 4 dark (hair, shoes)
GROUPS = {1: ['skin', 'skinShade', 'skinLine', 'cheek', 'nail'], 2: ['skinFar'], 3: ['dress', 'dressShade', 'mouth'], 4: ['hair', 'hairShade', 'shoe', 'shoeShade', 'eye', 'brow']}
cols, lab = [[255, 255, 255]], [0]
for g, ks in GROUPS.items():
    for k in ks:
        if k in pal: cols.append(hexrgb(pal[k])); lab.append(g)
cols, lab = np.array(cols, float), np.array(lab)

def classify(img):
    A = np.asarray(img.convert('RGB'), float)
    d = ((A[:, :, None, :] - cols[None, None]) ** 2).sum(-1)
    m = lab[d.argmin(-1)]; m[np.sqrt(d.min(-1)) > 70] = 0
    return m

def joints(pose):
    js = "import fs from 'node:fs'; import { createRig } from './engine/rig.js'; import { expandHands } from './engine/handlib.js';" \
         f"const C = (await import('./{D}/character.js')).default, rig = createRig(C);" \
         f"const lib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync('{D}/poses/hands/' + h + '.json'))]));" \
         f"const st = rig.solve(expandHands(JSON.parse(fs.readFileSync('{D}/poses/{pose}.json')), lib, C.handSides));" \
         "console.log(JSON.stringify(Object.fromEntries(['near', 'far'].map((s) => [s, [st['thigh.' + s].pos, st['shin.' + s].pos, st['foot.' + s].pos]]))));"
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout)

FT = [0.3, 0.5, 0.7, 0.85]; FS = [0.1, 0.23, 0.37, 0.5, 0.63, 0.77, 0.9]
def widths(m, axis, x0, y0, px, side):
    """m: label raster over the box at px/H; axis: [hip, knee, ankle] in H → {(seg, f): (front, back) H or None}"""
    own = 1 if side == 'near' else 2
    out = {}
    for seg, (p0, p1), fs in (('thigh', axis[0:2], FT), ('shin', axis[1:3], FS)):
        p0, p1 = np.array(p0), np.array(p1); u = p1 - p0; L = np.linalg.norm(u); u = u / L; n = np.array([u[1], -u[0]])
        for f in fs:
            c = p0 + f * L * u
            def lab_at(q):
                X, Y = int((q[0] - x0) * px), int((q[1] - y0) * px)
                return m[Y, X] if 0 <= Y < m.shape[0] and 0 <= X < m.shape[1] else 0
            if lab_at(c) != own: out[(seg, f)] = None; continue
            r = []
            for sg in (1, -1):
                k = 0; step = 0.5 / px
                while lab_at(c + sg * n * k * step) == own and k < 4000: k += 1
                end = lab_at(c + sg * n * (k + 1) * step)
                r.append(k * step if end in (0, 2 if side == 'near' else 1) else None)
            out[(seg, f)] = tuple(r)
    return out

report, ratios = {}, {}
for pose in a.poses:
    tf = f"out/fit_side/fit/{pose.split('/')[-1]}_targets.json"
    if not os.path.exists(tf): tf = f'out/fit_{pose}_targets.json'
    if not os.path.exists(tf): tf = f"out/fit_{json.load(open(f'{D}/poses/{pose}.json')).get('fitFrom', pose)}_targets.json"
    T = json.load(open(tf)); X = T['xf']
    ref = T['ref']; still = os.path.join(os.path.dirname(os.path.dirname(ref)), 'images', os.path.splitext(os.path.basename(ref))[0] + '.png')
    S = np.asarray(Image.open(still).convert('RGB'))
    J = joints(pose); tg = {t['n']: t for t in T['targets']}
    def still_axis(side):
        k = next((n for n, t in tg.items() if n.startswith('knee') and t['bone'] == f'thigh.{side}'), None)
        if not k: return None
        L = k[-1]; return [tg['hip' + L]['to'], tg['knee' + L]['to'], tg['ankle' + L]['to']]
    xs = [p[0] for s in J.values() for p in s]; x0, x1 = min(xs) - 1.2, max(xs) + 1.2; y0, y1 = -4.4, 0.15
    W, H = int((x1 - x0) * a.px), int((y1 - y0) * a.px)
    kx, ky = X.get('kx', X['sizePx'][0] / X['W']), X.get('ky', X['sizePx'][1] / X['H'])
    gy, gx = np.mgrid[0:H, 0:W]; Xr = x0 + (gx + 0.5) / a.px; Yr = y0 + (gy + 0.5) / a.px
    rx = ((Xr * X['Hpx'] + X['ground'][0] - X['cx']) / X['s'] + X['sx']) / kx; ry = ((Yr * X['Hpx'] + X['ground'][1] - X['cy']) / X['s'] + X['sy']) / ky
    ok = (rx >= 0) & (rx < S.shape[1] - 1) & (ry >= 0) & (ry < S.shape[0] - 1)
    M = np.full((H, W, 3), 255, np.uint8); M[ok] = S[ry[ok].astype(int), rx[ok].astype(int)]
    ms = classify(Image.fromarray(M))
    rend = f'out/_lw_{pose.replace("/", "_")}.png'
    subprocess.run(['node', 'tools/char_still.mjs', '--char', a.char, '--pose', pose, '--box', f'{x0},{y0},{x1},{y1}', '--px', str(W), '--out', rend], check=True, capture_output=True)
    mo = classify(Image.open(rend).convert('RGB').resize((W, H)))
    sides = ['near', 'far'] if a.side == 'both' else [a.side]
    rep = {}
    print(f'\n{pose}   (H; front + back = total; ratio still / ours)')
    for side in sides:
        sa = still_axis(side)
        if not sa: print(f'  {side}: no landmarks'); continue
        ws, wo = widths(ms, sa, x0, y0, a.px, side), widths(mo, J[side], x0, y0, a.px, side)
        for key in ws:
            s, o = ws[key], wo[key]
            fmt = lambda w: '   --          ' if not w else ' '.join('  -- ' if v is None else f'{v:5.3f}' for v in w) + (f' ={sum(w):5.3f}' if None not in w else '       ')
            rt = ''
            if s and o and None not in s and None not in o:
                r = sum(s) / sum(o); rt = f'x{r:4.2f}'; ratios.setdefault((side,) + key, []).append(r)
            print(f'  {side:4s} {key[0]:5s} {key[1]:4.2f}   still {fmt(s)}   ours {fmt(o)}   {rt}')
            rep[f'{side}.{key[0]}.{key[1]}'] = {'still': s, 'ours': o}
    report[pose] = rep
print('\nmean still/ours by station:')
for k in sorted(ratios): print(f'  {k[0]:4s} {k[1]:5s} {k[2]:4.2f}  x{np.mean(ratios[k]):4.2f}  (n={len(ratios[k])}, {", ".join(f"{r:.2f}" for r in ratios[k])})')
if a.json: json.dump({p: {k: v for k, v in r.items()} for p, r in report.items()}, open(a.json, 'w'), indent=1)
