#!/usr/bin/env python3
"""Metrics vs the reference: silhouette IoU, landmark error (% of figure height), palette ΔE2000 per token.
Writes out/metrics.txt and out/metrics.json. usage: python3 tools/metrics.py [render_ref_frame.png]"""
import sys, os, json, re
import numpy as np
from skimage import color
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segment import load, figure_mask, hex2rgb, classify, group_mask
from measure_ref import measure
from align import ROOT

def de2000(h1, h2):
    a = color.rgb2lab(hex2rgb(h1)[None, None, :]); b = color.rgb2lab(hex2rgb(h2)[None, None, :])
    return float(color.deltaE_ciede2000(a, b)[0, 0])

def palette_js():
    src = open(os.path.join(ROOT, 'characters/mum/palette.js')).read()
    return dict(re.findall(r"(\w+):\s*'(#[0-9a-fA-F]{6})'", src))

def main(render=os.path.join(ROOT, 'out/mum_rest_ref.png')):
    ref = json.load(open(os.path.join(ROOT, 'characters/mum/ref/measurements.json')))
    rgb_ref = load(os.path.join(ROOT, 'characters/mum/ref/reference.png')); rm = figure_mask(rgb_ref)
    rgb = load(render); am = figure_mask(rgb)
    iou = float((rm & am).sum() / (rm | am).sum())
    # interior holes: background pixels enclosed by the figure (figure_mask fills them, so IoU can't see them)
    from scipy import ndimage as ndi
    raw = np.max(1 - rgb, axis=2) > 0.07
    holes_lab, nh = ndi.label(ndi.binary_fill_holes(raw) & ~raw)
    # escaping strokes: shade-token pixels that touch the background (a stroke poking outside its host shape)
    Lr, nr = classify(rgb, raw, ref['palette'])
    shade = np.isin(Lr, [nr.index(t) for t in ('hairShade', 'garmentShade', 'cardiganShade', 'skinShade', 'skinLine', 'accentShade') if t in nr])
    bg_near = ndi.binary_dilation(~raw, iterations=1)
    esc_lab, ne = ndi.label(shade & bg_near)
    escapes = [(int((esc_lab == i).sum()), *[int(v) for v in np.argwhere(esc_lab == i).mean(0)[::-1]]) for i in range(1, ne + 1)]
    escapes = [e for e in escapes if e[0] >= 3]
    holes = []
    for i in range(1, nh + 1):
        yy, xx = np.nonzero(holes_lab == i)
        if len(yy) >= 4: holes.append((int(len(yy)), int(xx.mean()), int(yy.mean())))
    ys = np.nonzero(am)[0]; h_render = ys.max() - ys.min()
    lines = [f'silhouette IoU: {iou:.4f}   (target >= 0.92)',
             f'figure height: render {h_render}px vs reference {ref["height_px"]}px  (ratio {h_render / ref["height_px"]:.3f})',
             f'interior holes (background showing inside the figure, >=4 px): {len(holes)}' + ''.join(f'\n  {n} px at ({x},{y})' for n, x, y in sorted(holes, reverse=True)),
             f'escaping shade strokes (shade touching background, >=3 px): {len(escapes)}' + ''.join(f'\n  {n} px at ({x},{y})' for n, x, y in sorted(escapes, reverse=True)), '']
    # landmarks: same rules on both images
    try:
        meas, _ = measure(render, palette=ref['palette'])
        errs = {}
        for k, v in ref['landmarks'].items():
            if k in meas['landmarks']:
                r = meas['landmarks'][k]
                errs[k] = 100 * float(np.hypot(r[0] - v[0], r[1] - v[1])) / ref['height_px']
        lines.append('landmark error (% of height, target <= 2.0):')
        for k, e in sorted(errs.items(), key=lambda kv: -kv[1]):
            lines.append(f'  {k:14s} {e:5.2f}%  {"FAIL" if e > 2 else "ok"}   ref {ref["landmarks"][k]}  render {meas["landmarks"][k]}')
        missing = [k for k in ref['landmarks'] if k not in errs]
        if missing: lines.append('  not detected in render: ' + ', '.join(missing))
        lmax = max(errs.values()); lmean = float(np.mean(list(errs.values())))
    except Exception as e:
        lines.append(f'landmark measurement failed on render: {e!r}'); errs = {}; lmax = lmean = float('nan')
    # palette
    pj = palette_js(); lines += ['', 'palette ΔE2000 (token vs reference cluster, target <= 3):']
    des = {}
    for k, h in pj.items():
        if k in ref['palette']:
            des[k] = de2000(h, ref['palette'][k]); lines.append(f'  {k:14s} {h} vs {ref["palette"][k]}  ΔE {des[k]:.2f}')
    # material coverage (area ratio render/ref per material)
    L1, n1 = classify(rgb_ref, rm, ref['palette']); L2, n2 = classify(rgb, am, ref['palette'])
    lines += ['', 'material area ratio render/ref (diagnostic):']
    for g in ('skin', 'hair', 'garment', 'cardigan', 'sock'):
        a, b = group_mask(L1, n1, g).sum(), group_mask(L2, n2, g).sum()
        lines.append(f'  {g:10s} {b / a:.3f}')
    summary = {'iou': iou, 'landmark_max_pct': lmax, 'landmark_mean_pct': lmean, 'landmarks_failing': [k for k, e in errs.items() if e > 2],
               'deltaE_max': max(des.values()), 'holes': len(holes), 'escapes': len(escapes), 'height_ratio': h_render / ref['height_px']}
    lines = [f'SUMMARY  IoU {iou:.4f} | landmark max {lmax:.2f}% mean {lmean:.2f}% | failing {len(summary["landmarks_failing"])} | ΔE max {summary["deltaE_max"]:.2f} | holes {len(holes)} | escaping strokes {len(escapes)}', ''] + lines
    open(os.path.join(ROOT, 'out/metrics.txt'), 'w').write('\n'.join(lines) + '\n')
    json.dump(summary, open(os.path.join(ROOT, 'out/metrics.json'), 'w'), indent=1)
    print('\n'.join(lines))

if __name__ == '__main__':
    main(*sys.argv[1:])
