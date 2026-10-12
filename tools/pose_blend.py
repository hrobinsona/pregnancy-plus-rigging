#!/usr/bin/env python3
"""pose_blend.py <char> <out> <A> [<B> <w>] [--add bone=deg,...] [--set bone=deg,...] [--from B] [--note "..."]
Derived key poses (in-betweens and accents of FITTED keys): bones = A + w·(B − A), then additive accents (--add), then
explicit values (--set). Discrete fields (hands, handView, zBias, fx) come from A, or from B with --from B.
Every derived pose records its recipe, so a re-fit of A or B re-derives it the same way (tools/derive_*.sh)."""
import sys, json, argparse
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('out'); ap.add_argument('A'); ap.add_argument('B', nargs='?'); ap.add_argument('w', nargs='?', type=float, default=0)
ap.add_argument('--add', default=''); ap.add_argument('--set', default=''); ap.add_argument('--from', dest='frm', default='A'); ap.add_argument('--note', default=''); ap.add_argument('--hands', default='')
a = ap.parse_args(); D = f'characters/{a.char}/poses/'
L = lambda n: json.load(open(D + n + '.json'))
A = L(a.A); B = L(a.B) if a.B else A
bones = {k: A['bones'].get(k, 0) + a.w * (B['bones'].get(k, 0) - A['bones'].get(k, 0)) for k in set(A['bones']) | set(B['bones'])}
for kv in filter(None, a.add.split(',')): k, v = kv.split('='); bones[k] = bones.get(k, 0) + float(v)
for kv in filter(None, a.set.split(',')): k, v = kv.split('='); bones[k] = float(v)
src = B if a.frm == 'B' else A
out = {'name': a.out, 'note': a.note or f'derived: {a.A}' + (f' → {a.B} @ {a.w}' if a.B else ''), '_recipe': ' '.join(sys.argv[2:])}
for f in ('hands', 'handView', 'zBias', 'fx', 'scale'):
    if f in src: out[f] = src[f]
if a.hands: out['hands'] = {**out.get('hands', {}), **dict(kv.split('=') for kv in a.hands.split(','))}
ra, rb = A.get('root', [0, 0]), B.get('root', [0, 0]); out['root'] = [round(ra[i] + a.w * (rb[i] - ra[i]), 4) for i in (0, 1)]
out['bones'] = {k: round(v, 2) for k, v in sorted(bones.items())}
json.dump(out, open(D + a.out + '.json', 'w'), indent=1); print('wrote', a.out)
