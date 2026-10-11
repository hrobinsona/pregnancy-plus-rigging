#!/usr/bin/env python3
"""Side-by-side zoom of a region: reference | render (ref frame). usage: zoom.py x0 y0 x1 y1 scale out.png"""
import sys
from PIL import Image
x0, y0, x1, y1, s = map(int, sys.argv[1:6]); out = sys.argv[6]
a = Image.open('characters/mum/ref/reference.png').convert('RGB').crop((x0, y0, x1, y1))
b = Image.open('out/mum_rest_ref.png').convert('RGB').crop((x0, y0, x1, y1))
w, h = (x1 - x0) * s, (y1 - y0) * s
im = Image.new('RGB', (w * 2 + 10, h), 'white')
im.paste(a.resize((w, h), Image.LANCZOS), (0, 0)); im.paste(b.resize((w, h), Image.LANCZOS), (w + 10, 0)); im.save(out)
