#!/bin/sh
# Derived keys for the look-up shot (¾ view), all from FITTED keys (refs/fit_keys.sh). Re-run after any re-fit.
set -e
B="python3 tools/pose_blend.py mum3q"
# the far arm and the legs stay the look-down key's in every key: nothing in the brief moves them, and each still's own fit
# (forearm 10° → −3° → 3°) swung the far hand in and out behind her skirt by half its width (v1 hands + Lasseter critics)
STILL=clavicle.far,shoulderAbd.far,upperArm.far,armAbd.far,armRot.far,forearm.far,foreRot.far,hand.far,wristFlex.far,thigh.near,shin.near,foot.near,toe.near,thigh.far,shin.far,foot.far,toe.far,hipAbd.near,hipAbd.far
# BOTH hands on the bump (Harry on v3: the far arm "just hanging lifeless … in reality it would likely be placed on her bump
# too"). The far arm is the hand-on-top still's (fit-q_k3_down, placed by tools/hand_place.py --natural: the elbow at her
# side, the forearm hidden behind the bump, the hand lying across its top with the fingers together, curving toward us;
# Harry on v4's q_k2 hand, its fingers hanging off the far edge: "no one's hand naturally lies like this"), on the
# look-down key's trunk; the hand drawn on the dress
FAR=clavicle.far,shoulderAbd.far,upperArm.far,armAbd.far,armRot.far,forearm.far,foreRot.far,hand.far,wristFlex.far
$B n-base fit-q_k3_down fit-q_k_down 1 --keep $FAR --from B --hands far=hold --note "the look-down key (q_k_down_0) with the far hand lying across the top of the bump (q_k3_down_1)"
python3 tools/pose_set.py mum3q n-base --zbias arm.far.hand=40 >/dev/null
$B n-down n-base --hands near=drape --add chest=1.5,spineUpper=0.8 --note "looking down at her bump (still q_k_down_0), hand resting on its lower front, the upper back rounded a little"
$B n-mid n-base fit-q_k_mid 1 --keep $STILL --from B --hands near=drape,far=hold --note "half way up, the eyes already on us (still q_k_mid_2)"
# eye contact: the chest opens and the shoulders lift with the breath in (the body joins the look up)
$B n-up n-base fit-q_k_up 1 --keep $STILL --from B --hands near=drape,far=hold --add chest=-1,clavicle.far=2 --set clavicle.near=4.5 --note "head up, eye contact (still q_k_up_1), the chest open and the shoulders up a touch"
python3 tools/pose_set.py mum3q n-up --scale chest=1.02:1.01 >/dev/null
# the lift's anticipation: before the head comes up it sinks a touch deeper into the nod (and the shoulders settle)
$B n-dip n-down --hands near=drape --add neck=1.5,clavicle.near=-1.5 --note "anticipation before the look up: a touch deeper into the nod"
python3 tools/pose_set.py mum3q n-dip --fx headPitch=27 >/dev/null
# a moving hold while she looks at us: the head tips a little (a warm tilt), never a dead hold
$B n-tilt n-up --hands near=drape --add head=2.5,neck=1 --note "eye contact, the head tipped a little: a warm tilt in the hold"
python3 tools/pose_set.py mum3q n-tilt --scale chest=1.02:1.01 >/dev/null
# the way back down is its own softer path, not the look up in reverse: half way, the head a touch forward and tipped
# toward the bump (Lasseter v1: beats 3 and 5 traced the same sweep)
$B n-ret n-up n-down 0.45 --hands near=drape --add head=3,neck=-1 --note "breakdown on the way back down: forward and tipped toward the bump"
python3 tools/pose_set.py mum3q n-ret --fx headPitch=13 >/dev/null
# every key draws the far hand on her dress (n-mid and n-up take their discrete fields from their own stills' fits)
for n in n-down n-mid n-up n-dip n-tilt n-ret; do python3 tools/pose_set.py mum3q $n --zbias arm.far.hand=40 >/dev/null; done
