#!/usr/bin/env python3
"""master_measure.py <char> <master image> [--materials ref/materials.json] [--out ref/landmarks.json]
Recipe "New character", step 1: MEASURE a master drawing so a code-drawn character can be built from numbers, not by
reading a grid by eye (mum2's 53 landmarks were read off a grid by hand; that does not scale to a cast).
  · palette: k-means on the figure's pixels (Lab), anti-alias blends dropped → flat colours with pixel shares
  · materials: each colour NAMED from where it sits on the body (skin at the cheek, hair behind the ear, garment on the
    torso, shoes at the feet, feature = the eye) — override any of them in ref/materials.json {"#rrggbb": "name"}
  · joints: MediaPipe pose (tools/pose_est.py), near side = the more visible one; facing from nose vs ear
  · landmarks: named points from the material masks (skull top, chin, nose tip, bump apex, hem, heel, toe, …) and
    WIDTH profiles across each limb at stations along its bone (measurement, not contours: the parts build smooth
    shapes through these numbers)
Writes ref/landmarks.json (px, with Hpx = skull top → chin and ground = lowest shoe pixel, like mum2's) and
ref/measure.png (the master with every measured point and station drawn on it: LOOK at it before building).
Replaces measure_ref.py for new characters (that one is wired to the legacy seated mum's palette)."""
import argparse, json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage import color
from sklearn.cluster import KMeans

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('char'); ap.add_argument('master'); ap.add_argument('--k', type=int, default=12)
ap.add_argument('--materials'); ap.add_argument('--out')
a = ap.parse_args()
D = os.path.join(ROOT, 'characters', a.char, 'ref')
rgb = np.asarray(Image.open(a.master).convert('RGB')).astype(np.uint8)
Hh, Ww = rgb.shape[:2]
hexc = lambda c: '#%02x%02x%02x' % tuple(int(v) for v in c)

# ---- figure mask and palette ------------------------------------------------------------------------------------
border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]).astype(float)
bg = np.median(border, axis=0)
fig = np.abs(rgb.astype(float) - bg).sum(2) > 45
fig = ndi.binary_opening(fig, iterations=1)
lab = color.rgb2lab(rgb / 255.0)
pix = lab[fig]
rng = np.random.default_rng(0)
smp = pix[rng.choice(len(pix), min(len(pix), 120000), replace=False)]
km = KMeans(n_clusters=a.k, n_init=4, random_state=0).fit(smp)
cent = km.cluster_centers_
lbl = np.full((Hh, Ww), -1, int)
d = np.linalg.norm(pix[:, None, :] - cent[None], axis=2)
lbl[fig] = d.argmin(1)
# a flat colour is a cluster whose pixels are mostly INTERIOR (not anti-alias rims between two other colours)
keep = []
for i in range(a.k):
    m = lbl == i
    n = m.sum()
    if n < 0.002 * fig.sum():
        continue
    inner = ndi.binary_erosion(m, iterations=2).sum()
    if inner / max(1, n) > 0.35:
        keep.append(i)
cent_k = cent[keep]
d2 = np.linalg.norm(pix[:, None, :] - cent_k[None], axis=2)
lab_i = np.full((Hh, Ww), -1, int)
lab_i[fig] = np.where(d2.min(1) < 14, d2.argmin(1), -1)   # -1: rim/blend pixels
cols = [hexc(np.clip(color.lab2rgb(c[None, None])[0, 0] * 255, 0, 255)) for c in cent_k]
share = [float((lab_i == j).sum() / fig.sum()) for j in range(len(keep))]

# ---- pose -------------------------------------------------------------------------------------------------------
import pose_est
pose_m, hands_m = pose_est.mk(False)
R = pose_est.analyse(rgb.copy(), pose_m, hands_m, None, True)
P = R['pose']
if not P:
    sys.exit('no pose found in the master')
facing = 'right' if P['nose'][0] > (P['earL'][0] + P['earR'][0]) / 2 else 'left'
if facing != 'right':
    sys.exit('the engine draws characters facing right: mirror the master first')
def pick(n):   # near side = the more visible of L/R
    l, r = P[n + 'L'], P[n + 'R']
    return (r, l) if r[2] >= l[2] else (l, r)
pt = lambda p: np.array(p[:2], float)

# ---- materials: name each colour from where it sits --------------------------------------------------------------
def most_at(x, y, r, exclude=()):
    x, y, r = int(x), int(y), int(r)
    win = lab_i[max(0, y - r):y + r, max(0, x - r):x + r]
    v = win[win >= 0]
    v = v[~np.isin(v, list(exclude))]
    return int(np.bincount(v).argmax()) if len(v) else -1
ear = (pt(P['earL']) + pt(P['earR'])) / 2
nose = pt(P['nose'])
eye = (pt(P['eyeL']) + pt(P['eyeR'])) / 2
dHead = np.linalg.norm(nose - ear)
names = {}
skin = most_at(*(ear * 0.45 + nose * 0.55 + [0, 0.25 * dHead]), dHead * 0.15)
names[skin] = 'skin'
hair = most_at(*(ear + [-0.15 * dHead, -0.55 * dHead]), dHead * 0.15, exclude=[skin])
names[hair] = 'hair'
shN, shF = pick('shoulder'); hpN, hpF = pick('hip')
torso = (pt(shN) + pt(hpN)) / 2 + [0.25 * dHead, 0]
garment = most_at(*torso, dHead * 0.3, exclude=[skin, hair])
names[garment] = 'garment'
heN, heF = pick('heel'); ftN, ftF = pick('foot')
shoe = most_at(*((pt(heN) + pt(ftN)) / 2), dHead * 0.15, exclude=[skin, garment])
if shoe >= 0 and shoe not in names: names[shoe] = 'shoe'
feat = most_at(*eye, dHead * 0.08, exclude=[skin])
if feat >= 0 and feat not in names: names[feat] = 'feature'
alias = {'shoe': shoe, 'feature': feat}   # a shoe or eye drawn in the hair colour is still a shoe / an eye (masked by region)
L0 = cent_k
for j in range(len(keep)):   # the rest: shades of a named colour (same hue, darker), else accents
    if j in names:
        continue
    near_ = min(names, key=lambda k: np.linalg.norm(L0[j] - L0[k]))
    dE = np.linalg.norm(L0[j] - L0[near_])
    names[j] = f'{names[near_]}Shade' if dE < 20 and L0[j][0] < L0[near_][0] else f'accent{j}'
if a.materials and os.path.exists(a.materials):
    over = json.load(open(a.materials))
    for j, c in enumerate(cols):
        if c in over: names[j] = over[c]
mat = {names[j]: j for j in sorted(names, key=lambda j: -share[j])}
for k, j in alias.items():
    if j >= 0: mat.setdefault(k, j)
M = lambda name: lab_i == mat[name] if name in mat else np.zeros_like(fig)
rowsI = np.arange(Hh)[:, None]
skinM = M('skin') | M('skinShade')
hairM = M('hair') | M('hairShade')
garM = M('garment') | M('garmentShade')
shoeM = ((M('shoe') | M('shoeShade')) if 'shoe' in mat else hairM) & (rowsI > (pt(pick('knee')[0])[1] + pt(pick('ankle')[0])[1]) / 2)

# ---- landmarks --------------------------------------------------------------------------------------------------
pts = {}
ys, xs = np.nonzero(fig)
pts['crown'] = [int(xs[ys.argmin()]), int(ys.min())]
head = (hairM | skinM)[:int(ear[1]), int(ear[0] - 0.3 * dHead):int(nose[0] + 0.2 * dHead)]
hy, hx = np.nonzero(head)
pts['skullTop'] = [int(ear[0] - 0.3 * dHead) + int(np.median(hx[hy == hy.min()])), int(hy.min())] if len(hy) else pts['crown']
# face front edge per row (rightmost skin pixel in the head band) → nose tip, chin, neck front
x0 = int(ear[0] - 0.6 * dHead)
def front(y, m=None):
    m = (skinM | (fig & ~hairM)) if m is None else m
    r = np.nonzero(m[y, x0:])[0]
    return x0 + int(r.max()) if len(r) else None
yE, yS = int(eye[1]), int(pt(shN)[1])
rows = list(range(yE - int(0.3 * dHead), yS))
fx = {y: front(y) for y in rows}
noseY = max((y for y in rows if fx[y] is not None and y < eye[1] + 0.9 * dHead), key=lambda y: fx[y])
pts['noseTip'] = [fx[noseY], noseY]
mouth = (pt(P['mouthL']) + pt(P['mouthR'])) / 2
pts['mouth'] = mouth.astype(int).tolist()
# chin: below the mouth, the row where the front edge steps back the most (face → neck)
cand = [y for y in rows if y > mouth[1] and fx.get(y) is not None and fx.get(y + 3) is not None]
chinY = max(cand, key=lambda y: fx[y] - fx[y + 3])
pts['chin'] = [fx[chinY], chinY]
pts['eye'] = eye.astype(int).tolist()
fm = M('feature') & (np.abs(rowsI - eye[1]) < 0.3 * dHead) & (np.abs(np.arange(Ww)[None, :] - eye[0]) < 0.4 * dHead)
if fm.any():   # the eye blob nearest the MediaPipe eye
    lab_f, nf = ndi.label(fm)
    best = min(range(1, nf + 1), key=lambda k: np.linalg.norm(np.array(ndi.center_of_mass(lab_f == k))[::-1] - eye))
    cy, cx = ndi.center_of_mass(lab_f == best); pts['eye'] = [int(cx), int(cy)]
    bb = ndi.find_objects((lab_f == best).astype(int))[0]; pts['eyeSize'] = [bb[1].stop - bb[1].start, bb[0].stop - bb[0].start]
pts['ear'] = ear.astype(int).tolist()
# FACE PROFILE (profile/near-profile masters): named points on the face's front edge, each an extreme of that edge in its
# own band — forehead (most forward above the eye), nose bridge (deepest between eye and nose tip), subnasal (deepest
# between nose tip and mouth), upper lip / chin front (most forward), chin crease (deepest between them); and where the
# HAIR ends on the front edge (the first row whose front-most head pixel is skin)
def fmax(y0, y1): ys_ = [y for y in range(int(y0), int(y1)) if fx.get(y) is not None]; return max(ys_, key=lambda y: fx[y]) if ys_ else None
def fmin(y0, y1): ys_ = [y for y in range(int(y0), int(y1)) if fx.get(y) is not None]; return min(ys_, key=lambda y: fx[y]) if ys_ else None
fh = {y: front(y, hairM | skinM) for y in range(pts['skullTop'][1], yE)}
hf = next((y for y in range(pts['skullTop'][1], yE) if fh[y] is not None and skinM[y, fh[y]] and not hairM[y, max(0, fh[y] - 2)]), None)
for y in range(yE - int(0.3 * dHead), yE): fx.setdefault(y, front(y))
if hf is not None:
    for y in range(hf, yE - int(0.3 * dHead)): fx[y] = front(y)
    pts['hairFront'] = [fx[hf], hf]
# (a ¾ master has no profile on its front edge: a band can come out empty, and that point is then left out)
def setp(k, y):
    if y is not None: pts[k] = [fx[y], y]
    return y
yF = setp('forehead', fmax(hf if hf is not None else yE - 0.3 * dHead, eye[1]))
yB = setp('noseBridge', fmin(eye[1] - 0.1 * dHead, noseY))
yS = setp('subnasal', fmin(noseY, mouth[1]))
yU = setp('lipUpper', fmax(yS if yS is not None else noseY, mouth[1] + 2))
yC = setp('chinFront', fmax(mouth[1] + 0.12 * dHead, chinY))
setp('chinCrease', fmin(mouth[1] + 2, yC if yC is not None else chinY))
# (a ¾ or front face: tools/face_measure.py measures its features)
# EAR: rows between brow and jaw where the skin's BACK edge bulges backward (the ear in front of the hair): its extremes
def back_(y, m=skinM):
    r = np.nonzero(m[y, int(ear[0] - 1.0 * dHead):int(nose[0])])[0]
    return int(ear[0] - 1.0 * dHead) + int(r.min()) if len(r) else None
bk = {y: back_(y) for y in range(int(eye[1] - 0.45 * dHead), int(chinY))}
bk = {y: v for y, v in bk.items() if v is not None and v < eye[0] - 0.2 * dHead}
if bk:
    med = np.median(list(bk.values())); er = [y for y, v in bk.items() if v < med - 0.04 * dHead]
    if er:
        lab_e, ne = ndi.label(np.isin(np.arange(Hh), er)); big_e = max(range(1, ne + 1), key=lambda k: (lab_e == k).sum())
        er = [y for y in er if lab_e[y] == big_e]; yb = min(er, key=lambda y: bk[y])
        pts['earBack'], pts['earTop'], pts['earBottom'] = [bk[yb], yb], [bk[min(er)], min(er)], [bk[max(er)], max(er)]
# hair: bun = the hair blob behind the skull (its centroid and equal-area radius); hair outline as a polar profile
# bun = the biggest circle that fits in the hair behind and below the ear (distance transform), i.e. the round knot,
# not the centroid of the whole back mass it joins
dt = ndi.distance_transform_edt(hairM); dt[:int(ear[1]), :] = 0; dt[:, int(ear[0] - 0.35 * dHead):] = 0
if dt.max() > 0.1 * dHead:
    by, bx = np.unravel_index(int(dt.argmax()), dt.shape); pts['bun'] = [int(bx), int(by)]; pts['bunR'] = float(dt.max())
headC = np.array([(ear[0] + eye[0]) / 2, (pts['skullTop'][1] + chinY) / 2])
pts['headCentre'] = headC.astype(int).tolist()
polar = {}
for ang in range(0, 360, 15):
    v = np.array([np.cos(np.radians(ang)), -np.sin(np.radians(ang))]); r_hair = r_skin = None
    for r in np.arange(0, 2.2 * dHead, 1.0):
        x, y = (headC + v * r).astype(int)
        if not (0 <= x < Ww and 0 <= y < Hh): break
        if hairM[y, x]: r_hair = float(r)
        if skinM[y, x] and r < 1.3 * dHead: r_skin = float(r)
    polar[ang] = {'hair': r_hair, 'skin': r_skin}
# neck: front/back edges of skin between chin and shoulder
def xspan(m, y, xmin=None, xmax=None):
    r = np.nonzero(m[y, (xmin or 0):(xmax or Ww)])[0]
    return [int(r.min()) + (xmin or 0), int(r.max()) + (xmin or 0)] if len(r) else None
neckY = int(chinY + 0.45 * (pt(shN)[1] - chinY))
nk = xspan(skinM, neckY, int(ear[0] - 1.2 * dHead), int(nose[0] + 0.2 * dHead))
pts['neckBack'], pts['neckFront'] = [nk[0], neckY], [nk[1], neckY]
# torso and bump: garment front/back per station from the neckline to the hem
lab_g, ng = ndi.label(garM); garM = lab_g == 1 + int(np.argmax(ndi.sum(garM, lab_g, range(1, ng + 1))))
gy = np.nonzero(garM.any(1))[0]
top, bot = int(gy.min()), int(gy.max())
span = lambda y: (lambda s: s[1] - s[0] if s else 0)(xspan(garM, y))
ref_w = span(int(bot - 0.15 * (bot - top)))
hem = next(y for y in range(bot, top, -1) if span(y) >= 0.85 * ref_w)   # lowest row the skirt still spans (a curved hem's middle)
stations = []
for f in np.linspace(0, 1, 21):
    y = int(top + f * (hem - top)); s = xspan(garM, y)
    if s:   # the back edge is HIDDEN where the near arm covers it (skin just behind it)
        hid = bool(skinM[y, max(0, s[0] - 3)]) or bool(skinM[y, max(0, s[0] - 6)])
        stations.append({'f': round(float(f), 3), 'y': y, 'back': s[0], 'front': s[1], **({'backHidden': True} if hid else {})})
pts['garmentTop'], pts['hem'] = top, hem
ap_ = max(stations, key=lambda s: s['front']); pts['bumpApex'] = [ap_['front'], ap_['y']]
above = [s for s in stations if s['y'] < ap_['y'] and s['f'] > 0.1]
if above:
    nb = min(above[len(above) // 3:], key=lambda s: s['front']); pts['underBust'] = [nb['front'], nb['y']]
yh = int(hem - 0.03 * (hem - top)); hs = xspan(garM, yh); pts['hemBack'], pts['hemFront'] = [hs[0], yh], [hs[1], yh]
# bump bottom = the concave corner where the bump's curve meets the skirt: the front-edge point farthest inside the
# chord apex → hem front
A_, B_ = np.array(pts['bumpApex'], float), np.array(pts['hemFront'], float); nrm_ = np.array([-(B_ - A_)[1], (B_ - A_)[0]]) / np.linalg.norm(B_ - A_)
fr = [(xspan(garM, y)[1], y) for y in range(int(A_[1]), hem) if xspan(garM, y)]
bbp = max(fr, key=lambda p: np.dot(np.array(p, float) - A_, nrm_)); pts['bumpBottom'] = [int(bbp[0]), int(bbp[1])]
# limbs: joints and width profiles across the bone
J = {}
for n in ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle', 'heel', 'foot']:
    a_, b_ = pick(n); J[n + 'Near'] = [int(a_[0]), int(a_[1]), round(a_[2], 2)]; J[n + 'Far'] = [int(b_[0]), int(b_[1]), round(b_[2], 2)]
def widths(p, q, m, n=7):
    p, q = np.array(p[:2], float), np.array(q[:2], float); u = (q - p) / np.linalg.norm(q - p); nrm = np.array([-u[1], u[0]]); out = []
    for f in np.linspace(0.1, 0.9, n):
        c = p + f * (q - p); lo = hi = 0
        for s in range(1, 400):
            x, y = (c + nrm * s).astype(int)
            if not (0 <= x < Ww and 0 <= y < Hh and m[y, x]): break
            hi = s
        for s in range(1, 400):
            x, y = (c - nrm * s).astype(int)
            if not (0 <= x < Ww and 0 <= y < Hh and m[y, x]): break
            lo = s
        out.append({'f': round(float(f), 2), 'l': lo, 'r': hi, 'w': lo + hi})
    return out
W_ = {}
W_['upperArmNear'] = widths(J['shoulderNear'], J['elbowNear'], skinM)
W_['forearmNear'] = widths(J['elbowNear'], J['wristNear'], skinM)
farLeg = M('skinShade') if 'skinShade' in mat else skinM
def legblob(m):   # the biggest blob of this colour below the hem = that leg
    m = m & (rowsI > hem); l_, n_ = ndi.label(m)
    return l_ == 1 + int(np.argmax(ndi.sum(m, l_, range(1, n_ + 1)))) if n_ else m
legN, legF = legblob(M('skin')), legblob(farLeg)
W_['shinNear'] = widths(J['kneeNear'], J['ankleNear'], legN)
W_['shinFar'] = widths(J['kneeFar'], J['ankleFar'], legF)
yT = int(hem + 0.15 * (chinY - pts['skullTop'][1]))
W_[f'thighNear@{yT}'] = xspan(legN, yT)
W_[f'thighFar@{yT}'] = xspan(legF, yT)
# hands (MediaPipe hand landmarks: wrist 0, middle tip 12) and shoes (each shoe blob: heel = back, toe = front)
if R['hands']:   # the near hand is the one at the near wrist; a ¾ master shows the far one too
    hs_ = sorted(R['hands'], key=lambda q: np.hypot(q['pts'][0][0] - J['wristNear'][0], q['pts'][0][1] - J['wristNear'][1]))
    h = hs_[0]['pts']; pts['handWrist'] = [int(h[0][0]), int(h[0][1])]; pts['handTip'] = [int(h[12][0]), int(h[12][1])]
    pts['handPts'] = [[int(x), int(y)] for x, y in h]
    if len(hs_) > 1:
        h = hs_[1]['pts']; pts['handFarWrist'] = [int(h[0][0]), int(h[0][1])]; pts['handFarTip'] = [int(h[12][0]), int(h[12][1])]
if shoeM.any():
    lab_s, ns = ndi.label(shoeM); comps = sorted(range(1, ns + 1), key=lambda k: -(lab_s == k).sum())[:2]
    shoes = []
    for k in comps:
        yy, xx = np.nonzero(lab_s == k); shoes.append({'heel': [int(xx.min()), int(yy[xx.argmin()])], 'toe': [int(xx.max()), int(yy[xx.argmax()])], 'top': int(yy.min()), 'sole': int(yy.max())})
    shoes.sort(key=lambda s: -s['sole'])   # near shoe is lower on the page (in front)
    pts['shoeNear'], pts['shoeFar'] = shoes[0], shoes[1] if len(shoes) > 1 else shoes[0]
    ground = [int((pts['shoeNear']['heel'][0] + pts['shoeNear']['toe'][0]) / 2), pts['shoeNear']['sole']]
else:
    ground = [int(xs.mean()), int(ys.max())]
Hpx = chinY - pts['skullTop'][1]

out = {'_note': 'Measured by tools/master_measure.py from the master drawing (named points, joint positions and width '
                'profiles; no contour is drawn from it). px; Hpx = skull top to chin; ground = lowest near-shoe pixel.',
       'image': os.path.basename(a.master), 'sizePx': [Ww, Hh], 'facing': facing, 'Hpx': int(Hpx), 'ground': ground,
       'palette': {names[j]: {'hex': cols[j], 'share': round(share[j], 4)} for j in range(len(keep))},
       'points': pts, 'joints': J, 'widths': W_, 'torso': stations, 'headPolar': polar}
op = a.out or os.path.join(D, 'landmarks.json')
json.dump(out, open(op, 'w'), indent=1)

# ---- overlay ----------------------------------------------------------------------------------------------------
im = Image.fromarray(rgb).convert('RGB'); dr = ImageDraw.Draw(im)
dot = lambda p, c='#0050ff', r=5: dr.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=c)
for k, v in pts.items():
    if k != 'eyeSize' and isinstance(v, list) and len(v) == 2 and all(isinstance(t, (int, float)) for t in v): dot(v); dr.text((v[0] + 6, v[1] - 6), k, fill='#0030a0')
    if isinstance(v, dict):   # shoes
        for kk in ('heel', 'toe'): dot(v[kk], '#0050ff'); dr.text((v[kk][0] + 6, v[kk][1] + 4), f'{k}.{kk}', fill='#0030a0')
for k, v in J.items(): dot(v, '#e00000', 4)
for s in stations: dot([s['front'], s['y']], '#00a000', 3); dot([s['back'], s['y']], '#00a000', 3)
for ang, r in polar.items():
    for key, c in (('hair', '#a000a0'), ('skin', '#ff8000')):
        if r[key]: v = headC + np.array([np.cos(np.radians(ang)), -np.sin(np.radians(ang))]) * r[key]; dot(v, c, 3)
y0 = 10
for j in range(len(keep)):
    dr.rectangle((10, y0, 40, y0 + 20), fill=cols[j], outline='black'); dr.text((46, y0 + 4), f'{names[j]} {cols[j]} {share[j]:.3f}', fill='black'); y0 += 26
mp_ = os.path.join(D, 'measure.png'); im.save(mp_)
print(f'{op}: Hpx {Hpx}, {len(pts)} points, palette ' + ', '.join(f'{names[j]}={cols[j]}' for j in range(len(keep))))
print(f'look: {mp_}')
