#!/usr/bin/env python3
"""hand_shapes.py <char> <pose> --still <name> --side near|far --region fx0,fy0,fx1,fy1 [--shapes a,b,...] [--try JSON]
   [--bones JSON] [--face JSON] [--fx JSON] [--cols 4] [--scale 2] [--out out/hand_shapes_<pose>_<side>.png]

Pick a hand SHAPE side by side with the still's hand, BEFORE placing it (lesson 51): the key rendered once per candidate
shape, each cropped to the same region as the still and tiled after it, labelled.
  --shapes   hand-library names (characters/<c>/poses/hands/<name>.json) to try on --side
  --try      a JSON list of candidates [{"label": "...", "shape": {f1..f4, s, t, to, ts}, "bones": {...}, "face": {...}, "fx": {...},
             "style": {...}}]; "shape" is a library entry written inline (tune numbers here, then save the winner as a library
             file); "style" overrides the hand's DRAWING (params.handSpecs keys, both hands: rim = finger line weight, taper,
             tipK, fingerK, fingerW, lineStart/lineEnd, thumb {w, taper}) — save the winner in params.handSpecs
  --bones    explicit bones for every tile (e.g. '{"foreRot.far": 18}' to see a turn of the hand)
  --face     a face for every tile (pose.face; eyes are shape too: try lids against a look-down still)
  --fx       pose.fx fields for every tile (e.g. '{"headPitch": 30}': how far the head bows)
  --region   the crop as fractions of the FIGURE's bounding box (x from its left, y from its top), the same for the render
             and the still, so they line up without coordinates by hand. mum3q: top hand 0.48,0.27,1.1,0.37; lower hand
             0.34,0.40,0.96,0.50; eyes 0.33,0.03,0.85,0.13
Why: mum3q look-up v6's first `hold` (fingers curled 70-85°) and `cradle` (75-90°) were chosen by reasoning about angles;
the 3D fingers turned them into "a mitten" and "a rake". Eight candidates next to the still showed the right shape in
minutes: long fingers, fanned so the tips step, curved 45-65°. Then place the hand WITH the chosen shape
(tools/hand_place.py --hand <shape>).
The DRAWING is judged the same way (lesson 52), zoomed AND at film size (--scale 1): v6's fingers were drawn with thick
dark lines the full length of each finger, "four even parallel stripes, a comb"; the first redraw, picked zoomed (thin lines,
pointed tips), fused them into "a paddle" at phone size and lost its blind A/B. mum3q now: rim 0.012, taper [1, .92, .84,
.76], tipK 1.0, fingers fanned a few degrees. Pass "fx": {"contact.near": 1, "contact.far": 1} to see the hands' contact
shadows as the shot draws them."""
import sys, os, json, subprocess, argparse
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ref_match import bbox, font


def lib_bones(prefix, L, sign=1):
    """tools-side copy of engine/handlib.js handBones for one library entry"""
    o = {}
    for i in range(1, 5):
        fv = L['f%d' % i]
        o[f'{prefix}.f{i}a'] = fv[0]; o[f'{prefix}.f{i}b'] = fv[1]
        o[f'{prefix}.f{i}c'] = fv[2] if len(fv) > 2 else round(fv[1] * 0.67)
        o[f'{prefix}.f{i}s'] = sign * (L.get('s') or [0] * 4)[i - 1]
    o[f'{prefix}.t1'] = L['t'][0]; o[f'{prefix}.t2'] = L['t'][1]; o[f'{prefix}.t0'] = L.get('to', 0); o[f'{prefix}.ts'] = sign * -(L.get('ts', 0))
    return o


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('char'); ap.add_argument('pose')
    ap.add_argument('--still', required=True); ap.add_argument('--side', default='far'); ap.add_argument('--region', required=True)
    ap.add_argument('--shapes', default=''); ap.add_argument('--try', dest='tries', default='[]')
    ap.add_argument('--bones', default='{}'); ap.add_argument('--face', default=''); ap.add_argument('--fx', default='{}')
    ap.add_argument('--cols', type=int, default=4); ap.add_argument('--scale', type=float, default=2); ap.add_argument('--out')
    a = ap.parse_args()
    c = a.char; R = f'characters/{c}'
    pose = json.load(open(f'{R}/poses/{a.pose}.json'))
    sides = json.loads(subprocess.run(['node', '-e', f"import('./{R}/character.js').then(m=>console.log(JSON.stringify(m.default.handSides||{{}})))"],
                                      capture_output=True, text=True).stdout or '{}')
    sd = sides.get(a.side, {'prefix': f'hand.{a.side}', 'spreadSign': 1})
    cands = [{'label': f'{a.pose} as keyed'}]
    cands += [{'label': n, 'shape': json.load(open(f'{R}/poses/hands/{n}.json'))} for n in a.shapes.split(',') if n]
    cands += json.loads(a.tries)
    fr = [float(v) for v in a.region.split(',')]
    os.makedirs('out/hand_shapes', exist_ok=True)
    srvs = {}   # one still server per drawing style (a hand's drawing is built when the character loads)

    def server(style):
        k = json.dumps(style or {}, sort_keys=True)
        if k not in srvs:
            srvs[k] = subprocess.Popen(['node', 'tools/still_server.mjs', '--char', c] + (['--hand-style', k] if style else []),
                                       stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        return srvs[k]

    def crop(im):
        x0, y0, x1, y1 = bbox(im); w, h = x1 - x0, y1 - y0
        return im.crop((round(x0 + fr[0] * w), round(y0 + fr[1] * h), round(x0 + fr[2] * w), round(y0 + fr[3] * h)))

    tiles = []
    st = Image.open(f'{R}/refs/images/{a.still}.png').convert('RGB')
    tiles.append((f'still {a.still}', crop(st)))
    for k, cd in enumerate(cands):
        q = json.loads(json.dumps(pose)); q['bones'] = dict(q.get('bones', {}))
        if 'shape' in cd:
            q['bones'].update(lib_bones(sd['prefix'], cd['shape'], sd.get('spreadSign', 1)))
        q['bones'].update(json.loads(a.bones)); q['bones'].update(cd.get('bones', {}))
        q['fx'] = {**q.get('fx', {}), **json.loads(a.fx), **cd.get('fx', {})}
        if a.face or cd.get('face'):
            q['face'] = cd.get('face') or json.loads(a.face)
        f = f'out/hand_shapes/{a.pose}_{k}.png'
        srv = server(cd.get('style')); srv.stdin.write(json.dumps({'pose': q, 'out': f}) + '\n'); srv.stdin.flush()
        r = srv.stdout.readline().strip()
        if r != 'ok':
            print(f'{cd.get("label")}: {r}', file=sys.stderr); continue
        tiles.append((cd.get('label', str(k)), crop(Image.open(f).convert('RGB'))))
    for srv in srvs.values():
        srv.stdin.close(); srv.wait()
    th = max(t.height for _, t in tiles)
    tiles = [(l, t.resize((round(t.width * a.scale * th / t.height), round(th * a.scale)))) for l, t in tiles]
    tw, th = max(t.width for _, t in tiles), tiles[0][1].height
    nr = -(-len(tiles) // a.cols); F = font(18)
    sheet = Image.new('RGB', (a.cols * (tw + 8), nr * (th + 34)), 'white'); d = ImageDraw.Draw(sheet)
    for i, (l, t) in enumerate(tiles):
        x, y = (i % a.cols) * (tw + 8), (i // a.cols) * (th + 34)
        d.text((x + 4, y + 6), l, fill='#c00', font=F); sheet.paste(t, (x, y + 30))
    out = a.out or f'out/hand_shapes_{a.pose}_{a.side}.png'
    sheet.save(out); print(os.path.abspath(out))


if __name__ == '__main__':
    main()
