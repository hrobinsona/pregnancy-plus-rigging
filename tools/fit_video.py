#!/usr/bin/env python3
"""fit_video.py <char> <videoPoseJson> <seg> --frames a:b:step --base <pose> [--first "flags"] [--every "flags"] [--last "flags"]
Fit the rig to every sampled frame of a motion-reference video (tools/pose_est.py output), each frame seeded from the
previous frame's fit (--nogrid: the arm keeps its 3D branch from frame to frame); the first frame gets the full search.
Writes poses <char>/poses/v/<seg>_f####.json and characters/<char>/refs/tracks/vtrack_<seg>.json (bone angle tracks over video time) for
tools/vtrack_keys.py. Measurement only: the video is never drawn."""
import sys, json, subprocess, argparse, os, shlex, time
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('video'); ap.add_argument('seg'); ap.add_argument('--frames', required=True); ap.add_argument('--base', required=True)
ap.add_argument('--first', default=''); ap.add_argument('--every', default=''); ap.add_argument('--last', default='')
a = ap.parse_args(); V = json.load(open(a.video)); fps = V['fps']; F = V['frames']
f0, f1, st = map(int, a.frames.split(':')); idx = list(range(f0, min(f1, len(F) - 1) + 1, st))
D = f'characters/{a.char}/'; os.makedirs(f'{D}poses/v', exist_ok=True); os.makedirs(f'{D}refs/pose/v/{a.seg}', exist_ok=True)
prev = a.base; track = {'seg': a.seg, 'video': a.video, 'fps': fps, 't': [], 'bones': {}, 'root': [], 'rms': []}; t0 = time.time()
for k, i in enumerate(idx):
    fr = {kk: vv for kk, vv in F[i].items() if kk not in ('i', 't')}
    if not fr.get('pose'): continue
    rj = f'{D}refs/pose/v/{a.seg}/f{i:04d}.json'; json.dump(fr, open(rj, 'w'))
    name = f'v/{a.seg}_f{i:04d}'
    flags = shlex.split(a.every) + (shlex.split(a.first) if k == 0 else []) + (shlex.split(a.last) if k == len(idx) - 1 else []) + ([] if k == 0 else ['--nogrid'])
    r = subprocess.run(['node', 'tools/fit_pose.mjs', a.char, rj, name, '--base', prev] + flags, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-500:]); sys.exit(1)
    p = json.load(open(f'{D}poses/{name}.json')); prev = name
    track['t'].append(i / fps); track['root'].append(p.get('root', [0, 0])); track['rms'].append(p['_fit']['rms'])
    for b, v in p['bones'].items(): track['bones'].setdefault(b, []).append(v)
    print(f'{name} rms {p["_fit"]["rms"]:.3f}  ({time.time() - t0:.0f}s)', flush=True)
_o = f'{D}refs/tracks/vtrack_{a.seg}.json'; os.makedirs(os.path.dirname(_o), exist_ok=True)
json.dump(track, open(_o, 'w')); print('wrote', _o)
