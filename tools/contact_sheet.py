"""Contact sheet for an animation (also the input pack for the Prompt C motion critic).
usage: python3 tools/contact_sheet.py idle-seated
writes out/<anim>_contact.png:
  A. every 3rd frame, upper body (key frames ringed red, blink frames marked, breath phase per tile)
  B. breath made visible: outlines at the bottom of the exhale vs the top of the inhale, overlaid
  C. key poses as colour + solid silhouette (silhouette test)
  D. channel curves: breath wave order (belly -> chest -> shoulders -> head), overlap lags, drift, springs
"""
import json, sys, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

name = sys.argv[1] if len(sys.argv) > 1 else 'idle-seated'
FR = f'out/frames/{name}'
T = json.load(open(f'out/{name}_tracks.json'))
spec = json.load(open(f'characters/mum/anims/{name}.json'))
fps, N, loop = T['fps'], T['N'], T.get('loop')
tracks = T['tracks']
LAST = N - 1 if loop else N
keyF = sorted(set(round(k['t'] * fps) % (N if loop else 10 ** 9) for k in spec['keys']))
blinkF = [round(e['t'] * fps) for e in spec.get('events', []) if e['type'] == 'blink']
BR = spec['breath']
shape = BR.get('shape', {'inhale': .55, 'exhale': .35, 'pause': .10})
D = BR.get('delays', {})

def font(sz, bold=False):
    try:
        return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf", sz)
    except Exception:
        return ImageFont.load_default()
F14, F16, F18B, F26B = font(14), font(16), font(18, True), font(26, True)

def frame(i):
    return Image.open(f'{FR}/f{i:04d}.png').convert('RGB')

def phase_label(i):
    if not isinstance(BR.get('period'), (int, float)): return ''
    f = (BR.get('phase0', 0) + (i / fps) / BR['period']) % 1
    return 'in' if f < shape['inhale'] else 'out' if f < shape['inhale'] + shape['exhale'] else 'pause'

CROP = (215, 150, 945, 1010)          # head to mid-thigh, output px

# ---------------------------------------------------------------- A. grid
def grid(step=3, cols=9, tw=196):
    fr = list(range(0, LAST + 1, step))
    th = round(tw * (CROP[3] - CROP[1]) / (CROP[2] - CROP[0]))
    rows = (len(fr) + cols - 1) // cols
    g = Image.new('RGB', (cols * tw, rows * (th + 24)), 'white')
    d = ImageDraw.Draw(g)
    for n, i in enumerate(fr):
        im = frame(i).crop(CROP).resize((tw, th), Image.LANCZOS)
        x, y = (n % cols) * tw, (n // cols) * (th + 24)
        g.paste(im, (x, y + 24))
        isk = any(abs(k - i) <= 1 for k in keyF)
        isb = any(0 <= i - b <= 9 for b in blinkF)
        d.text((x + 4, y + 3), f'f{i} {i / fps:.1f}s', fill='#c0392b' if isk else '#222', font=F16)
        d.text((x + tw - 52, y + 4), phase_label(i), fill='#2471a3', font=F14)
        if isk: d.rectangle([x, y + 24, x + tw - 1, y + 24 + th - 1], outline='#c0392b', width=3)
        if isb: d.text((x + 6, y + th), 'blink', fill='#8e44ad', font=F14)
    return g

# ---------------------------------------------------------------- B. breath overlay
def edges(im):
    a = np.asarray(im).astype(int)
    e = (np.abs(np.diff(a, axis=0, prepend=a[:1])).sum(2) > 30) | (np.abs(np.diff(a, axis=1, prepend=a[:, :1])).sum(2) > 30)
    return e

def breath_overlay(scale=1.0):
    """Breath layer in isolation: keys frozen on the first pose, drift and blinks off; bottom of exhale vs top of inhale."""
    period = BR['period']
    t_lo = 0.0 - BR.get('phase0', 0) * period + (shape['inhale'] + shape['exhale'] + shape['pause'] * 0.5) * period
    t_hi = (shape['inhale'] - BR.get('phase0', 0)) * period + D.get('chest', 3) / fps
    mods = json.dumps({'keys': [dict(spec['keys'][0], t=0)], 'drift': {'amp': 0, 'bones': {}}, 'events': []})
    subprocess.run(['node', 'tools/frame_at.mjs', '--anim', name, '--t', f'{t_lo % spec["duration"]:.4f},{t_hi:.4f}',
                    '--out', f'out/tmp_poses/{name}_breath_%t.png', '--mods', mods], check=True, capture_output=True)
    box = (300, 300, 900, 900)
    A = Image.open(f'out/tmp_poses/{name}_breath_{t_lo % spec["duration"]:.3f}.png').convert('RGB').crop(box)
    B = Image.open(f'out/tmp_poses/{name}_breath_{t_hi:.3f}.png').convert('RGB').crop(box)
    ea, eb = edges(A), edges(B)
    base = (255 - (255 - np.asarray(A).astype(float)) * 0.18).astype(np.uint8)
    out = base.copy()
    out[ea & ~eb] = (40, 110, 220)      # exhale bottom only
    out[eb & ~ea] = (220, 60, 60)       # inhale top only
    out[ea & eb] = (60, 60, 60)
    im = Image.fromarray(out)
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.NEAREST)
    cap = Image.new('RGB', (im.width, im.height + 56), 'white')
    cap.paste(im, (0, 56))
    d = ImageDraw.Draw(cap)
    d.text((6, 4), 'breath layer alone: blue = end of exhale, red = top of inhale', fill='#222', font=F16)
    d.text((6, 26), 'grey = unchanged edge (keys frozen, drift off). Ribcage lifts and widens', fill='#555', font=F14)
    return cap

# ---------------------------------------------------------------- C. key poses + silhouettes
def key_poses(h=430):
    tiles = []
    for k in spec['keys']:
        p = k['pose']
        col, sil = f'out/tmp_poses/{p}_still.png', f'out/tmp_poses/{p}_sil.png'
        subprocess.run(['node', 'tools/still.mjs', '--pose', p, '--out', col], check=True, capture_output=True)
        subprocess.run(['node', 'tools/still.mjs', '--pose', p, '--sil', '--out', sil], check=True, capture_output=True)
        a, b = Image.open(col).convert('RGB'), Image.open(sil).convert('RGB')
        box = (180, 150, 980, 1780)
        a, b = a.crop(box), b.crop(box)
        w = round(h * a.width / a.height)
        t = Image.new('RGB', (2 * w, h + 28), 'white')
        t.paste(a.resize((w, h), Image.LANCZOS), (0, 28)); t.paste(b.resize((w, h), Image.LANCZOS), (w, 28))
        ImageDraw.Draw(t).text((4, 4), f"{p}  @ {k['t']}s", fill='#222', font=F16)
        tiles.append(t)
    W = sum(t.width for t in tiles) + 10 * (len(tiles) - 1)
    out = Image.new('RGB', (W, tiles[0].height), 'white')
    x = 0
    for t in tiles: out.paste(t, (x, 0)); x += t.width + 10
    return out

# ---------------------------------------------------------------- D. curves
def curves(width_px):
    t = np.array([r['t'] for r in tracks[:LAST + 1]])
    ch = lambda k: np.array([r['ch'].get(k, 0) for r in tracks[:LAST + 1]])
    fig, axs = plt.subplots(4, 1, figsize=(width_px / 100, 9.6), dpi=100, sharex=True)
    ax = axs[0]
    b = ch('breath'); ax.plot(t, b, lw=2, label='belly (breath wave)')
    for lbl, key in [('chest', 'chest'), ('shoulders', 'shoulders'), ('head', 'head')]:
        dd = D.get(key, 0)
        ax.plot(t, np.roll(b, dd), lw=1.2, label=f'{lbl} (+{dd}f)')
    ax.set_title(f"breath: inhale {shape['inhale']:.0%} / exhale {shape['exhale']:.0%} / pause {shape['pause']:.0%} of {BR.get('period')} s", fontsize=10, loc='left')
    ax.legend(fontsize=8, ncol=4, loc='upper right')
    ax = axs[1]
    for k in ['bone.spineLower', 'bone.spineUpper', 'bone.chest', 'bone.neck', 'bone.head']:
        y = ch(k); ax.plot(t, y - y.mean(), label=k.split('.', 1)[1])
    ax.set_title('spine chain, deg about mean (keys + breath + drift): each link trails the one below', fontsize=10, loc='left'); ax.legend(fontsize=8, ncol=5)
    ax = axs[2]
    for k in ['bone.upperArm.near', 'bone.forearm.near', 'bone.hand.near', 'bone.hand.far']:
        y = ch(k); ax.plot(t, y - y.mean(), label=k.split('.', 1)[1])
    ax.set_title('arms, deg about mean (caress key + contact pinning + drift)', fontsize=10, loc='left'); ax.legend(fontsize=8, ncol=4)
    ax = axs[3]
    ax.plot(t, ch('hairNear'), label='hair near (deg)'); ax.plot(t, ch('hairFar'), label='hair far (deg)')
    ax.plot(t, ch('bellyY') * 1000, label='belly lattice (H x1000)')
    ax.set_title('secondary (closed-form springs)', fontsize=10, loc='left'); ax.legend(fontsize=8, ncol=3)
    ax.set_xlabel('t (s)')
    for a in axs:
        for k in spec['keys']: a.axvline(k['t'], color='#c0392b', lw=0.8, ls='--', alpha=0.6)
        for bf in blinkF: a.axvline(bf / fps, color='#8e44ad', lw=0.8, ls=':', alpha=0.7)
        a.grid(alpha=0.2)
    fig.tight_layout()
    p = f'out/{name}_curves.png'; fig.savefig(p); plt.close(fig)
    return Image.open(p).convert('RGB')

if __name__ == '__main__':
    os.makedirs('out/tmp_poses', exist_ok=True)
    G = grid()
    W = G.width
    head = Image.new('RGB', (W, 74), 'white')
    d = ImageDraw.Draw(head)
    d.text((10, 8), f"{name}  ·  {spec['duration']} s @ {fps} fps  ·  {N} frames{'  ·  seamless loop' if loop else ''}", fill='#111', font=F26B)
    d.text((10, 44), spec.get('story', ''), fill='#555', font=F16)
    B = breath_overlay(); K = key_poses(h=B.height - 28)
    room = W - B.width - 20
    if K.width > room: K = K.resize((room, round(K.height * room / K.width)), Image.LANCZOS)
    mid = Image.new('RGB', (W, max(B.height, K.height)), 'white')
    mid.paste(B, (0, 0)); mid.paste(K, (B.width + 20, 0))
    C = curves(W)
    out = Image.new('RGB', (W, head.height + G.height + mid.height + C.height + 40), 'white')
    y = 0
    for part in (head, G, mid, C):
        out.paste(part, (0, y)); y += part.height + 13
    out.save(f'out/{name}_contact.png')
    print('wrote', f'out/{name}_contact.png', out.size)
