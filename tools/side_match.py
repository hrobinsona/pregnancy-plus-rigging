#!/usr/bin/env python3
"""side_match.py <char> <pose>[:<still.png>] ... [--out out/side_match.png] [--px 420 | --pxh 225] [--margin 0.25] [--json out.json] [--tiles dir [--ground #hex]]

A fitted pose against its reference still, MATERIAL by material: the still is mapped into rig units with the pose's fit
(out/fit_<pose>_targets.json, written by tools/fit_pose.mjs; the still defaults to the fit's own), both are classified
pixel by pixel into the character's materials (skin, dress, dark = hair and shoes) and compared:
  grey   both the same material         red    only the still has her there        blue   only ours has her there
  amber  both have her, but a different material (our skin where the still has dress: a skirt too short; the reverse:
         a skirt too long, or a leg drawn where the still's dress hangs)
Prints the IoU of each material and of the whole silhouette. Why: a side-on pose off her feet is judged by its SHAPES
(does the skirt drape where the still's does, do the legs fold like the still's, does the bump hang), not by the few
joints the fit meets; the whole figure's outline is what reads as natural or not (side-on library, lesson 62). The still is
measurement only: nothing of it is drawn."""
import argparse, json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('pairs', nargs='+')
ap.add_argument('--out', default='out/side_match.png'); ap.add_argument('--px', type=int, default=420)
ap.add_argument('--margin', type=float, default=0.25); ap.add_argument('--json'); ap.add_argument('--cols', type=int, default=2)
ap.add_argument('--pxh', type=float, help='pixels per H instead of --px (225: film size)'); ap.add_argument('--tiles', help='also save <dir>/<pose>_still.png and _ours.png (tools/critic_F.py --side)'); ap.add_argument('--ground', help='#hex: the _ours tile with the floor shadow (character.ground)')
a = ap.parse_args()
os.chdir(R)
D = f'characters/{a.char}'
pal = json.loads(subprocess.run(['node', '-e', f"import('./{D}/character.js').then((m) => console.log(JSON.stringify(m.default.palette)))"],
                                capture_output=True, text=True, check=True).stdout)
hexrgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]
GROUPS = {'skin': ['skin', 'skinFar', 'skinShade', 'skinLine', 'cheek', 'nail'], 'dress': ['dress', 'dressShade', 'mouth'], 'dark': ['hair', 'hairShade', 'shoe', 'shoeShade', 'eye', 'brow']}
cols, lab = [[255, 255, 255]], [0]
for gi, (g, ks) in enumerate(GROUPS.items(), 1):
    for k in ks:
        if k in pal: cols.append(hexrgb(pal[k])); lab.append(gi)
# the props' own colours (engine/props.js: the chair's wood, the toy, the ball, the worktop): not her. Within 70 of the
# dress the wood and the orange toy classed as DRESS, so a chair or a toy counted as skirt (round 13)
for h in ['#c98d5c', '#ad7446', '#9c663c', '#f38a3a', '#e07330', '#a9cdec', '#ebe4da', '#d9d0c4', '#cdbfae']: cols.append(hexrgb(h)); lab.append(0)
cols, lab = np.array(cols, float), np.array(lab)
NAMES = ['bg'] + list(GROUPS)

def classify(img):
    A = np.asarray(img.convert('RGB'), float)
    d = ((A[:, :, None, :] - cols[None, None]) ** 2).sum(-1)
    k = d.argmin(-1); m = lab[k]
    m[np.sqrt(d.min(-1)) > 70] = 0        # far from every material (a prop, a ball): not her
    return m

def bounds(pose):
    o = subprocess.run(['node', 'tools/char_bounds.mjs', a.char, pose, str(a.margin)], capture_output=True, text=True, check=True).stdout
    return [float(v) for v in o.strip().split(',')]

F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
tiles, report = [], {}
for pr in a.pairs:
    pose, still = (pr.split(':', 1) + [None])[:2]
    tf = f'out/fit_{pose}_targets.json'
    if not os.path.exists(tf): tf = f"out/fit_{json.load(open(f'{D}/poses/{pose}.json')).get('fitFrom', pose)}_targets.json"   # a floored pose: its fit's
    T = json.load(open(tf)); X = T['xf']
    if not still:
        ref = T['ref']; base = os.path.splitext(os.path.basename(ref))[0]
        still = os.path.join(os.path.dirname(os.path.dirname(ref)), 'images', base + '.png')
    S = Image.open(still).convert('RGB'); SA = np.asarray(S)
    # the box: our posed bounds, grown to hold the still's figure too (mapped into rig units)
    x0, y0, x1, y1 = bounds(pose)
    sm = classify(S) > 0; ys, xs = np.nonzero(sm)
    kx, ky = X.get('kx', X['sizePx'][0] / X['W']), X.get('ky', X['sizePx'][1] / X['H'])
    toRig = lambda px, py: (((px * kx - X['sx']) * X['s'] + X['cx'] - X['ground'][0]) / X['Hpx'], ((py * ky - X['sy']) * X['s'] + X['cy'] - X['ground'][1]) / X['Hpx'])
    if len(xs):
        rx0, ry0 = toRig(xs.min(), ys.min()); rx1, ry1 = toRig(xs.max(), ys.max())
        x0, y0, x1, y1 = min(x0, rx0 - a.margin), min(y0, ry0 - a.margin), max(x1, rx1 + a.margin), max(y1, ry1 + a.margin)
    W = int(round((x1 - x0) * a.pxh)) if a.pxh else a.px; H = int(round(W * (y1 - y0) / (x1 - x0)))
    rend = f'out/_sm_{pose.replace("/", "_")}.png'
    subprocess.run(['node', 'tools/char_still.mjs', '--char', a.char, '--pose', pose, '--box', f'{x0},{y0},{x1},{y1}', '--px', str(W), '--out', rend], check=True, capture_output=True)
    ours = Image.open(rend).convert('RGB').resize((W, H))
    gy, gx = np.mgrid[0:H, 0:W]; Xr = x0 + (gx + 0.5) / W * (x1 - x0); Yr = y0 + (gy + 0.5) / H * (y1 - y0)
    nx = (Xr * X['Hpx'] + X['ground'][0] - X['cx']) / X['s'] + X['sx']; ny = (Yr * X['Hpx'] + X['ground'][1] - X['cy']) / X['s'] + X['sy']
    rx, ry = nx / kx, ny / ky
    ok = (rx >= 0) & (rx < SA.shape[1] - 1) & (ry >= 0) & (ry < SA.shape[0] - 1)
    M = np.full((H, W, 3), 255, np.uint8); M[ok] = SA[ry[ok].astype(int), rx[ok].astype(int)]
    still_m = Image.fromarray(M)
    if a.tiles:
        os.makedirs(a.tiles, exist_ok=True); tn = pose.replace('/', '_')
        still_m.save(f'{a.tiles}/{tn}_still.png'); og = ours
        if a.ground:   # the tile as the film draws her: with the floor shadow under whatever touches the floor (not compared)
            subprocess.run(['node', 'tools/char_still.mjs', '--char', a.char, '--pose', pose, '--box', f'{x0},{y0},{x1},{y1}', '--px', str(W), '--ground', a.ground, '--out', rend], check=True, capture_output=True)
            og = Image.open(rend).convert('RGB').resize((W, H))
        og.save(f'{a.tiles}/{tn}_ours.png')
    cs, co = classify(still_m), classify(ours)
    res = {}
    for gi, g in enumerate(NAMES[1:], 1):
        u = ((cs == gi) | (co == gi)).sum(); res[g] = round(float(((cs == gi) & (co == gi)).sum() / u), 3) if u else None
    u = ((cs > 0) | (co > 0)).sum(); res['silhouette'] = round(float(((cs > 0) & (co > 0)).sum() / u), 3) if u else None
    res['box'] = [round(v, 3) for v in (x0, y0, x1, y1)]; report[pose] = res
    diff = np.full((H, W, 3), 255, np.uint8)
    diff[(cs > 0) & (co == cs)] = (170, 170, 170); diff[(cs > 0) & (co == 0)] = (220, 40, 40); diff[(cs == 0) & (co > 0)] = (40, 90, 230)
    diff[(cs > 0) & (co > 0) & (cs != co)] = (240, 170, 20)
    t = Image.new('RGB', (3 * W + 12, H + 24), 'white')
    for i, im in enumerate([still_m, ours, Image.fromarray(diff)]): t.paste(im, (i * (W + 6), 24))
    ImageDraw.Draw(t).text((4, 4), f"{pose}   sil {res['silhouette']}  dress {res['dress']}  skin {res['skin']}  dark {res['dark']}", fill='#c00', font=F)
    tiles.append(t)
    print(f"{pose:32s} silhouette {res['silhouette']}  dress {res['dress']}  skin {res['skin']}  dark {res['dark']}")
cw = max(t.size[0] for t in tiles); ncol = min(a.cols, len(tiles)); rows = [tiles[i:i + ncol] for i in range(0, len(tiles), ncol)]
sheet = Image.new('RGB', (ncol * (cw + 16), sum(max(t.size[1] for t in r) + 10 for r in rows)), 'white'); yy = 0
for r in rows:
    for i, t in enumerate(r): sheet.paste(t, (i * (cw + 16), yy))
    yy += max(t.size[1] for t in r) + 10
os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True); sheet.save(a.out); print(a.out, sheet.size)
if a.json: json.dump(report, open(a.json, 'w'), indent=1)
