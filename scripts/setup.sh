#!/bin/sh
# One-time setup on a new machine (run from the repo root).
set -e
npm i -D playwright@1.56.0 && npx playwright install chromium
python3 -m pip install -r requirements.txt
mkdir -p models
B=https://storage.googleapis.com/mediapipe-models
[ -f models/pose_landmarker_heavy.task ] || curl -L -o models/pose_landmarker_heavy.task $B/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task
[ -f models/hand_landmarker.task ] || curl -L -o models/hand_landmarker.task $B/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
[ -f models/face_landmarker.task ] || curl -L -o models/face_landmarker.task $B/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
echo "setup done — try: node tools/char_anim.mjs --char mum2 --anim nausea-to-belly"
