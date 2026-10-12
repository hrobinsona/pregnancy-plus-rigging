#!/bin/sh
# every fitted pose of mum3: re-run after a rig change (tools/new_pose.py appends here)
R=characters/mum3/refs


# m3_k_bump (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/m3_k_bump_1.json ] || python3 tools/pose_est.py $R/images/m3_k_bump_1.png --out $R/pose/m3_k_bump_1.json --hands
node tools/fit_pose.mjs mum3 $R/pose/m3_k_bump_1.json fit-m3_k_bump

# m3_k_high (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/m3_k_high_2.json ] || python3 tools/pose_est.py $R/images/m3_k_high_2.png --out $R/pose/m3_k_high_2.json --hands
node tools/fit_pose.mjs mum3 $R/pose/m3_k_high_2.json fit-m3_k_high

# m3_k_breath (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/m3_k_breath_0.json ] || python3 tools/pose_est.py $R/images/m3_k_breath_0.png --out $R/pose/m3_k_breath_0.json --hands
node tools/fit_pose.mjs mum3 $R/pose/m3_k_breath_0.json fit-m3_k_breath

# m3_lift1 (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/m3_lift1_1.json ] || python3 tools/pose_est.py $R/images/m3_lift1_1.png --out $R/pose/m3_lift1_1.json --hands
node tools/fit_pose.mjs mum3 $R/pose/m3_lift1_1.json fit-m3_lift1

# m3_lift2 (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/m3_lift2_2.json ] || python3 tools/pose_est.py $R/images/m3_lift2_2.png --out $R/pose/m3_lift2_2.json --hands
node tools/fit_pose.mjs mum3 $R/pose/m3_lift2_2.json fit-m3_lift2

# m3_k_stroke (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/m3_k_stroke_0.json ] || python3 tools/pose_est.py $R/images/m3_k_stroke_0.png --out $R/pose/m3_k_stroke_0.json --hands
node tools/fit_pose.mjs mum3 $R/pose/m3_k_stroke_0.json fit-m3_k_stroke
