#!/usr/bin/env python3
"""side_zoom.py <char> <pose | anim@t>... [--out out/side_zoom.png] [--px 350] [--size 0.7] [--film 225] [--try JSON] [--at near,far] [--marks dress,dress.skirt]

A side-on pose beside its reference still, close up: one row per crop, [still | ours | ours at film size] (and the same
pair for every --try candidate). By default the crops are the HANDS (--at near,far): ours centred on the posed hand
(wrist, middle fingertip, thumb tip), the still's on its nearest hand (MediaPipe landmarks mapped into rig units with the
pose's fit), and the offset between the two is printed on the row: a hand placed wrong shows as a number, not only as a
picture. --at neck,thigh.near@0.2:0 (any bone, name@dx:dy offset in H) zooms anywhere else, the still cropped at the same
rig coordinates through the fit. `--size` H square. --try is tools/side_zoom.mjs's candidate list ([{"label", "style": {params.handSpecs keys}, "bones", "fx",
"hands"}]): pick a hand's drawing or shape beside the stills, then save the winner (params.handSpecs, the hand library).
Why: side-on round 5's hands lens scored 4.5–6 for five rounds running ("stripe paddles", "a flat card"), and a
whole-figure sheet draws a hand at 30 px, too small to see WHAT differs from the still: here the still's relaxed C-curl,
its short separations near the tips, its fingers held together and its one smooth outline sit next to ours at 1:1 and at
film size (lesson 64). 'rest' is cropped beside the master illustration. <anim>@<t> crops a shot's frame (no still): try a drawing on the standing shot as well as the side
poses before keeping it (round 5's hands won beside the stills and lost blind on breathe-stroke). The still is measurement
only: nothing of it is drawn."""
import argparse, json, math, os, re, subprocess, tempfile
from PIL import Image, ImageDraw

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('poses', nargs='+')
ap.add_argument('--out', default='out/side_zoom.png'); ap.add_argument('--px', type=int, default=350, help='crop side in px')
ap.add_argument('--size', type=float, default=0.7, help='crop side in H'); ap.add_argument('--film', type=float, default=225, help='film px per H')
ap.add_argument('--try', dest='try_', help='candidates JSON (tools/side_zoom.mjs)'); ap.add_argument('--at', default='near,far', help='hands (near, far) or bones, name@dx:dy')
ap.add_argument('--marks', default='', help='parts whose anchors are drawn numbered over ours (dress,dress.skirt)')
ap.add_argument('--hidden-far', action='store_true', help='a far hand the pose hides (behind her bump, her near hand, her body) gets a blank panel saying so, not a crop of what covers it')
a = ap.parse_args()
os.chdir(R)
tmp = tempfile.mkdtemp(prefix='side_zoom_')
cands = json.loads(a.try_) if a.try_ else [{'label': 'ours'}]
# --hidden-far: the same figure drawn without its far arm, so the far crop's changed pixels are the far hand we SEE. A far
# hand hidden behind her bump or her near hand cropped as "far" showed the near hand a second time, and every critic read
# it as "the far hand a full duplicate of the near one, a second fan" (side-on round 9, all three lenses)
nofar = a.hidden_far and 'far' in a.at.split(',')
run = cands + ([{**cands[0], 'label': '_nofar', 'fx': {**cands[0].get('fx', {}), 'show.far.arm': 0}}] if nofar else [])
subprocess.run(['node', 'tools/side_zoom.mjs', '--char', a.char, '--out', tmp, '--px', str(a.px), '--size', str(a.size), '--at', a.at,
                '--try', json.dumps(run), *(['--marks', a.marks] if a.marks else []), *a.poses], check=True, capture_output=True)
centre = json.load(open(f'{tmp}/centres.json'))

def fit_of(pose):
    if '@' in pose: return None
    tf = f'out/fit_{pose}_targets.json'
    if not os.path.exists(tf): tf = f"out/fit_{json.load(open(f'characters/{a.char}/poses/{pose}.json')).get('fitFrom', pose)}_targets.json"
    return json.load(open(tf)) if os.path.exists(tf) else None

def master_crop(x, y):
    # 'rest': the master illustration (C.ref: rig unit → master px = ground + v·Hpx), the design every pose is drawn from
    R_ = json.loads(subprocess.run(['node', '-e', f"import('./characters/{a.char}/character.js').then(m=>console.log(JSON.stringify(m.default.ref)))"], check=True, capture_output=True, text=True).stdout)
    im = Image.open(f'characters/{a.char}/{R_["image"]}').convert('RGB'); H_, (gx, gy), h = R_['Hpx'], R_['groundPx'], a.size / 2
    return im.crop((int(gx + (x - h) * H_), int(gy + (y - h) * H_), int(gx + (x + h) * H_), int(gy + (y + h) * H_))).resize((a.px, a.px), Image.LANCZOS)

def still_crop(T, x, y):
    # the still's pixels for the H square of side --size about (x, y): the fit's map (tools/side_match.py toRig) inverted
    X = T['xf']; ref = T['ref']; base = os.path.splitext(os.path.basename(ref))[0]
    im = Image.open(os.path.join(os.path.dirname(os.path.dirname(ref)), 'images', base + '.png')).convert('RGB')
    kx, ky = X.get('kx', X['sizePx'][0] / X['W']), X.get('ky', X['sizePx'][1] / X['H'])
    px = lambda v: ((v * X['Hpx'] + X['ground'][0] - X['cx']) / X['s'] + X['sx']) / kx
    py = lambda v: ((v * X['Hpx'] + X['ground'][1] - X['cy']) / X['s'] + X['sy']) / ky
    h = a.size / 2
    return im.crop((int(px(x - h)), int(py(y - h)), int(px(x + h)), int(py(y + h)))).resize((a.px, a.px), Image.LANCZOS)

F = max(1, int(round(a.size * a.film))); rows = []
for p in a.poses:
    T = fit_of(p); sh = []
    if T:
        by = {}
        for t in T['targets']:
            m = re.fullmatch(r'(wrist|index|pinky|thumb)([LR])', t['n'])
            if m: by.setdefault(m.group(2), []).append(t['to'])
        sh = [(sum(q[0] for q in v) / len(v), sum(q[1] for q in v) / len(v)) for v in by.values()]
    used = set()
    for sd in a.at.split(','):
        cx, cy = centre[p][sd]; hand = sd in ('near', 'far')
        # the still's crop sits on ITS nearest hand (so a hand placed wrong still shows the still's hand), the offset printed
        cand = sorted((math.hypot(h[0] - cx, h[1] - cy), k) for k, h in enumerate(sh) if k not in used) if hand else []
        off = ''
        if cand and cand[0][0] < 1.0:
            used.add(cand[0][1]); sx, sy = sh[cand[0][1]]; off = f'   ours {cand[0][0]:.2f} H from the still\'s ({cx - sx:+.2f}, {cy - sy:+.2f})'
        else: sx, sy = cx, cy
        row = Image.new('RGB', (a.px + len(cands) * (a.px + F + 30) + 20, a.px + 28), 'white'); dr = ImageDraw.Draw(row)
        # a still that draws ONE hand (its far hand behind her bump, a thigh or a post, checked at 1:1 and recorded as the
        # pose's fx.stillHidesFar): cropped where OUR far hand would be, it showed the still's NEAR hand, and all three
        # lenses read "the still shows the far hand; draw it" on four poses (side-on round 13, lesson 74)
        hides = sd == 'far' and T and (json.load(open(f'characters/{a.char}/poses/{p}.json')).get('fx') or {}).get('stillHidesFar')
        if hides:
            im = Image.new('RGB', (a.px, a.px), '#eeeeee'); di = ImageDraw.Draw(im)
            for j, ln in enumerate(['THE STILL HIDES ITS FAR HAND', '(behind her bump, her thigh or', 'the post: it draws one hand)', 'so ours hidden matches it']):
                di.text((12, 12 + 18 * j), ln, fill='#333')
            row.paste(im, (0, 28)); off = ''
        elif T: row.paste(still_crop(T, sx, sy), (0, 28))
        elif p == 'rest': row.paste(master_crop(cx, cy), (0, 28))
        dr.text((6, 6), f'{p} {sd}: still{off}', fill='black')
        x = a.px + 20
        crop = lambda k: Image.open(f"{tmp}/{p.replace('/', '_')}_{re.sub(r'[^\w.-]', '_', sd)}_{k}.png").convert('RGB')
        seen = None
        if nofar and sd == 'far':   # the share of the crop that is far arm (more than a faint edge: 24 levels)
            A_, B_ = crop(0), crop(len(cands)); seen = sum(1 for u, v in zip(A_.getdata(), B_.getdata()) if max(abs(u[i] - v[i]) for i in range(3)) > 24) / (A_.width * A_.height)
        for k, c in enumerate(cands):
            im = crop(k)
            if seen is not None and seen < 0.03:   # (a hand's back fills ~8–15% of a 0.75 H crop; under 3% only a sliver or a tip shows)
                im = Image.new('RGB', im.size, '#eeeeee'); di = ImageDraw.Draw(im)
                for j, ln in enumerate(['FAR HAND HIDDEN', f'only {seen * 100:.1f}% of this crop is her', 'far arm: it is behind her bump,', 'her near hand or her body', '(there is no second hand)']):
                    di.text((12, 12 + 18 * j), ln, fill='#333')
            row.paste(im, (x, 28)); row.paste(im.resize((F, F), Image.LANCZOS), (x + a.px + 10, 28))
            dr.text((x + 4, 30), c.get('label', str(k)), fill='black'); x += a.px + F + 30
        rows.append(row)
W = max(r.width for r in rows); out = Image.new('RGB', (W, sum(r.height + 10 for r in rows)), 'white'); y = 0
for r in rows: out.paste(r, (0, y)); y += r.height + 10
os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True); out.save(a.out); print(a.out, out.size)
