#!/usr/bin/env python3
"""pose_set.py <char> <pose> [--add bone=deg,...] [--set bone=deg,...] [--hand side=<json|name>] [--fx key=val,...] [--scale bone=along:across]
Edit a pose IN PLACE with recorded accents (appended to its _edits list), e.g. the resting far hand curled round the bump's
rim after a fit: a fit measures where the hand is; what the drawing needs to read as a hand (shape, roll) is set here."""
import sys, json, argparse
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('pose'); ap.add_argument('--add', default=''); ap.add_argument('--set', default=''); ap.add_argument('--hand', action='append', default=[]); ap.add_argument('--fx', default=''); ap.add_argument('--scale', default='')
a = ap.parse_args(); f = f'characters/{a.char}/poses/{a.pose}.json'; d = json.load(open(f)); b = d.setdefault('bones', {})
# IDEMPOTENT: an --add applies to the value the pose had before its first edit (kept in _orig), so re-running a recipe
# never accumulates (a fit rewrites the file without _orig, and the recipe starts over from the fit)
orig = d.setdefault('_orig', {})
for kv in filter(None, a.add.split(',')):
    k, v = kv.split('='); orig.setdefault(k, b.get(k, 0)); b[k] = round(orig[k] + float(v), 2)
for kv in filter(None, a.set.split(',')): k, v = kv.split('='); b[k] = float(v)
for h in a.hand:
    sd, v = h.split('=', 1)
    try: v = json.loads(v)
    except Exception: pass
    d.setdefault('hands', {})[sd] = v
for kv in filter(None, a.scale.split(',')): k, v = kv.split('='); d.setdefault('scale', {})[k] = [float(x) for x in v.split(':')]
for kv in filter(None, a.fx.split(',')): k, v = kv.split('='); d.setdefault('fx', {})[k] = float(v)
e = d.setdefault('_edits', []); cmd = ' '.join(sys.argv[3:]); e.append(cmd) if cmd not in e else None
json.dump(d, open(f, 'w'), indent=1); print('edited', a.pose)
