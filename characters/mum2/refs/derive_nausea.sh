#!/bin/sh
# Derived keys for the nausea shot, all from FITTED keys (refs/fit_keys.sh): accents and in-betweens, never invented poses.
set -e
B="python3 tools/pose_blend.py mum2"
S="python3 tools/pose_set.py mum2"
# the resting far hand CURLS round the bump's rim (k1/k2/k8: only the curled fingers show over the far edge): shape + roll
# the cover hand slants across toward the near cheek (ref k4), not fingers-up over the nose
for k in fit-k4 fit-k5 fit-k6 fit-k7; do $S $k --add hand.far=-25 >/dev/null; done
# the resting far hand lies round the FAR side of the bump at mid-height (k1/k2/k8): wrist on the bump's back surface just inside
# the rim, elbow down at her side — drawn as fingertips over the rim (parts/wrap.js)
for k in fit-k1 fit-k2 fit-k8; do node tools/contact_pose.mjs mum2 $k $k --side far --at 0.83,-3.62 --surface bump --back 1 --gap 0.04 --phi 0 --handDir 140 --hand limp >/dev/null; done
# feet stay planted: every key's root x is the rest's (the generator's framing drifts a little between refs)

$B n-wind fit-k4 --add chest=3,spineUpper=2,clavicle.near=8,clavicle.far=-8,neck=4,head=2 --hands near=press --note "retch wind-up: chin tucks on a hard swallow, shoulders creep up"
# THE HIT = the retch video's hit frame (f26) refitted with the trunk's FORESHORTENING (tools/fit_pose.mjs --fold): a ¾
# figure doubling over bends toward the camera, so her shoulders and head DROP more than they swing sideways (measured:
# nose 1.2 H down, 0.6 H forward) — flat spine rotations alone read as "toppling like a post" (critic R17)
node tools/fit_pose.mjs mum2 characters/mum2/refs/pose/v/retch/f0026.json v/retch-hit-fold --base fit-k4 --fold --z arm.far.fore=55 --view far=back --order far.hand=front:jaw,far.fore=front:trunk >/dev/null
$B n-hit v/retch-hit-fold --set pelvis=0,spineLower=18.7,hipAbd.near=0.4,hipAbd.far=0.1,clavicle.near=-10,clavicle.far=2,thigh.near=29,shin.near=-43,foot.near=14,thigh.far=32,shin.far=-46,foot.far=14 --hands near=press --note "the hit: the retch video's own hit frame refitted with the trunk's foreshortening — shoulders and head drop, hips go back, knees give; the head bows into the hand (nod)"
# the head goes FORWARD over the top of the bump as well as down (k5, the video: about half as far forward as down) — the
# upper back rounds (chest); measured before: the head only dropped, 0.46 H down and 0.1 H forward (critic R23 "sinks back")
$S n-hit --add chest=10 >/dev/null
$B n-hit2 n-hit --add clavicle.near=1,clavicle.far=-3,chest=2,spineUpper=1 --note "the hit's settle: she keeps squeezing — shoulders inch up, back curls a touch more (a held hit must not freeze)"
$B n-rebound fit-k4 n-hit2 0.55 --hands near=press --note "the release comes a third of the way up: she stays hunched, the second hit must read against it"
$B n-small fit-k4 n-hit2 0.82 --from B --note "second hit: from the partial release (0.55) down again to 0.82 of the first — sudden like the first, clearly smaller"
# n-small knees: the second hit is smaller mainly in the KNEES (the whole figure shortens less), its shoulders-and-head
# jerk stays sharp (critic R27)
python3 - <<'PY'
import json
P='characters/mum2/poses/'; k4=json.load(open(P+'fit-k4.json')); h=json.load(open(P+'n-hit2.json')); s=json.load(open(P+'n-small.json'))
for b in ['thigh.near','thigh.far','shin.near','shin.far','foot.near','foot.far','spineLower']: s['bones'][b]=k4['bones'].get(b,0)+0.5*(h['bones'].get(b,0)-k4['bones'].get(b,0))
s['note']=s.get('note','')+' (n-small knees: legs and lower back at 50%)'; json.dump(s,open(P+'n-small.json','w'),indent=1)
PY
$B n-small2 n-small --add clavicle.near=2,clavicle.far=-2,chest=1 --note "the second hit's squeeze"
$B n-hold fit-k6 n-hit 0.3 --note "uncurls slowly, still a little hunched"
$B n-in fit-k6 --add clavicle.near=26,clavicle.far=-26 --note "breath IN through the hand: ribcage swells, shoulders and the raised elbow rise clearly, head up a touch"
$B n-out fit-k6 --add clavicle.near=-12,clavicle.far=12,spineUpper=-2,neck=2 --note "breath OUT (k6): shoulders drop, a small slump"
$B n-sigh fit-k7 fit-k8 0.5 --add clavicle.near=-3,clavicle.far=3,head=5 --from A --note "the sigh: shoulders drop as the hand falls"
$B n-lift fit-k3 --note "the lift's breakdown (k3) with the hand loosely curled, knuckles leading (critic: an open, fingers-up hand read as a wave / an oath)"
$B n-swallow fit-k2 --add neck=4,head=5,chest=1 --note "the swallow: chin dips, eyes drop toward the bump"
$B n-look fit-k8 --add neck=5,head=8,chest=2,spineUpper=1 --note "relief: chin drops toward the bump, looking down at it"
$B n-peel fit-k7 --add hand.far=30 --note "the peel (k7) with the wrist flexed: palm still toward her face, fingers loosely together (the fitted k7 hand stood upright, fingers up: an oath, critic R26)"
$B n-fall-via fit-k7 fit-k8 0.5 --set hand.far=30 --from A --hands far=limp --note "reach via: the far hand falling in front of the chest, wrist limp"
node tools/plant_feet.mjs mum2 fit-k1 fit-k2 fit-k3 fit-k4 fit-k5 fit-k6 fit-k7 fit-k8 fit-bl1 fit-bl2 fit-bf1 fit-bf2 n-wind n-hit n-rebound n-small n-hold n-in n-out n-sigh n-fall-via n-swallow n-look n-lift n-hit2 n-small2
$S n-in --scale spineUpper=1.07:1.1,chest=1.18:1.05 >/dev/null; $S n-out --scale chest=0.9:1 >/dev/null
$S n-lift --hand 'far={"pose":"cup","mix":{"relaxed":0.35}}' >/dev/null
$S n-peel --hand 'far={"pose":"relaxed","mix":{"cup":0.5}}' >/dev/null
$S n-sigh --hand 'far={"pose":"relaxed","mix":{"cup":0.1}}' >/dev/null   # the falling hand lands OPEN on the bump (a limp curl seen from the back read as a fist)
$S n-hit2 --scale chest=0.6:1,neck=0.6:1 >/dev/null; $S n-small --scale chest=0.64:1,neck=0.64:1 >/dev/null; $S n-small2 --scale chest=0.62:1,neck=0.62:1 >/dev/null; $S n-rebound --scale chest=0.72:1,neck=0.72:1 >/dev/null   # the neck all but disappears as the chin tucks   # the in-breath SWELLS the ribcage (scale), it does not tip the head
# the head NODS where she looks down (fx.headPitch, engine/warp.js) instead of rolling the flat head on its neck: the chin
# dips into the cover hand, the swallow, the hunched hold, relief looking down at the bump (the retch's own nod comes from
# the video layer, anims/nausea-to-belly.json video[retch])
$S n-wind --fx headPitch=13 >/dev/null; $S n-hit --fx headPitch=30 >/dev/null; $S n-rebound --fx headPitch=29 >/dev/null; $S n-small --fx headPitch=28 >/dev/null; $S n-hold --fx headPitch=24 >/dev/null; $S n-hit2 --fx headPitch=32,swivelFar=46 >/dev/null; $S n-small2 --fx headPitch=29,swivelFar=42 >/dev/null; $S n-out --fx headPitch=27 >/dev/null; $S n-in --fx headPitch=22,swivelFar=-8 >/dev/null
$S n-swallow --add head=-3 --fx headPitch=10 >/dev/null; $S n-look --add head=-4 --fx headPitch=16 >/dev/null
# the far ELBOW swings out to her side as she folds under the hand at her mouth (fx.swivelFar: turns the elbow about the
# shoulder→wrist line) — held fixed it dropped onto the bump and the forearm became a vertical tube (critic, round 8);
# k5: the forearm angles down and OUT to an elbow beside her far side (35° still propped it on the bump top, R24; 55° a wing)
$S n-wind --fx swivelFar=8 >/dev/null; $S n-hit --fx swivelFar=50 >/dev/null; $S n-rebound --fx swivelFar=30 >/dev/null; $S n-small --fx swivelFar=40 >/dev/null; $S n-hold --fx swivelFar=10 >/dev/null
# every key of the shot: the near hand stays planted on the bump (pin), the far arm never swings free
for k in fit-k1 fit-k2 fit-k3 fit-k4 fit-k5 fit-k6 fit-k7 fit-k8 fit-bl1 fit-bl2 fit-bf1 fit-bf2 n-wind n-hit n-rebound n-small n-hold n-in n-out n-sigh n-fall-via n-swallow n-look n-lift n-hit2 n-small2 n-peel; do $S $k --fx pinNear=1,armFree=0 >/dev/null; done

# --- v14: the GENTLE version (client: "the nausea part is far too extreme and fast"): no retch — nausea cues at the
# mouth (a small hunch and a swallow), ONE deep inhale (shoulders and ribcage rise, the head lifts a touch, eyes closed),
# a long exhale (shoulders drop, a soft slump), she feels better, the hand comes down, both hands hold the bump
$B n-cue fit-k4 --add chest=2,clavicle.near=3,clavicle.far=-3,neck=3 --hands near=press --note "nausea cue at the mouth: a small hunch on a hard swallow, shoulders creep up a little"
$B n-inhale fit-k6in1 fit-k6in2 0.5 --add clavicle.near=3,clavicle.far=-3 --note "the deep IN-breath through the hand, MEASURED (two fitted stills): vs the out-breath (k6) the head lifts ~15° of nod, the shoulders rise ~10°, the chest straightens ~3°; +3° shoulders so it reads at phone size"
$B n-exhale fit-k6 --add clavicle.near=-4,clavicle.far=4,spineUpper=-1 --note "the long OUT-breath (k6, measured) a touch deeper: shoulders drop, a soft slump — it passes"
node tools/plant_feet.mjs mum2 n-cue n-inhale n-exhale >/dev/null
$S n-inhale --scale spineUpper=1.04:1.06,chest=1.12:1.04 >/dev/null; $S n-exhale --scale chest=0.95:1 >/dev/null
$S n-cue --fx headPitch=14,pinNear=1,armFree=0 >/dev/null; $S n-inhale --fx headPitch=11,pinNear=1,armFree=0 >/dev/null; $S n-exhale --fx headPitch=27,pinNear=1,armFree=0 >/dev/null
