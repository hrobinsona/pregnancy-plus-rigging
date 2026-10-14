#!/usr/bin/env python3
"""blind_ab.py <a.mp4> <b.mp4> [--t0 s --t1 s] [--crop x0,y0,x1,y1] [--hands x0,y0,x1,y1] [--step s] [--anim char/anim | --brief "text"] [--out out/blind_ab]
   blind_ab.py --reveal <out>
Blind A/B pack: the two renders relabelled X/Y in a random order (secret in <out>/key.json), frame sheets of both at
matched times, and <out>/prompt.md for a FRESH subagent that is not told what changed. Hand it: "Read <out>/prompt.md and
follow it exactly". Afterwards `--reveal <out>` prints which file was X and which Y.
Small moves are drawn for the reviewer (tools/motion_sheet.py, lesson 58): the upper body's motion per second (magenta =
changed), and with --hands (default: the --anim spec's handsBox, film px) the hands at 1:1 every 0.5 s and their motion.
Why (reels, kits/rig/LESSONS.md): a blind A/B caught what scored rubrics missed, and is how principle-driven changes were
tested before keeping them. Harry's eye still overrules the verdict."""
import sys, os, json, glob, shutil, random, subprocess, argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)

if len(sys.argv) == 3 and sys.argv[1] == '--reveal':
    k = json.load(open(os.path.join(sys.argv[2], 'key.json')))
    for lab in ('X', 'Y'): print(f"{lab} = {k[lab]}  (argument {k['arg'][lab]})")
    sys.exit()

ap = argparse.ArgumentParser(); ap.add_argument('a'); ap.add_argument('b')
ap.add_argument('--t0', type=float, default=0); ap.add_argument('--t1', type=float); ap.add_argument('--crop')
ap.add_argument('--hands', help='x0,y0,x1,y1 film px: the hands at 1:1 + their motion (default: the --anim spec\'s handsBox)')
ap.add_argument('--step', type=float, default=0.1, help='seconds between paired frames on the pair sheets')
ap.add_argument('--anim', help='char/anim: brief + intensity from its spec'); ap.add_argument('--brief'); ap.add_argument('--out', default='out/blind_ab')
o = ap.parse_args(); root = os.getcwd()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import motion_sheet as MS
spec = json.load(open('characters/{}/anims/{}.json'.format(*o.anim.split('/')))) if o.anim else {}
hb = tuple(map(int, o.hands.split(','))) if o.hands else tuple(spec['handsBox']) if spec.get('handsBox') else None

def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:format=duration', '-of', 'json', p], capture_output=True, text=True, check=True)
    j = json.loads(r.stdout); s = j['streams'][0]; n, d = s['r_frame_rate'].split('/')
    return s['width'], s['height'], float(n) / float(d), float(j['format']['duration'])

(W, H, fps, dur), pb = probe(o.a), probe(o.b)
if (W, H) != pb[:2] or abs(fps - pb[2]) > 0.01: sys.exit(f'clips differ in size or fps: {W}x{H}@{fps} vs {pb[0]}x{pb[1]}@{pb[2]}')
t1 = o.t1 if o.t1 is not None else min(dur, pb[3])
# secret order (os.urandom: not reproducible from anything the reviewer can see)
rng = random.Random(int.from_bytes(os.urandom(8), 'big')); swap = rng.random() < 0.5
lab = {'X': o.b if swap else o.a, 'Y': o.a if swap else o.b}
if os.path.isdir(o.out):
    if os.listdir(o.out) and not os.path.exists(f'{o.out}/key.json'): sys.exit(f'{o.out} exists and is not a blind_ab pack; pick another --out')
    shutil.rmtree(o.out)
os.makedirs(o.out)
json.dump({'X': os.path.abspath(lab['X']), 'Y': os.path.abspath(lab['Y']), 'arg': {'X': 'b' if swap else 'a', 'Y': 'a' if swap else 'b'}}, open(f'{o.out}/key.json', 'w'), indent=1)

# frames of the window, every source frame, into a scratch dir (deleted at the end: its names would not leak, but keep the pack small)
tmp = f'{o.out}/.frames'; seq = {}
for L in 'XY':
    os.makedirs(f'{tmp}/{L}')
    subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{o.t0:.4f}', '-i', lab[L], '-t', f'{t1 - o.t0:.4f}', '-vsync', '0', f'{tmp}/{L}/%04d.png'], check=True)
    seq[L] = sorted(glob.glob(f'{tmp}/{L}/*.png'))
N = min(len(seq['X']), len(seq['Y']))
if N < 2: sys.exit('window has < 2 frames')
fr = lambda L, i: Image.open(seq[L][i]).convert('RGB')
tl = lambda i: o.t0 + i / fps   # matched time: same index = same time in both clips

# crop: given, else where the most moves in either clip (motion energy on a 1/8 grid, cells ≥ half the peak: the main mover: the
# breath and sway touch the whole figure, so "anything changed" frames her head to toe), + margin, at least 480 px
if o.crop: bx = tuple(map(int, o.crop.split(',')))
else:
    g = 8; en = np.zeros((H // g, W // g)); fig = np.zeros((H, W), bool)
    for L in 'XY':
        prev = None
        for i in range(0, N, 2):
            a = np.asarray(fr(L, i), int); fig |= a.sum(-1) < 3 * 245
            if prev is not None: en += (np.abs(a - prev).sum(-1) > 30)[:H // g * g, :W // g * g].reshape(H // g, g, W // g, g).mean((1, 3))
            prev = a
    m = en >= 0.5 * en.max() if en.max() > 0 else None
    if m is not None: ys, xs = np.nonzero(m); ys, xs = ys * g + g // 2, xs * g + g // 2
    else: ys, xs = np.nonzero(fig)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    sw, sh = max(480, xs.max() - xs.min() + 200), max(480, ys.max() - ys.min() + 200)
    bx = (int(max(0, cx - sw / 2)), int(max(0, cy - sh / 2)), int(min(W, cx + sw / 2)), int(min(H, cy + sh / 2)))
ys, xs = np.nonzero(np.asarray(fr('X', 0)).sum(-1) < 3 * 245)
fb = (max(0, xs.min() - 30), max(0, ys.min() - 30), min(W, xs.max() + 30), min(H, ys.max() + 30)) if len(xs) else (0, 0, W, H)
files = []

def pair_sheet(path, idx, box, tw, cols, desc):
    th = int(tw * (box[3] - box[1]) / (box[2] - box[0])); rows = (len(idx) + cols - 1) // cols
    S = Image.new('RGB', (60 + cols * tw, rows * (2 * th + 40) + 8), 'white'); d = ImageDraw.Draw(S)
    for k, i in enumerate(idx):
        x, y = 60 + (k % cols) * tw, (k // cols) * (2 * th + 40)
        d.text((x + 3, y + 2), f'{tl(i):.2f}s', fill='#c00', font=F(13))
        for r, L in enumerate('XY'):
            S.paste(fr(L, i).crop(box).resize((tw, th), Image.LANCZOS), (x, y + 20 + r * (th + 4)))
            if k % cols == 0: d.text((8, y + 20 + r * (th + 4) + th // 2 - 14), L, fill='#111', font=F(28))
        d.line((x + tw - 1, y + 20, x + tw - 1, y + 20 + 2 * th + 4), fill='#ddd')
    S.save(path); files.append((path, desc))

# 1. whole figure, phone size, matched times (X row above Y row)
step = max(1, round(o.step * fps)); idx = list(range(0, N, step))
pair_sheet(f'{o.out}/ab_film.png', idx[::max(1, len(idx) // 24)] if len(idx) > 24 else idx, fb, 110, 12, 'whole figure at phone size; X row above Y row at the same moment (time in seconds)')
# 2. close up on what moves, every `step` s, paged
per = 16
for p in range(0, len(idx), per):
    pair_sheet(f'{o.out}/ab_close_{p // per + 1:02d}.png', idx[p:p + per], bx, 170, 8, f'close up on what moves, X row above Y row, {tl(idx[p]):.2f}-{tl(idx[min(p + per, len(idx)) - 1]):.2f}s')
# 3. every frame of each clip on its own (judge each as a move, not only pair by pair)
for L in 'XY':
    tw = 120; th = int(tw * (bx[3] - bx[1]) / (bx[2] - bx[0])); cols = 12; allf = list(range(N)); rows = (N + cols - 1) // cols
    S = Image.new('RGB', (cols * tw, rows * (th + 16) + 30), 'white'); d = ImageDraw.Draw(S); d.text((4, 4), f'clip {L}: every frame', fill='#111', font=F(18))
    for k, i in enumerate(allf):
        x, y = (k % cols) * tw, 30 + (k // cols) * (th + 16); S.paste(fr(L, i).crop(bx).resize((tw, th), Image.LANCZOS), (x, y + 16)); d.text((x + 2, y), f'{tl(i):.2f}s', fill='#c00', font=F(11))
    S.save(f'{o.out}/{L}_every_frame.png'); files.append((f'{o.out}/{L}_every_frame.png', f'clip {L} alone, every frame, close up'))
# 4. small moves drawn (lesson 58): the upper body's motion per second, larger than the film; the hands at 1:1 and their motion
get = lambda L, i: fr(L, i)
ub = (fb[0], fb[1], fb[2], int(fb[1] + 0.55 * (fb[3] - fb[1]))); nw = max(1, round((t1 - o.t0)))
sc = min(1.0, (MS.MAX - 60) / (2 * (ub[3] - ub[1])), ((MS.MAX - 34) / min(8, nw) - 8) / (ub[2] - ub[0]))
MS.motion(get, 'XY', N, fps, o.t0, ub, sc, f'{o.out}/ab_motion_body_%02d.png', 'upper body', files=files)
if hb:
    MS.at_scale(get, 'XY', list(range(0, N, max(1, round(0.5 * fps)))), hb, tl, f'{o.out}/ab_hands_%02d.png', 'the hands every 0.5 s', files=files)
    MS.motion(get, 'XY', N, fps, o.t0, hb, 1.0, f'{o.out}/ab_motion_hands_%02d.png', 'the hands at 1:1', files=files)
shutil.rmtree(tmp)

brief = o.brief or ''
if o.anim:
    brief = spec.get('story', '') + (f"\n\nINTENSITY (set by the client — judge against THIS, do not push it further): {spec['intensity']}" if spec.get('intensity') else '')
flist = '\n'.join(f'- {os.path.join(root, p)} — {d}' for p, d in files)
prompt = f"""You are a fresh reviewer in a BLIND A/B test of two renders of the same character animation shot, labelled X and Y
in a random order. You are not told what differs between them, or which is newer — on purpose. Your only question:
**which reads as a more natural, believable person moving?**

You see ONLY these files (open every one with the Read tool):
{flist}

Do NOT open {os.path.join(root, o.out, 'key.json')} (it holds the answer), do not read code, specs, logs or anything else in the repo, and
do not guess which is "the new one": judge only what you see. Times are in seconds of the shot ({o.t0:.2f}-{t1:.2f}s); the same
time in X and Y is the same moment of the shot.

{('Shot brief (what the client wants; the brief and its intensity beat your own taste — do not prefer a version for being bigger, faster or more dramatic than this):' + chr(10) + brief) if brief else 'Judge as a viewer would on a phone: a real woman moving, Headspace / BUCK quality.'}

How to review:
1. Look at the phone-size film first and say which you prefer at a glance, before looking closely.
2. Then go through the close-ups pair by pair, and each clip's every-frame sheet as a move: the arm and hands (wrist angle,
   elbow, shoulder joining in, size of the hands), the body and clothes moving as one, timing and spacing (slow in and out,
   no pops, no floaty or mechanical evenness), contact (a hand on the body touches it, no hovering or sinking), the face.
3. Then the motion sheets (magenta = what changed during that second) and, if given, the hands at full film size: on a
   phone a viewer SEES small moves that still frames hide. Judge whether each part lives and moves like a real body (a
   still body breathes; resting hands shift a little), and whether each move reads natural: not whether it is bigger.
4. Differences may be small. Name only what you can point to in the frames; if you can't see a difference, say so.

Output, exactly in this form:
- **First impression**: X or Y (one sentence why).
- **Scores**: X n/10, Y n/10 (overall naturalness; 7 = would ship).
- **The 3 most visible differences**, most visible first. For each: the time(s) · what X does · what Y does · which reads
  more natural and why.
- **Anything wrong in both** (at most 3, with times).
- Last line: "MORE NATURAL: X", "MORE NATURAL: Y" or "MORE NATURAL: NO CLEAR DIFFERENCE".

Your verdict is one input: Harry's eye overrules a reviewer, and a reviewer has been wrong before (a gulp it called
"barely registers" read to Harry as a burp). Say how confident you are.
"""
open(f'{o.out}/prompt.md', 'w').write(prompt)
print(f'{o.out}/prompt.md  ({len(files)} images, {N} frames {o.t0:.2f}-{t1:.2f}s, crop {bx})\nunblind afterwards: python3 tools/blind_ab.py --reveal {o.out}')
