#!/bin/sh
# Derived keys for the look-up shot (¾ view), all from FITTED keys (refs/fit_keys.sh). Re-run after any re-fit.
set -e
B="python3 tools/pose_blend.py mum3q"
# both arms and the legs stay the look-down key's in every key: nothing in the brief moves them, and each still's own fit
# (forearm 10° → −3° → 3°) swung the far hand in and out behind her skirt by half its width (v1 hands + Lasseter critics)
STILL=clavicle.far,shoulderAbd.far,upperArm.far,armAbd.far,armRot.far,forearm.far,foreRot.far,hand.far,wristFlex.far,thigh.near,shin.near,foot.near,toe.near,thigh.far,shin.far,foot.far,toe.far,hipAbd.near,hipAbd.far
# BOTH hands on the bump, as an expectant mother holds it (still q_k4_down_0, picked by Harry 2026-10-13: "keep far on
# top"): the FAR hand curled a little over the top of the bump, its arm coming down past her bust and round the bump's
# side (Harry on v5's hand lying flat across the top with its arm hidden: "still looks creepy and lifeless. Rather than
# being a little curled over the top of the bump"); the NEAR hand cradling its underside, the thumb on its lower front.
# Both arms placed on the still by tools/hand_place.py --natural (refs/fit_keys.sh), on the look-down key's trunk; the far
# hand drawn on the dress
FAR=clavicle.far,shoulderAbd.far,upperArm.far,armAbd.far,armRot.far,forearm.far,foreRot.far,hand.far,wristFlex.far
NEAR=shoulderAbd.near,upperArm.near,armAbd.near,armRot.near,forearm.near,foreRot.near,hand.near,wristFlex.near
STILL=$STILL,$NEAR
$B n-base fit-q_k4_down fit-q_k_down 1 --keep $FAR,$NEAR --from B --hands near=cradle,far=hold --note "the look-down key (q_k_down_0) holding the bump with both hands: the far hand curled over its top, the near one cradling it (q_k4_down_0)"
python3 tools/pose_set.py mum3q n-base --zbias arm.far.hand=40 >/dev/null
$B n-down n-base --hands near=cradle --add chest=1.5,spineUpper=0.8 --note "looking down at her bump (still q_k_down_0), holding it with both hands (still q_k4_down_0), the upper back rounded a little"
# the head bowed a little deeper than the fit's face angle: the natural lens on v6 saw 'the head too upright… glancing
# sideways' against the stills' chin toward the chest
python3 tools/pose_set.py mum3q n-down --fx headPitch=28 >/dev/null
# the breakdown is HALF way in the head (the still q_k_mid_2 is ~85% up: through it the lift happened in 0.3 s, "a little
# brisk for unhurried", natural lens v6 round 2); the eyes are already on us
$B n-mid n-base fit-q_k_mid 1 --keep $STILL --from B --hands near=cradle,far=hold --add head=-7,neck=7 --note "half way up, the eyes already on us (still q_k_mid_2, the head held back to half way), both hands holding the bump as in still q_k4_down_0"
python3 tools/pose_set.py mum3q n-mid --fx headPitch=12 >/dev/null
# eye contact: the chest opens and the shoulders lift with the breath in (the body joins the look up)
$B n-up n-base fit-q_k_up 1 --keep $STILL --from B --hands near=cradle,far=hold --add chest=-1,clavicle.far=2 --set clavicle.near=4.5 --note "head up, eye contact (still q_k_up_1), the chest open and the shoulders up a touch, both hands holding the bump as in still q_k4_down_0"
python3 tools/pose_set.py mum3q n-up --scale chest=1.02:1.01 >/dev/null
# the lift's anticipation: before the head comes up it sinks a touch deeper into the nod (and the shoulders settle)
$B n-dip n-down --hands near=cradle --add neck=1.5,clavicle.near=-1.5 --note "anticipation before the look up: a touch deeper into the nod"
python3 tools/pose_set.py mum3q n-dip --fx headPitch=31 >/dev/null
# a moving hold while she looks at us: the head tips a little (a warm tilt), never a dead hold
$B n-tilt n-up --hands near=cradle --add head=2.5,neck=1 --note "eye contact, the head tipped a little: a warm tilt in the hold"
python3 tools/pose_set.py mum3q n-tilt --scale chest=1.02:1.01 >/dev/null
# the way back down is its own softer path, not the look up in reverse: half way, the head a touch forward and tipped
# toward the bump (Lasseter v1: beats 3 and 5 traced the same sweep)
$B n-ret n-up n-down 0.45 --hands near=cradle --add head=3,neck=-1 --note "breakdown on the way back down: forward and tipped toward the bump"
python3 tools/pose_set.py mum3q n-ret --fx headPitch=13 >/dev/null
# every key draws the far hand on her dress (n-mid and n-up take their discrete fields from their own stills' fits)
for n in n-down n-mid n-up n-dip n-tilt n-ret; do python3 tools/pose_set.py mum3q $n --zbias arm.far.hand=40 >/dev/null; done
