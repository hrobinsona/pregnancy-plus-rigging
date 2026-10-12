#!/usr/bin/env python3
"""fit_sheet.py <char> <out.png> <pose>:<refImage> ... [--box x0,y0,x1,y1] [--px 360]
Reference (mapped into rig units with the fit's similarity) next to our render of the fitted pose, one pair per key —
the visual check of a pose fit (the overlay tool's first two panels, stacked for a whole set)."""
import sys, subprocess, argparse
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('out'); ap.add_argument('pairs', nargs='+'); ap.add_argument('--box', default='-1.6,-6.4,1.6,-2.4'); ap.add_argument('--px', type=int, default=360); ap.add_argument('--cols', type=int, default=4)
a = ap.parse_args(); F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15); tiles = []
for pr in a.pairs:
    pose, ref = pr.split(':', 1)
    o = f'out/_fs_{pose.replace("/", "_")}.png'
    subprocess.run(['python3', 'tools/fit_overlay.py', a.char, pose, ref, f'--box={a.box}', '--px', str(a.px), '--out', o], check=True, capture_output=True)
    im = Image.open(o); W = a.px; t = Image.new('RGB', (2 * W + 6, im.size[1] + 22), 'white'); t.paste(im.crop((0, 0, 2 * W + 6, im.size[1])), (0, 22))
    ImageDraw.Draw(t).text((4, 3), f'{pose}  (ref | ours)', fill='#c00', font=F); tiles.append(t)
w, h = tiles[0].size; cols = min(a.cols, len(tiles)); rows = (len(tiles) + cols - 1) // cols
s = Image.new('RGB', (cols * (w + 12), rows * h), 'white')
for i, t in enumerate(tiles): s.paste(t, ((i % cols) * (w + 12), (i // cols) * h))
s.save(a.out); print(a.out, s.size)
