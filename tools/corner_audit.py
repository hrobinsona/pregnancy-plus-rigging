#!/usr/bin/env python3
"""corner_audit.py <char> [pose] [--px 1800] [--turn 30] [--group skin]
OUTLINE-CORNER audit: the construction faults the pixel audit cannot see because they are neither thin nor small —
a TOOTH or KINK where two shapes of one material meet (palm × thenar pad, wrist bridge × palm, finger root × palm):
a sharp turn in an outline that should be one smooth curve.
For each material group (X + XShade + XLine), the group's silhouette contour is walked; at every point the turning angle
over ±0.008 H is measured. A point is reported when
  · the turn is sharp (concave > --turn 12°: where two shapes meet; convex > --turnConvex 35°: a knob) and the outline there is the group's own SILHOUETTE (only the group and the
    background nearby — corners where another material crosses it, like a cuff over a wrist, are junctions, not kinks), and
  · it is SHALLOW: within ±0.04 H the outline stays within 0.012 H of its chord. Deep V's (the notch between two fingertips,
    the thumb notch) are separations by design; a shallow sharp turn on a long edge is a kink, a tooth or a knob.
Writes out/<char>_<pose>_corners.txt and out/<char>_<pose>_corners.png (numbered crops).
Why: R14 — the critic saw wrist teeth on every hand pose while the pixel audit reported 0 findings."""
import json, subprocess, argparse, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('pose', nargs='?', default='stand')
ap.add_argument('--px', type=int, default=1800); ap.add_argument('--turn', type=float, default=12); ap.add_argument('--turnConvex', type=float, default=45); ap.add_argument('--group', default='skin'); ap.add_argument('--win', type=float, default=0.008)
a = ap.parse_args()
meta = json.loads(subprocess.run(['node', '-e', f"import('./characters/{a.char}/character.js').then(m=>console.log(JSON.stringify({{palette:m.default.palette}})))"], check=True, capture_output=True, text=True).stdout)
pal = {k: v for k, v in meta['palette'].items() if isinstance(v, str) and v.startswith('#')}
x0, y0, x1, y1 = map(float, subprocess.run(['node', 'tools/char_bounds.mjs', a.char, a.pose], check=True, capture_output=True, text=True).stdout.split(','))
px = int(a.px * (x1 - x0) / 2.6); src = f'out/{a.char}_{a.pose}_corners_src.png'
subprocess.run(['node', 'tools/char_still.mjs', '--char', a.char, '--pose', a.pose, '--box', f'{x0},{y0},{x1},{y1}', '--px', str(px), '--out', src], check=True, capture_output=True)
im = np.asarray(Image.open(src).convert('RGB')).astype(np.int32); Hh, Ww = im.shape[:2]; ppH = px / (x1 - x0)
names = ['bg'] + list(pal); cols = np.array([[255, 255, 255]] + [[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in pal.values()])
best = np.full(im.shape[:2], 1 << 30, np.int32); lab = np.zeros(im.shape[:2], np.int16)
for k, c in enumerate(cols):
    dk = ((im - c) ** 2).sum(-1, dtype=np.int32); u = dk < best; best[u] = dk[u]; lab[u] = k
groups = [g for g in a.group.split(',')]; core = best < 14 ** 2
k_ = max(3, int(a.win * ppH)); K = int(0.04 * ppH); R = int(0.012 * ppH)
findings = []
for g in groups:
    members = [i for i, n in enumerate(names) if n in (g, g + 'Shade', g + 'Line')]
    mask = np.isin(lab, members).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    cnts, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    for cn in cnts:
        P = cn[:, 0, :].astype(float); n = len(P)
        if n < 4 * K: continue
        prev = np.roll(P, k_, 0); nxt = np.roll(P, -k_, 0)
        v1 = P - prev; v2 = nxt - P
        ang = np.degrees(np.arctan2(v1[:, 0] * v2[:, 1] - v1[:, 1] * v2[:, 0], (v1 * v2).sum(1)))
        A = np.abs(ang); cand = np.where(A > a.turn)[0]
        used = np.zeros(n, bool)
        for i in cand[np.argsort(-A[cand])]:
            if used[max(0, i - 2 * k_):i + 2 * k_].any(): continue
            used[max(0, i - 2 * k_):i + 2 * k_] = True
            cx, cy = int(P[i, 0]), int(P[i, 1])
            win = (slice(max(0, cy - R), cy + R), slice(max(0, cx - R), cx + R))
            nb = set(np.unique(lab[win][core[win]]).tolist())               # core pixels only: antialiased edge blends quantise to random palette entries
            if not nb <= set(members) | {0}: continue                       # another material crosses here: a junction
            # shallow? the outline within ±K stays near its chord
            seg = P[[(i + j) % n for j in range(-K, K + 1)]]; c0, c1 = seg[0], seg[-1]; dv = c1 - c0; L = np.hypot(*dv) + 1e-9
            depth = np.abs(dv[0] * (seg[:, 1] - c0[1]) - dv[1] * (seg[:, 0] - c0[0])).max() / L / ppH
            mid = (prev[i] + nxt[i]) / 2; inside = mask[int(mid[1]) % Hh, int(mid[0]) % Ww] > 0
            if not inside and depth > 0.012: continue                           # a deep concave V (fingertip / thumb notch): a separation by design (convex corners are never excused by depth: a flat-cut end has two)
            if inside and A[i] < a.turnConvex: continue                         # gentle convex = a fingertip / rounded end
            findings.append((('knob/spike' if inside else 'kink/tooth'), g, cx, cy, A[i], depth))
lines = [f'corner audit {a.char}/{a.pose}: {len(findings)} findings (turn > {a.turn:.0f}° over ±{k_ / ppH:.3f} H, shallow < 0.012 H, groups {a.group})']
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18); srcim = Image.open(src).convert('RGB'); crops = []
for j, (kind, g, cx, cy, t, dpt) in enumerate(findings, 1):
    lines.append(f'{j:3d} {kind:11s} {g:8s} at ({x0 + cx / ppH:+.3f}, {y0 + cy / ppH:+.3f}) H  turn {t:4.0f}°  depth {dpt:.3f} H')
    r = int(0.06 * ppH); c = srcim.crop((cx - r, cy - r, cx + r, cy + r)).resize((220, 220), Image.LANCZOS); d = ImageDraw.Draw(c)
    d.ellipse([100, 100, 120, 120], outline='#e00000', width=2); d.text((4, 2), f'{j} {kind}', fill='#e00000', font=F); crops.append(c)
open(f'out/{a.char}_{a.pose}_corners.txt', 'w').write('\n'.join(lines) + '\n'); print('\n'.join(lines))
if crops:
    cn_ = 8; rows = (len(crops) + cn_ - 1) // cn_; sh = Image.new('RGB', (cn_ * 224, rows * 224), 'white')
    for j, c in enumerate(crops): sh.paste(c, ((j % cn_) * 224, (j // cn_) * 224))
    sh.save(f'out/{a.char}_{a.pose}_corners.png')
