#!/bin/sh
# torso_cmp.sh <char> [pose] [x0 y0 x1 y1] — reference crop | render crop (ref frame) side by side → out/<char>_crop.png
C=$1; P=${2:-}; B="${3:-450} ${4:-700} ${5:-1300} ${6:-1650}"
if [ -n "$P" ]; then node tools/char_still.mjs --char $C --pose $P --frame ref --out out/${C}_crop_src.png >/dev/null; else node tools/char_still.mjs --char $C --frame ref --out out/${C}_crop_src.png >/dev/null; fi
python3 - "$C" $B <<'PY'
import sys, json
from PIL import Image
c=sys.argv[1]; box=tuple(int(v) for v in sys.argv[2:6])
ref=json.load(open(f'characters/{c}/ref/landmarks.json'))['image']
r=Image.open(f'characters/{c}/ref/{ref}').convert('RGB'); m=Image.open(f'out/{c}_crop_src.png').convert('RGB')
a=r.crop(box); b=m.crop(box); s=Image.new('RGB',(a.width*2+10,a.height),'white'); s.paste(a,(0,0)); s.paste(b,(a.width+10,0))
k=min(1.0, 1100/s.width); s=s.resize((int(s.width*k),int(s.height*k))); s.save(f'out/{c}_crop.png'); print('wrote', f'out/{c}_crop.png')
PY
