"""Design review pack for a character's master pose vs its reference (inputs for Critic B).
usage: python3 tools/char_compare.py <char> [pose]
writes out/<char>_compare.png  (reference | render | colour overlay | silhouette diff, plus a face/hands zoom row)
       out/<char>_metrics.txt  (silhouette IoU, row-profile deltas in H, palette tokens)"""
import sys, json, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFont
char = sys.argv[1]; pose = sys.argv[2] if len(sys.argv) > 2 else 'stand'
L = json.load(open(f'characters/{char}/ref/landmarks.json')); Hpx = L['Hpx']
subprocess.run(['node', 'tools/char_still.mjs', '--char', char, '--pose', pose, '--frame', 'ref', '--out', f'out/{char}_{pose}_ref.png'], check=True, capture_output=True)
R = Image.open(f'characters/{char}/ref/{L["image"]}').convert('RGB'); M = Image.open(f'out/{char}_{pose}_ref.png').convert('RGB')
a = np.asarray(R).astype(int); b = np.asarray(M).astype(int)
ma = np.abs(a - 255).sum(2) > 40; mb = np.abs(b - 255).sum(2) > 40
iou = (ma & mb).sum() / (ma | mb).sum()
ys = np.nonzero(ma.any(1))[0]; xs = np.nonzero(ma.any(0))[0]
box = (max(0, xs.min() - 40), max(0, ys.min() - 40), min(a.shape[1], xs.max() + 40), min(a.shape[0], ys.max() + 40))
ov = (a * 0.5 + b * 0.5).astype(np.uint8)
sd = np.full(a.shape, 255, np.uint8); sd[ma & mb] = (160, 160, 160); sd[ma & ~mb] = (220, 70, 70); sd[mb & ~ma] = (60, 110, 225)
W, H = box[2] - box[0], box[3] - box[1]; sc = 700 / H
tiles = [R, M, Image.fromarray(ov), Image.fromarray(sd)]
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
sheet = Image.new('RGB', (max(int(W * sc) * 4 + 30, 4 * 370), 34 + 700 + 20 + 360 + 40), 'white'); d = ImageDraw.Draw(sheet)
for i, (t, n) in enumerate(zip(tiles, ['reference (landmarks only)', 'render (code)', 'overlay', 'silhouette diff (red ref / blue render)'])):
    sheet.paste(t.crop(box).resize((int(W * sc), 700)), (i * (int(W * sc) + 10), 34)); d.text((i * (int(W * sc) + 10) + 4, 6), n, fill='#111', font=F)
# zoom row: face, near hand, far hand, feet (reference above-left / render right)
P = {k: v for k, v in L['points'].items()}
def zoom(c, half):
    bx = (int(c[0] - half), int(c[1] - half), int(c[0] + half), int(c[1] + half))
    t = Image.new('RGB', (360, 180), 'white'); t.paste(R.crop(bx).resize((180, 180)), (0, 0)); t.paste(M.crop(bx).resize((180, 180)), (180, 0)); return t.resize((360, 180))
zs = [zoom(P['eyeNear'][:1] + [P['eyeNear'][1] + 20] if False else [(P['eyeNear'][0] + P['eyeFar'][0]) / 2, P['eyeNear'][1] + 40], 170),
      zoom([P['wristNear'][0], P['wristNear'][1] + 90], 130), zoom([P['wristFar'][0] + 20, P['wristFar'][1] + 80], 120),
      zoom([(P['heelNear'][0] + P['toeFar'][0]) / 2, P['toeNear'][1] - 150], 300)]
for i, z in enumerate(zs): sheet.paste(z.resize((360, 360 // 2 * 2)), (i * 370, 760))
d.text((4, 1130), 'zoom pairs (reference | render): face · near hand · far hand · feet', fill='#333', font=F)
sheet.save(f'out/{char}_compare.png')
prof = subprocess.run(['python3', 'tools/profile_cmp.py', f'characters/{char}/ref/{L["image"]}', f'out/{char}_{pose}_ref.png', str(Hpx), '60'], capture_output=True, text=True).stdout
flag = [l for l in prof.splitlines()[1:] if '*' in l]
open(f'out/{char}_metrics.txt', 'w').write(f'silhouette IoU vs reference: {iou:.4f}\nrows (every 60 ref px) with an extent off by > 0.03 H: {len(flag)} of {len(prof.splitlines()) - 1}\n\n' + prof)
print(f'IoU {iou:.4f}; flagged rows {len(flag)}')
