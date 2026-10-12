#!/bin/sh
# Reproducible key-pose fits for the nausea shot: reference image → MediaPipe landmarks → 3D-arm rig pose.
# (--z / --view / --hand record what the reference SHOWS: the far forearm in front, the back of the hand, the hand shape.)
set -e
R=characters/mum2/refs
for k in k6_in_v2_1 k6_in_v2_2 k1_calm_0 k2_unease_v2_0 k3_lift_v2_0 k4_cover_v2_0 k5_retch_v2_1 k6_in_v2_0 k6_out_v2_0 k7_peel_v2_0 k7_fall_v2_0 k8_relief_v2_0; do
  [ -f $R/pose/$k.json ] || python3 tools/pose_est.py $R/images/$k.png --out $R/pose/$k.json --hands
done
F="--z arm.far.fore=55 --view far=back --order far.hand=front:jaw,far.fore=front:trunk"
W="--order far.hand=onback:bump"
node tools/fit_pose.mjs mum2 $R/pose/k1_calm_0.json      fit-k1 --base bump-rest $W
node tools/fit_pose.mjs mum2 $R/pose/k2_unease_v2_0.json fit-k2 --base bump-rest --hand near=press $W
node tools/fit_pose.mjs mum2 $R/pose/k3_lift_v2_0.json   fit-k3 --base bump-rest $F --hand far=limp
node tools/fit_pose.mjs mum2 $R/pose/k4_cover_v2_0.json  fit-k4 --base bump-rest $F --hand far=cover
node tools/fit_pose.mjs mum2 $R/pose/k5_retch_v2_1.json  fit-k5 --base bump-rest $F --hand far=cover,near=grip
node tools/fit_pose.mjs mum2 $R/pose/k6_out_v2_0.json    fit-k6 --base bump-rest $F --hand far=cover
node tools/fit_pose.mjs mum2 $R/pose/k7_peel_v2_0.json   fit-k7 --base bump-rest $F --hand far=limp
node tools/fit_pose.mjs mum2 $R/pose/k8_relief_v2_0.json fit-k8 --base bump-rest $W
# the deep IN-breath with the hand at the mouth (two samples; their near hand fell off the bump — pinned in the shot)
node tools/fit_pose.mjs mum2 $R/pose/k6_in_v2_1.json fit-k6in1 --base bump-rest $F --hand far=cover
node tools/fit_pose.mjs mum2 $R/pose/k6_in_v2_2.json fit-k6in2 --base bump-rest $F --hand far=cover
# in-between stills (tools/refgen.py, Codex on the ChatGPT login; best of 3 samples by rms): the lowering mouth → bump
# (b_lower1: hand flat below the collarbone; b_lower2: settling onto the bump's far rim) and the lift bump → mouth
# (b_lift1/2: one loose curl, back of the hand to camera — 'cup' matches it; 'relaxed' read as an open "oath" palm)
for k in b_lower1_2 b_lower2_1 b_lift1_2 b_lift2_2; do
  [ -f $R/pose/$k.json ] || python3 tools/pose_est.py $R/images/$k.png --out $R/pose/$k.json --hands
done
node tools/fit_pose.mjs mum2 $R/pose/b_lower1_2.json fit-bl1 --base bump-rest $F --hand far=limp
node tools/fit_pose.mjs mum2 $R/pose/b_lower2_1.json fit-bl2 --base bump-rest $F --hand far=relaxed
node tools/fit_pose.mjs mum2 $R/pose/b_lift1_2.json  fit-bf1 --base bump-rest $F --hand far=cup
node tools/fit_pose.mjs mum2 $R/pose/b_lift2_2.json  fit-bf2 --base bump-rest $F --hand far=cup
