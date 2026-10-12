#!/usr/bin/env python3
"""head_pose.py <char> <img> [<img> ...]          head pitch / yaw / roll (and face centre) of each image vs the master
   head_pose.py <char> --fit <name> [--sample k]  set the HEAD of poses/fit-<name>.json from the still's face
Measure the head's orientation on a still with MediaPipe's face landmarker (its facial transformation matrix, on a 3× crop
of the head), relative to the character's master, and use it to set a ¾ head: the nod (fx.headPitch, engine/warp.js), the
neck's and the head's rolls.
Why: on a ¾ face the body fitter cannot tell a NOD from a ROLL in the picture plane: both move the eye, ear and mouth
landmarks down. On mum3q's look-down still it chose a 15° roll with the chin tipped UP (pitch −9.7): the head tilted
sideways on its neck instead of bowing. Held nods refitted with the body did no better (the fitter rolled the trunk to
compensate). The face matrix separates them: a bow is mostly nod, its roll on screen is what a nod about a ¾ lateral axis
projects to.
--fit: keeps the body of fit-<name> (new_pose.py's fit, sample from fit_keys.sh unless --sample) and searches nod, neck and
head by Nelder–Mead on renders (two seeds), matching the still's head pitch and roll (degrees) and its face centre (px / 5).
Angles are MediaPipe's; only differences between images mean anything."""
import argparse, json, os, re, subprocess, sys
import numpy as np
from PIL import Image
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('char'); ap.add_argument('imgs', nargs='*'); ap.add_argument('--fit'); ap.add_argument('--sample', type=int)
ap.add_argument('--k', type=int, default=3)
a = ap.parse_args()
D = f'characters/{a.char}'
L = json.load(open(f'{D}/ref/landmarks.json'))
# the rig's scale and ground (C.ref), not landmarks.json's own Hpx: a second view keeps the first view's H (mum3q: 210 px,
# its own head measures 220) and a box at the wrong scale rendered every candidate shrunk and moved
REF = json.loads(subprocess.run(['node', '-e', f"import('./{D}/character.js').then(m=>console.log(JSON.stringify(m.default.ref)))"], check=True, capture_output=True, text=True).stdout)
G, Hpx = REF['groundPx'], REF['Hpx']
det = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=mpt.BaseOptions(model_asset_path='models/face_landmarker.task'), output_facial_transformation_matrixes=True, num_faces=1))

# the head box: from just above the master's skull top down past the chin, ±0.95 H across (the same box for every image:
# the stills share the master's framing)
st = L['points']['skullTop']; BOX = (int(st[0] - 0.95 * Hpx), int(st[1] - 0.15 * Hpx), int(st[0] + 0.95 * Hpx), int(st[1] + 1.65 * Hpx))

def face(path):   # (rotation, face centre px) or None
    im = Image.open(path).convert('RGB').crop(BOX); im = im.resize((im.width * a.k, im.height * a.k), Image.LANCZOS)
    r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(im)))
    if not r.face_landmarks: return None
    c = np.mean([(BOX[0] + p.x * im.width / a.k, BOX[1] + p.y * im.height / a.k) for p in r.face_landmarks[0]], axis=0)
    return np.array(r.facial_transformation_matrixes[0])[:3, :3], c

def euler(R):   # pitch (x), yaw (y), roll (z), degrees
    return np.degrees([np.arctan2(R[2, 1], R[2, 2]), np.arctan2(-R[2, 0], np.hypot(R[0, 0], R[1, 0])), np.arctan2(R[1, 0], R[0, 0])])

F0 = face(f'{D}/ref/master.png')
if F0 is None: sys.exit('no face on the master')
def rel(p):
    f = face(p)
    return None if f is None else (euler(f[0] @ F0[0].T), f[1])

if not a.fit:
    for p in a.imgs:
        r = rel(p)
        print(f'{os.path.basename(p)}: ' + ('no face' if r is None else f'pitch {r[0][0]:+.1f}  yaw {r[0][1]:+.1f}  roll {r[0][2]:+.1f}  face at {r[1][0]:.0f},{r[1][1]:.0f} px'))
    sys.exit(0)

n = a.fit
if a.sample is None:
    m = re.search(rf'pose/{re.escape(n)}_(\d+)\.json', open(f'{D}/refs/fit_keys.sh').read())
    a.sample = int(m.group(1)) if m else 0
img = f'{D}/refs/images/{n}_{a.sample}.png'
T = rel(img)
if T is None: sys.exit(f'no face on {img}')
print(f'{n}_{a.sample}: pitch {T[0][0]:+.1f}  roll {T[0][2]:+.1f}  face at {T[1][0]:.0f},{T[1][1]:.0f} px (vs master)')
pf = f'{D}/poses/fit-{n}.json'; base = json.load(open(pf))
box = ','.join(str(v) for v in [(0 - G[0]) / Hpx, (0 - G[1]) / Hpx, (L['sizePx'][0] - G[0]) / Hpx, (L['sizePx'][1] - G[1]) / Hpx])
os.makedirs(f'{D}/poses/_hp', exist_ok=True); os.makedirs('out', exist_ok=True)
seen = {}
def cost(x):   # x = (nod, neck, head)
    key = tuple(round(v, 2) for v in x)
    if key in seen: return seen[key]
    p = json.loads(json.dumps(base)); p['name'] = '_hp/t'; p['fx'] = {**(p.get('fx') or {}), 'headPitch': x[0]}
    p['bones']['neck'], p['bones']['head'] = x[1], x[2]
    json.dump(p, open(f'{D}/poses/_hp/t.json', 'w'))
    subprocess.run(['node', 'tools/char_still.mjs', '--char', a.char, '--pose', '_hp/t', '--box', box, '--px', str(L['sizePx'][0]), '--out', 'out/_hp.png'], check=True, capture_output=True)
    r = rel('out/_hp.png')
    c = 1e9 if r is None else float(np.hypot(r[0][0] - T[0][0], r[0][2] - T[0][2]) + np.linalg.norm(r[1] - T[1]) / 5)
    seen[key] = c; return c
def nelder_mead(x0, size=8.0, iters=60):   # a plain Nelder–Mead on (nod, neck, head): the valley is diagonal (more nod,
    # less head roll), which single-axis steps cannot walk down (they stopped at a 15° roll on mum3q's look-down)
    S = [list(x0)] + [[v + (size if j == i else 0) for j, v in enumerate(x0)] for i in range(3)]
    F = [cost(x) for x in S]
    for _ in range(iters):
        o = sorted(range(4), key=lambda i: F[i]); S, F = [S[i] for i in o], [F[i] for i in o]
        if F[-1] - F[0] < 0.2 and max(abs(S[-1][j] - S[0][j]) for j in range(3)) < 0.5: break
        c = [sum(S[i][j] for i in range(3)) / 3 for j in range(3)]
        r = [c[j] + (c[j] - S[-1][j]) for j in range(3)]; fr = cost(r)
        if fr < F[0]:
            e = [c[j] + 2 * (c[j] - S[-1][j]) for j in range(3)]; fe = cost(e)
            S[-1], F[-1] = (e, fe) if fe < fr else (r, fr)
        elif fr < F[-2]: S[-1], F[-1] = r, fr
        else:
            k = [c[j] + 0.5 * (S[-1][j] - c[j]) for j in range(3)]; fk = cost(k)
            if fk < F[-1]: S[-1], F[-1] = k, fk
            else:
                S = [S[0]] + [[S[0][j] + 0.5 * (S[i][j] - S[0][j]) for j in range(3)] for i in range(1, 4)]; F = [F[0]] + [cost(x) for x in S[1:]]
    i = min(range(4), key=lambda i: F[i]); return S[i], F[i]
fx0, nk0, hd0 = float(base.get('fx', {}).get('headPitch', 0)), float(base['bones'].get('neck', 0)), float(base['bones'].get('head', 0))
# seeds: the body fit's own head, and a bow (a nod 2.5× the still's pitch, the neck carrying the head forward, the head
# counter-rolled so the face does not roll on top of the nod)
seeds = [[fx0, nk0, hd0], [2.5 * float(T[0][0]), nk0 + 8, -(nk0 + 8) - 3]]
best, x = 1e9, None
for sd in seeds:
    y, c = nelder_mead(sd)
    print(f'  from nod {sd[0]:+.1f} neck {sd[1]:+.1f} head {sd[2]:+.1f}: nod {y[0]:+.1f} neck {y[1]:+.1f} head {y[2]:+.1f} → off by {c:.1f}')
    if c < best: best, x = c, [round(v, 1) for v in y]
for f in os.listdir(f'{D}/poses/_hp'): os.remove(f'{D}/poses/_hp/{f}')
os.rmdir(f'{D}/poses/_hp')
base['fx'] = {**(base.get('fx') or {}), 'headPitch': x[0]}; base['bones']['neck'], base['bones']['head'] = x[1], x[2]
base['note'] = (base.get('note', '') + f'; head (nod {x[0]:g}, neck {x[1]:g}, head {x[2]:g}) set from the still\'s face by tools/head_pose.py (off by {best:.1f})').lstrip('; ')
json.dump(base, open(pf, 'w'), indent=1)
print(f'fit-{n}: nod {x[0]:g}, neck {x[1]:g}, head {x[2]:g} (off by {best:.1f}: degrees + px/5) → {pf}')
