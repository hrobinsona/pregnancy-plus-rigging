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
run('python3', 'tools/zoom_tour.py', c, pose)                   # close-ups of every region (construction faults hide at 1080)
run('python3', 'tools/detail_audit.py', c, pose)                # pixel audit: pinholes, slivers, spurs
run('python3', 'tools/hand_lab.py', c, '--pose', pose)           # every hand-library pose, both hands, large
run('python3', 'tools/hand_fit.py', c)                           # rest hands measured against the reference
root = os.getcwd()
files = [f'out/{c}_{pose}_still.png — the {pose} pose, full size (1080×1920)',
         f'out/{c}_{pose}_phone.png — the same at phone thumbnail size (360 px wide)',
         f'out/{c}_{pose}_sil.png — solid silhouette of the same pose',
         f'out/{c}_compare.png — reference | render | overlay | silhouette diff, then zoom pairs (reference | render): face, near hand, far hand, feet',
         f'out/{c}_{pose}_tour.png — ZOOM TOUR: 3–4× close-ups of head, neck & collars, shoulders, bust→bump, hem & crotch, hands, knees, feet. Inspect every tile for construction faults (lumps, teeth, slivers, kinks, tangents)',
         f'out/{c}_{pose}_audit.txt — automated pixel audit (pinholes, specks, thin spurs) after the allowlist of intentional thin features',
         f'out/{c}_hand_lab.png — HAND LAB: every hand-library pose (relaxed, open, cup, press, grip, fist, point) on the near (top, back of hand) and far (bottom, palm view) hand at ~4× close range, plus the {pose} pose. Judge construction, anatomy and joint direction here',
         f'out/{c}_hand_fit.png + out/{c}_hand_fit.txt — rest-pose hands vs the reference at the same scale: reference | render | mask overlay, width profile and length along the hand axis',
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
