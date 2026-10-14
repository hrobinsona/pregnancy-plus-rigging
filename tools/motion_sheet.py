"""motion_sheet.py: review-pack sheets that make SMALL moves visible. Imported by blind_ab.py and critic_F.py (not a CLI).
  at_scale(...)  a region (the hands) at 1:1 film px, one row per clip, every `step` s, paged so no sheet is downscaled
  motion(...)    per window (1 s): the window's first frame faded, every pixel that changed during the window tinted
                 magenta, one row per clip. A still part shows no magenta; a band's thickness is how far its edge travelled.
Why (lesson 58): mum3q look-up v14–v17's hands move 20–26 px on her every second and her chest lifts on the look up, but the
packs showed the figure at a third of film size (110–170 px tiles) as still frames: a 20 px move became ~7 px between two
tiles a row apart. Three reviewers in a row called the hands "frozen" while QA measured them moving, and a blind A/B said
"a real but small hand or eye change could be there without me seeing it". A viewer of the film sees motion; a reviewer of
stills needs it drawn for them, at the size it is filmed."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont

_F = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F = lambda s: ImageFont.truetype(_F, s)
MAX = 1560   # longest side of a sheet: larger images are downscaled before a reviewer sees them, undoing the 1:1


def _pages(cells, cw, ch, max_side=MAX, left=0):
    """split cells (one per time/window) into pages of cols x rows that fit max_side"""
    cols = max(1, (max_side - left) // cw); rows = max(1, (max_side - 30) // ch); per = cols * rows
    return [cells[p:p + per] for p in range(0, len(cells), per)], cols


def at_scale(get, labels, idx, box, tl, path_fmt, desc, scale=1.0, files=None):
    """get(label, i) -> PIL frame; labels e.g. 'XY' or ['film']; idx: frame indices; tl(i) -> seconds.
    Writes path_fmt % page for each page; appends (path, desc) to files."""
    tw, th = round((box[2] - box[0]) * scale), round((box[3] - box[1]) * scale)
    nl = len(labels); left = 34 if nl > 1 else 0; cw, ch = tw + 6, nl * (th + 4) + 22
    pages, cols = _pages(list(idx), cw, ch, left=left); out = []
    for pg, cell in enumerate(pages, 1):
        rows = (len(cell) + cols - 1) // cols
        S = Image.new('RGB', (left + min(cols, len(cell)) * cw, 30 + rows * ch), 'white'); d = ImageDraw.Draw(S)
        d.text((4, 4), f'{desc} ({scale:g}:1 film px)', fill='#111', font=F(15))
        for k, i in enumerate(cell):
            x, y = left + (k % cols) * cw, 30 + (k // cols) * ch
            d.text((x + 2, y + 2), f'{tl(i):.2f}s', fill='#c00', font=F(13))
            for r, L in enumerate(labels):
                S.paste(get(L, i).crop(box).resize((tw, th), Image.LANCZOS), (x, y + 20 + r * (th + 4)))
                if nl > 1 and k % cols == 0: d.text((6, y + 20 + r * (th + 4) + th // 2 - 12), str(L), fill='#111', font=F(24))
        p = path_fmt % pg; S.save(p); out.append(p)
        if files is not None: files.append((p, f'{desc}, {tl(cell[0]):.1f}-{tl(cell[-1]):.1f}s, at {scale:g}:1 film px' + (f', {" row above ".join(map(str, labels))} row at the same moment' if nl > 1 else '')))
    return out


def moved(get, L, i0, i1, box, thr=60):
    """pixels of box that differ from frame i0 in any frame up to i1 (sum of |RGB diff| > thr: above video noise)"""
    base = np.asarray(get(L, i0).crop(box), int); m = np.zeros(base.shape[:2], bool)
    for i in range(i0 + 1, i1 + 1): m |= np.abs(np.asarray(get(L, i).crop(box), int) - base).sum(-1) > thr
    return base, m


def motion(get, labels, n, fps, t0, box, scale, path_fmt, desc, window=1.0, files=None):
    """one cell per `window` s of the n frames: the window's first frame faded, magenta where anything changed in it"""
    w = max(2, round(window * fps)); wins = [(a, min(n - 1, a + w)) for a in range(0, n - 1, w) if min(n - 1, a + w) > a]
    tw, th = round((box[2] - box[0]) * scale), round((box[3] - box[1]) * scale)
    nl = len(labels); left = 34 if nl > 1 else 0; cw, ch = tw + 6, nl * (th + 4) + 22
    pages, cols = _pages(wins, cw, ch, left=left); out = []
    for pg, cell in enumerate(pages, 1):
        rows = (len(cell) + cols - 1) // cols
        S = Image.new('RGB', (left + min(cols, len(cell)) * cw, 30 + rows * ch), 'white'); d = ImageDraw.Draw(S)
        d.text((4, 4), f'{desc}: magenta = changed during that {window:g} s', fill='#111', font=F(15))
        for k, (a, b) in enumerate(cell):
            x, y = left + (k % cols) * cw, 30 + (k // cols) * ch
            d.text((x + 2, y + 2), f'{t0 + a / fps:.1f}-{t0 + b / fps:.1f}s', fill='#c00', font=F(13))
            for r, L in enumerate(labels):
                base, m = moved(get, L, a, b, box)
                im = 255 - (255 - base) * 0.35; im[m] = im[m] * 0.25 + np.array([225, 0, 150]) * 0.75
                S.paste(Image.fromarray(im.astype(np.uint8)).resize((tw, th), Image.LANCZOS), (x, y + 20 + r * (th + 4)))
                if nl > 1 and k % cols == 0: d.text((6, y + 20 + r * (th + 4) + th // 2 - 12), str(L), fill='#111', font=F(24))
        p = path_fmt % pg; S.save(p); out.append(p)
        if files is not None: files.append((p, f'{desc}, what changed in each {window:g} s ({t0 + cell[0][0] / fps:.1f}-{t0 + cell[-1][1] / fps:.1f}s): the window\'s first frame faded, magenta = every pixel that changed during it (a band\'s thickness = how far that edge travelled; no magenta = still)' + (f'; {" row above ".join(map(str, labels))} row' if nl > 1 else '')))
    return out
