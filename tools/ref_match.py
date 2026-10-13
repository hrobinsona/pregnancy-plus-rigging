#!/usr/bin/env python3
"""ref_match.py <char> <anim> [--pair T=STILL ...] — every key of a rendered shot SIDE BY SIDE with the reference still it
was fitted from, whole figure plus the same zoomed crops (head, hands on the bump, feet), for the natural lens of
critic_F.py and for anyone's eye.

Why: the fit only meets a handful of points (wrist, knuckle, fingertips), so a render can "match" its still and still
draw a different hand: mum3q look-up v5's top hand was a boxy block with its fingers pointing back at her chest, fitted to
q_k3_down, whose hand curls forward over the dome (Harry: "still looks creepy and lifeless"). The still is the standard
for SHAPE as well as position: hand silhouette, finger direction and curl, wrist bend, contact, posture.

Pairs (time → still) come from the shot itself: every key and reach stop whose pose (poses/<p>.json "note") or own
"note" names a still ("still q_k3_down_1"); --pair 2.45=q_k_mid_2 adds or overrides one. Needs the frames
(tools/char_anim.mjs). Writes out/<c>_<a>_refmatch_<n>.png and prints them as "path — description" lines."""
import sys, os, re, json, glob
from PIL import Image, ImageDraw, ImageFont
import numpy as np

STILL = re.compile(r'\bstill\s+([a-z0-9_]+_\d+)\b')


def font(s):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
              '/Library/Fonts/Arial Bold.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, s)
    return ImageFont.load_default()


def pairs(c, a, spec, extra):
    """{t: [stills]}: every still named in the notes of a key or reach stop (its own note and its pose's) at that time, a
    time dropped when it names the same stills as the time kept before it; --pair T=STILL adds one"""
    at = {}

    def take(t, *notes):
        for n in notes:
            for m in STILL.findall(n or ''):
                at.setdefault(round(t, 3), [])
                if m not in at[round(t, 3)]:
                    at[round(t, 3)].append(m)

    def pose_note(p):
        pj = f'characters/{c}/poses/{p}.json'
        return json.load(open(pj)).get('note', '') if p and os.path.exists(pj) else ''

    for k in spec.get('keys', []):
        take(k['t'], k.get('note', ''), pose_note(k.get('pose')))
    # a reach stop's still (a hand placed from its own still) joins the KEY nearest its time (≤ 0.25 s); a stop away from
    # every key is skipped: pairing a moving frame with a resting still compared a look-up frame with the look-down still
    kt = sorted(at) or [k['t'] for k in spec.get('keys', [])]
    for side, stops in (spec.get('reach') or {}).items():
        for st in stops if isinstance(stops, list) else []:
            if isinstance(st, dict) and 't' in st and not st.get('via'):
                near = min(kt, key=lambda k: abs(k - st['t']), default=None)
                if near is not None and abs(near - st['t']) <= 0.25:
                    take(near, st.get('note', ''), pose_note(st.get('pose')))
    for p in extra:
        t, st = p.split('=')
        at.setdefault(round(float(t), 3), []).insert(0, st)
    out, prev = {}, None
    for t in sorted(at):
        if at[t] != prev:
            out[t] = at[t][:3]; prev = at[t]
    return out


def bbox(im):
    a = np.asarray(im.convert('L')) < 240
    ys, xs = np.nonzero(a)
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1) if len(xs) else (0, 0, im.width, im.height)


def crop_rel(im, box, fy0, fy1, pad=0.08):
    """a band of the figure, fy0..fy1 of its height, the figure's full width plus a margin"""
    x0, y0, x1, y1 = box; h, w = y1 - y0, x1 - x0
    return im.crop((max(0, int(x0 - pad * w)), max(0, int(y0 + fy0 * h)), min(im.width, int(x1 + pad * w)), min(im.height, int(y0 + fy1 * h))))


def fit_h(im, h):
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)


def main():
    args = sys.argv[1:]
    extra = []
    while '--pair' in args:
        i = args.index('--pair'); extra.append(args[i + 1]); del args[i:i + 2]
    c, a = args[0], args[1]
    spec = json.load(open(f'characters/{c}/anims/{a}.json')); fps = spec['fps']
    frames = sorted(glob.glob(f'out/frames/{c}_{a}/f*.png'))
    if not frames:
        sys.exit(f'no frames in out/frames/{c}_{a}: run tools/char_anim.mjs first')
    P = pairs(c, a, spec, extra)
    if not P:
        sys.exit('no key names a still in its note; pass --pair T=STILL')
    for old in glob.glob(f'out/{c}_{a}_refmatch_*.png'):
        os.remove(old)
    bands = [('head', 0.0, 0.24, 170), ('hands and bump', 0.28, 0.6, 330), ('feet', 0.84, 1.0, 130)]   # name, band of the figure, row height
    F = font(22); n = 0
    for t, stills in P.items():
        refs = [(st, Image.open(f'characters/{c}/refs/images/{st}.png').convert('RGB')) for st in stills
                if os.path.exists(f'characters/{c}/refs/images/{st}.png')]
        if not refs:
            print(f'# skip {t:.2f} s: none of {stills} in refs/images', file=sys.stderr); continue
        fr = Image.open(frames[min(len(frames) - 1, round(t * fps))]).convert('RGB')
        ims = [('render', fr)] + refs; boxes = [bbox(im) for _, im in ims]
        whole = [fit_h(im.crop(b), 620) for (_, im), b in zip(ims, boxes)]
        rows = [[fit_h(crop_rel(im, b, y0, y1, 0.02), rh) for (_, im), b in zip(ims, boxes)] for _, y0, y1, rh in bands]
        wl = sum(w.width for w in whole) + 10 * len(whole); wr = max(sum(r.width for r in row) + 8 * len(row) for row in rows)
        sheet = Image.new('RGB', (wl + wr + 40, 60 + max(620, sum(b[3] + 12 for b in bands)) + 20), 'white'); d = ImageDraw.Draw(sheet)
        d.text((10, 14), f'{t:.2f} s   render (first)  |  ' + '  |  '.join(f'still {st}' for st, _ in refs), fill='#c00', font=F)
        x = 10
        for w in whole:
            sheet.paste(w, (x, 60)); x += w.width + 10
        x += 20; y = 60
        for (name, _, _, rh), row in zip(bands, rows):
            xx = x
            for r in row:
                sheet.paste(r, (xx, y)); xx += r.width + 8
            d.text((x, y + 2), name, fill='#c00', font=font(16)); y += rh + 12
        out = f'out/{c}_{a}_refmatch_{n:02d}.png'; sheet.save(out); n += 1
        print(f'{os.path.abspath(out)} — {t:.2f} s: the render (first) next to the reference stills it was built from '
              f'({", ".join(st for st, _ in refs)}): whole figure, then head, hands and bump, feet at the same crop')


if __name__ == '__main__':
    main()
