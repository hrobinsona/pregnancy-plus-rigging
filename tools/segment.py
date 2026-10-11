"""Shared segmentation: colour-classify figure pixels into material tokens.
Used by measure_ref.py (reference) and metrics.py (renders) so both are measured the same way."""
import numpy as np
from PIL import Image
from skimage import color

# Semantic seeds: rough descriptions of each material, used only to NAME k-means clusters.
SEEDS = {
    'garment':       '#c8aae8',  # lilac top + joggers
    'garmentShade':  '#b494dc',
    'cardigan':      '#ffb8c4',  # pink cardigan
    'cardiganShade': '#fa9aae',
    'skin':          '#d4805a',
    'skinShade':     '#c86c48',
    'skinLine':      '#bc5e37',  # crease/line core (derived separately, see measure_ref.derive_palette)
    'hair':          '#643828',
    'hairShade':     '#4c2818',
    'accent':        '#ffe078',  # yellow socks
    'accentShade':   '#f8c848',
    'line':          '#100404',  # eyes
    'mouth':         '#803018',
    'cheek':         '#e47258',
}
MATERIAL = {  # token -> material group
    'garment': 'garment', 'garmentShade': 'garment',
    'cardigan': 'cardigan', 'cardiganShade': 'cardigan',
    'skin': 'skin', 'skinShade': 'skin', 'skinLine': 'skin', 'cheek': 'skin',
    'hair': 'hair', 'hairShade': 'hair',
    'accent': 'sock', 'accentShade': 'sock',
    'line': 'feature', 'mouth': 'feature',
}

def hex2rgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)]) / 255.0

def rgb2hex(c):
    c = np.clip(np.round(np.asarray(c) * 255), 0, 255).astype(int); return '#%02x%02x%02x' % tuple(c)

def load(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(float) / 255.0
    rgb = a[..., :3] * a[..., 3:4] + (1 - a[..., 3:4])  # composite on white
    return rgb

def figure_mask(rgb, thr=0.07):
    from scipy import ndimage as ndi
    m = np.max(1 - rgb, axis=2) > thr
    m = ndi.binary_opening(m, iterations=1)
    lab, n = ndi.label(m)
    if n == 0: return m
    sizes = ndi.sum(m, lab, range(1, n + 1))
    keep = np.zeros(n + 1, bool); keep[1:] = sizes > 0.002 * m.sum()
    m = keep[lab]
    return ndi.binary_fill_holes(m)

def classify(rgb, mask, palette, max_de=14.0):
    """Label each figure pixel with nearest palette token (CIEDE2000-ish via Lab euclid); far pixels -> 'edge'."""
    lab = color.rgb2lab(rgb)
    names = list(palette.keys())
    cols = color.rgb2lab(np.array([[hex2rgb(palette[n]) for n in names]]))[0]
    px = lab[mask]
    d = np.linalg.norm(px[:, None, :] - cols[None, :, :], axis=2)
    j = d.argmin(1); dm = d.min(1)
    out = np.full(mask.shape, -1, int)
    lbl = np.where(dm < max_de, j, -2)
    out[mask] = lbl
    return out, names

def token_mask(labels, names, *tokens):
    idx = [names.index(t) for t in tokens if t in names]
    return np.isin(labels, idx)

def group_mask(labels, names, group):
    return token_mask(labels, names, *[t for t, g in MATERIAL.items() if g == group])
