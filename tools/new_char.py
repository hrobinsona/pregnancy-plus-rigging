"""Recipe: NEW CHARACTER — scaffold characters/<id> from a template character, ready for its own master drawing.
    python3 tools/new_char.py <id> [--from mum3] [--master path/to/sheet.png]
Template: mum3 (near profile, bare arms, sleeveless dress: the design that suits a cut-out rig, its params read from
ref/landmarks.json) unless the new character is a ¾ figure in a cardigan like mum2.
Copies the drawing code (character.js, params.js, parts/), the hand library (poses/hands/) and the base poses
(rest, bump-rest, face-*, c-on/c-off), renames it, makes refs/{images,pose,tracks} with an empty ledger and fit_keys.sh, and copies the
master drawing to ref/master.<ext>. Prints the next steps (the skill's "New character" recipe). Shots, fitted
poses and review logs are NOT copied: they belong to the template's story."""
import argparse
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('id'); ap.add_argument('--from', dest='src', default='mum3'); ap.add_argument('--master')
a = ap.parse_args()
if not re.fullmatch(r'[a-z][a-z0-9_-]*', a.id): sys.exit('id: lowercase letters, digits, - or _')
S, D = os.path.join(ROOT, 'characters', a.src), os.path.join(ROOT, 'characters', a.id)
if os.path.exists(D): sys.exit(f'{D} exists')
os.makedirs(D)
for f in ('character.js', 'params.js'): shutil.copy(os.path.join(S, f), D)
shutil.copytree(os.path.join(S, 'parts'), os.path.join(D, 'parts'))
os.makedirs(os.path.join(D, 'poses'))
shutil.copytree(os.path.join(S, 'poses', 'hands'), os.path.join(D, 'poses', 'hands'))
for f in os.listdir(os.path.join(S, 'poses')):
    if f in ('rest.json', 'bump-rest.json', 'c-on.json', 'c-off.json') or f.startswith('face-'): shutil.copy(os.path.join(S, 'poses', f), os.path.join(D, 'poses'))
for d in ('refs/images', 'refs/pose', 'refs/tracks', 'ref', 'anims'): os.makedirs(os.path.join(D, d), exist_ok=True)
shutil.copy(os.path.join(S, 'ref', 'landmarks.json'), os.path.join(D, 'ref'))   # the template's measurements until the new master is measured (params.js imports them)
open(os.path.join(D, 'refs', 'ledger.jsonl'), 'w').close()
open(os.path.join(D, 'refs', 'fit_keys.sh'), 'w').write(f'#!/bin/sh\n# every fitted pose of {a.id}: re-run after a rig change (tools/new_pose.py appends here)\nR=characters/{a.id}/refs\n')
cj = os.path.join(D, 'character.js'); txt = open(cj).read(); open(cj, 'w').write(txt.replace(f"name: '{a.src}'", f"name: '{a.id}'"))
if a.master:
    ext = os.path.splitext(a.master)[1]; shutil.copy(a.master, os.path.join(D, 'ref', 'master' + ext))
print(f'''characters/{a.id}: scaffolded from {a.src}. Next (skill: "New character checklist"):
  1. master drawing designed for the rig (skill checklist step 1): {'copied to ref/' if a.master else 'push requests/refgen/<name>.json (the Mac worker draws it), pick one, copy to ref/master.png'}
  2. measure it: python3 tools/master_measure.py {a.id} characters/{a.id}/ref/master.png  → ref/landmarks.json + ref/measure.png (LOOK at every point)
     and calibrate the fitter: python3 tools/pose_est.py characters/{a.id}/ref/master.png --out characters/{a.id}/refs/pose/master.json
  3. redraw params.js and parts/ from the measurements; gate: node tools/char_check.mjs {a.id}, python3 tools/char_compare.py {a.id} rest (IoU ≥ 0.95)
  4. limbs hidden by design → C.fit.hidden; contact shadow gated by fx.contact.<side>; hands early (tools/hand_fit.py)
  5. key stills through the worker, then python3 tools/new_pose.py fit {a.id} <name> (base: rest)''')
