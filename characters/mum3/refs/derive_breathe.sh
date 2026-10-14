#!/bin/sh
# Derived keys for the breathe-and-stroke shot, all from FITTED keys (refs/fit_keys.sh): accents, never invented poses.
# Re-run after any re-fit: it is the source of truth for every n-* pose.
set -e
B="python3 tools/pose_blend.py mum3"
# the hand resting on the bump: the fit measures where it is; the fingers lie ON the curve (hands/lay), not straight past it
$B n-bump fit-m3_k_bump --hands near=lay --note "hand on the lower front of the bump, fingers softly curved onto it"
# the deep breath in, readable at phone size AND vertical (v2 measured: the accents leaned her BACK, shoulder −15 px across
# and only 5 px up, head 20 px back: it read as a sway, not a breath; blind A/B: "no visible chest, shoulder or bump rise").
# Reels: a relief breath lifts the shoulders and head ~13 px. So: the bump key's own trunk (no lean), the ribcage LENGTHENS
# (chest and upper spine scaled along), the shoulders rise (clavicle), the chin lifts, the bump swells under the hand.
# v3 blind A/B: v2's chin lift read more clearly than v3's 3.5°, so the chin lifts 5.5° (a rotation, not a lean)
$B n-breath fit-m3_k_bump --hands near=lay --add head=-5.5,neck=-1.5,clavicle.near=4 --note "top of the deep breath in: the ribcage lifts, shoulders up, chin up"
python3 tools/pose_set.py mum3 n-breath --scale chest=1.04:1.03,spineUpper=1.03:1.02,belly=1.03:1.025 >/dev/null
# the breath out settles a touch LOWER than where it started: shoulders down, the ribcage a hair shorter, head sinks
$B n-out fit-m3_k_bump --hands near=lay --add clavicle.near=-2,head=1.5,neck=0.5 --note "end of the long breath out: settled lower than the start"
python3 tools/pose_set.py mum3 n-out --scale chest=0.99:1,spineUpper=0.995:1 >/dev/null
# the breath's anticipation: she lets a little air out first. v3's (half way to n-out) moved the head ~1 px and did not
# read at phone size (critics): the shoulders sink 2–3 px, the chin drops ~2.5°, the ribcage shortens a hair
$B n-prep n-bump --hands near=lay --add clavicle.near=-3.5,head=2.5,neck=1 --note "before the deep breath in: a little air out first, the shoulders settle"
python3 tools/pose_set.py mum3 n-prep --scale chest=0.985:0.99,spineUpper=0.995:1 >/dev/null
# the stroke's top: the hand on the front of the bump at mid height, elbow under the shoulder (still m3_k_stroke)
$B n-stroke fit-m3_k_stroke --hands near=lay --note "top of the stroke: hand on the bump's front, fingers curved onto it"
# the stroke's top with the finger pads over the dome (v2: a flat paddle; v3's whole-finger 'wrap' a stubby paw); fingers-only keys for the way
# down (flatter, the heel leading) and the hand hanging at her side (a loose curl, not v2's 'relaxed' fork)
# its TRUNK stays the bump key's: the stroke still leaned her back 3° (spineLower), which carried the shoulder 27 px back
# for what is a hand move ("small, soft moves"); and the head bows ~30% less than the still ("chin nearly to chest"
# in the v3 A/B: the head then had the shot's fastest move to make, coming back up)
$B n-top fit-m3_k_bump fit-m3_k_stroke 1 --keep root,pelvis,spineLower,spineUpper,chest,hipAbd.near,hipAbd.far,thigh.near,thigh.far,shin.near,shin.far,foot.near,foot.far,toe.near,toe.far --add head=-4.5,neck=-3.5 --hands near=crest --note "top of the stroke: the stroke still's arm and head on the bump key's trunk, the finger pads curving over the dome"
$B n-flat fit-m3_k_bump --hands near=flat --note "fingers-only key: stroking down, the fingers flatter"
$B n-rest rest --hands near=hang --add forearm.near=10,upperArm.near=-3 --note "the master's pose, the elbow softly bent (a relaxed arm is never locked straight; a straight one is the IK singularity the lift starts from) and the hand loosely curled"
# fingers in flight: loosely curled and together (reels: a hand in flight never flies open), for fingers-only keys
$B n-limp rest --hands near=limp --note "fingers-only key: the hand relaxes in flight"
# the lift's breakdown, in JOINT space: a third of the way from rest to the bump key, so the elbow bends progressively
# (a hand-space line from a hanging arm lifts the wrist toward the shoulder and snaps the elbow into its bend). Used as a
# reach via AND an arm-only key at the same time (PIPELINE lesson 20). The in-between stills (m3_lift1/2) confirmed the
# rest of the path: the shot already passes lift1 within 0.01 spine-lengths, and lift2 drifted onto the key itself.
$B n-lift n-rest n-bump 0.35 --hands near=limp --note "lift breakdown: elbow a third bent, hand trailing"
# the head's breakdown on the way back up from the look-down (head/neck-only key, kind breakdown): a third of the way up,
# so the rise is one unhurried move instead of a hold and then most of it in 0.3 s (v3 Lasseter)
$B n-look n-top n-rest 0.35 --hands near=crest --note "head/neck-only breakdown: a third of the way up from the look-down"
# sigh-look (a re-cut for the Braxton Hicks story): after the sigh she looks down at her bump with no stroke: the end of the
# breath out with the stroke key's head and neck, the hand left where the sigh put it
$B n-gaze n-top n-out 1 --keep head,neck --from B --note "after the sigh, looking down at her bump: the end of the breath out (n-out) with the look-down's head and neck (n-top's), the hand where the sigh left it (sigh-look)"
# ease-sway (Braxton Hicks story): as a tightening eases she sways her weight from the back foot to the front one, her
# hand on her bump, then lifts her eyes to the bag by the door and smiles. No stills: the legs tilt from the ankles (both
# thighs together; plantFeet ik keeps the feet planted and carries the hips ~25 px back, ~30 px forward), the trunk
# counters a little, the back knee softens under the forward weight
$B n-sway-back n-bump --add thigh.near=2,thigh.far=2,spineLower=0.8,head=3,neck=3 --note "weight on the back foot, the hips ~25 px back, the trunk a touch forward over them, her head bowed to her bump (ease-sway)"
$B n-sway-front n-bump --add thigh.near=-2.5,thigh.far=-2.5,spineLower=-1,shin.near=3,head=3,neck=3 --note "weight onto the front foot, the hips ~30 px forward, the trunk a touch back, the back knee soft (ease-sway)"
$B n-sway-settle n-bump --add thigh.near=-1.5,thigh.far=-1.5,spineLower=-0.6,shin.near=1.5,head=3,neck=3 --note "settled, the weight a little forward of centre (ease-sway)"
$B n-sway-bag n-sway-settle --add head=-2,neck=-1.5,chest=-0.5 --note "settled, her head up from the bump to look at the bag by the door, on the floor ahead (ease-sway)"
