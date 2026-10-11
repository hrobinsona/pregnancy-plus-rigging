"""Silhouette profile comparison (measuring, not tracing): for each row band, the left/right extent of the figure in the
reference vs the render, reported in H units. Used to tune PARAMETERS numerically; never to copy contour points.
usage: python3 tools/profile_cmp.py <ref image> <render png> <Hpx> [step_px]"""
import sys, numpy as np
from PIL import Image
ref, ren, Hpx = sys.argv[1], sys.argv[2], float(sys.argv[3]); step = int(sys.argv[4]) if len(sys.argv) > 4 else 40
a = np.asarray(Image.open(ref).convert('RGB')).astype(int); b = np.asarray(Image.open(ren).convert('RGB')).astype(int)
ma = np.abs(a - 255).sum(2) > 40; mb = np.abs(b - 255).sum(2) > 40
ys = np.nonzero(ma.any(1))[0]; y0, y1 = ys.min(), ys.max()
print(f'{"y":>5} {"ref L":>7} {"ren L":>7} {"dL":>6} | {"ref R":>7} {"ren R":>7} {"dR":>6}   (H units; d = render - ref; * if |d| > 0.03)')
for y in range(y0, y1 + 1, step):
    ra, rb = np.nonzero(ma[y])[0], np.nonzero(mb[y])[0]
    if len(ra) == 0 and len(rb) == 0: continue
    f = lambda v: f'{v / Hpx:7.3f}' if v is not None else '    -  '
    L1, R1 = (ra.min(), ra.max()) if len(ra) else (None, None)
    L2, R2 = (rb.min(), rb.max()) if len(rb) else (None, None)
    dL = (L2 - L1) / Hpx if L1 is not None and L2 is not None else None
    dR = (R2 - R1) / Hpx if R1 is not None and R2 is not None else None
    fl = lambda d: (f'{d:6.3f}' + ('*' if abs(d) > 0.03 else ' ')) if d is not None else '   -   '
    print(f'{y:5d} {f(L1)} {f(L2)} {fl(dL)} | {f(R1)} {f(R2)} {fl(dR)}')
