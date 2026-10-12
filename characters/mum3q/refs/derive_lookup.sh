#!/bin/sh
# Derived keys for the look-up shot (¾ view), all from FITTED keys (refs/fit_keys.sh). Re-run after any re-fit.
set -e
B="python3 tools/pose_blend.py mum3q"
# the three fitted keys, the near hand lying on the bump (hands/drape: the ¾ resting hand, fingers flat along the bump, thumb out)
$B n-down fit-q_k_down --hands near=drape --note "looking down at her bump (still q_k_down_0), hand resting on its lower front"
$B n-mid fit-q_k_mid --hands near=drape --note "half way up, the eyes already on us (still q_k_mid_2)"
$B n-up fit-q_k_up --hands near=drape --note "head up, eye contact (still q_k_up_1)"
# the lift's anticipation: before the head comes up it sinks a touch deeper into the nod (and the shoulders settle)
$B n-dip n-down --hands near=drape --add neck=1.5,clavicle.near=-1.5 --note "anticipation before the look up: a touch deeper into the nod"
python3 tools/pose_set.py mum3q n-dip --fx headPitch=27 >/dev/null
# a moving hold while she looks at us: the head tips a little toward her raised shoulder (a warm tilt), never a dead hold
$B n-tilt n-up --hands near=drape --add head=2.5,neck=1 --note "eye contact, the head tipped a little: a warm tilt in the hold"
