#!/usr/bin/env python3
"""face_measure.py <char> [--master characters/<char>/ref/master.png] [--k 3]
Recipe "New view" / "New character", step 3b: MEASURE a ¾ or front FACE, where the features sit INSIDE the face rather
than on its edge (master_measure.py reads a profile off the face's front edge, which a ¾ face doesn't have).
MediaPipe's face landmarker (models/face_landmarker.task, on a k× crop of the head) finds each feature; the drawing's own
flat colours then measure it: each eye and brow is the dark blob at its landmark, the mouth the coral blob, the ear the
skin bulge left of the face, the hairline the lowest hair pixel above each brow column, the face's edge the last skin
pixel per row. Writes the "face" block of ref/landmarks.json (px) and ref/face.png (every point drawn: LOOK at it).
Needs master_measure.py run first (palette, Hpx, skull top, chin)."""
import argparse, json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('char'); ap.add_argument('--master'); ap.add_argument('--k', type=int, default=3)
a = ap.parse_args()
D = os.path.join(ROOT, 'characters', a.char, 'ref')
LM = json.load(open(os.path.join(D, 'landmarks.json')))
img = Image.open(a.master or os.path.join(D, LM.get('image', 'master.png'))).convert('RGB')
rgb = np.asarray(img).astype(int); Hh, Ww = rgb.shape[:2]
H = LM['Hpx']; pts = LM['points']
hexrgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])
pal = {k: hexrgb(v['hex']) for k, v in LM['palette'].items()}
near = lambda c, tol: np.abs(rgb - c).sum(2) < tol
hairM = near(pal['hair'], 90)
skinM = near(pal['skin'], 40)
# the head box: skull top to below the chin, around the head centre
hc = pts['headCentre']; top = pts['skullTop'][1]; chin = pts['chin'][1]
x0, x1, y0, y1 = int(hc[0] - 0.85 * H), int(hc[0] + 0.85 * H), int(top - 0.05 * H), int(chin + 0.2 * H)
x0, y0, x1, y1 = max(0, x0), max(0, y0), min(Ww, x1), min(Hh, y1)

# ---- MediaPipe face landmarks on an upscaled crop ----------------------------------------------------------------
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
crop = img.crop((x0, y0, x1, y1)); crop = crop.resize((crop.width * a.k, crop.height * a.k), Image.LANCZOS)
det = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=os.path.join(ROOT, 'models', 'face_landmarker.task')),
    num_faces=1, min_face_detection_confidence=0.1, min_face_presence_confidence=0.1))
r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(crop)))
if not r.face_landmarks:
    sys.exit('no face found: crop the head by hand (--master) or check the palette')
F = np.array([(x0 + p.x * crop.width / a.k, y0 + p.y * crop.height / a.k) for p in r.face_landmarks[0]])
mean = lambda ids: F[ids].mean(0)
EYE = {'img-left': [33, 133, 159, 145, 153, 144, 163, 7], 'img-right': [263, 362, 386, 374, 380, 373, 390, 249]}
BROW = {'img-left': [70, 63, 105, 66, 107], 'img-right': [336, 296, 334, 293, 300]}

def blob_near(mask, seed, rad):
    lab, n = ndi.label(mask)
    best, bd = None, 1e9
    for k in range(1, n + 1):
        m = lab == k
        if m.sum() < 0.0015 * H * H: continue
        cy, cx = ndi.center_of_mass(m); d = np.hypot(cx - seed[0], cy - seed[1])
        if d < rad and d < bd: best, bd = m, d
    return best

def ellipse_of(m):   # centre, half-axes and tilt from the blob's second moments (a flat drawn oval is exactly this)
    yy, xx = np.nonzero(m); c = np.array([xx.mean(), yy.mean()]); cov = np.cov(np.vstack([xx - c[0], yy - c[1]]))
    ev, evec = np.linalg.eigh(cov); rx, ry = 2 * np.sqrt(ev[::-1])   # uniform ellipse: var = r²/4
    ang = np.degrees(np.arctan2(evec[1, 1], evec[0, 1]))
    if rx < ry: rx, ry, ang = ry, rx, ang + 90
    return {'c': c.round(1).tolist(), 'rx': round(float(rx), 1), 'ry': round(float(ry), 1), 'rot': round(float((ang + 90) % 180 - 90), 1)}

face = {'_note': 'tools/face_measure.py: px; the eyes, brows and mouth are the drawing\'s own blobs at MediaPipe\'s face landmarks'}
dark = hairM | (np.abs(rgb - rgb.min()).sum(2) < 0)
eyes, brows = [], []
for side in ('img-left', 'img-right'):
    s = mean(EYE[side]); m = blob_near(hairM & (np.abs(np.arange(Hh)[:, None] - s[1]) < 0.15 * H), s, 0.12 * H)
    if m is None: continue
    e = ellipse_of(m); yy, xx = np.nonzero(m); e['bbox'] = [int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())]
    hl = (rgb.sum(2) > 480) & ~skinM; hl[:e['bbox'][1], :] = 0; hl[e['bbox'][3] + 1:, :] = 0; hl[:, :e['bbox'][0]] = 0; hl[:, e['bbox'][2] + 1:] = 0
    hl &= ndi.binary_dilation(m, iterations=2) & ~m
    if hl.sum() > 2: hy, hx = np.nonzero(hl); e['highlight'] = [round(float(hx.mean()), 1), round(float(hy.mean()), 1)]
    e['side'] = side; eyes.append(e)
    # brow: column by column above the eye, the lowest THIN dark run (a brow can touch the hair cap at its outer end, so
    # it is not a blob of its own; a run as thick as the cap is the cap)
    b = mean(BROW[side]); line, thick = [], []
    for x in range(int(b[0] - 0.2 * H), int(b[0] + 0.2 * H)):
        col = hairM[int(e['bbox'][1] - 0.3 * H):e['bbox'][1] - 1, x]; ys_ = np.nonzero(col)[0]
        if not len(ys_): continue
        runs = np.split(ys_, np.nonzero(np.diff(ys_) > 1)[0] + 1); run = runs[-1]
        if len(run) < 0.06 * H and (len(runs) > 1 or run[0] > 0.04 * H):
            line.append([x, int(e['bbox'][1] - 0.3 * H) + float(run.mean())]); thick.append(len(run))
    if len(line) > 4:
        line = np.array(line); seg = np.split(np.arange(len(line)), np.nonzero((np.diff(line[:, 0]) > 2) | (np.abs(np.diff(line[:, 1])) > max(2, 0.012 * H)))[0] + 1)   # a gap, or a jump where the brow meets the cap's edge
        seg = max(seg, key=len); L_ = line[seg]; T_ = np.array(thick)[seg]; st = np.linspace(0, len(seg) - 1, 5).astype(int)
        brows.append({'side': side, 'p': [[int(L_[i, 0]), round(float(L_[i, 1]), 1)] for i in st], 'w': [int(T_[i]) for i in st]})
face['eyes'], face['brows'] = eyes, brows
# mouth: the coral blob between the mouth's corner landmarks
mouthC = mean([13, 14]); mouthM = (rgb[..., 0] > 200) & (rgb[..., 1] < 165) & (rgb[..., 1] > 90) & (rgb[..., 2] < 130)
mm = blob_near(mouthM & (np.abs(np.arange(Hh)[:, None] - mouthC[1]) < 0.12 * H), mouthC, 0.15 * H)
if mm is not None:
    yy, xx = np.nonzero(mm); cols = np.unique(xx); st = np.linspace(cols.min(), cols.max(), 5).astype(int)
    face['mouth'] = {'p': [[int(c), round(float(yy[xx == c].mean()), 1)] for c in st], 'w': [int((xx == c).sum()) for c in st]}
face['mouthCorners'] = [F[61].round(1).tolist(), F[291].round(1).tolist()]
face['noseTip'], face['noseBridge'], face['noseBase'] = F[1].round(1).tolist(), F[168].round(1).tolist(), F[2].round(1).tolist()
face['chinLM'], face['foreheadLM'] = F[152].round(1).tolist(), F[10].round(1).tolist()
face['cheekL'], face['cheekR'] = F[234].round(1).tolist(), F[454].round(1).tolist()
# face edge on the right: the last skin pixel per row, brow → chin (the cheek, the nose's bump if it breaks the edge, the jaw)
yb = int(min(e['bbox'][1] for e in eyes)) if eyes else int(F[10][1])
edge = []
for y in range(yb, int(chin) + 1, max(1, int(0.04 * H))):
    row = np.nonzero(skinM[y, int(hc[0]):x1])[0]
    if len(row): edge.append([int(hc[0]) + int(row.max()), y])
face['edgeRight'] = edge
# ear: the skin bulge left of the face's left landmark, between the brow and the mouth (in front of the hair)
earM = skinM.copy(); earM[:, int(F[234][0] - 0.02 * H):] = 0; earM[:int(F[105][1]), :] = 0; earM[int(mouthC[1]):, :] = 0
lab, n = ndi.label(earM)
if n:
    k = max(range(1, n + 1), key=lambda k: (lab == k).sum())
    if (lab == k).sum() > 0.01 * H * H: face['ear'] = ellipse_of(lab == k)
# hairline: scanning down each column across the forehead from the skull top, where the hair cap gives way to skin
hl_ = []
xa, xb = int(F[234][0]), int(F[454][0])
for x in np.linspace(xa, xb, 9).astype(int):
    col = hairM[int(top):int(yb), x]; ys_ = np.nonzero(~col)[0]
    first_hair = np.nonzero(col)[0]
    if not len(first_hair): continue
    gap = ys_[ys_ > first_hair[0]]
    if len(gap): hl_.append([int(x), int(top) + int(gap[0])])
face['hairline'] = hl_
LM['face'] = face
json.dump(LM, open(os.path.join(D, 'landmarks.json'), 'w'), indent=1)

# ---- overlay ----------------------------------------------------------------------------------------------------
s = 4; big = img.crop((x0, y0, x1, y1)).resize(((x1 - x0) * s, (y1 - y0) * s)); dr = ImageDraw.Draw(big)
P_ = lambda p: ((p[0] - x0) * s, (p[1] - y0) * s)
dot = lambda p, c, r=5: dr.ellipse((P_(p)[0] - r, P_(p)[1] - r, P_(p)[0] + r, P_(p)[1] + r), fill=c)
for e in eyes:
    c = e['c']; dot(c, '#00a0ff', 6); t = np.radians(e['rot'])
    ring = [(c[0] + e['rx'] * np.cos(u) * np.cos(t) - e['ry'] * np.sin(u) * np.sin(t), c[1] + e['rx'] * np.cos(u) * np.sin(t) + e['ry'] * np.sin(u) * np.cos(t)) for u in np.linspace(0, 2 * np.pi, 40)]
    dr.line([P_(q) for q in ring], fill='#00a0ff', width=2)
    if 'highlight' in e: dot(e['highlight'], '#ffff00', 4)
for b in brows: dr.line([P_(q) for q in b['p']], fill='#00ff60', width=3)
if 'mouth' in face: dr.line([P_(q) for q in face['mouth']['p']], fill='#ff00ff', width=3)
if 'ear' in face:
    c = face['ear']['c']; dot(c, '#ff8000', 6)
for k in ('noseTip', 'noseBridge', 'noseBase', 'chinLM', 'cheekL', 'cheekR'): dot(face[k], '#ff0000', 5)
dr.line([P_(q) for q in face['edgeRight']], fill='#0000ff', width=2)
if hl_: dr.line([P_(q) for q in hl_], fill='#a000a0', width=3)
op = os.path.join(D, 'face.png'); big.save(op)
print(f'{a.char}: {len(eyes)} eyes, {len(brows)} brows, mouth {"yes" if "mouth" in face else "no"}, ear {"yes" if "ear" in face else "no"}; look: {op}')
