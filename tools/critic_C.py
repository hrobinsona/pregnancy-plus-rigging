#!/usr/bin/env python3
"""critic_C.py <char> <anim> — refresh the motion review pack and print the filled Critic C prompt (stdout).
Run after tools/char_anim.mjs. Pack: contact sheet (every 6th frame, whole figure), per-move strips (every frame, face +
hands zoomed), magnified motion paths (arcs + spacing), measured metrics. History: characters/<char>/critic_log_<anim>.md."""
import sys, os, glob, json, subprocess
from PIL import Image, ImageDraw, ImageFont
c, a = sys.argv[1], sys.argv[2]; name = f'{c}_{a}'; root = os.getcwd()
spec = json.load(open(f'characters/{c}/anims/{a}.json'))
subprocess.run(['python3', 'tools/review_pack.py', c, a], check=True, capture_output=True)
fs = sorted(glob.glob(f'out/frames/{name}/f*.png'))[::6]
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
ims = [Image.open(f).convert('RGB').resize((216, 384)) for f in fs]; cols = 9; rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 220, rows * 388), 'white')
for i, (f, im) in enumerate(zip(fs, ims)):
    ImageDraw.Draw(im).text((4, 2), 'f' + f[-8:-4].lstrip('0').rjust(1, '0'), fill='#c00', font=F); sheet.paste(im, ((i % cols) * 220, (i // cols) * 388))
sheet.save(f'out/{name}_contact.png')
files = [f'out/{name}_contact.png — every 6th frame, whole 1080×1920 frame (phone-size read)'] + \
        [f'{p} — every frame of one move, face (top) and hands (bottom) zoomed' for p in sorted(glob.glob(f'out/{name}_strip_*.png'))] + \
        [f'out/{name}_arcs.png — magnified joint paths, one dot per frame (arcs and spacing)', f'out/{name}_metrics.txt — measured motion facts']
files = '\n'.join(f'- {os.path.join(root, f.split(" — ")[0])} — {f.split(" — ")[1]}' for f in files)
log = f'characters/{c}/critic_log_{a}.md'
hist = ('HISTORY (earlier rounds on this shot — check whether their asks landed):\n' + open(log).read()) if os.path.exists(log) else ''
print(open('tools/critic_prompt_C.md').read().replace('{FILES}', files).replace('{BRIEF}', spec.get('story', '')) + ('\n\n' + hist if hist else ''))
