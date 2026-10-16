#!/usr/bin/env python3
"""cloth_fit.py <char> <pose> --knobs sq.tail.1=0:0.5,kp.pull=0:0.5,... [--steps 5] [--passes 2] [--below 0.1] [--pxh 120]

Fits a side-on pose's skirt to its still's DRESS outline by measurement: each knob is a path into the pose's
fx.clothTry (engine/drape.js reads clothTry.sq / .kp / .af / .seated and the cloth options tailRound, tailK, seatCorner,
frontWalk; an array index as a number: sq.tail.1), searched coordinate by coordinate over lo:hi (`--steps` values, the
range halved round the best each pass). The score is the dress IoU of the pose against its still, both mapped into rig
units by the pose's fit as tools/side_match.py does, over the rows below the hip (`--below` H above the near hip joint):
the skirt's shape, not the bodice or the posture's other differences. Prints each pass's best and the `cloth` line to put
in the pose's build script (characters/<c>/refs/fit_side.sh); writes the before/after diff to out/cloth_fit_<pose>.png.

Why: rounds 3–12 tuned the folded poses' cloth by eye one constant at a time (the squat's tail, kneel-pick's back corner,
the hem on the ball), and the lenses read "a sack… a sail… a flap" a fourth round running (lesson 73). The still is
measurement only: nothing of it is drawn, the drape stays procedural and only its few shape numbers are fitted."""
import argparse, copy, json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('pose')
ap.add_argument('--knobs', required=True); ap.add_argument('--steps', type=int, default=5); ap.add_argument('--passes', type=int, default=2)
ap.add_argument('--below', type=float, default=0.1, help='the region starts this far (H) above the near hip joint')
ap.add_argument('--pxh', type=float, default=120); ap.add_argument('--margin', type=float, default=0.4)
a = ap.parse_args()
os.chdir(R)
D = f'characters/{a.char}'
node = lambda js: subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout
pal = json.loads(node(f"import C from './{D}/character.js'; console.log(JSON.stringify(C.palette))"))
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
DRESS = 2

def classify(img):
    A = np.asarray(img.convert('RGB'), float)
    d = ((A[:, :, None, :] - cols[None, None]) ** 2).sum(-1)
    m = lab[d.argmin(-1)]; m[np.sqrt(d.min(-1)) > 70] = 0
    return m

# the pose, its fit's mapping of the still into rig units, the box and the region
pf = f'{D}/poses/{a.pose}.json'; P0 = json.load(open(pf))
tf = f'out/fit_{a.pose}_targets.json'
if not os.path.exists(tf): tf = f"out/fit_{P0.get('fitFrom', a.pose)}_targets.json"
T = json.load(open(tf)); X = T['xf']
ref = T['ref']; still = os.path.join(os.path.dirname(os.path.dirname(ref)), 'images', os.path.splitext(os.path.basename(ref))[0] + '.png')
SA = np.asarray(Image.open(still).convert('RGB'))
x0, y0, x1, y1 = [float(v) for v in subprocess.run(['node', 'tools/char_bounds.mjs', a.char, a.pose, str(a.margin)], capture_output=True, text=True, check=True).stdout.strip().split(',')]
hipY = json.loads(node(f"""import fs from 'node:fs'; import {{ createRig }} from './engine/rig.js'; import {{ expandHands }} from './engine/handlib.js';
import C from './{D}/character.js'; const rig = createRig(C);
const hl = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync('{D}/poses/hands/' + h + '.json'))]));
const S = rig.solve(expandHands(JSON.parse(fs.readFileSync('{pf}')), hl, C.handSides)); console.log(JSON.stringify(S['thigh.near'].pos[1]));"""))
W = int(round((x1 - x0) * a.pxh)); H = int(round(W * (y1 - y0) / (x1 - x0)))
kx, ky = X.get('kx', X['sizePx'][0] / X['W']), X.get('ky', X['sizePx'][1] / X['H'])
gy, gx = np.mgrid[0:H, 0:W]; Xr = x0 + (gx + 0.5) / W * (x1 - x0); Yr = y0 + (gy + 0.5) / H * (y1 - y0)
nx = (Xr * X['Hpx'] + X['ground'][0] - X['cx']) / X['s'] + X['sx']; ny = (Yr * X['Hpx'] + X['ground'][1] - X['cy']) / X['s'] + X['sy']
rx, ry = nx / kx, ny / ky
ok = (rx >= 0) & (rx < SA.shape[1] - 1) & (ry >= 0) & (ry < SA.shape[0] - 1)
M = np.full((H, W, 3), 255, np.uint8); M[ok] = SA[ry[ok].astype(int), rx[ok].astype(int)]
still_m = Image.fromarray(M); cs = classify(still_m)
region = Yr > hipY - a.below

tmp_name = f"_trial/cf_{os.path.basename(a.pose)}"; tmp = f'{D}/poses/{tmp_name}.json'
os.makedirs(os.path.dirname(tmp), exist_ok=True)
def render(ct):
    p = copy.deepcopy(P0); p.setdefault('fx', {})['clothTry'] = ct
    json.dump(p, open(tmp, 'w'))
    out = f'out/_cf_{os.path.basename(a.pose)}.png'
    subprocess.run(['node', 'tools/char_still.mjs', '--char', a.char, '--pose', tmp_name, '--box', f'{x0},{y0},{x1},{y1}', '--px', str(W), '--out', out], check=True, capture_output=True)
    return Image.open(out).convert('RGB').resize((W, H))
def score(img):
    co = classify(img); s_, o_ = (cs == DRESS) & region, (co == DRESS) & region
    u = (s_ | o_).sum(); return float((s_ & o_).sum() / u) if u else 0.0, co

# knobs: path=lo:hi; a path's start value is the pose's clothTry, else the drape's default (SQ, KP, AF, SEATED, CLOTH)
defs = json.loads(node(f"""import {{ SQ, KP, AF, SEATED }} from './engine/drape.js'; import * as sk from './{D}/parts/skirt.js';
console.log(JSON.stringify({{ sq: SQ, kp: KP, af: AF, seated: SEATED, ...(sk.CLOTH || {{}}) }}));"""))
ct = copy.deepcopy(P0.get('fx', {}).get('clothTry', {}))
def get(o, path):
    for k in path:
        if isinstance(o, list): o = o[int(k)] if int(k) < len(o) else None
        else: o = o.get(k) if isinstance(o, dict) else None
        if o is None: return None
    return o
def put(o, path, v):
    for i, k in enumerate(path[:-1]):
        nxt = path[i + 1]
        if isinstance(o, list): o = o[int(k)]; continue
        if k not in o: o[k] = copy.deepcopy(get(defs, path[:i + 1])) if get(defs, path[:i + 1]) is not None else ([] if nxt.isdigit() else {})
        o = o[k]
    last = path[-1]
    if isinstance(o, list): o[int(last)] = v
    else: o[last] = v
knobs = []
for spec in a.knobs.split(','):
    k, r = spec.split('='); lo, hi = [float(x) for x in r.split(':')]; path = k.split('.')
    v = get(ct, path); v = get(defs, path) if v is None else v; v = (lo + hi) / 2 if v is None else float(v)
    put(ct, path, round(v, 4)); knobs.append([path, lo, hi])
base, co0 = score(render(ct)); best = base; img0 = render(ct) if False else None
print(f'{a.pose}: dress IoU below the hip {base:.3f} at {json.dumps(ct)}')
for ps in range(a.passes):
    for kn in knobs:
        path, lo, hi = kn; cur = get(ct, path)
        for v in np.linspace(lo, hi, a.steps):
            v = round(float(v), 4)
            if abs(v - cur) < 1e-9: continue
            t = copy.deepcopy(ct); put(t, path, v); s, _ = score(render(t))
            if s > best + 1e-4: best, ct = s, t
        nv = get(ct, path); w = (hi - lo) / 4; kn[1], kn[2] = nv - w, nv + w
    print(f'  pass {ps + 1}: {best:.3f} at {json.dumps(ct)}')
# the before/after picture: still | before | after, dress mismatches in the region marked
after = render(ct); _, coA = score(after)
P_ = copy.deepcopy(P0); json.dump(P_, open(tmp, 'w')); before = render(P0.get('fx', {}).get('clothTry', {})); _, coB = score(before)
def marks(co):
    d = np.full((H, W, 3), 255, np.uint8); s_, o_ = cs == DRESS, co == DRESS
    d[(cs > 0) | (co > 0)] = (225, 225, 225); d[s_ & o_] = (170, 170, 170); d[s_ & ~o_] = (220, 40, 40); d[~s_ & o_] = (40, 90, 230)
    d[~region] = (d[~region] * 0.35 + 255 * 0.65).astype(np.uint8); return Image.fromarray(d)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
sheet = Image.new('RGB', (5 * W + 24, H + 24), 'white')
for i, im in enumerate([still_m, before, marks(coB), after, marks(coA)]): sheet.paste(im, (i * (W + 6), 24))
ImageDraw.Draw(sheet).text((4, 4), f'{a.pose}: dress IoU below the hip {base:.3f} -> {best:.3f}   (red: only the still has dress; blue: only ours)', fill='#c00', font=F)
outp = f'out/cloth_fit_{os.path.basename(a.pose)}.png'; sheet.save(outp)
os.remove(tmp)
print(outp)
print(f"cloth {os.path.basename(a.pose)} '{json.dumps(ct, separators=(',', ':'))}'")
