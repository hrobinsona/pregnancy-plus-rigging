#!/usr/bin/env python3
"""hand_fit.py <char> [--pose rest] [--px 600]
Measure the hands against the reference instead of eyeballing them. For each hand, the same H-unit box (centred on the
reference wrist→fingertip landmarks) is cropped from the reference and rendered from the rest pose; skin is segmented
with ONE colour classifier for both, then measured along the reference hand axis (wrist → fingertip):
  · width profile   skin width across the axis at 10 stations (H)          → palm/finger chunkiness, taper
  · runs            separate skin runs across the axis (fingers apart = >1)  → fingers grouped vs. rake
  · length          furthest skin along the axis (H)                       → finger length
  · IoU             mask overlap
Writes out/<char>_hand_fit.png (reference | render | overlay, per hand) and out/<char>_hand_fit.txt.
Why: hands were judged by eye for three rounds and stayed too thin and too long; the numbers show it at once."""
import json, subprocess, argparse, numpy as np
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('--pose', default='rest'); ap.add_argument('--px', type=int, default=600)
a = ap.parse_args(); c = a.char
meta = json.loads(subprocess.run(['node', '-e', f"import('./characters/{c}/character.js').then(m=>console.log(JSON.stringify({{ref:m.default.ref}})))"], check=True, capture_output=True, text=True).stdout)
L = json.load(open(f'characters/{c}/ref/landmarks.json'))['points']
Hpx, G = meta['ref']['Hpx'], meta['ref']['groundPx']; ref = Image.open(f'characters/{c}/ref/' + meta['ref']['image'].split('/')[-1]).convert('RGB')
toH = lambda p: ((p[0] - G[0]) / Hpx, (p[1] - G[1]) / Hpx)

def skin(im):
    a_ = np.asarray(im.convert('HSV')).astype(float); h, s, v = a_[..., 0] * 360 / 255, a_[..., 1] / 255, a_[..., 2] / 255
    return (h > 4) & (h < 34) & (s > 0.33) & (v > 0.35) & (v < 0.97)   # skin + skin lines; excludes pinks (h ≈ 345–3)

def profile(m, w, t, ppH, n=10):
    """skin width and run count across the axis at n stations; axis from w to t in px"""
    d = np.array(t, float) - np.array(w, float); Lx = np.hypot(*d); u = d / Lx; nn = np.array([-u[1], u[0]])
    rows = []
    for k in range(n + 3):
        s = (k + 0.5) / n
        c0 = np.array(w) + u * Lx * s
        xs = np.arange(-0.35 * ppH, 0.35 * ppH)
        pts = (c0[None] + xs[:, None] * nn[None]).round().astype(int)
        ok = (pts[:, 0] >= 0) & (pts[:, 0] < m.shape[1]) & (pts[:, 1] >= 0) & (pts[:, 1] < m.shape[0])
        line = np.zeros(len(xs), bool); line[ok] = m[pts[ok, 1], pts[ok, 0]]
        runs = int(((line[1:].astype(int) - line[:-1].astype(int)) == 1).sum() + line[0])
        rows.append((s, line.sum() / ppH, runs))
    # length: furthest skin pixel along the axis (beyond the wrist)
    yy, xx = np.nonzero(m); proj = ((xx - w[0]) * u[0] + (yy - w[1]) * u[1]) / ppH
    return rows, (proj.max() if len(proj) else 0)

F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
tiles, report = [], []
for side, (wk, tk) in {'near': ('wristNear', 'fingertipNear'), 'far': ('wristFar', 'fingertipFar')}.items():
    wH, tH = toH(L[wk]), toH(L[tk]); cx, cy = (wH[0] + tH[0]) / 2, (wH[1] + tH[1]) / 2; h = 0.42
    box = (cx - h, cy - h, cx + h, cy + h); ppH = a.px / (2 * h)
    rc = ref.crop(tuple(int(round(v)) for v in (box[0] * Hpx + G[0], box[1] * Hpx + G[1], box[2] * Hpx + G[0], box[3] * Hpx + G[1]))).resize((a.px, a.px), Image.LANCZOS)
    out = f'out/{c}_hand_fit_{side}.png'
    subprocess.run(['node', 'tools/char_still.mjs', '--char', c, '--pose', a.pose, '--box', ','.join(map(str, box)), '--px', str(a.px), '--out', out], check=True, capture_output=True)
    rr = Image.open(out).convert('RGB').resize((a.px, a.px))
    mr, mm = skin(rc), skin(rr)
    w = ((wH[0] - box[0]) * ppH, (wH[1] - box[1]) * ppH); t = ((tH[0] - box[0]) * ppH, (tH[1] - box[1]) * ppH)
    pr, lr = profile(mr, w, t, ppH); pm, lm = profile(mm, w, t, ppH)
    iou = (mr & mm).sum() / max(1, (mr | mm).sum())
    report.append(f'{side} hand: IoU {iou:.2f}   length along axis ref {lr:.3f} H  render {lm:.3f} H  ({lm / lr:.2f}×)')
    report.append('   station   width ref  render  ratio   runs ref render')
    for (s, wr, nr), (_, wm, nm) in zip(pr, pm):
        if wr == 0 and wm == 0: continue
        report.append(f'   {s:5.2f}     {wr:6.3f}  {wm:6.3f}  {wm / wr if wr else float("nan"):5.2f}   {nr:4d} {nm:6d}')
    ov = np.full((a.px, a.px, 3), 255, np.uint8); ov[mr & ~mm] = (220, 60, 60); ov[mm & ~mr] = (60, 100, 220); ov[mr & mm] = (150, 150, 150)
    ov = Image.fromarray(ov); d = ImageDraw.Draw(ov); d.line([w, t], fill='#00a000', width=2)
    for im, lab in ((rc, f'{side}: reference'), (rr, f'{side}: render ({a.pose})'), (ov, 'red ref / blue render')):
        ImageDraw.Draw(im).text((6, 4), lab, fill='#c00000', font=F); tiles.append(im)
sheet = Image.new('RGB', (3 * (a.px + 6), 2 * (a.px + 6)), 'white')
for i, im in enumerate(tiles): sheet.paste(im, ((i % 3) * (a.px + 6), (i // 3) * (a.px + 6)))
sheet.save(f'out/{c}_hand_fit.png'); open(f'out/{c}_hand_fit.txt', 'w').write('\n'.join(report) + '\n'); print('\n'.join(report))
