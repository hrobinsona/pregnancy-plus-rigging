#!/bin/sh
# Derived keys for the look-up shot (¾ view), all from FITTED keys (refs/fit_keys.sh). Re-run after any re-fit.
set -e
B="python3 tools/pose_blend.py mum3q"
# the far arm and the legs stay the look-down key's in every key: nothing in the brief moves them, and each still's own fit
# (forearm 10° → −3° → 3°) swung the far hand in and out behind her skirt by half its width (v1 hands + Lasseter critics)
STILL=clavicle.far,shoulderAbd.far,upperArm.far,armAbd.far,armRot.far,forearm.far,foreRot.far,hand.far,thigh.near,shin.near,foot.near,toe.near,thigh.far,shin.far,foot.far,toe.far,hipAbd.near,hipAbd.far
# the three fitted keys, the near hand lying on the bump (hands/drape: the ¾ resting hand, fingers flat along the bump, thumb out)
# looking down: the upper back rounds a little over the bump (v1's torso was the same block down and up: the whole look
# happened in the neck, Lasseter)
$B n-down fit-q_k_down --hands near=drape --add chest=1.5,spineUpper=0.8 --note "looking down at her bump (still q_k_down_0), hand resting on its lower front, the upper back rounded a little"
$B n-mid fit-q_k_down fit-q_k_mid 1 --keep $STILL --from B --hands near=drape --note "half way up, the eyes already on us (still q_k_mid_2)"
# eye contact: the chest opens and the shoulders lift with the breath in (the body joins the look up)
$B n-up fit-q_k_down fit-q_k_up 1 --keep $STILL --from B --hands near=drape --add chest=-1,clavicle.far=2 --set clavicle.near=4.5 --note "head up, eye contact (still q_k_up_1), the chest open and the shoulders up a touch"
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
# the far arm HANGS: whatever the trunk does in a key (the chest opening 3.7° on the look up), the far upper arm keeps the
# look-down still's angle in the world, so the hand stays at her side instead of swinging out behind the skirt
python3 - <<'PY'
import json
D = 'characters/mum3q/poses/'
CH = ['pelvis', 'spineLower', 'spineUpper', 'chest', 'clavicle.far', 'shoulderAbd.far']
ref = json.load(open(D + 'fit-q_k_down.json'))['bones']
chain = lambda b: sum(b.get(k, 0) for k in CH)
for n in ['n-down', 'n-mid', 'n-up', 'n-dip', 'n-tilt', 'n-ret']:
    p = json.load(open(D + n + '.json'))
    p['bones']['upperArm.far'] = round(ref.get('upperArm.far', 0) + (chain(p['bones']) - chain(ref)), 2)   # the far arm's angle runs opposite to the trunk's
    json.dump(p, open(D + n + '.json', 'w'), indent=1)
PY
