#!/usr/bin/env python3
"""critic_ceiling.py <char> [--lens natural,craft] [--out out/ceiling]

The critic's ceiling: what the side-on review protocol gives an image with NO rig in it. For each side-on pose it puts a
SIBLING still (another sample of the same prompt, refs/images/<stem>_<j>.png) in the sheet's "RENDER" panel beside the
pose's reference still, labelled exactly as the real pack labels ours, and writes each lens's prompt from the real one
(`out/critic_prompt_side_<lens>.md`, so run `python3 tools/critic_F.py <char> --side` first) with the history and the
close-up sheets taken out. Spawn one fresh critic per lens on it ("Read out/ceiling/prompt_<lens>.md and follow it
exactly"), on the same model as the real critics, and compare its scores with the real round's.

Why: side-on rounds 1–14 held at 4.5–7.5 against a bar of 8 on every lens. Run this way the stills' own siblings scored
5.5–7.5 (natural mean 6.9, craft 6.6), none 8, and the critics named rig faults in them ("a flat paddle with four
stripes", "the far shoe a thin wedge"): a score measures distance from ONE still through a prompt that says the image is
a rig, so a bar must be set against this ceiling, not on its own (PIPELINE lesson 75)."""
import argparse, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('--lens', default='natural,craft'); ap.add_argument('--out', default='out/ceiling')
a = ap.parse_args()
os.chdir(R); os.makedirs(a.out, exist_ok=True)
D, I = f'characters/{a.char}', f'characters/{a.char}/refs/images'
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)

def crop(im):
    m = np.abs(np.asarray(im.convert('RGB')).astype(int) - 255).sum(-1) > 40
    ys, xs = np.nonzero(m); pad = 30
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))

pairs = []
for p in sorted(os.path.splitext(f)[0] for f in os.listdir(f'{D}/poses/side') if f.endswith('.json')):
    P = json.load(open(f'{D}/poses/side/{p}.json'))
    tf = f"out/fit_{P.get('fitFrom', 'side/' + p)}_targets.json"
    if not os.path.exists(tf): print(f'{p}: no fit targets ({tf}); rebuild it with refs/fit_side.sh'); continue
    ref = os.path.splitext(os.path.basename(json.load(open(tf))['ref']))[0]
    stem, k = ref.rsplit('_', 1)
    sib = next((f'{stem}_{j}' for j in range(6) if str(j) != k and os.path.exists(f'{I}/{stem}_{j}.png')), None)
    if not sib: print(f'{p}: no sibling still of {ref}'); continue
    A, B = crop(Image.open(f'{I}/{sib}.png').convert('RGB')), crop(Image.open(f'{I}/{ref}.png').convert('RGB'))
    h = 900; A = A.resize((int(A.width * h / A.height), h), Image.LANCZOS); B = B.resize((int(B.width * h / B.height), h), Image.LANCZOS)
    t = Image.new('RGB', (A.width + B.width + 30, h + 40), 'white'); t.paste(A, (0, 40)); t.paste(B, (A.width + 30, 40))
    d = ImageDraw.Draw(t); d.text((6, 6), f'{p}: RENDER (film size)', fill='#c00', font=F(20)); d.text((A.width + 36, 6), 'REFERENCE STILL (same scale)', fill='#555', font=F(20))
    t.save(f'{a.out}/{p}.png'); pairs.append((p, sib, ref))
json.dump(pairs, open(f'{a.out}/pairs.json', 'w'))
for L in a.lens.split(','):
    src = f'out/critic_prompt_side_{L}.md'
    if not os.path.exists(src): print(f'{L}: no {src}; run tools/critic_F.py {a.char} --side first'); continue
    s = open(src).read().split('\n\nHISTORY (earlier rounds')[0]
    new, done = [], False
    for ln in s.split('\n'):
        if ln.startswith('- ') and '/out/side_critic/' in ln:
            if not done:
                new += [f'- {R}/{a.out}/{p}.png — {p}: the render (left) beside its reference still (right)' for p, _, _ in pairs]
                new.append('(No close-up sheets this round: judge the hands and feet from these sheets.)'); done = True
            continue
        new.append(ln)
    open(f'{a.out}/prompt_{L}.md', 'w').write('\n'.join(new))
print(json.dumps(pairs)); print(f'prompts: {a.out}/prompt_<lens>.md; one fresh critic per lens')
