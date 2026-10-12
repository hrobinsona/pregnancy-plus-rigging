"""Pixel checks on a rendered frame folder (ported from reels tools/rig/checks.py `jumps` and engine/qa/motion.py).
    python3 tools/qa_frames.py out/frames/<char>_<anim> [--fps 30] [--box x0,y0,x1,y1] [--from s --to s]
  jumps   a frame changing > 1.8x its neighbours' mean (and > 0.8 levels) inside --box: a pop (a part swapped or jumping)
  still   a stretch > 1 s where nothing visibly moves, outside the last 1.5 s (the film should always be alive)
Exit 1 if either finds something. Called by tools/qa_checks.mjs."""
import argparse
import os
import sys

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('dir'); ap.add_argument('--fps', type=float, default=30); ap.add_argument('--box')
ap.add_argument('--from', dest='t0', type=float, default=0); ap.add_argument('--to', dest='t1', type=float)
a = ap.parse_args()
files = sorted(f for f in os.listdir(a.dir) if f.endswith('.png'))
i0, i1 = int(a.t0 * a.fps), len(files) - 1 if a.t1 is None else int(a.t1 * a.fps)
box = [int(v) for v in a.box.split(',')] if a.box else None
load = lambda i: np.asarray(Image.open(os.path.join(a.dir, files[i])).convert('RGB'), dtype=np.float32)
crop = lambda x: x[box[1]:box[3], box[0]:box[2]] if box else x
full, boxed, prev = [], [], load(i0)
for i in range(i0 + 1, i1 + 1):
    cur = load(i)
    boxed.append(np.abs(crop(cur) - crop(prev)).mean())
    full.append(np.abs(cur - prev).mean())                   # whole frame for the still check
    prev = cur
d = np.array(boxed)
# neighbours' mean over the neighbours there are (zero padding made the first frame of a move look like a jump)
local = np.convolve(d, np.ones(7), 'same') / np.convolve(np.ones_like(d), np.ones(7), 'same')
spikes = [round((i0 + 1 + k) / a.fps, 2) for k in np.where((d > 1.8 * local) & (d > 0.8))[0]]
print(f'  change per frame: max {d.max():.2f} at {(i0 + 1 + int(d.argmax())) / a.fps:.2f} s; jumps at {spikes or "none"}')
f = np.array(full); w = np.maximum(f[:-1], f[1:]) if len(f) > 1 else f
runs, s = [], None
for k, still in enumerate(list(w < 0.02) + [False]):
    if still and s is None: s = k
    if not still and s is not None:
        t0, t1 = (i0 + s) / a.fps, (i0 + k) / a.fps
        if t1 - t0 > 1.0 and t0 < len(files) / a.fps - 1.5: runs.append((round(t0, 2), round(t1, 2)))
        s = None
print(f'  still stretches > 1 s: {runs or "none"}')
sys.exit(1 if spikes or runs else 0)
