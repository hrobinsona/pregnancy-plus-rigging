"""Align a render to the reference: scale so figure heights match, translate so ground points coincide."""
import json, os
import numpy as np
from PIL import Image
from segment import load, figure_mask

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ground_and_height(mask):
    ys, xs = np.nonzero(mask)
    top, bot = ys.min(), ys.max()
    gx = xs[ys >= bot - 2].mean()
    return np.array([gx, bot], float), float(bot - top)

def align(render_path, out_path=None):
    ref = json.load(open(os.path.join(ROOT, 'characters/mum/ref/measurements.json')))
    W, H = ref['size']
    rgb = load(render_path)
    m = figure_mask(rgb)
    g, h = ground_and_height(m)
    s = ref['height_px'] / h
    rg = np.array(ref['landmarks']['ground'], float)
    im = Image.fromarray((rgb * 255).astype(np.uint8))
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    off = rg - g * s
    canvas = Image.new('RGB', (W, H), 'white')
    canvas.paste(im, (int(round(off[0])), int(round(off[1]))))
    if out_path:
        canvas.save(out_path)
    return canvas, {'scale': s, 'offset': off.tolist(), 'render_height_px': h}
