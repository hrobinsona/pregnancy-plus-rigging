#!/usr/bin/env python3
"""seg_ref.py <char> <refImage> <fitTargetsJson> <out.json> [--box x0,y0,x1,y1 (H)] [--res 0.02]
MEASUREMENT ONLY: segments a reference image into MATERIAL classes (bg, skin, hair, top, bottoms, cardigan, sock) and
resamples the class map into RIG units (the similarity the landmark fit found, xf in out/fit_<pose>_targets.json), so a
silhouette fit can compare our render with what the reference actually shows — the shape of a sleeve, where the top
shows between arm and body — instead of where a pose estimator guessed the joints.
Classes come from the character palette: each palette colour seeds a cluster; two Lloyd iterations in Lab adapt the
seeds to the reference's own colours (generated refs drift a little), then every pixel takes its cluster's class.
Writes {box, res, w, h, classes: [..row-major..], names} + a preview png next to out.json."""
import sys, json, argparse, subprocess
import numpy as np
from PIL import Image
CLASSES = ['bg', 'skin', 'hair', 'top', 'bottoms', 'cardigan', 'sock', 'ignore']
def palette_classes(pal):
    m = {'skin': 1, 'skinShade': 1, 'skinLine': 1, 'cheek': 1, 'nail': 1, 'mouth': 1, 'sick': 1, 'hair': 2, 'hairShade': 2, 'top': 3, 'topShade': 3,
         'bottoms': 4, 'bottomsShade': 4, 'cardigan': 5, 'cardiganShade': 5, 'sock': 6, 'sockShade': 6, 'eye': 7,
         'skinFar': 1, 'earIn': 1, 'dress': 3, 'dressShade': 3, 'shoe': 2, 'shoeShade': 2, 'brow': 2}   # mum3 (engine/raster.js CLASS_OF_PALETTE)
    return [(k, v, m.get(k, 7)) for k, v in pal.items()]
def hex2rgb(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
def lab(rgb):
    c = rgb / 255.0; c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]); xyz = c @ M.T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
def segment(img, pal):
    A = np.asarray(img.convert('RGB')).astype(float); L = lab(A)
    seeds = [q for q in palette_classes(pal) if q[0] != 'nail']   # (a nail is a few pixels of near-white: a pale counter took its class)
    S = lab(np.array([hex2rgb(v) for _, v, _ in seeds], float)); cls = np.array([c for _, _, c in seeds])
    fg = (A.min(-1) < 238) | (L[..., 1] ** 2 + L[..., 2] ** 2 > 60)
    X = L[fg]
    # a colour far from every material of the PALETTE (a chair, a ball, a kitchen counter in a side-on still) is not her:
    # 'ignore', not background (it may hide her, as a chair's leg hides her shin). Judged against the palette itself, not
    # the adapted seeds: adapting first, the skin seed drifted onto a beige counter and called it skin
    near = np.sqrt(((X[:, None, :] - S[None]) ** 2).sum(-1).min(1)) < 20
    for _ in range(2):   # adapt seeds to the reference's colours
        d = ((X[:, None, :] - S[None]) ** 2).sum(-1); a = d.argmin(1)
        for k in range(len(S)):
            m = (a == k) & near
            if m.sum() > 50: S[k] = 0.5 * S[k] + 0.5 * X[m].mean(0)
    d = ((X[:, None, :] - S[None]) ** 2).sum(-1); a = d.argmin(1)
    c = cls[a].astype(np.uint8); c[~near] = 7
    out = np.zeros(A.shape[:2], np.uint8); out[fg] = c
    return out
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('ref'); ap.add_argument('targets'); ap.add_argument('out')
    ap.add_argument('--box', default='-1.8,-6.6,1.8,0.1'); ap.add_argument('--res', type=float, default=0.02)
    a = ap.parse_args()
    pal = json.loads(subprocess.run(['node', '-e', f"import('./characters/{a.char}/params.js').then(m=>console.log(JSON.stringify(m.palette)))"], capture_output=True, text=True, check=True).stdout)
    im = Image.open(a.ref); seg = segment(im, pal); X = json.load(open(a.targets))['xf']
    x0, y0, x1, y1 = map(float, a.box.split(',')); w = int(round((x1 - x0) / a.res)); h = int(round((y1 - y0) / a.res))
    ys, xs = np.mgrid[0:h, 0:w]; Xr = x0 + (xs + 0.5) * a.res; Yr = y0 + (ys + 0.5) * a.res
    cpx = Xr * X['Hpx'] + X['ground'][0]; cpy = Yr * X['Hpx'] + X['ground'][1]
    nx = (cpx - X['cx']) / X['s'] + X['sx']; ny = (cpy - X['cy']) / X['s'] + X['sy']
    rx = (nx / X['kx'] if 'kx' in X else nx * X['W'] / X['sizePx'][0]).astype(int); ry = (ny / X['ky'] if 'ky' in X else ny * X['H'] / X['sizePx'][1]).astype(int)
    ok = (rx >= 0) & (rx < seg.shape[1]) & (ry >= 0) & (ry < seg.shape[0])
    C = np.zeros((h, w), np.uint8); C[ok] = seg[ry[ok], rx[ok]]
    json.dump({'box': [x0, y0, x1, y1], 'res': a.res, 'w': w, 'h': h, 'classes': C.flatten().tolist(), 'names': CLASSES}, open(a.out, 'w'))
    cols = np.array([[255, 255, 255], [212, 128, 85], [94, 52, 36], [185, 157, 215], [156, 127, 181], [254, 184, 195], [224, 192, 121], [40, 40, 40]], np.uint8)
    Image.fromarray(cols[C]).resize((w * 3, h * 3), Image.NEAREST).save(a.out.replace('.json', '.png'))
    print(a.out, w, h, {CLASSES[k]: int((C == k).sum()) for k in range(len(CLASSES))})
