#!/bin/sh
# every fitted pose of mum3q: re-run after a rig change (tools/new_pose.py appends here)
R=characters/mum3q/refs

# q_k_down (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/q_k_down_0.json ] || python3 tools/pose_est.py $R/images/q_k_down_0.png --out $R/pose/q_k_down_0.json --hands
node tools/fit_pose.mjs mum3q $R/pose/q_k_down_0.json fit-q_k_down
python3 tools/head_pose.py mum3q --fit q_k_down   # the ¾ head (nod, neck, head) from the still's face

# q_k_mid (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/q_k_mid_2.json ] || python3 tools/pose_est.py $R/images/q_k_mid_2.png --out $R/pose/q_k_mid_2.json --hands
node tools/fit_pose.mjs mum3q $R/pose/q_k_mid_2.json fit-q_k_mid
python3 tools/head_pose.py mum3q --fit q_k_mid   # the ¾ head (nod, neck, head) from the still's face

# q_k_up (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/q_k_up_1.json ] || python3 tools/pose_est.py $R/images/q_k_up_1.png --out $R/pose/q_k_up_1.json --hands
node tools/fit_pose.mjs mum3q $R/pose/q_k_up_1.json fit-q_k_up
python3 tools/head_pose.py mum3q --fit q_k_up   # the ¾ head (nod, neck, head) from the still's face

# q_k2_down (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/q_k2_down_2.json ] || python3 tools/pose_est.py $R/images/q_k2_down_2.png --out $R/pose/q_k2_down_2.json --hands
node tools/fit_pose.mjs mum3q $R/pose/q_k2_down_2.json fit-q_k2_down
# the far hand on the top of the bump: MediaPipe can't see its wrist (hidden behind her), so its three points are marked
# on the still by eye (wrist out from behind the under-bust, middle knuckle, fingertips) and the arm is solved hidden
python3 tools/hand_place.py mum3q --fit q_k2_down --side far --keys 587,518,615,545,617,585 --hand atop --zbias arm.far.hand=40 --seed=-25,125,-40,0,0,-15

# q_k2_mid, q_k2_up (tools/new_pose.py, best of 3 by rms): bodies for reference; the look-up keys take only q_k2_down's far arm
# q_k2_mid
[ -f $R/pose/q_k2_mid_0.json ] || python3 tools/pose_est.py $R/images/q_k2_mid_0.png --out $R/pose/q_k2_mid_0.json --hands
node tools/fit_pose.mjs mum3q $R/pose/q_k2_mid_0.json fit-q_k2_mid

# q_k2_up (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/q_k2_up_0.json ] || python3 tools/pose_est.py $R/images/q_k2_up_0.png --out $R/pose/q_k2_up_0.json --hands
node tools/fit_pose.mjs mum3q $R/pose/q_k2_up_0.json fit-q_k2_up
