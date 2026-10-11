"""Motion review pack (inputs for the Prompt C critic). Run after render_anim.mjs and contact_sheet.py.
usage: python3 tools/review_pack.py <anim>
writes out/<anim>_strip_<move>.png  every frame of each key move, auto-zoomed on the region that moves
       out/<anim>_arcs.png          per move: joint paths, one dot per frame (arcs + spacing), key frames ringed
       out/<anim>_metrics.txt       measured motion facts (ranges, speeds, holds, seam, determinism, eases)
Moves come straight from the timeline keys (segment i = key i -> key i+1; a loop adds the closing segment).
"""
import json, sys, os, re
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# usage (engine characters): python3 tools/review_pack.py <char> <anim>   (v1 legacy: python3 tools/review_pack.py <anim>)
if len(sys.argv) > 2: CHAR, ANIM = sys.argv[1], sys.argv[2]; name = f'{CHAR}_{ANIM}'; specp = f'characters/{CHAR}/anims/{ANIM}.json'
else: ANIM = sys.argv[1] if len(sys.argv) > 1 else 'idle-seated'; name = ANIM; specp = f'characters/mum/anims/{ANIM}.json'
FR = f'out/frames/{name}'
T = json.load(open(f'out/{name}_tracks.json'))
spec = json.load(open(specp))
fps, N, loop, tracks = T['fps'], T['N'], T.get('loop'), T['tracks']
LAST = N - 1 if loop else N

def font(sz, bold=False):
    try: return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf", sz)
    except Exception: return ImageFont.load_default()
F15, F18B = font(15), font(18, True)
_cache = {}
def frame(i):
    i = i % N if loop else min(i, N)
    if i not in _cache: _cache[i] = Image.open(f'{FR}/f{i:04d}.png').convert('RGB')
    return _cache[i]

keys = spec['keys']
kf = [round(k['t'] * fps) for k in keys]
moves = []
for i in range(len(keys) - 1):
    moves.append((f"{i + 1:02d}-{keys[i + 1]['pose']}", kf[i], kf[i + 1], 'spline' if 'breakdown' in (keys[i].get('kind'), keys[i + 1].get('kind')) else keys[i + 1].get('ease', 'inOut')))
if loop:
    moves.append((f"{len(keys):02d}-{keys[0]['pose']}-close", kf[-1], N + kf[0], 'spline' if keys[-1].get('kind') == 'breakdown' else spec.get('wrapEase', 'inOut')))
keyset = set(k % N if loop else k for k in kf)

def region(names, a, b, pad=110, minw=300):
    pts = np.array([tr(i)[n] for i in range(a, b + 1) for n in names])
    x0, y0 = pts.min(0) - pad; x1, y1 = pts.max(0) + pad
    w = max(minw, x1 - x0, y1 - y0); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return (int(max(0, cx - w / 2)), int(max(0, cy - w / 2)), int(min(1080, cx + w / 2)), int(min(1920, cy + w / 2)))

REGIONS = {'face': (['head', 'headTip'], 60), 'hands': (['handNearTip', 'wristNear', 'handFarTip'], 70)}

def strip(mv, a, b, cols=12, tw=165):
    """every frame of the move, two detail crops per frame (face | hands) at ~0.6x so small motions stay visible"""
    boxes = {k: region(v[0], a, b, pad=v[1] + 60) for k, v in REGIONS.items()}
    fr = list(range(a, b + 1))
    rows = (len(fr) + cols - 1) // cols
    th = tw
    sheet = Image.new('RGB', (cols * tw, 34 + rows * (2 * th + 26)), 'white')
    d = ImageDraw.Draw(sheet)
    d.text((6, 6), f'{name} · move {mv} · f{a}–f{b} ({(b - a) / fps:.2f}s) · every frame · top: face {boxes["face"]} · bottom: hands {boxes["hands"]}', fill='#111', font=F18B)
    for n, i in enumerate(fr):
        x, y = (n % cols) * tw, 34 + (n // cols) * (2 * th + 26)
        for r, k in enumerate(['face', 'hands']):
            im = frame(i).crop(boxes[k]).resize((tw - 2, th - 2), Image.LANCZOS)
            sheet.paste(im, (x + 1, y + 22 + r * th + 1))
        isk = (i % N if loop else i) in keyset
        d.text((x + 4, y + 3), f'f{i % N if loop else i}', fill='#c0392b' if isk else '#333', font=F15)
        if isk: d.rectangle([x, y + 22, x + tw - 1, y + 22 + 2 * th - 1], outline='#c0392b', width=2)
    sheet.save(f'out/{name}_strip_{mv}.png')

JOINTS = {'headTip': '#1f77b4', 'neck': '#17becf', 'shoulderNear': '#8c564b', 'elbowNear': '#2ca02c', 'wristNear': '#ff7f0e',
          'handNearTip': '#d62728', 'handFarTip': '#9467bd', 'chest': '#7f7f7f'}
def tr(i): return tracks[i % N if loop else i]

def arcs():
    """magnified motion paths: each joint's path relative to its own mean, in output px (equal axes), one dot per frame,
    coloured by move; key frames ringed. Dot spacing = speed, so eases and arcs read even for 2-3 px motions."""
    J = list(JOINTS)
    cols = 3; rows = (len(J) + cols - 1) // cols
    fig, axs = plt.subplots(rows, cols, figsize=(5.2 * cols, 4.6 * rows), dpi=105, squeeze=False)
    cm = plt.get_cmap('tab10')
    for ax, jn in zip(axs.flat, J):
        P = np.array([tr(i)[jn] for i in range(0, LAST + 1)]); m = P.mean(0)
        for k, (mv, a, b, ease) in enumerate(moves):
            seg = np.array([tr(i)[jn] for i in range(a, b + 1)]) - m
            ax.plot(seg[:, 0], seg[:, 1], '-', lw=0.8, color=cm(k), alpha=0.6)
            ax.scatter(seg[:, 0], seg[:, 1], s=9, color=cm(k), label=f'{mv} ({ease})', zorder=3)
            ax.scatter([seg[0, 0]], [seg[0, 1]], s=60, facecolors='none', edgecolors='k', zorder=4)
        r = max(3, np.abs(P - m).max() * 1.15)
        ax.set_xlim(-r, r); ax.set_ylim(r, -r); ax.set_aspect('equal'); ax.grid(alpha=0.25)
        ax.set_title(f'{jn}: travel {np.ptp(P[:, 0]):.1f} x {np.ptp(P[:, 1]):.1f} px', fontsize=10)
    for ax in list(axs.flat)[len(J):]: ax.axis('off')
    h, l = axs.flat[0].get_legend_handles_labels()
    fig.legend(h, l, loc='lower center', ncol=len(moves), fontsize=9)
    fig.suptitle(f'{name}: motion paths magnified (output px about each joint mean; y down). One dot per frame; ringed = key frame.', fontsize=11)
    fig.tight_layout(rect=(0, 0.05, 1, 0.95)); fig.savefig(f'out/{name}_arcs.png'); plt.close(fig)

def metrics():
    L = []
    rng = range(0, LAST + 1)
    L.append(f'anim {name}: {spec["duration"]} s @ {fps} fps, {N} frames, loop={bool(loop)}, exposure={spec.get("exposure", "ones")}')
    allk = keys + [k for tr_ in spec.get('tracks', {}).values() for k in (tr_ if isinstance(tr_, list) else tr_['keys'])]
    L.append('eases used: ' + ', '.join(sorted(set([k.get("ease", "inOut") for k in allk if k.get('kind') != 'breakdown'] + ([spec.get("wrapEase", "inOut")] if loop else [])))) + ' (linear is rejected at load)')
    bd = [f"{k['pose']}@{k['t']}s" for k in keys if k.get('kind') == 'breakdown']
    if bd: L.append('breakdowns (curve passes through, cubic Hermite in angle space): ' + ', '.join(bd))
    for g, tr_ in spec.get('tracks', {}).items(): L.append(f'track {g}: ' + ', '.join(f"{k['pose']}@{k['t']}s/{k.get('ease','inOut')}" for k in (tr_ if isinstance(tr_, list) else tr_['keys'])))
    # report the EFFECTIVE offset of each channel at each shifted key (global lag + per-key shift): R3's critic read the raw
    # shifts as total offsets and saw children leading parents that in fact trail them
    lags = spec.get('lags', {})
    sh = [f"{k['pose']}@f{round(k['t'] * fps)} " + ', '.join(f"{b} {lags.get(b, 0) + v:+d}" for b, v in k['shift'].items()) for k in keys if k.get('shift')]
    if sh: L.append('channel timing offsets at shifted keys (frames after the key = global lag + per-key shift): ' + '; '.join(sh))
    if lags: L.append('global lags (frames, every key): ' + ', '.join(f'{b} {v:+d}' for b, v in lags.items() if v))
    for jn in JOINTS:
        a = np.array([tr(i)[jn] for i in rng])
        v = np.diff(np.vstack([a, a[:1]]) if loop else a, axis=0); sp = np.hypot(*v.T)
        L.append(f'{jn:13s} travel x {np.ptp(a[:, 0]):6.1f} y {np.ptp(a[:, 1]):6.1f} px | speed max {sp.max():5.2f} px/f, mean {sp.mean():4.2f} | frames < 0.05 px/f: {int((sp < 0.05).sum())}')
    prev, diffs = None, []
    for i in list(rng) + ([0] if loop else []):
        a = np.asarray(frame(i)).astype(np.int16)
        if prev is not None: diffs.append(int((np.abs(a - prev).sum(2) > 0).sum()))
        prev = a
    diffs = np.array(diffs)
    L.append(f'pixels changed frame->next: min {diffs.min()}, median {int(np.median(diffs))}, max {diffs.max()}; frames with no change: {int((diffs == 0).sum())}')
    sp = [d / max(1, (diffs[i - 1] + diffs[(i + 1) % len(diffs)]) / 2) for i, d in enumerate(diffs)]
    L.append(f'largest single-frame change vs its neighbours: x{max(sp):.2f} (pops show as > 2)')
    # per-move travel (R6: the critic had to guess per-breath shoulder/head travel from strips)
    L.append('per-move travel (px, screen; window = key frame → next key frame + 7f of lag): ' + ' | '.join(
        f"{mv}: " + ', '.join(f"{jn} {np.ptp(np.array([tr(i % N if loop else min(i, N - 1))[jn] for i in range(a, b + 8)])[:, 1]):.0f}v/{np.ptp(np.array([tr(i % N if loop else min(i, N - 1))[jn] for i in range(a, b + 8)])[:, 0]):.0f}h" for jn in ('shoulderNear', 'headTip', 'wristNear'))
        for mv, a, b, _ in moves))
    ch = lambda k: np.array([tr(i)['ch'].get(k, 0) for i in rng])
    b = ch('breath')
    if b.max() > 0:
        up = np.argmax(b); L.append(f'breath: peak at f{up} ({up / fps:.2f}s); chest stretch range {np.ptp(ch("chestAlong")) * 100:.2f}% along')
    hx = np.array([tr(i)['headTip'][0] for i in rng])
    L.append(f'headTip screen x: max at f{int(np.argmax(hx))}, min at f{int(np.argmin(hx))} (travel {np.ptp(hx):.1f} px)')
    for k, tip in [('hairNear', 'hairNearTip'), ('hairFar', 'hairFarTip')]:
        if tip not in tr(0): continue
        x = np.array([tr(i)[tip][0] for i in rng])
        L.append(f'{k}: spring range {np.ptp(ch(k)):.2f} deg; strand TIP screen x max at f{int(np.argmax(x))}, min at f{int(np.argmin(x))} (travel {np.ptp(x):.1f} px) -> follow-through vs headTip')
    h = open(f'out/{name}_hashes.txt').read() if os.path.exists(f'out/{name}_hashes.txt') else ''
    L.append(f'determinism: PNG hashes recorded for {len(h.splitlines())} frames; re-render check is printed by render_anim --verify')
    open(f'out/{name}_metrics.txt', 'w').write('\n'.join(L) + '\n')
    return L

if __name__ == '__main__':
    import glob
    for old in glob.glob(f"out/{name}_strip_*.png"): os.remove(old)      # stale strips from an earlier timeline would reach the critic
    for mv, a, b, _ in moves: strip(mv, a, b)
    arcs()
    print('\n'.join(metrics()))
    print('moves:', [m[0] for m in moves])
