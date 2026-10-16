#!/usr/bin/env python3
"""critic_F.py <char> <anim> [--lens feel|lasseter|hands|natural|all]   |   critic_F.py <char> --poses p1,p2,...
   |   critic_F.py <char> --side [p1,p2,...]   (the side-on pose library: three lenses, natural, body, craft)
The FEEL critic pack: look-and-feel only, deliberately NO metrics (the maths critic C scored proxies — px/f, lag offsets,
path loops — for six rounds while the client saw a stiff, detached, dead-handed arm; numbers bias a reviewer away from
"does this look like a real body?").
Anim mode (run after tools/char_anim.mjs) writes:
  out/<c>_<a>_feel_film.png     every 2nd frame, the whole figure at phone size, time in seconds
  out/<c>_<a>_feel_beat_<n>.png per beat: onion skin (ghost outlines, early = blue → late = red, over the middle frame)
                                + the beat's frames side by side, zoomed on what moves
  out/<c>_<a>_feel_keys.png     the key moments, upper body, large
  out/<c>_<a>_feel_motion_*.png what changed each second (magenta), upper body; with spec.handsBox also the hands at 1:1
                                (+ _feel_hands_1to1_*.png every 0.5 s): small moves drawn, lesson 58
Pose mode writes out/<c>_feel_poses.png (each pose large, upper body + full figure).
Prints the filled prompt (tools/critic_prompt_F.md) with history from characters/<c>/feel_log_<a or poses>.md.
--lens (anim mode; default feel): lasseter = the 12 principles, a score and a timed fix each; hands = the hands at size,
  adding out/<c>_<a>_feel_hands_*.png (zoomed tiles from out/<c>_<a>_tracks.json, one scale for both hands) and a hand
  angle/size trace; all = a judge panel: each lens also written to out/critic_prompt_<lens>.md (one fresh reviewer each),
  all three printed together. From the reels rig, where these lenses found what the overall rubric missed.
--lens natural: "does this look like an illustration of a real person, holding herself as she really would?" judged
  against the reference STILLS (tools/ref_match.py: each key next to the stills it was built from) and every item of
  docs/HARRY_EYE.md (Harry's notes as questions). In --lens all as the fourth reviewer."""
import sys, os, re, glob, json, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
args = sys.argv[1:]; lens = 'feel'
if '--lens' in args: i = args.index('--lens'); lens = args[i + 1]; del args[i:i + 2]
LENSES = ['feel', 'lasseter', 'hands', 'natural']
if lens not in LENSES + ['all']: sys.exit('--lens ' + '|'.join(LENSES + ['all']))
c = args[0]; root = os.getcwd()
_FONT = next((f for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf') if os.path.exists(f)), None)
F = lambda s: ImageFont.truetype(_FONT, s) if _FONT else ImageFont.load_default()

def refmatch_files():
    """(path, description) for each key next to its reference stills (tools/ref_match.py), [] if none name a still"""
    r = subprocess.run([sys.executable, 'tools/ref_match.py', c, args[1]], capture_output=True, text=True)
    return [tuple(l.split(' — ', 1)) for l in r.stdout.splitlines() if ' — ' in l]

def fill(files, brief, logname, hand_files=()):
    parts = re.split(r'^<!-- (lens:\w+|framing) -->\n', open('tools/critic_prompt_F.md').read(), flags=re.M); B = dict(zip(parts[1::2], parts[2::2]))
    log = f'characters/{c}/{logname}'
    hist = ('\n\nHISTORY (earlier feel reviews — check whether their asks landed):\n' + open(log).read()) if os.path.exists(log) else ''
    out = []
    eye = open('docs/HARRY_EYE.md').read() if os.path.exists('docs/HARRY_EYE.md') else ''
    rm = refmatch_files() if lens in ('natural', 'all') and len(args) > 1 and args[1] != '--poses' else []
    for L in (LENSES if lens == 'all' else [lens]):
        fs_ = list(hand_files) + files if L == 'hands' else rm + files if L == 'natural' else files
        fl = '\n'.join(f'- {os.path.join(root, p)} — {d}' for p, d in fs_)
        out.append(B['lens:' + L].replace('{FILES}', fl).replace('{BRIEF}', brief).replace('{FRAMING}', B['framing']).replace('{CHECKLIST}', eye))
        if lens == 'all': open(f'out/critic_prompt_{L}.md', 'w').write(out[-1] + hist)
    if lens != 'all': print(out[0] + hist); return
    print('A judge panel in one pass: four lenses on the same shot (feel, Lasseter principles, hands, natural). Do them in\n'
          'order, each as its own review with its own output, as if four different reviewers wrote them; open each file once.\n'
          '(The same lenses are in out/critic_prompt_feel.md, _lasseter.md, _hands.md and _natural.md, to give each to its own\n'
          'fresh reviewer.)\n\n'
          + '\n\n---\n\n'.join(f'# Lens {i}: {L}\n\n{t}' for i, (L, t) in enumerate(zip(LENSES, out), 1)) + hist)

def fig_mask(im):
    a = np.asarray(im.convert('L')); return a < 245

def skin_mask(im):
    a = np.asarray(im.convert('HSV')).astype(float); h, s_, v = a[..., 0] * 360 / 255, a[..., 1] / 255, a[..., 2] / 255
    return (h > 4) & (h < 34) & (s_ > 0.33) & (v > 0.35) & (v < 0.97)

def outline(mask):
    m = Image.fromarray((mask * 255).astype(np.uint8)); e = m.filter(ImageFilter.FIND_EDGES)
    return np.asarray(e.filter(ImageFilter.MaxFilter(3))) > 0

if args[1] == '--side':
    # SIDE-ON POSE LIBRARY (characters/<c>/poses/side/): each pose at film size beside its reference still mapped to the
    # same scale (tools/side_match.py), and three lenses (tools/critic_prompt_side.md: natural, body, craft), each to its
    # own fresh reviewer: out/critic_prompt_side_<lens>.md. The bar before Harry sees the library: every pose 8/10 or more
    # on every lens (SKILL.md "Learning from corrections" 2). Lesson 62.
    poses = args[2].split(',') if len(args) > 2 and not args[2].startswith('--') else sorted(os.path.splitext(f)[0] for f in os.listdir(f'characters/{c}/poses/side') if f.endswith('.json'))
    td = 'out/side_critic'; os.makedirs(td, exist_ok=True)
    for f in glob.glob(f'{td}/*.png'): os.remove(f)
    subprocess.run([sys.executable, 'tools/side_match.py', c] + [f'side/{p}' for p in poses] + ['--pxh', '225', '--margin', '0.3', '--tiles', td, '--ground', '#efe5dc', '--out', f'{td}/_match.png'], check=True, capture_output=True)
    files = []
    for p in poses:
        a, b = Image.open(f'{td}/side_{p}_ours.png').convert('RGB'), Image.open(f'{td}/side_{p}_still.png').convert('RGB')
        k = min(1.0, 1500 / (a.size[0] * 2 + 30), 1100 / a.size[1]); w, h = int(a.size[0] * k), int(a.size[1] * k)
        t = Image.new('RGB', (2 * w + 30, h + 40), 'white'); t.paste(a.resize((w, h), Image.LANCZOS), (0, 40)); t.paste(b.resize((w, h), Image.LANCZOS), (w + 30, 40))
        d = ImageDraw.Draw(t); d.text((6, 6), f'{p}: RENDER (film size{"" if k >= 0.999 else f" x{k:.2f}"})', fill='#c00', font=F(20)); d.text((w + 36, 6), 'REFERENCE STILL (same scale)', fill='#555', font=F(20))
        t.save(f'{td}/{p}.png'); files.append((f'{td}/{p}.png', f'{p}: the render (left) beside its reference still (right)'))
        # the hands and feet at 1:1 beside the still's (Harry, round 8: stiff hands and thin shoes "across many poses",
        # which a whole figure at film size draws too small to judge; lesson 69)
        subprocess.run([sys.executable, 'tools/side_zoom.py', c, f'side/{p}', '--at', 'near,far,toe.near@-0.1:0', '--size', '0.75', '--px', '300', '--hidden-far', '--out', f'{td}/{p}_close.png'], check=True, capture_output=True)
        files.append((f'{td}/{p}_close.png', f'{p}: CLOSE-UPS, rows near hand, far hand, feet; each [still | render 1:1 | render at film size]'))
    T = open('tools/critic_prompt_side.md').read(); parts = re.split(r'^<!-- (lens:\w+|framing) -->\n', T, flags=re.M); B = dict(zip(parts[1::2], parts[2::2]))
    eye = open('docs/HARRY_EYE.md').read(); eye = eye[eye.index('## The whole figure'):]
    eye = re.sub(r'## Hands.*?(?=## Motion)', '', eye, flags=re.S); eye = re.sub(r'## Motion and acting.*?(?=## Drawing quality)', '', eye, flags=re.S)
    brief = ('"Every side on view should be incredibly high quality and look natural - the same way a person would actually do it. '
             'Keeping the feel... so it feels like a real 2d representation of a real pregnant woman. In addition to the bump and dress '
             'often the legs look unnatural too - wrong posture, overlapping so they look like their on hinges rather than a real rig. '
             'These should look completely natural, like a real woman, just illustrated in 2D." (Harry). These are still poses of the '
             'side-on library; each will later be animated (breathing, blinks) and joined by moves.')
    # (a feel-log block between <!-- not for critics --> and <!-- /not for critics --> stays out of the history: the critics'
    # own ceiling test, scores they'd anchor on, lesson 75)
    log = f'characters/{c}/feel_log_side.md'; hist = ('\n\nHISTORY (earlier rounds on these poses: check whether their asks landed):\n' + re.sub(r'<!-- not for critics -->.*?<!-- /not for critics -->\n?', '', open(log).read(), flags=re.S)) if os.path.exists(log) else ''
    fl = '\n'.join(f'- {os.path.join(root, p)} — {d}' for p, d in files)
    for L in ['natural', 'body', 'craft']:
        open(f'out/critic_prompt_side_{L}.md', 'w').write(B['lens:' + L].replace('{FILES}', fl).replace('{BRIEF}', brief).replace('{FRAMING}', B['framing']).replace('{CHECKLIST}', eye).replace('{POSES}', ', '.join(poses)) + hist)
    print(f'{len(poses)} poses: {", ".join(poses)}\nsheets in {td}/; prompts: out/critic_prompt_side_natural.md, _body.md, _craft.md (one fresh reviewer each)')
    sys.exit()

if args[1] == '--poses':
    if lens != 'feel': sys.exit('--lens applies to anim mode only')
    poses = args[2].split(','); tiles = []
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

a = args[1]; name = f'{c}_{a}'; spec = json.load(open(f'characters/{c}/anims/{a}.json')); fps = spec['fps']
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
# 2b. zoom strips (spec.feelZoom = [{name, from, to, step?, box: [x0,y0,x1,y1] px}]): every frame of a move, close up —
#     the moves the client watches hardest (a hand travelling to the mouth, a retch) need more than a phone-size film
for z in spec.get('feelZoom', []):
    bz = z['box']; idx = list(range(z['from'], min(z['to'], N - 1) + 1, z.get('step', 1))); tw = z.get('w', 150); th = int(tw * (bz[3] - bz[1]) / (bz[2] - bz[0])); cols = min(len(idx), z.get('cols', 12)); rows = (len(idx) + cols - 1) // cols
    zs = Image.new('RGB', (cols * tw, rows * (th + 16)), 'white'); d = ImageDraw.Draw(zs)
    for k, i in enumerate(idx):
        x, y = (k % cols) * tw, (k // cols) * (th + 16); zs.paste(fr(i).crop(tuple(bz)).resize((tw, th), Image.LANCZOS), (x, y + 16)); d.text((x + 2, y), f'{i / fps:.2f}s', fill='#c00', font=F(11))
    zp = f'out/{name}_feel_zoom_{z["name"].replace(" ", "_")}.png'; zs.save(zp); files.append((zp, f"every frame of '{z['name']}', close up"))
# 2c. small moves drawn (tools/motion_sheet.py, lesson 58): what changed each second, the upper body larger than the film;
#     with spec.handsBox (film px) the hands at 1:1 every 0.5 s and their motion. Still strips at phone size hid 20 px hand moves
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import motion_sheet as MS
get = lambda L, i: fr(i); nw = max(1, round(N / fps))
ub = (bx[0], bx[1], bx[2], int(bx[1] + 0.55 * (bx[3] - bx[1])))
sc = min(1.0, (MS.MAX - 60) / (ub[3] - ub[1]), ((MS.MAX - 34) / min(8, nw) - 8) / (ub[2] - ub[0]))
MS.motion(get, ('',), N, fps, 0, ub, sc, f'out/{name}_feel_motion_body_%02d.png', 'upper body', files=files)
if spec.get('handsBox'):
    hb = tuple(spec['handsBox'])
    MS.at_scale(get, ('',), list(range(0, N, max(1, round(0.5 * fps)))), hb, lambda i: i / fps, f'out/{name}_feel_hands_1to1_%02d.png', 'the hands every 0.5 s', files=files)
    MS.motion(get, ('',), N, fps, 0, hb, 1.0, f'out/{name}_feel_motion_hands_%02d.png', 'the hands at 1:1', files=files)
# 3. key moments, upper body, large
kt = sorted(set([round(k['t'] * fps) for k in spec['keys']] + [b['from'] for b in beats]))
kt = [k for k in kt if k < N][:16]; ub = (bx[0], bx[1], bx[2], int(bx[1] + (bx[3] - bx[1]) * 0.6)); tw = 300; th = int(tw * (ub[3] - ub[1]) / (ub[2] - ub[0]))
cols = 4; rows = (len(kt) + cols - 1) // cols; keys_im = Image.new('RGB', (cols * tw, rows * (th + 20)), 'white'); d = ImageDraw.Draw(keys_im)
for j, k in enumerate(kt):
    x, y = (j % cols) * tw, (j // cols) * (th + 20); keys_im.paste(fr(k).crop(ub).resize((tw, th), Image.LANCZOS), (x, y + 20)); d.text((x + 3, y + 2), f'{k / fps:.2f}s', fill='#c00', font=F(14))
keys_im.save(f'out/{name}_feel_keys.png'); files.append((f'out/{name}_feel_keys.png', 'key moments, upper body, large'))
for rp, rd in spec.get('feelRefs', []): files.append((rp, rd))   # the illustrator's references the shot was built from
# 4. hands lens: zoomed tiles of both hands at ONE scale (size and drawing compare across hands), every 0.1 s, + angle trace
hand_files = []
tp = f'out/{name}_tracks.json'
if lens in ('hands', 'all') and not os.path.exists(tp): print(f'warning: {tp} missing (run tools/char_anim.mjs): no hand tiles', file=sys.stderr)
elif lens in ('hands', 'all'):
    T = json.load(open(tp))['tracks']; T = T[:N]
    # a hand the character hides by design (C.fit.hidden 'far.arm': behind her body all shot) gets no tiles
    hid = subprocess.run(['node', '--input-type=module', '-e', f"const C = (await import('{root}/characters/{c}/character.js')).default; console.log(JSON.stringify(C.fit?.hidden || []))"], capture_output=True, text=True).stdout.strip() or '[]'
    H_ = {h: v for h, v in {'near': ('wristNear', 'handNearTip'), 'far': ('wristFar', 'handFarTip')}.items() if f'{h}.arm' not in json.loads(hid)}
    P = {h: (np.array([t[w] for t in T], float), np.array([t[k] for t in T], float)) for h, (w, k) in H_.items()}
    hl = {h: np.hypot(*(P[h][1] - P[h][0]).T) for h in P}; S = int(max(200, 3.2 * np.median(np.concatenate(list(hl.values())))))
    def tile(im, h, i, tw):
        cx, cy = P[h][0][i] + 0.55 * (P[h][1][i] - P[h][0][i]); x0, y0 = int(cx - S / 2), int(cy - S / 2)
        t = Image.new('RGB', (S, S), 'white'); t.paste(im.crop((max(0, x0), max(0, y0), min(im.width, x0 + S), min(im.height, y0 + S))), (max(0, -x0), max(0, -y0)))   # white past the frame edge
        return t.resize((tw, tw), Image.LANCZOS)
    per, step, tw, cols = 90, 3, 160, 15
    for pg, f0 in enumerate(range(0, N, per), 1):
        idx = list(range(f0, min(N, f0 + per), step)); rows = (len(idx) + cols - 1) // cols
        sheet = Image.new('RGB', (70 + cols * tw, 30 + len(H_) * rows * (tw + 16) + 20), 'white'); d = ImageDraw.Draw(sheet)
        d.text((4, 4), f'hands {f0 / fps:.1f}-{(idx[-1]) / fps:.1f}s, every 0.1 s' + (', one scale for both (near rows, then far rows)' if len(H_) > 1 else f' ({next(iter(H_))} hand; the other is hidden behind her by design)'), fill='#111', font=F(16))
        ims = {i: fr(i) for i in idx}
        for r, h in enumerate(H_):
            y0 = 30 + r * (rows * (tw + 16) + 20); d.text((6, y0 + rows * (tw + 16) // 2 - 10), h, fill='#111', font=F(20))
            for k, i in enumerate(idx):
                x, y = 70 + (k % cols) * tw, y0 + (k // cols) * (tw + 16)
                sheet.paste(tile(ims[i], h, i, tw), (x, y + 16)); d.text((x + 2, y), f'{i / fps:.2f}s', fill='#c00', font=F(11))
        hp = f'out/{name}_feel_hands_{pg:02d}.png'; sheet.save(hp); hand_files.append((hp, (f'both hands zoomed, {f0 / fps:.1f}-{idx[-1] / fps:.1f}s every 0.1 s: near hand rows above far hand rows, same scale' if len(H_) > 1 else f'the {next(iter(H_))} hand zoomed, {f0 / fps:.1f}-{idx[-1] / fps:.1f}s every 0.1 s (the other hand is hidden behind her by design)')))
    # key moments: both hands large, side by side
    tw = 280; cols = 4; nh = len(H_); rows = (len(kt) + cols - 1) // cols; ks = Image.new('RGB', (cols * (nh * tw + 12), rows * (tw + 22)), 'white'); d = ImageDraw.Draw(ks)
    for j, k in enumerate(kt):
        x, y = (j % cols) * (nh * tw + 12), (j // cols) * (tw + 22); im = fr(k)
        for q, h in enumerate(H_): ks.paste(tile(im, h, k, tw), (x + q * tw, y + 22))
        d.text((x + 3, y + 3), f'{k / fps:.2f}s  ' + ' | '.join(H_), fill='#c00', font=F(14))
    hp = f'out/{name}_feel_hands_keys.png'; ks.save(hp); hand_files.append((hp, 'key moments: near hand (left) and far hand (right) large, same scale' if nh > 1 else f'key moments: the {next(iter(H_))} hand large'))
    # trace: hand angle (wrist → fingertips, screen degrees, unwrapped) and wrist-to-tip length, per frame, beats marked
    pw, ph, m = 1500, 260, 60; tr = Image.new('RGB', (pw, 2 * ph + 70), 'white'); d = ImageDraw.Draw(tr)
    ang = {h: np.degrees(np.unwrap(np.arctan2(*(P[h][1] - P[h][0]).T[::-1]))) for h in P}; col = {'near': '#d04020', 'far': '#2050d0'}
    for r, (ttl, ser) in enumerate((('hand angle (deg): through a move it should run one way; a flick past and back is a spring', ang), ('wrist-to-fingertip length (px): a hand that grows or shrinks without turning', hl))):
        y0 = 30 + r * (ph + 30); lo = min(v.min() for v in ser.values()); hi = max(v.max() for v in ser.values()); hi = hi if hi > lo else lo + 1
        d.text((m, y0 - 22), ttl, fill='#111', font=F(13)); d.rectangle((m, y0, pw - 10, y0 + ph), outline='#999')
        for b in beats: xb = m + (pw - 10 - m) * b['from'] / N; d.line((xb, y0, xb, y0 + ph), fill='#ddd'); d.text((xb + 2, y0 + 2), b['name'], fill='#888', font=F(10))
        for s_ in range(0, int(N / fps) + 1): xs_ = m + (pw - 10 - m) * s_ * fps / N; d.text((xs_ - 6, y0 + ph + 2), f'{s_}s', fill='#666', font=F(10))
        d.text((4, y0), f'{hi:.0f}', fill='#666', font=F(10)); d.text((4, y0 + ph - 12), f'{lo:.0f}', fill='#666', font=F(10))
        for h, v in ser.items():
            pts = [(m + (pw - 10 - m) * i / N, y0 + ph - (ph - 4) * (v[i] - lo) / (hi - lo) - 2) for i in range(len(v))]
            d.line(pts, fill=col[h], width=2); d.text((pw - 120, y0 + 4 + 14 * (h == 'far')), h + ' hand', fill=col[h], font=F(12))
    hp = f'out/{name}_feel_hands_trace.png'; tr.save(hp); hand_files.append((hp, 'hand angle and size per frame, both hands, beats marked (the only numbers in this pack: use them to confirm what the tiles show)'))
fill(files, spec.get('story', '') + (f"\n\nINTENSITY (set by the client — judge against THIS, do not push it further): {spec['intensity']}" if spec.get('intensity') else ''), f'feel_log_{a}.md', hand_files)
