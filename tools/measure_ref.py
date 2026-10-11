#!/usr/bin/env python3
"""Measure a character image (the reference, or a render) from its pixels.

Usage:
  python3 tools/measure_ref.py                       # reference -> ref/measurements.json + ref/annotated.png
  python3 tools/measure_ref.py IMG OUT.json [ANNOT]  # any image, measured with the reference palette

The same landmark rules run on the reference and on renders, so landmark error compares like with like.
All landmark rules are colour/silhouette based; see LANDMARK_RULES below.
"""
import json, sys, os
import numpy as np
from scipy import ndimage as ndi
from skimage import color
from sklearn.cluster import KMeans
from segment import load, figure_mask, classify, token_mask, group_mask, SEEDS, hex2rgb, rgb2hex

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, 'characters/mum/ref/reference.png')

LANDMARK_RULES = {
    'crown': 'topmost figure pixel (top of bun)',
    'skullTop': 'topmost hair pixel in the column midway between the eyes',
    'chin': 'first row below the mouth where the face front edge reaches the neck front edge',
    'eyeNear/eyeFar': 'centroids of the two largest eye-dark blobs (near = screen-left)',
    'mouth': 'centroid of the mouth blob',
    'nose': 'centroid of the skin-shade blob between eyes and mouth',
    'cheekNear/cheekFar': 'centroids of the blush blobs',
    'ear': 'centroid of the small skin blob left of the face',
    'neckBack/neckFront': 'skin edges 0.15H below the chin',
    'neckline': 'lowest pixel of the face/neck/chest skin region',
    'shoulderNear/Far': 'topmost cardigan pixel left/right of the neck',
    'armNearOuter/armFarOuter': 'extreme left/right figure pixel between shoulder and seat',
    'bustApex': 'rightmost torso-garment pixel between neckline and under-bust',
    'underBust': 'lowest pixel of the far under-bust shade arc',
    'bellyApex': 'rightmost torso-garment pixel below the under-bust',
    'bellyBottom': 'lowest pixel of the torso-garment region (top/belly)',
    'handNear/handFar': 'centroids of the hand skin regions (near = lower hand)',
    'kneeFar': 'rightmost leg-garment pixel above the shins',
    'shinGap': 'apex of the background gap between the shins (front-bottom of near knee)',
    'seat': 'midpoint of the bottom 3 rows of leg garment left of the near shin (seat line)',
    'cardiganHem': 'lowest cardigan pixel',
    'cuffNear/cuffFar': 'lowest garment pixel at each shin centre',
    'sockTopNear/Far': 'topmost sock pixel at each sock centre',
    'toeNear/toeFar': 'rightmost sock pixel of each sock',
    'heelNear/heelFar': 'leftmost sock pixel in the bottom 35% of each sock',
    'ground': 'midpoint of the lowest figure row',
}


def derive_palette(rgb, mask, k=16):
    lab = color.rgb2lab(rgb)
    px = lab[mask]
    rng = np.random.default_rng(0)
    idx = rng.choice(len(px), min(60000, len(px)), replace=False)
    km = KMeans(k, n_init=4, random_state=0).fit(px[idx])
    counts = np.bincount(km.predict(px), minlength=k)
    centers = km.cluster_centers_
    seeds = {n: color.rgb2lab(hex2rgb(h)[None, None, :])[0, 0] for n, h in SEEDS.items()}
    pal = {}
    for name, s in seeds.items():
        d = np.linalg.norm(centers - s, axis=1)
        j = int(d.argmin())
        pal[name] = rgb2hex(np.clip(color.lab2rgb(centers[j][None, None, :])[0, 0], 0, 1))
    # small features (cheek, mouth, eyes) are too small for k-means: take the median of pixels nearest the seed
    seed_arr = np.array(list(seeds.values())); seed_names = list(seeds.keys())
    dall = np.linalg.norm(px[:, None, :] - seed_arr[None], axis=2)
    nearest = dall.argmin(1)
    for name in ('cheek', 'mouth', 'line'):
        j = seed_names.index(name)
        near = px[(nearest == j) & (dall[:, j] < 15)]
        if len(near) > 30:
            pal[name] = rgb2hex(np.clip(color.lab2rgb(np.median(near, 0)[None, None, :])[0, 0], 0, 1))
    # skinLine: core colour of thin skin line-work (finger creases, nose): darkest tenth of skin-shade pixels (stroke cores, not anti-aliased rims)
    j = seed_names.index('skinShade')
    sh = px[(nearest == j) & (dall[:, j] < 15)]
    core = sh[sh[:, 0] <= np.percentile(sh[:, 0], 10)]
    pal['skinLine'] = rgb2hex(np.clip(color.lab2rgb(np.median(core, 0)[None, None, :])[0, 0], 0, 1))
    return pal, {rgb2hex(np.clip(color.lab2rgb(c[None, None, :])[0, 0], 0, 1)): int(n) for c, n in zip(centers, counts)}


def comps(m, min_area=30):
    lab, n = ndi.label(m)
    out = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < min_area:
            continue
        out.append(dict(area=len(ys), x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()),
                        cx=float(xs.mean()), cy=float(ys.mean()), mask=(lab == i)))
    out.sort(key=lambda c: -c['area'])
    return out


def pt(x, y):
    return [round(float(x), 1), round(float(y), 1)]


def measure(path, palette=None):
    rgb = load(path)
    fig = figure_mask(rgb)
    pal_counts = None
    if palette is None:
        palette, pal_counts = derive_palette(rgb, fig)
    L, names = classify(rgb, fig, palette)
    G = lambda g: group_mask(L, names, g)
    T = lambda *t: token_mask(L, names, *t)
    skin, hair, gar, card, sock = G('skin'), G('hair'), G('garment'), G('cardigan'), G('sock')
    eyeM, mouthM = T('line'), T('mouth')
    # drop anti-aliasing specks (e.g. lilac->skin edges at the cuffs that sit near pink in Lab)
    card = np.any([c['mask'] for c in comps(card, 400)], axis=0)
    sock = np.any([c['mask'] for c in comps(sock, 400)], axis=0)

    ys, xs = np.nonzero(fig)
    lm = {}
    top = ys.min(); bot = ys.max()
    lm['crown'] = pt(xs[ys == top].mean(), top)
    lm['ground'] = pt(xs[ys >= bot - 2].mean(), bot)
    height = bot - top

    # --- face features
    head_zone = np.zeros_like(fig); head_zone[: int(top + 0.3 * height)] = True
    eyes = [c for c in comps(eyeM & head_zone, 20)][:2]
    eyes.sort(key=lambda c: c['cx'])
    lm['eyeNear'] = pt(eyes[0]['cx'], eyes[0]['cy']); lm['eyeFar'] = pt(eyes[1]['cx'], eyes[1]['cy'])
    eye_sizes = {'near': [eyes[0]['x1'] - eyes[0]['x0'] + 1, eyes[0]['y1'] - eyes[0]['y0'] + 1],
                 'far': [eyes[1]['x1'] - eyes[1]['x0'] + 1, eyes[1]['y1'] - eyes[1]['y0'] + 1]}
    mo = comps(mouthM & head_zone, 15)[0]
    lm['mouth'] = pt(mo['cx'], mo['cy'])
    mouth_w = mo['x1'] - mo['x0'] + 1
    eye_y = (lm['eyeNear'][1] + lm['eyeFar'][1]) / 2
    nz = np.zeros_like(fig); nz[int(eye_y):int(mo['y0'])] = True
    nzx = np.zeros_like(fig); nzx[:, int(lm['eyeNear'][0]):int(lm['eyeFar'][0]) + 15] = True
    nose = comps(T('skinShade', 'skinLine') & nz & nzx, 15)
    if nose:
        lm['nose'] = pt(nose[0]['cx'], nose[0]['cy'])
    ch = sorted(comps(T('cheek') & head_zone, 40)[:2], key=lambda c: c['cx'])
    if len(ch) == 2:
        lm['cheekNear'] = pt(ch[0]['cx'], ch[0]['cy']); lm['cheekFar'] = pt(ch[1]['cx'], ch[1]['cy'])
    mid_x = int(round((lm['eyeNear'][0] + lm['eyeFar'][0]) / 2))
    col = np.nonzero(hair[:, mid_x - 3: mid_x + 4].any(1))[0]
    lm['skullTop'] = pt(mid_x, col.min())

    # face/neck skin region = largest skin comp touching the eye rows
    sk_comps = comps(skin, 100)
    face = [c for c in sk_comps if c['y0'] < eye_y < c['y1']]
    face = max(face, key=lambda c: c['area'])
    fm = face['mask']
    ear = [c for c in sk_comps if c is not face and c['x1'] < lm['eyeNear'][0] and c['y0'] < eye_y + 40 and c['y1'] < mo['y1'] + 60]
    if ear:
        lm['ear'] = pt(ear[0]['cx'], ear[0]['cy'])
    # chin: face right edge trace below mouth; neck front = median right edge further down
    rows = range(int(mo['y1']), int(mo['y1'] + 0.5 * (face['y1'] - mo['y1'])))
    redge = {y: np.nonzero(fm[y])[0].max() for y in rows if fm[y].any()}
    ys_sorted = sorted(redge)
    neck_front = np.median([redge[y] for y in ys_sorted[len(ys_sorted) // 2:]])
    chin_y = next(y for y in ys_sorted if redge[y] <= neck_front + 4)
    chin_x = np.nonzero(fm[chin_y - 3])[0].max()
    lm['chin'] = pt(chin_x, chin_y)
    H = chin_y - lm['skullTop'][1]
    ny = int(chin_y + 0.15 * H)
    nrow = np.nonzero(fm[ny])[0]
    lm['neckBack'] = pt(nrow.min(), ny); lm['neckFront'] = pt(nrow.max(), ny)
    fy, fx = np.nonzero(fm)
    lm['neckline'] = pt(fx[fy == fy.max()].mean(), fy.max())

    # --- cardigan / shoulders / arms
    cy_, cx_ = np.nonzero(card)
    neck_x = (lm['neckBack'][0] + lm['neckFront'][0]) / 2
    left = cx_ < neck_x; right = ~left
    yl = cy_[left].min(); yr = cy_[right].min()
    lm['shoulderNear'] = pt(cx_[left][cy_[left] == yl].mean(), yl)
    lm['shoulderFar'] = pt(cx_[right][cy_[right] == yr].mean(), yr)
    lm['cardiganHem'] = pt(cx_[cy_ == cy_.max()].mean(), cy_.max())

    # --- torso garment (top + belly) = garment comp that touches the neckline row
    g_comps = comps(T('garment'), 200)  # base tone only: the shade arc under the belly separates top from legs
    torso = [c for c in g_comps if c['y0'] <= lm['neckline'][1] + 0.3 * H]
    torso = max(torso, key=lambda c: c['area'])
    tm = torso['mask']
    # under-bust shade arcs (garmentShade, within torso bbox, upper half)
    gs = comps(T('garmentShade'), 150)
    ub = [c for c in gs if torso['y0'] < c['cy'] < torso['y0'] + 0.6 * (torso['y1'] - torso['y0']) and c['cx'] > neck_x]
    ub_y = max(c['y1'] for c in ub) if ub else torso['y0'] + 0.4 * (torso['y1'] - torso['y0'])
    if ub:
        far = max(ub, key=lambda c: c['cx'])
        yy, xx = np.nonzero(far['mask']); lm['underBust'] = pt(xx[yy == yy.max()].mean(), yy.max())
    rows = np.arange(int(lm['neckline'][1]), int(ub_y))
    rx = np.array([np.nonzero(tm[y])[0].max() if tm[y].any() else -1 for y in rows])
    i = int(rx.argmax()); lm['bustApex'] = pt(rx[i], rows[i])
    rows = np.arange(int(ub_y), torso['y1'] + 1)
    rx = np.array([np.nonzero(tm[y])[0].max() if tm[y].any() else -1 for y in rows])
    i = int(rx.argmax()); lm['bellyApex'] = pt(rx[i], rows[i])
    belly_profile = [pt(rx[k], rows[k]) for k in np.linspace(0, len(rows) - 1, 14).astype(int)]
    ty, tx = np.nonzero(tm)
    lm['bellyBottom'] = pt(tx[ty == ty.max()].mean(), ty.max())

    # --- hands: skin comps (not face) whose centroid is inside the torso rows
    hands = [c for c in sk_comps if c is not face and c['area'] > 0.1 * face['area'] and torso['y0'] < c['cy'] < torso['y1'] + 40]
    hands.sort(key=lambda c: c['cy'])
    if len(hands) >= 2:
        lm['handFar'] = pt(hands[0]['cx'], hands[0]['cy']); lm['handNear'] = pt(hands[1]['cx'], hands[1]['cy'])

    # --- arms outer extremes (between shoulders and seat)
    band = (ys > lm['shoulderNear'][1] + 0.3 * H) & (ys < lm['bellyBottom'][1])
    i = np.argmin(np.where(band, xs, 10 ** 6)); lm['armNearOuter'] = pt(xs[i], ys[i])
    cy2, cx2 = np.nonzero(card)
    i = cx2.argmax(); lm['armFarOuter'] = pt(cx2[i], cy2[i])

    # --- socks
    s_comps = sorted(comps(sock, 400)[:2], key=lambda c: c['cx'])
    sockinfo = {}
    for nm, c in zip(('Near', 'Far'), s_comps):
        yy, xx = np.nonzero(c['mask'])
        cxm = int(round(np.median(xx[yy < c['y0'] + 0.3 * (c['y1'] - c['y0'])])))
        topc = yy[np.abs(xx - cxm) <= 2].min()
        lm['sockTop' + nm] = pt(cxm, topc)
        i = xx.argmax(); lm['toe' + nm] = pt(xx[i], yy[i])
        low = yy > c['y1'] - 0.35 * (c['y1'] - c['y0'])
        i = np.argmin(np.where(low, xx, 10 ** 6)); lm['heel' + nm] = pt(xx[i], yy[i])
        sockinfo[nm] = c

    # --- legs: shins = garment columns just above socks
    leg_rows = gar & ~tm
    for nm in ('Near', 'Far'):
        sx = lm['sockTop' + nm][0]
        colm = leg_rows[:, int(sx) - 2: int(sx) + 3].any(1)
        yy = np.nonzero(colm[: int(lm['sockTop' + nm][1]) + 5])[0]
        lm['cuff' + nm] = pt(sx, yy.max())
    shin_y = int(lm['cuffNear'][1] - 0.6 * H)
    runs = np.nonzero(leg_rows[shin_y])[0]
    splits = np.split(runs, np.nonzero(np.diff(runs) > 3)[0] + 1)
    shins = {}
    if len(splits) >= 2:
        shins = {'near': [int(splits[0].min()), int(splits[0].max())], 'far': [int(splits[-1].min()), int(splits[-1].max())]}
    # gap between shins: background between them, connected downward
    gx0, gx1 = shins['near'][1], shins['far'][0]
    gap = ~fig[:, gx0:gx1 + 1]
    gy = shin_y
    while gy > 0 and gap[gy].any():
        gy -= 1
    gy += 1
    gxs = np.nonzero(gap[gy])[0] + gx0
    lm['shinGap'] = pt(gxs.mean(), gy)
    # knee far: rightmost leg garment pixel above the shin row
    yy, xx = np.nonzero(leg_rows[: shin_y])
    i = xx.argmax(); lm['kneeFar'] = pt(xx[i], yy[i])
    # seat: lowest leg-garment pixel left of the near shin
    lmask = leg_rows[:, : shins['near'][0] - 4]
    yy, xx = np.nonzero(lmask)
    lm['seat'] = pt(xx[yy >= yy.max() - 2].mean(), yy.max())  # flat edge: midpoint of the bottom rows

    # --- profiles
    back_profile = []
    for y in np.linspace(lm['shoulderNear'][1] + 5, lm['cardiganHem'][1] - 5, 12).astype(int):
        r = np.nonzero(fig[y])[0]; back_profile.append(pt(r.min(), y))
    front_profile = []
    for y in np.linspace(lm['chin'][1], lm['seat'][1], 16).astype(int):
        r = np.nonzero(fig[y])[0]; front_profile.append(pt(r.max(), y))

    out = {
        'image': os.path.relpath(path, ROOT), 'size': list(rgb.shape[1::-1]),
        'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
        'height_px': int(height), 'head_H_px': float(H), 'height_in_heads': round(height / H, 3),
        'landmarks': lm,
        'landmarks_frac': {k: [round((v[0] - lm['ground'][0]) / height, 4), round((lm['ground'][1] - v[1]) / height, 4)] for k, v in lm.items()},
        'feature_sizes': {'eyes_px': eye_sizes, 'mouth_w_px': int(mouth_w),
                          'neck_w_px': float(lm['neckFront'][0] - lm['neckBack'][0]),
                          'shins_px': shins},
        'belly_profile': belly_profile, 'back_profile': back_profile, 'front_profile': front_profile,
        'palette': palette, 'landmark_rules': LANDMARK_RULES,
        'notes': ['Seated pose, three-quarter facing screen-right; near side = her right side = screen-left.',
                  'Navel and pubis are not visible (hands/top cover them); bellyBottom and seat replace them.',
                  'Spine is hidden by the cardigan; back_profile is the near sleeve/cardigan silhouette edge.'],
    }
    if pal_counts:
        out['kmeans_clusters'] = pal_counts
    return out, (rgb, fig, L, names)


def annotate(meas, rgb, path):
    from PIL import Image, ImageDraw
    im = Image.fromarray((rgb * 255).astype(np.uint8)).convert('RGB')
    im = Image.blend(im, Image.new('RGB', im.size, 'white'), 0.35)
    d = ImageDraw.Draw(im)
    for prof, col in ((meas['belly_profile'], (0, 140, 255)), (meas['back_profile'], (0, 170, 0)), (meas['front_profile'], (255, 140, 0))):
        for x, y in prof:
            d.ellipse([x - 3, y - 3, x + 3, y + 3], outline=col, width=2)
    for k, (x, y) in meas['landmarks'].items():
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(230, 0, 60))
        d.text((x + 7, y - 6), k, fill=(20, 20, 20))
    lm = meas['landmarks']
    d.line([(lm['skullTop'][0] - 40, lm['skullTop'][1]), (lm['skullTop'][0] + 40, lm['skullTop'][1])], fill=(0, 0, 0), width=2)
    d.line([(lm['chin'][0] - 40, lm['chin'][1]), (lm['chin'][0] + 40, lm['chin'][1])], fill=(0, 0, 0), width=2)
    d.text((10, 10), 'H=%.0fpx  height=%dpx  %.2f heads' % (meas['head_H_px'], meas['height_px'], meas['height_in_heads']), fill=(0, 0, 0))
    im.save(path)


if __name__ == '__main__':
    if len(sys.argv) == 1:
        meas, (rgb, *_ ) = measure(REF)
        json.dump(meas, open(os.path.join(ROOT, 'characters/mum/ref/measurements.json'), 'w'), indent=1)
        annotate(meas, rgb, os.path.join(ROOT, 'characters/mum/ref/annotated.png'))
        print(json.dumps({k: meas[k] for k in ('bbox', 'height_px', 'head_H_px', 'height_in_heads', 'palette')}, indent=1))
        for k, v in meas['landmarks'].items():
            print('%-14s %s' % (k, v))
    else:
        ref = json.load(open(os.path.join(ROOT, 'characters/mum/ref/measurements.json')))
        meas, (rgb, *_ ) = measure(sys.argv[1], palette=ref['palette'])
        json.dump(meas, open(sys.argv[2], 'w'), indent=1)
        if len(sys.argv) > 3:
            annotate(meas, rgb, sys.argv[3])
