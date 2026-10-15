#!/bin/sh
# fit_side.sh — mum3's SIDE-ON POSE LIBRARY (characters/mum3/poses/side/<pose>.json), rebuilt from its reference stills:
#   1. fit the rig to the still's landmarks, placed by the still's floor row (tools/fit_pose.mjs --floor), into side/fit/:
#      the POSTURE (each segment's direction, --dirs), the positions only anchoring her (a still's proportions are its own);
#   2. put the pose's contacts on what they rest on, nothing through the floor (tools/floor_pose.mjs), into side/;
#   3. the furniture (--props) is placed from her posed body when drawn (parts/props.js), so it needs no step here.
# Re-run after any rig change (all of them, in order), then check them against their stills: tools/side_match.py, and
# the critic pack (tools/critic_F.py mum3 --side). New pose: generate stills (docs/REF_PROMPTS.md, side-on), pick the
# best by side_match, add two lines here. Side-on library, PIPELINE lesson 62. The stills are measurement only.
#   sh characters/mum3/refs/fit_side.sh [pose ...]   (no poses: all of them; else only those, e.g. walk-contact walk-pass)
set -e
cd "$(dirname "$0")/../../.."
R=characters/mum3/refs
ONLY=" $* "
want() { [ "$ONLY" = "  " ] || case "$ONLY" in *" $1 "*) return 0;; *) return 1;; esac; }
fit() {   # fit <pose> <still> [--far-hidden] [fit_pose options]   (--far-hidden: the far arm hidden behind her, as the still hides it)
  want "$1" || return 0
  n=$1; s=$2; shift 2; show="--show far.arm"; if [ "$1" = "--far-hidden" ]; then show=""; shift; fi
  [ -f $R/pose/$s.json ] || python3 tools/pose_est.py $R/images/$s.png --out $R/pose/$s.json --hands
  node tools/fit_pose.mjs mum3 $R/pose/$s.json side/fit/$n --base rest --floor $show --dirs 0.5 --turn 0.4 "$@" | tail -1
}
floor() {   # floor <pose> [floor_pose options]: side/fit/<pose> → side/<pose>
  want "$1" || return 0
  n=$1; shift
  node tools/floor_pose.mjs mum3 side/fit/$n --out side/$n "$@" | head -2
}
bumphands() {   # bumphands <pose> [near wrist x,y] [near hand dir] [far wrist x,y] [far hand dir]: both hands on the bump
  want "$1" || return 0
  # (a spot on the bump, in the belly bone's rest space, so a new fit keeps them there; by default cradling its underside):
  # the fit put the still's wrists where its smaller bump is, and ours floated in front of hers (critic R1 "the hands
  # float past the bump")
  n=$1
  node tools/contact_pose.mjs mum3 side/$n side/$n --side near --at ${2:-0.44,-4.0} --on belly --surface bump --handDir ${3:--25} --hand lay 2>/dev/null | tail -1
  node tools/contact_pose.mjs mum3 side/$n side/$n --side far --at ${4:-0.53,-3.85} --on belly --surface bump --handDir ${5:--20} --hand lay 2>/dev/null | tail -1
}
dirs() {   # dirs <pose> [pose_dirs options]: a posture written as segment directions, on side/fit/<pose> in place
  want "$1" || return 0
  n=$1; shift
  node tools/pose_dirs.mjs mum3 side/fit/$n "$@"
}
scale() {   # scale <pose> bone=s,...: a segment's drawn length (pose.scale), on side/fit/<pose> in place: a thigh turned out
  want "$1" || return 0   # toward us or away (knees apart round the bump) is foreshortened in profile by the cosine of the turn
  n=$1; python3 - "characters/mum3/poses/side/fit/$n.json" "$2" <<'PYS'
import json, sys
f, kv = sys.argv[1], sys.argv[2]; p = json.load(open(f)); sc = p.setdefault('scale', {})
for e in kv.split(','): b, v = e.split('='); sc[b] = [float(v), 1]
json.dump(p, open(f, 'w'), indent=1); print(f'scale {f.split("/")[-1]}: {kv}')
PYS
}
settle() {   # settle <pose> [floor_pose options]: a further solve on side/<pose> in place (a limb laid on a surface)
  want "$1" || return 0
  n=$1; shift
  node tools/floor_pose.mjs mum3 side/$n "$@" | head -2
}

# kneeling up: both knees and the tops of both shoes on the floor (a kneeling shin rests along it)
# (the far knee and shoe on the far floor line, 0.162 H up, as the standing rest pose draws the far shoe: on one line the
# far shoe hid behind the near one, the still draws both; the far side seen from a little above, fx.farUp, so the far
# thigh stays upright to reach it)
fit kneel s_kneel_up_1 --fix fx.farUp=0.12
floor kneel --touch leg.near:4,leg.near:7,leg.far:4@-0.162,leg.far:7@-0.162,shoe.near:2,shoe.near:4,shoe.far:2@-0.162,shoe.far:4@-0.162 --bones shin,foot,toe
bumphands kneel

# all fours: knees, shoe tops and both palms down, the palms laid flat with the fingers forward (--flat); the trunk and
# arms move with them (one stiff contact pulls the others: LM, not one bone at a time)
# (the far knee, shoe and hand on the far floor line, as kneeling; both arms STRAIGHT and upright, the wrists under the
# shoulders (round 3: 12–15° forward, "the weight not over the hands"): held upright by heavy aims while the trunk and root
# move (left free, the solve leaned them forward; left out, it couldn't reach the floor and flipped a hand); the neck raised so the head sits up off her shoulders, as the still:
# fitted, the neck ran out level with the back, the head hanging, round 3)
fit all-fours s_all_fours_1 --hand near=press,far=press --fix fx.farUp=0.162
dirs all-fours --dir neck=-58,head=-66,upperArm.near=88,forearm.near=88,upperArm.far=86,forearm.far=86
V="pelvis,spineLower,spineUpper,chest"; for sd in near far; do V="$V,wristFlex.$sd,hand.$sd,foreRot.$sd,upperArm.$sd,forearm.$sd"; done
floor all-fours --touch leg.near:4,leg.near:7,leg.far:4@-0.162,leg.far:7@-0.162,shoe.near:2,shoe.far:2@-0.162,hand.near.palm:low,hand.far.palm:low@-0.162 --flat hand.near,hand.far --bones thigh,shin,foot,toe --vars $V --free root.0 --keep 0.3 --aim upperArm.near=88,forearm.near=86,upperArm.far=86,forearm.far=84,hand.near=0,hand.far=0 --aimw 6

# sitting on a kitchen chair, both feet flat (the far shoe at the standing rest pose's height, 0.162 H up: the floor seen a
# little from above, as on every pose)
# (the shins upright, the feet clear in front of the chair's front legs, her height found from her feet: with the shins
# free the floor solve raked them 15–20° back under the seat, critic R2–R3)
fit sit-chair s_sit_chair_1 --props chair
dirs sit-chair --dir thigh.near=3,thigh.far=3,shin.near=94,shin.far=96
floor sit-chair --touch shoe.near:5,shoe.near:6@-0.04,shoe.far:5@-0.162,shoe.far:6@-0.202 --bones foot,toe
# (the near hand at the bump's widest point, the forearm near level, as the still rests it; under the bump, the forearm
# hung steeply down to her lap, critic R3)
bumphands sit-chair 0.5,-4.32 -8

# sitting on a birth ball, her hips a little above her knees (the thighs 13° down to the knee, as a birth ball is chosen
# for), the shins upright and her height found from her feet (with the shins free the floor solve raked them back under
# her): the ball's top is her seat, so the higher seat gives the still's big ball (level thighs drew it ~20% small,
# critic R2)
fit sit-ball s_sit_ball_0 --props ball
dirs sit-ball --dir thigh.near=13,thigh.far=11,shin.near=95,shin.far=97
floor sit-ball --touch shoe.near:5,shoe.near:6@-0.04,shoe.far:5@-0.162,shoe.far:6@-0.202 --bones foot,toe

# supported squat, holding a chair's back in front of her; both feet flat and both knees forward (--twin legs: the far leg
# the near one's twin, just behind it). The thighs at full length: the stills draw the near thigh long and level from the
# seat to the knee in front of the bump (foreshortened by --splay, the knee stayed under the bump: round 2 "the thighs
# missing, only the knees peek out")
# (--fix fx.kneesApart=1: her knees apart round the bump, a fact the profile can't show: the skirt hangs between them as a
# curtain, engine/drape.js)
fit squat s_squat_0 --twin legs --props chair:back=1 --hand near=grip,far=grip --fix fx.kneesApart=1
floor squat --touch shoe.near:low --bones foot,toe --sides near

# leaning her forearms on a kitchen counter: the forearms and hands laid level on its top (the fit left them sloping down
# to the hands, the forearms off the worktop)
# (both feet flat: the far shoe at the height the standing rest pose draws it, 0.162 H up, as on every standing pose; the
# palms pressed flat on the worktop)
fit lean-counter s_lean_counter_1 --props counter --hand near=press,far=press
floor lean-counter --touch shoe.near:5,shoe.near:6@-0.04,shoe.far:5@-0.162,shoe.far:6@-0.202 --bones shin,foot,toe
settle lean-counter --fixroot --bones x --vars upperArm.near,forearm.near,upperArm.far,forearm.far,hand.near,hand.far --aim forearm.near=0,forearm.far=0,hand.near=0,hand.far=0

# squatting to pick up a toddler's ball ahead of her near foot. The still's arms are 20% longer than hers (shoulder to
# fingertip 1.7 hip-to-shoulder lengths against her 1.36), so they reach the floor from its half squat and hers can't:
# fitted to its hand she pitched over (round 1), from its half squat she held the toy at her shins (round 2), and a toy
# under her heels with the arm hanging plumb read as wrong (round 3: "ahead of the toes, a diagonal reach, the seat over
# the heels"). So she does what a real pregnant woman does: a DEEP squat, her seat low over her heels, the shins leaning
# well forward (35°, the knees past the toes) with the feet flat, her knees apart round the bump (fx.kneesApart: the far
# knee a little further forward and up, as the still draws it), the back straight and leaning 35°, the head up; the near
# arm reaches down and forward past her knee to a small ball (11 cm: r 0.24 H, round 3 "0.65× the size") on the floor
# ahead of her toes, a step nearer us (toy near), her fingers on its crown; the far arm hidden behind her, as in the still.
fit bend-pick s_bend_pick_1 --far-hidden --twin legs --props toy:r=0.24:near=1 --hand near=press --fix fx.kneesApart=1
dirs bend-pick --dir pelvis=-70,spineLower=-70,spineUpper=-71,chest=-73,neck=-75,head=-86,thigh.near=-30,shin.near=130,thigh.far=-36,shin.far=128,foot.near=59,foot.far=59,upperArm.near=78,forearm.near=74,hand.near=82
floor bend-pick --touch shoe.near:5,shoe.near:6@-0.04,shoe.far:5@-0.162,shoe.far:6@-0.202 --bones foot
settle bend-pick --fixroot --touch hand.near.palm:low@-0.43 --vars upperArm.near,forearm.near,hand.near --bones x --keep 0.3 --aim upperArm.near=78,forearm.near=74 --aimw 3

# walking: the contact position (front heel down, back toe pushing off)
# (the arms swing against the legs: the still paces, its near arm back with the near leg, critic R1 "she paces"; the far
# arm swung back far enough to show behind her, round 2 "a sliver"; the skirt trailing a little, fx.skirtSwing)
fit walk-contact s_walk_contact_1 --fix fx.skirtSwing=0.1
dirs walk-contact --dir upperArm.near=76,forearm.near=58,hand.near=68,upperArm.far=118,forearm.far=108,hand.far=110
# (both feet on ONE floor line, as the still: striding, the far foot on the far floor line, 0.162 H up, read as a front
# heel floating 20 px off the ground, critic R2–R3)
floor walk-contact --touch shoe.near:low,shoe.far:low --bones foot,toe

# walking: the passing position (the far arm swinging forward past the bump as the still's does, round 2 "missing"; the
# skirt still an A, trailing behind her as she walks: fx.skirtSwing) (the estimator joins the front knee to the back ankle here: the legs read off the still
# with tools/grid_still.py and set by hand)
fit walk-pass s_walk_pass_1 --fix fx.skirtSwing=0.2 --set kneeR:545:1135,ankleR:560:1440,heelR:525:1480,footR:695:1495,kneeL:390:1135,ankleL:255:1325,heelL:195:1335,footL:295:1460
dirs walk-pass --dir upperArm.near=95,forearm.near=82,hand.near=88,upperArm.far=68,forearm.far=55,hand.far=62
floor walk-pass --touch shoe.near:low --bones foot,toe
