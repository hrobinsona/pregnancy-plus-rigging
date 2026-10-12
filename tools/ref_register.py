#!/usr/bin/env python3
"""ref_register.py — bring reference STILLS made with any image tool (Codex CLI / ChatGPT images, fal, Midjourney, a
designer) into the pipeline with the same provenance as tools/fal_gen.py, then pose-estimate them for fitting.

  python3 tools/ref_register.py <char> <name> <image> [<image> ...] --provider codex \
      --prompt "…" | --prompt-file docs/prompts/<name>.txt  [--ref <input image> ...]  [--est]

  · copies the images to characters/<char>/refs/images/<name>_<i>.png (converted to PNG, i = 0, 1, …)
  · appends one line to characters/<char>/refs/ledger.jsonl (provider, prompt, input images, outputs) — so a later run
    can see which prompt and which tool produced which reference, and which samples were used
  · --est: runs tools/pose_est.py on each (→ characters/<char>/refs/pose/<name>_<i>.json), ready for tools/fit_pose.mjs
References are MEASUREMENT ONLY: nothing registered here is ever drawn into a frame."""
import sys, os, json, time, argparse, subprocess
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('char'); ap.add_argument('name'); ap.add_argument('images', nargs='+')
ap.add_argument('--provider', default='external'); ap.add_argument('--model', default='')
ap.add_argument('--prompt', default=''); ap.add_argument('--prompt-file', default='')
ap.add_argument('--ref', action='append', default=[]); ap.add_argument('--est', action='store_true')
a = ap.parse_args()
prompt = open(a.prompt_file).read().strip() if a.prompt_file else a.prompt
D = f'characters/{a.char}/refs'; os.makedirs(f'{D}/images', exist_ok=True); os.makedirs(f'{D}/pose', exist_ok=True)
outs = []
for i, src in enumerate(a.images):
    dst = f'{D}/images/{a.name}_{i}.png'
    Image.open(src).convert('RGB').save(dst); outs.append(dst); print('saved', dst)
entry = {'t': time.strftime('%Y-%m-%d %H:%M:%S'), 'kind': 'image', 'name': a.name, 'provider': a.provider, 'model': a.model,
         'prompt': prompt, 'refs': a.ref, 'outputs': outs}
with open(f'{D}/ledger.jsonl', 'a') as f: f.write(json.dumps(entry) + '\n')
print('ledger +1:', a.name, f'({a.provider}, {len(outs)} images)')
if a.est:
    for o in outs:
        pj = f'{D}/pose/' + os.path.basename(o)[:-4] + '.json'
        r = subprocess.run(['python3', 'tools/pose_est.py', o, '--out', pj, '--hands'], capture_output=True, text=True)
        print(('pose ' + pj) if r.returncode == 0 else ('pose_est FAILED for ' + o + ':\n' + r.stderr[-800:]))
