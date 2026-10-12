"""Recipe: NEW CHARACTER — scaffold characters/<id> from a template character, ready for its own master drawing.
    python3 tools/new_char.py <id> [--from mum2] [--master path/to/sheet.png]
Copies the drawing code (character.js, params.js, parts/), the hand library (poses/hands/) and the rest poses
(bump-rest, face-*), renames it, makes refs/{images,pose,tracks} with an empty ledger and fit_keys.sh, and copies the
master drawing to ref/master.<ext>. Prints the next steps (the skill's "New character" recipe). Shots, fitted
poses and review logs are NOT copied: they belong to the template's story."""
import argparse
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('id'); ap.add_argument('--from', dest='src', default='mum2'); ap.add_argument('--master')
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
    if f == 'bump-rest.json' or f.startswith('face-'): shutil.copy(os.path.join(S, 'poses', f), os.path.join(D, 'poses'))
for d in ('refs/images', 'refs/pose', 'refs/tracks', 'ref', 'anims'): os.makedirs(os.path.join(D, d), exist_ok=True)
shutil.copy(os.path.join(S, 'ref', 'landmarks.json'), os.path.join(D, 'ref'))   # the template's measurements until the new master is measured (params.js imports them)
open(os.path.join(D, 'refs', 'ledger.jsonl'), 'w').close()
open(os.path.join(D, 'refs', 'fit_keys.sh'), 'w').write(f'#!/bin/sh\n# every fitted pose of {a.id}: re-run after a rig change (tools/new_pose.py appends here)\nR=characters/{a.id}/refs\n')
cj = os.path.join(D, 'character.js'); txt = open(cj).read(); open(cj, 'w').write(txt.replace(f"name: '{a.src}'", f"name: '{a.id}'"))
if a.master:
    ext = os.path.splitext(a.master)[1]; shutil.copy(a.master, os.path.join(D, 'ref', 'master' + ext))
print(f'''characters/{a.id}: scaffolded from {a.src}. Next (skill: "Recipes → New character"):
  1. master drawing: one clean full-body sheet in the {a.src} pose and framing ({'copied' if a.master else 'tools/refgen.py on the Mac, then copy to ref/'}),
     measured: python3 tools/master_measure.py {a.id} characters/{a.id}/ref/master.png  → ref/landmarks.json + ref/measure.png (LOOK)
  2. rest pose fitted to it; limb lengths left = right; python3 tools/pose_est.py the master --out refs/pose/master.json
  3. hands early: tools/hand_fit.py, tools/hand_lab.py
  4. gate: node tools/char_check.mjs {a.id}; stress poses (tools/char_pose_sheet.py), detail_audit.py, corner_audit.py
  5. poses: python3 tools/new_pose.py gen|fit {a.id} <name> …''')
