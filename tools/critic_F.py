#!/usr/bin/env python3
"""critic_F.py <char> <anim>   |   critic_F.py <char> --poses p1,p2,...
The FEEL critic pack: look-and-feel only, deliberately NO metrics (the maths critic C scored proxies — px/f, lag offsets,
path loops — for six rounds while the client saw a stiff, detached, dead-handed arm; numbers bias a reviewer away from
"does this look like a real body?").
Anim mode (run after tools/char_anim.mjs) writes:
  out/<c>_<a>_feel_film.png     every 2nd frame, the whole figure at phone size, time in seconds
  out/<c>_<a>_feel_beat_<n>.png per beat: onion skin (ghost outlines, early = blue → late = red, over the middle frame)
                                + the beat's frames side by side, zoomed on what moves
  out/<c>_<a>_feel_keys.png     the key moments, upper body, large
Pose mode writes out/<c>_feel_poses.png (each pose large, upper body + full figure).
Prints the filled prompt (tools/critic_prompt_F.md) with history from characters/<c>/feel_log_<a or poses>.md."""
import sys, os, glob, json, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
c = sys.argv[1]; root = os.getcwd()
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)

def fill(files, brief, logname):
    files = '\n'.join(f'- {os.path.join(root, p)} — {d}' for p, d in files)
    log = f'characters/{c}/{logname}'
    hist = ('\n\nHISTORY (earlier feel reviews — check whether their asks landed):\n' + open(log).read()) if os.path.exists(log) else ''
    print(open('tools/critic_prompt_F.md').read().replace('{FILES}', files).replace('{BRIEF}', brief) + hist)

def fig_mask(im):
    a = np.asarray(im.convert('L')); return a < 245

def skin_mask(im):
    a = np.asarray(im.convert('HSV')).astype(float); h, s_, v = a[..., 0] * 360 / 255, a[..., 1] / 255, a[..., 2] / 255
    return (h > 4) & (h < 34) & (s_ > 0.33) & (v > 0.35) & (v < 0.97)

def outline(mask):
    m = Image.fromarray((mask * 255).astype(np.uint8)); e = m.filter(ImageFilter.FIND_EDGES)
    return np.asarray(e.filter(ImageFilter.MaxFilter(3))) > 0

if sys.argv[2] == '--poses':
    poses = sys.argv[3].split(','); tiles = []
    for p in poses:
        out = f'out/{c}_feel_pose_{p}.png'
        subprocess.run(['node', 'tools/char_still.mjs', '--char', c, '--pose', p, '--px', '900', '--out', out], check=True, capture_output=True)
        im = Image.open(out).convert('RGB'); W, H = im.size
        up = im.crop((int(W * 0.12), int(H * 0.08), int(W * 0.88), int(H * 0.62))).resize((560, int(560 * (H * 0.54) / (W * 0.76))))
        full = im.resize((int(W * up.size[1] / H), up.size[1]))
        t = Image.new('RGB', (up.size[0] + full.size[0] + 10, up.size[1] + 30), 'white'); t.paste(full, (0, 30)); t.paste(up, (full.size[0] + 10, 30))
        ImageDraw.Draw(t).text((6, 4), p, fill='#c00', font=F(20)); tiles.append(t)
    w = max(t.size[0] for t in tiles); cols = 2; rows = (len(tiles) + 1) // 2; h = max(t.size[1] for t in tiles)
    sheet = Image.new('RGB', (cols * w, rows * h), 'white')
    for i, t in enumerate(tiles): sheet.paste(t, ((i % cols) * w, (i // cols) * h))
    sheet.save(f'out/{c}_feel_poses.png')
    fill([(f'out/{c}_feel_poses.png', 'key poses: whole figure (left) and upper body large (right)')],
         'Still key poses for the character (no motion). Judge them as drawings of a real body in these poses.', 'feel_log_poses.md')
    sys.exit()

a = sys.argv[2]; name = f'{c}_{a}'; spec = json.load(open(f'characters/{c}/anims/{a}.json')); fps = spec['fps']
frames = sorted(glob.glob(f'out/frames/{name}/f*.png')); N = len(frames)
fr = lambda i: Image.open(frames[i % N]).convert('RGB')
for old in glob.glob(f'out/{name}_feel_*.png'): os.remove(old)
# whole-figure crop box (union of the figure over the shot) so every tile is framed the same
acc = None
for i in range(0, N, 6):
    m = fig_mask(fr(i)); acc = m if acc is None else (acc | m)
ys, xs = np.nonzero(acc); bx = (max(0, xs.min() - 20), max(0, ys.min() - 20), min(1080, xs.max() + 20), min(1920, ys.max() + 20))
# 1. film strip
tw = 150; th = int(tw * (bx[3] - bx[1]) / (bx[2] - bx[0])); idx = list(range(0, N, 2)); cols = 14; rows = (len(idx) + cols - 1) // cols
film = Image.new('RGB', (cols * tw, rows * (th + 18)), 'white'); d = ImageDraw.Draw(film)
for k, i in enumerate(idx):
    x, y = (k % cols) * tw, (k // cols) * (th + 18)
    film.paste(fr(i).crop(bx).resize((tw, th), Image.LANCZOS), (x, y + 18)); d.text((x + 3, y + 1), f'{i / fps:.2f}s', fill='#c00', font=F(12))
film.save(f'out/{name}_feel_film.png')
# 2. beats: spec.beats [{name, from, to}] (frames), else consecutive key pairs merged into ≥ 12f spans
beats = spec.get('beats')
if not beats:
    kf = sorted(set(round(k['t'] * fps) for k in spec['keys'])); beats = []; s = kf[0]
    for f_ in kf[1:] + [N]:
        if f_ - s >= 12 or f_ == N: beats.append({'name': f'f{s}-f{f_}', 'from': s, 'to': f_}); s = f_
files = [(f'out/{name}_feel_film.png', 'every 2nd frame, whole figure at phone size (time in seconds)')]
for bi, b in enumerate(beats, 1):
    a0, a1 = b['from'], min(b['to'], N - 1 if not spec.get('loop') else b['to'])
    seq = [fr(i) for i in range(a0, a1 + 1)]
    # region: where anything changes in this beat (+ margin), at least 420 px
    diff = np.zeros((1920, 1080), bool)
    for p, q in zip(seq[:-1], seq[1:]): diff |= (np.abs(np.asarray(p, int) - np.asarray(q, int)).sum(-1) > 30)
    if diff.any():
        ys, xs = np.nonzero(diff); cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2; s_ = max(420, xs.max() - xs.min() + 160, ys.max() - ys.min() + 160)
    else: cx, cy, s_ = (bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 3, 420
    box = (int(max(0, cx - s_ / 2)), int(max(0, cy - s_ / 2)), int(min(1080, cx + s_ / 2)), int(min(1920, cy + s_ / 2)))
    mid = np.asarray(seq[len(seq) // 2], float); onion = 255 - (255 - mid) * 0.35
    sel = list(range(0, len(seq), 2)) or [0]
    for j, k in enumerate(sel):
        t = j / max(1, len(sel) - 1); col = np.array([40 + 200 * t, 60, 220 - 200 * t])
        onion[outline(fig_mask(seq[k])) | outline(skin_mask(seq[k]))] = col   # silhouette + skin (hands, face): limbs crossing the body show
    on = Image.fromarray(onion.astype(np.uint8)).crop(box).resize((520, int(520 * (box[3] - box[1]) / (box[2] - box[0]))), Image.LANCZOS)
    n = len(seq); tws = 150; cols = min(n, 10); rows = (n + cols - 1) // cols; tht = int(tws * (box[3] - box[1]) / (box[2] - box[0]))
    sheet = Image.new('RGB', (on.size[0] + 10 + cols * tws, max(on.size[1], rows * (tht + 16)) + 30), 'white'); d = ImageDraw.Draw(sheet)
    sheet.paste(on, (0, 30)); d.text((4, 4), f"beat {bi}: {b['name']}  ({(a1 - a0) / fps:.2f}s)  onion skin (silhouette + hands/face outlines): blue = start, red = end", fill='#111', font=F(16))
    for j, im in enumerate(seq):
        x, y = on.size[0] + 10 + (j % cols) * tws, 30 + (j // cols) * (tht + 16)
        sheet.paste(im.crop(box).resize((tws, tht), Image.LANCZOS), (x, y + 16)); d.text((x + 2, y), f'{(a0 + j) / fps:.2f}s', fill='#c00', font=F(11))
    p = f'out/{name}_feel_beat_{bi:02d}.png'; sheet.save(p); files.append((p, f"beat {bi} '{b['name']}': onion skin (left) and every frame (right), zoomed on what moves"))
# 3. key moments, upper body, large
kt = sorted(set([round(k['t'] * fps) for k in spec['keys']] + [b['from'] for b in beats]))
kt = [k for k in kt if k < N][:16]; ub = (bx[0], bx[1], bx[2], int(bx[1] + (bx[3] - bx[1]) * 0.6)); tw = 300; th = int(tw * (ub[3] - ub[1]) / (ub[2] - ub[0]))
cols = 4; rows = (len(kt) + cols - 1) // cols; keys_im = Image.new('RGB', (cols * tw, rows * (th + 20)), 'white'); d = ImageDraw.Draw(keys_im)
for j, k in enumerate(kt):
    x, y = (j % cols) * tw, (j // cols) * (th + 20); keys_im.paste(fr(k).crop(ub).resize((tw, th), Image.LANCZOS), (x, y + 20)); d.text((x + 3, y + 2), f'{k / fps:.2f}s', fill='#c00', font=F(14))
keys_im.save(f'out/{name}_feel_keys.png'); files.append((f'out/{name}_feel_keys.png', 'key moments, upper body, large'))
fill(files, spec.get('story', ''), f'feel_log_{a}.md')
