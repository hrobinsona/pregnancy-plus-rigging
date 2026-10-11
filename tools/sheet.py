#!/usr/bin/env python3
"""Compare sheet: reference | render | 50% overlay | silhouette XOR (red = missing, blue = extra),
plus a detail row (head and hands, reference vs render) so face/hand quality can be judged.
usage: python3 tools/sheet.py [render.png] [out.png]"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segment import load, figure_mask
from align import align, ROOT

def font(sz):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def main(render=os.path.join(ROOT, 'out/mum_rest_ref.png'), out=os.path.join(ROOT, 'out/mum_compare.png')):
    # The rig is authored in the reference's pixel frame with its origin at the measured ground point, so the
    # 'ref' frame render is aligned by construction (no resampling, no ground-point estimation drift).
    ref_p = os.path.join(ROOT, 'characters/mum/ref/reference.png')
    ref = Image.open(ref_p).convert('RGB')
    al = Image.open(render).convert('RGB'); info = {'frame': 'reference px, origin = measured ground point'}
    rm = figure_mask(load(ref_p)); am = figure_mask(np.asarray(al).astype(float) / 255)
    over = Image.blend(ref, al, 0.5)
    xor = np.full(rm.shape + (3,), 255, np.uint8)
    xor[rm & am] = (215, 215, 215)
    xor[rm & ~am] = (230, 30, 40)     # missing (in reference, not in render)
    xor[~rm & am] = (30, 90, 230)     # extra (in render, not in reference)
    xor = Image.fromarray(xor)
    bbox = (330, 10, 920, 1225)  # crop to figure area
    panels = [(ref, 'reference'), (al, 'render'), (over, 'overlay 50%'), (xor, 'silhouette XOR  red=missing  blue=extra')]
    pw, ph = bbox[2] - bbox[0], bbox[3] - bbox[1]
    head = (420, 20, 700, 330); hands = (470, 500, 790, 690)
    dh = 420
    sheet = Image.new('RGB', (pw * 4 + 50, ph + 60 + dh + 60), 'white')
    d = ImageDraw.Draw(sheet); F = font(26)
    for i, (im, lab) in enumerate(panels):
        sheet.paste(im.crop(bbox), (10 + i * (pw + 10), 50))
        d.text((10 + i * (pw + 10), 12), lab, fill=(20, 20, 20), font=F)
    y2 = ph + 60 + 50
    x = 10
    for box, lab in ((head, 'head'), (hands, 'hands')):
        for im, who in ((ref, 'reference'), (al, 'render')):
            c = im.crop(box); s = dh / c.height; c = c.resize((round(c.width * s), dh), Image.LANCZOS)
            sheet.paste(c, (x, y2)); d.text((x, y2 - 38), f'{lab} — {who}', fill=(20, 20, 20), font=F)
            x += c.width + 10
    sheet.save(out)
    print('wrote', out, info)

if __name__ == '__main__':
    main(*sys.argv[1:])
