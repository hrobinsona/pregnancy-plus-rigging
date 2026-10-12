"""Recipe: NEW POSE — one sentence → reference stills → fitted pose, with a pass/fail gate.
    python3 tools/new_pose.py gen <char> <name> --prompt-file docs/prompts/<name>.txt --ref <sheet> --ref <prev key> [-n 3]
        (runs where Codex is logged in to ChatGPT, i.e. Harry's Mac: tools/refgen.py, registered without --est)
    python3 tools/new_pose.py fit <char> <name> [--base bump-rest] [--fit-args "--view far=back --hand far=cup"]
        (anywhere: pose_est each sample, fit each, keep the lowest rms, gate it, record it in refs/fit_keys.sh)
Gate: rms <= 0.06 H, no bone pinned on a joint limit, then LOOK at out/new_pose_<name>.png (reference next to the fit:
contacts must be right, e.g. a hand on the bump is on it). Exit 1 if the gate fails. See the skill, "Recipes"."""
import argparse
import glob
import json
import os
import re
import shlex
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('stage', choices=['gen', 'fit']); ap.add_argument('char'); ap.add_argument('name')
ap.add_argument('--prompt-file'); ap.add_argument('--prompt'); ap.add_argument('--ref', action='append', default=[]); ap.add_argument('-n', type=int, default=3)
ap.add_argument('--base', default='bump-rest'); ap.add_argument('--fit-args', default=''); ap.add_argument('--out-pose')
ap.add_argument('--max-rms', type=float, default=0.06); ap.add_argument('--no-record', action='store_true')
a = ap.parse_args()
R = f'characters/{a.char}/refs'
run = lambda cmd, **kw: subprocess.run(cmd, cwd=ROOT, check=True, text=True, **kw)

if a.stage == 'gen':
    cmd = [sys.executable, 'tools/refgen.py', a.char, a.name, '-n', str(a.n)]
    cmd += ['--prompt-file', a.prompt_file] if a.prompt_file else ['--prompt', a.prompt or sys.exit('--prompt or --prompt-file')]
    for r in a.ref: cmd += ['--ref', r]
    run(cmd)
    print(f'next (anywhere): python3 tools/new_pose.py fit {a.char} {a.name} --fit-args "…"   (commit the images first)')
    sys.exit(0)

imgs = sorted(glob.glob(os.path.join(ROOT, R, 'images', f'{a.name}_[0-9]*.png')))
if not imgs: sys.exit(f'no samples {R}/images/{a.name}_<i>.png — run the gen stage (or ref_register.py) first')
out_pose = a.out_pose or f'fit-{a.name}'
res = []
for img in imgs:
    k = os.path.splitext(os.path.basename(img))[0]; pj = f'{R}/pose/{k}.json'
    if not os.path.exists(os.path.join(ROOT, pj)):
        run([sys.executable, 'tools/pose_est.py', os.path.relpath(img, ROOT), '--out', pj, '--hands'], stdout=subprocess.DEVNULL)
    trial = f'_trial/{out_pose}-{k}'
    o = run(['node', 'tools/fit_pose.mjs', a.char, pj, trial, '--base', a.base, *shlex.split(a.fit_args)], capture_output=True).stdout
    m = re.search(r'rms ([\d.]+) H', o); rms = float(m.group(1)) if m else 9
    print(f'  {k}: rms {rms:.3f}  {o.strip().split("worst:")[-1].strip() if "worst:" in o else ""}')
    res.append((rms, k, pj, trial))
rms, k, pj, trial = min(res)
cmdline = f'node tools/fit_pose.mjs {a.char} $R/pose/{k}.json {out_pose} --base {a.base} {a.fit_args}'.strip()
run(['node', 'tools/fit_pose.mjs', a.char, pj, out_pose, '--base', a.base, *shlex.split(a.fit_args)], stdout=subprocess.DEVNULL)
for _, _, _, t in res:
    p = os.path.join(ROOT, f'characters/{a.char}/poses/{t}.json')
    if os.path.exists(p): os.remove(p)
try: os.rmdir(os.path.join(ROOT, f'characters/{a.char}/poses/_trial'))
except OSError: pass
# bones on a joint limit (a fit that ran into a stop is usually a wrong branch or a wrong hand view, not a pose)
lim = run(['node', '--input-type=module', '-e', f'''
import fs from 'node:fs'; import {{ createRig }} from './engine/rig.js';
const C = (await import('./characters/{a.char}/character.js')).default, rig = createRig(C), P = JSON.parse(fs.readFileSync('characters/{a.char}/poses/{out_pose}.json'));
const hit = Object.entries(P.bones || {{}}).filter(([b, v]) => rig.BONE[b] && ((rig.BONE[b].min !== undefined && v - rig.BONE[b].min < 0.5) || (rig.BONE[b].max !== undefined && rig.BONE[b].max - v < 0.5))).map(([b, v]) => b + '=' + v);
console.log(JSON.stringify(hit));'''], capture_output=True).stdout
at_limit = json.loads(lim.strip() or '[]')
sheet = f'out/new_pose_{a.name}.png'
run([sys.executable, 'tools/fit_sheet.py', a.char, sheet, f'{out_pose}:{os.path.relpath(os.path.join(ROOT, R, "images", k + ".png"), ROOT)}'], stdout=subprocess.DEVNULL)
ok = rms <= a.max_rms and not at_limit
print(f'{out_pose} <- {k}: rms {rms:.3f} (gate {a.max_rms}){"; ON A LIMIT: " + ", ".join(at_limit) if at_limit else ""}')
print(f'look: {sheet} (reference | fit) — contacts right?')
if ok and not a.no_record:
    fk = os.path.join(ROOT, R, 'fit_keys.sh'); txt = open(fk).read() if os.path.exists(fk) else '#!/bin/sh\nR=' + R + '\n'
    pe = f'[ -f $R/pose/{k}.json ] || python3 tools/pose_est.py $R/images/{k}.png --out $R/pose/{k}.json --hands'
    if cmdline not in txt:
        open(fk, 'a').write(f'\n# {a.name} (tools/new_pose.py, best of {len(res)} by rms)\n{pe}\n{cmdline}\n'); print(f'recorded in {R}/fit_keys.sh')
print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
