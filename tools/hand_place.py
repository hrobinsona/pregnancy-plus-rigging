#!/usr/bin/env python3
"""hand_place.py <char> --fit <name> --side far --keys wx,wy[,kx,ky],tx,ty [--tips x1,y1,…,x4,y4] [--hand <shape>] [--zbias part=dz,...] [--seed a,b,... ...] [--restarts N] [--natural [--slack deg] [--hang d] [--hand-len l] [--palm-down d]] [--bones ...] [--fore fx,fy --hide upper] [--elbow ex,ey --hide none] [--sample k] [--dry]
Place a hand whose WRIST the pose estimator can't see: a far hand resting on the top of the bump, its forearm hidden
behind her body. Three points are measured by eye on the still (refs/images/<fit>_<sample>.png, still px) and recorded
with the command in refs/fit_keys.sh: W where the wrist comes out from behind her, K the middle knuckle, T the centroid
of the four fingertips. tools/hand_keys.mjs solves the arm (default upperArm, forearm, hand, armAbd, armRot, foreRot of
--side) so the drawn hand lands on them while the upper arm and forearm stay inside the body's silhouette (rendered
here twice, the arm out of the way up and down, intersected). Writes the arm bones, --hand and --zbias into
poses/fit-<name>.json with a note, and a check image out/hand_place_<name>.png (still | render).
Why: on mum3q's both-hands stills MediaPipe put the hidden far wrist at the fingertips (70 px off), and matching the
hand's skin blob instead converged on a blocky hand inside the outline (the drawn hand never has the still's shape, so
area/overlap terms pull it anywhere); three points plus 'the arm stays hidden' is well posed (PIPELINE lesson 48).
--natural --restarts N: also require an arm a body can make (upper arm hanging, elbow out at her side, back of the hand to
us, every joint --slack degrees clear of its limits so the shot's reach can still move it) from N seeds; keys alone put
mum3q's elbow inside her chest (lesson 49).
--hide none --elbow ex,ey: a VISIBLE arm whose hand the joint fit misplaces (q_k4_down's near hand curled over the top of
the bump: the drawn forearm is shorter than the illustration's, so the fit left the hand 50 px low); the elbow is a key."""
import argparse, json, os, re, subprocess
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('char'); ap.add_argument('--fit', required=True); ap.add_argument('--side', default='far')
ap.add_argument('--keys', required=True); ap.add_argument('--sample', type=int); ap.add_argument('--hand'); ap.add_argument('--zbias', default='')
ap.add_argument('--bones', default='upperArm,forearm,hand,armAbd,armRot,foreRot'); ap.add_argument('--seed', action='append', default=[])
ap.add_argument('--restarts', type=int, default=0); ap.add_argument('--natural', action='store_true'); ap.add_argument('--slack', type=float, help='--natural: degrees each joint keeps clear of its limits (default 8)'); ap.add_argument('--hand-len', type=float, help='--natural: the hand\'s least drawn length (a3.len; 0.9 for a hand resting on her: illustrations draw it unforeshortened)'); ap.add_argument('--hang', type=float, help='--natural: the upper arm\'s least downward component (default 0.55; ~0.35 for an elbow lifted out to the side)'); ap.add_argument('--palm-down', type=float, help='--natural: the palm normal\'s least screen-down component (~0.6 for a hand lying on top of the bump: its curl then bends the fingers down over the dome on screen)')
ap.add_argument('--fore', help='a point on a forearm the still shows (still px)'); ap.add_argument('--hide', default='arm', choices=['arm', 'upper', 'none']); ap.add_argument('--elbow', help='the still\'s elbow (still px), a key too')
ap.add_argument('--tips', help='each fingertip on the still, index → little (x1,y1,…,x4,y4): fits the hand\'s roll, which T\'s centroid leaves free (lesson 54)')
ap.add_argument('--dry', action='store_true', help='print the result, write nothing to the pose')
a = ap.parse_args()
D = f'characters/{a.char}'; L = json.load(open(f'{D}/ref/landmarks.json'))
REF = json.loads(subprocess.run(['node', '-e', f"import('./{D}/character.js').then(m=>console.log(JSON.stringify(m.default.ref)))"], check=True, capture_output=True, text=True).stdout)
G, Hpx = REF['groundPx'], REF['Hpx']
if a.sample is None:
    m = re.search(rf'pose/{re.escape(a.fit)}_(\d+)\.json', open(f'{D}/refs/fit_keys.sh').read())
    a.sample = int(m.group(1)) if m else 0
pf = f'{D}/poses/fit-{a.fit}.json'; base = json.load(open(pf))
if a.hand: base['hands'] = {**base.get('hands', {}), a.side: a.hand}
for kv in filter(None, a.zbias.split(',')): k, v = kv.split('='); base.setdefault('zBias', {})[k] = float(v)   # e.g. arm.far.hand=40: the hand drawn on the dress
box = ','.join(str(v) for v in [(0 - G[0]) / Hpx, (0 - G[1]) / Hpx, (L['sizePx'][0] - G[0]) / Hpx, (L['sizePx'][1] - G[1]) / Hpx])
os.makedirs('out', exist_ok=True); tmp = f'out/_hpl{os.getpid()}'
srv = subprocess.Popen(['node', 'tools/still_server.mjs', '--char', a.char, '--box', box, '--px', str(L['sizePx'][0])], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
def render(p, out):
    srv.stdin.write(json.dumps({'pose': p, 'out': out}) + '\n'); srv.stdin.flush()
    r = srv.stdout.readline().strip()
    if r != 'ok': raise SystemExit(f'still_server: {r or "died"}')
# the body's silhouette without this arm: render it held straight up and hanging, keep what both renders cover
masks = []
for k, ua in enumerate([170, -5]):
    p = json.loads(json.dumps(base)); p.pop('zBias', None)
    p['bones'].update({f'upperArm.{a.side}': ua, f'forearm.{a.side}': 0, f'armAbd.{a.side}': 0, f'armRot.{a.side}': 0})
    render(p, f'{tmp}_{k}.png'); im = np.asarray(Image.open(f'{tmp}_{k}.png').convert('RGB')).astype(int); os.remove(f'{tmp}_{k}.png')
    masks.append(~((im[..., 0] > 245) & (im[..., 1] > 245) & (im[..., 2] > 245)))
body = masks[0] & masks[1]; rows = []
for r in body:
    d = np.diff(np.concatenate([[0], r.astype(int), [0]])); s, e = np.where(d == 1)[0], np.where(d == -1)[0] - 1
    rows.append([[int(x0), int(x1)] for x0, x1 in zip(s, e) if x1 - x0 > 3])
json.dump({'y0': 0, 'rows': rows}, open(f'{tmp}_sil.json', 'w'))
pn = f'_hpl{os.getpid()}'; pj = f'{D}/poses/{pn}.json'; json.dump({**base, 'name': pn}, open(pj, 'w'))
try:
    cmd = ['node', 'tools/hand_keys.mjs', a.char, pn, '--side', a.side, '--keys', a.keys, '--sil', f'{tmp}_sil.json', '--bones', a.bones, '--hide', a.hide] + (['--fore', a.fore] if a.fore else []) + (['--elbow', a.elbow] if a.elbow else []) + (['--tips', a.tips] if a.tips else []) + [f'--seed={s}' for s in a.seed] + (['--restarts', str(a.restarts)] if a.restarts else []) + (['--natural'] if a.natural else []) + (['--slack', str(a.slack)] if a.slack is not None else []) + (['--hang', str(a.hang)] if a.hang is not None else []) + (['--hand-len', str(a.hand_len)] if a.hand_len is not None else []) + (['--palm-down', str(a.palm_down)] if a.palm_down is not None else [])
    r = subprocess.run(cmd, capture_output=True, text=True); print(r.stderr, end='')
    if r.returncode: raise SystemExit(r.stderr)
    res = json.loads(r.stdout.strip().splitlines()[-1])
finally:
    os.remove(pj); os.remove(f'{tmp}_sil.json')
for n, v in zip(res['names'], res['x']): base['bones'][n] = v
render(json.loads(json.dumps(base)), f'{tmp}.png'); srv.stdin.close(); srv.wait()
k = [int(v) for v in a.keys.split(',') + (a.elbow.split(',') if a.elbow else []) + (a.tips.split(',') if a.tips else [])]; x0, y0 = max(0, min(k[0::2]) - 90), max(0, min(k[1::2]) - 90); x1, y1 = max(k[0::2]) + 90, max(k[1::2]) + 90
st = Image.open(f'{D}/refs/images/{a.fit}_{a.sample}.png').convert('RGB').crop((x0, y0, x1, y1)); rd = Image.open(f'{tmp}.png').convert('RGB').crop((x0, y0, x1, y1)); os.remove(f'{tmp}.png')
o = Image.new('RGB', (st.width * 2 + 6, st.height), 'white'); o.paste(st, (0, 0)); o.paste(rd, (st.width + 6, 0)); o.resize((o.width * 2, o.height * 2)).save(f'out/hand_place_{a.fit}.png')
summary = f'{a.side} arm ({", ".join(f"{n} {v}" for n, v in zip(res["names"], res["x"]))}) on the still\'s hand points by tools/hand_place.py (rms {res["rms"]} px, ' + {'arm': 'arm inside her outline', 'upper': 'upper arm inside her outline, forearm through the still\'s', 'none': 'the arm visible' + (', elbow on the still\'s' if a.elbow else '')}[a.hide] + (', a natural arm' if a.natural else '') + ')'
print(f'fit-{a.fit}: {summary}; drawn at {res["at"]} → out/hand_place_{a.fit}.png')
# keys met within ~5 px or the SHAPE is wrong, not the arm: mum3q's top hand with a curl in its finger joints could not
# meet the still's four tips (6.6–8 px) whatever the arm did; draped at the knuckles it met them to 4.5 (lesson 54)
if res['rms'] > 5: print(f'  ! rms {res["rms"]} px: the hand shape ({a.hand or "the pose"}) does not fit the still; re-pick it beside the still (hand_shapes.py) before placing again (lesson 54)')
if a.dry: raise SystemExit(0)
base['note'] = '; '.join([q for q in base.get('note', '').split('; ') if q and not q.startswith(f'{a.side} arm (')] + [summary])   # one summary per side
json.dump(base, open(pf, 'w'), indent=1)
