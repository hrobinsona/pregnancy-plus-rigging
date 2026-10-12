#!/bin/sh
# Derived keys for the breathe-and-stroke shot, all from FITTED keys (refs/fit_keys.sh): accents, never invented poses.
# Re-run after any re-fit: it is the source of truth for every n-* pose.
set -e
B="python3 tools/pose_blend.py mum3"
# the hand resting on the bump: the fit measures where it is; the fingers lie ON the curve (hands/lay), not straight past it
$B n-bump fit-m3_k_bump --hands near=lay --note "hand on the lower front of the bump, fingers softly curved onto it"
# the deep breath in, readable at phone size (v1 critics: "the breath doesn't read"; the still's own lift is ~3° of chin):
# chest and shoulders up, chin up ~5° from the bump key, the bump swells a little (the hand on it rides out)
$B n-breath fit-m3_k_breath --hands near=lay --add head=-2.2,neck=-1,chest=-2,spineUpper=-0.8,clavicle.near=3 --note "top of the deep breath in"
# the breath out settles a touch LOWER than where it started: shoulders down, chest softens, head sinks
$B n-out fit-m3_k_bump --hands near=lay --add chest=1.2,spineUpper=0.4,clavicle.near=-2,head=1.5,neck=0.5 --note "end of the long breath out: settled lower than the start"
# ... and the bump swells a little with it (the hand resting on it, reach on: belly, rides out)
python3 tools/pose_set.py mum3 n-breath --scale belly=1.025:1.02 >/dev/null
# the stroke's top: the hand on the front of the bump at mid height, elbow under the shoulder (still m3_k_stroke)
$B n-stroke fit-m3_k_stroke --hands near=lay --note "top of the stroke: hand on the bump's front, fingers curved onto it"
# fingers in flight: loosely curled and together (reels: a hand in flight never flies open), for fingers-only keys
$B n-limp rest --hands near=limp --note "fingers-only key: the hand relaxes in flight"
# the lift's breakdown, in JOINT space: a third of the way from rest to the bump key, so the elbow bends progressively
# (a hand-space line from a hanging arm lifts the wrist toward the shoulder and snaps the elbow into its bend). Used as a
# reach via AND an arm-only key at the same time (PIPELINE lesson 20). The in-between stills (m3_lift1/2) confirmed the
# rest of the path: the shot already passes lift1 within 0.01 spine-lengths, and lift2 drifted onto the key itself.
$B n-lift rest n-bump 0.35 --hands near=limp --note "lift breakdown: elbow a third bent, hand trailing"
