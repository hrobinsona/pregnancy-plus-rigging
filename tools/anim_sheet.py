"""Review pack for an animation (input to the Prompt C motion critic).
usage: python3 tools/anim_sheet.py nausea-to-belly
writes out/<anim>_contact.png        every 3rd frame, full figure, frame numbers, key frames outlined
       out/<anim>_strip_<move>.png   per move: upper-body crops, every frame
       out/<anim>_arcs.png           per move: onion trail of joint paths (dot per frame -> arcs + spacing)
       out/<anim>_curves.png         channel curves over time with key times (linear segments / dead holds / overlap)
"""
import json, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

name = sys.argv[1] if len(sys.argv) > 1 else 'nausea-to-belly'
FR = f'out/frames/{name}'
T = json.load(open(f'out/{name}_tracks.json'))
fps, N, keys, tracks = T['fps'], T['N'], T['keys'], T['tracks']
keyF = sorted(set(round(k['t'] * fps) for k in keys))
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
    FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
except Exception:
    FONT = FS = ImageFont.load_default()

def frame(i):
    p = f'{FR}/f{i:04d}.png'
    return Image.open(p).convert('RGB') if os.path.exists(p) else None

def contact(step=3, cols=12, crop=(170, 150, 990, 1770), tw=150):
    fr = [i for i in range(0, N + 1, step) if frame(i) is not None]
    th = round(tw * (crop[3] - crop[1]) / (crop[2] - crop[0]))
    rows = (len(fr) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * (th + 24)), 'white')
    d = ImageDraw.Draw(sheet)
    for n, i in enumerate(fr):
        im = frame(i).crop(crop).resize((tw, th), Image.LANCZOS)
        x, y = (n % cols) * tw, (n // cols) * (th + 24)
        sheet.paste(im, (x, y + 24))
        near = min(keyF, key=lambda k: abs(k - i))
        isk = abs(near - i) <= 1
        d.text((x + 4, y + 2), f'{i}  {i / fps:.1f}s', fill='#c0392b' if isk else '#333', font=FS)
        if isk: d.rectangle([x, y + 24, x + tw - 1, y + 24 + th - 1], outline='#c0392b', width=2)
    sheet.save(f'out/{name}_contact.png')

MOVES = {  # (first, last) frame of each beat, from the keys
    'wave': (8, 52), 'breath': (46, 104), 'relief': (100, 140), 'handdown': (136, 196), 'rub': (210, 266),
}
UPPER = (300, 150, 900, 900)

def strip(move, a, b, step=1, cols=15, tw=150):
    fr = [i for i in range(a, b + 1, step) if frame(i) is not None]
    if not fr: return
    th = round(tw * (UPPER[3] - UPPER[1]) / (UPPER[2] - UPPER[0]))
    rows = (len(fr) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * (th + 26)), 'white')
    d = ImageDraw.Draw(sheet)
    for n, i in enumerate(fr):
        im = frame(i).crop(UPPER).resize((tw, th), Image.LANCZOS)
        x, y = (n % cols) * tw, (n // cols) * (th + 26)
        sheet.paste(im, (x, y + 26))
        d.text((x + 4, y + 3), f'f{i}', fill='#c0392b' if i in keyF else '#333', font=FONT)
    sheet.save(f'out/{name}_strip_{move}.png')

COLS = {'headTip': '#1f77b4', 'handNearTip': '#d62728', 'wristNear': '#ff7f0e', 'elbowNear': '#2ca02c', 'handFarTip': '#9467bd', 'chest': '#8c564b'}

def arcs():
    panels = list(MOVES.items())
    W = len(panels)
    fig, axs = plt.subplots(1, W, figsize=(4.2 * W, 6.2), dpi=110)
    for ax, (mv, (a, b)) in zip(axs, panels):
        mid = frame((a + b) // 2 - ((a + b) // 2) % 1) or frame(a)
        base = None
        for i in (a, (a + b) // 2, b):
            f = frame(i)
            if f is None:
                j = min((k for k in range(N + 1) if frame(k) is not None), key=lambda k: abs(k - i))
                f = frame(j)
            im = np.asarray(f.crop(UPPER)).astype(float)
            base = im if base is None else np.minimum(base, im)
        ax.imshow((255 - (255 - base) * 0.35).astype(np.uint8), extent=(UPPER[0], UPPER[2], UPPER[3], UPPER[1]))
        for jn, c in COLS.items():
            xs = [tracks[i][jn][0] for i in range(a, b + 1)]
            ys = [tracks[i][jn][1] for i in range(a, b + 1)]
            ax.plot(xs, ys, '-', color=c, lw=0.8, alpha=0.6)
            ax.scatter(xs, ys, s=7, color=c, zorder=3)
            for i in range(a, b + 1):
                if i in keyF: ax.scatter([tracks[i][jn][0]], [tracks[i][jn][1]], s=40, facecolors='none', edgecolors='k', zorder=4)
        ax.set_xlim(UPPER[0], UPPER[2]); ax.set_ylim(UPPER[3], UPPER[1])
        ax.set_title(f'{mv}  f{a}-f{b}', fontsize=11); ax.set_xticks([]); ax.set_yticks([])
    handles = [plt.Line2D([], [], marker='o', ls='', color=c, label=k) for k, c in COLS.items()]
    fig.legend(handles=handles, loc='lower center', ncol=len(COLS), fontsize=9)
    fig.suptitle('joint paths, one dot per frame (dot spacing = speed; ringed = key frame)', fontsize=11)
    fig.tight_layout(rect=(0, 0.05, 1, 0.96))
    fig.savefig(f'out/{name}_arcs.png')

def curves():
    t = np.array([r['t'] for r in tracks])
    ch = lambda k: np.array([r['ch'].get(k, 0) for r in tracks])
    groups = [
        ('spine chain (deg): overlap = offset peaks', ['bone.spineUpper', 'bone.chest', 'bone.neck', 'bone.head']),
        ('near arm (deg)', ['bone.upperArm.near', 'bone.forearm.near', 'bone.hand.near']),
        ('breath wave + shoulder/head', ['breath', 'bone.clavicle.near', 'chestAlong']),
        ('secondary: hair springs (deg), belly lattice (H)', ['hairNear', 'hairFar', 'bellyY']),
    ]
    fig, axs = plt.subplots(len(groups), 1, figsize=(14, 3.0 * len(groups)), dpi=100, sharex=True)
    for ax, (title, ks) in zip(axs, groups):
        for k in ks:
            y = ch(k)
            if k == 'chestAlong': y = (y - 1) * 100
            if k == 'bellyY': y = y * 1000
            ax.plot(t, y, label=k + (' (%)' if k == 'chestAlong' else ' (x1000)' if k == 'bellyY' else ''), lw=1.4)
        for k in keys: ax.axvline(k['t'], color='#bbb', lw=0.8, ls='--')
        ax.set_title(title, fontsize=10, loc='left'); ax.legend(fontsize=8, loc='upper right'); ax.grid(alpha=0.2)
    axs[-1].set_xlabel('t (s)')
    for k in keys: axs[0].text(k['t'], axs[0].get_ylim()[1], k['pose'], rotation=90, fontsize=7, va='top', ha='right', color='#666')
    fig.tight_layout(); fig.savefig(f'out/{name}_curves.png')

if __name__ == '__main__':
    contact()
    for mv, (a, b) in MOVES.items(): strip(mv, a, b)
    arcs(); curves()
    print('ok')
