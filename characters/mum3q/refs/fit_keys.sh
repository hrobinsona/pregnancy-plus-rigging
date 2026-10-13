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

# q_k3_down (tools/new_pose.py, best of 3 by rms)
[ -f $R/pose/q_k3_down_1.json ] || python3 tools/pose_est.py $R/images/q_k3_down_1.png --out $R/pose/q_k3_down_1.json --hands
node tools/fit_pose.mjs mum3q $R/pose/q_k3_down_1.json fit-q_k3_down
# its far hand (Harry on v4's: "no one's hand naturally lies like this"): the wrist just past the bump's far edge, the
# fingertips' centroid, by eye on q_k3_down_1; no knuckle key (the still's palm curves toward us, the drawn one can't);
# the arm solved hidden behind the bump AND natural (hanging, elbow at her side, back of the hand to us, the wrist 15°
# clear of its limits so the reach can hold the hand's size as she looks up; lesson 49)
python3 tools/hand_place.py mum3q --fit q_k3_down --side far --keys 632,556,558,586 --hand hold --zbias arm.far.hand=40 --bones upperArm,forearm,hand,armAbd,armRot,foreRot,wristFlex --natural --slack 15 --restarts 60

# q_k4_down (tools/new_pose.py, best of 3 by rms): both hands holding the bump (Harry's pick, 2026-10-13: the far hand on
# top, curled a little over it; the near hand cradling its underside). Both hands placed on the still's points by eye
# (wrist, middle knuckle, fingertips' centroid): the joint fit leaves the visible hands where the drawn arm's lengths
# put them, not where the illustration draws them (lesson 51)
[ -f $R/pose/q_k4_down_0.json ] || python3 tools/pose_est.py $R/images/q_k4_down_0.png --out $R/pose/q_k4_down_0.json --hands
node tools/fit_pose.mjs mum3q $R/pose/q_k4_down_0.json fit-q_k4_down
# the far arm comes down past her bust (a point on it: --fore) and round the bump's side, the hand curled over the top:
# palm DOWN onto the dome (--palm-down), so its curl bends the fingers down over it on screen (lesson 51)
python3 tools/hand_place.py mum3q --fit q_k4_down --sample 0 --side far --keys 632,552,580,552,535,578 --fore 600,495 --hide none --hand hold --zbias arm.far.hand=40 --bones upperArm,forearm,hand,armAbd,armRot,foreRot,wristFlex --natural --slack 10 --restarts 60 --hand-len 0.85 --palm-down 0.55
# the near arm across her front, the hand cradling the underside with the thumb on its lower front
python3 tools/hand_place.py mum3q --fit q_k4_down --sample 0 --side near --keys 528,738,568,764,618,768 --elbow 366,621 --hide none --hand cradle --bones upperArm,forearm,hand,armAbd,armRot,foreRot,wristFlex --natural --slack 10 --restarts 40
