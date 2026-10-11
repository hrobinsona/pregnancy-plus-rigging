#!/usr/bin/env python3
"""critic_B.py <char> [pose] — refresh the review pack and print the filled Critic B prompt (stdout).
The prompt = tools/critic_prompt_B.md with {FILES} (review pack + params/parts for names) and {HISTORY}
(characters/<char>/critic_log.md: earlier rounds' scores and asks, so a fresh critic does not move the goalposts)."""
import sys, subprocess, os, glob
from PIL import Image
c = sys.argv[1]; pose = sys.argv[2] if len(sys.argv) > 2 else 'stand'
run = lambda *a: subprocess.run(a, check=True, capture_output=True)
run('node', 'tools/char_still.mjs', '--char', c, '--pose', pose, '--frame', 'still', '--out', f'out/{c}_{pose}_still.png')
run('node', 'tools/char_still.mjs', '--char', c, '--pose', pose, '--frame', 'still', '--sil', '1', '--out', f'out/{c}_{pose}_sil.png')
im = Image.open(f'out/{c}_{pose}_still.png'); im.resize((360, im.height * 360 // im.width), Image.LANCZOS).save(f'out/{c}_{pose}_phone.png')
run('python3', 'tools/char_compare.py', c, 'rest')              # rest pose = reference-matched: landmark fidelity
os.replace(f'out/{c}_metrics.txt', f'out/{c}_rest_metrics.txt')
run('python3', 'tools/char_compare.py', c, pose)                # designed pose: deliberate deviations expected
run('node', 'tools/hand_sheet.mjs', '--char', c)
root = os.getcwd()
files = [f'out/{c}_{pose}_still.png — the {pose} pose, full size (1080×1920)',
         f'out/{c}_{pose}_phone.png — the same at phone thumbnail size (360 px wide)',
         f'out/{c}_{pose}_sil.png — solid silhouette of the same pose',
         f'out/{c}_compare.png — reference | render | overlay | silhouette diff, then zoom pairs (reference | render): face, near hand, far hand, feet',
         f'out/{c}_hands.png — the hand pose library on the near (top) and far (bottom) hand, reference crop at the left',
         f'out/{c}_rest_metrics.txt — REST pose (reference-matched) silhouette IoU and row-extent deltas vs reference (H): the landmark-fidelity gate',
         f'out/{c}_metrics.txt — the {pose} pose vs reference: deviations here are partly deliberate (posture, A-pose arms)',
         f'out/{c}_hands_metrics.txt — pairwise silhouette IoU of the hand poses',
         f'characters/{c}/params.js — every design parameter (use these names in fixes)'] + \
        [f'{p} — part ids and shape parameters (read for names only)' for p in sorted(glob.glob(f'characters/{c}/parts/*.js'))]
files = '\n'.join(f'- {os.path.join(root, f)}' for f in files)
log = f'characters/{c}/critic_log.md'
hist = open(log).read() if os.path.exists(log) else ''
hist = ('HISTORY (earlier rounds — check whether their asks landed; do not move the goalposts):\n' + hist) if hist else ''
print(open('tools/critic_prompt_B.md').read().replace('{FILES}', files).replace('{HISTORY}', hist))
