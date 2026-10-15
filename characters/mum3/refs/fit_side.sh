#!/bin/sh
# fit_side.sh — mum3's SIDE-ON POSE LIBRARY (characters/mum3/poses/side/<pose>.json), rebuilt from its reference stills:
#   1. fit the rig to the still's landmarks, placed by the still's floor row (tools/fit_pose.mjs --floor), into side/fit/:
#      the POSTURE (each segment's direction, --dirs), the positions only anchoring her (a still's proportions are its own);
#   2. put the pose's contacts on what they rest on, nothing through the floor (tools/floor_pose.mjs), into side/;
#   3. the furniture (--props) is placed from her posed body when drawn (parts/props.js), so it needs no step here.
# Re-run after any rig change (all of them, in order), then check them against their stills: tools/side_match.py, and
# the critic pack (tools/critic_F.py mum3 --side). New pose: generate stills (docs/REF_PROMPTS.md, side-on), pick the
# best by side_match, add two lines here. Side-on library, PIPELINE lesson 62. The stills are measurement only.
set -e
cd "$(dirname "$0")/../../.."
R=characters/mum3/refs
fit() {   # fit <pose> <still> [--far-hidden] [fit_pose options]   (--far-hidden: the far arm hidden behind her, as the still hides it)
  n=$1; s=$2; shift 2; show="--show far.arm"; if [ "$1" = "--far-hidden" ]; then show=""; shift; fi
  [ -f $R/pose/$s.json ] || python3 tools/pose_est.py $R/images/$s.png --out $R/pose/$s.json --hands
  node tools/fit_pose.mjs mum3 $R/pose/$s.json side/fit/$n --base rest --floor $show --dirs 0.5 --turn 0.4 "$@" | tail -1
}
floor() {   # floor <pose> [floor_pose options]: side/fit/<pose> → side/<pose>
  n=$1; shift
  node tools/floor_pose.mjs mum3 side/fit/$n --out side/$n "$@" | head -2
}
bumphands() {   # bumphands <pose>: both hands cradling the bump's underside (a spot on the bump, in the belly bone's rest
  # space, so a new fit keeps them there): the fit put the still's wrists where its smaller bump is, and ours floated in
  # front of hers (critic R1 "the hands float past the bump")
  n=$1
  node tools/contact_pose.mjs mum3 side/$n side/$n --side near --at 0.44,-4.0 --on belly --surface bump --handDir -25 --hand lay 2>/dev/null | tail -1
  node tools/contact_pose.mjs mum3 side/$n side/$n --side far --at 0.53,-3.85 --on belly --surface bump --handDir -20 --hand lay 2>/dev/null | tail -1
}
dirs() {   # dirs <pose> [pose_dirs options]: a posture written as segment directions, on side/fit/<pose> in place
  n=$1; shift
  node tools/pose_dirs.mjs mum3 side/fit/$n "$@"
}
settle() {   # settle <pose> [floor_pose options]: a further solve on side/<pose> in place (a limb laid on a surface)
  n=$1; shift
  node tools/floor_pose.mjs mum3 side/$n "$@" | head -2
}

# kneeling up: both knees and the tops of both shoes on the floor (a kneeling shin rests along it)
fit kneel s_kneel_up_1
floor kneel --touch leg.near:4,leg.near:7,leg.far:4,leg.far:7,shoe.near:2,shoe.near:4,shoe.far:2,shoe.far:4 --bones shin,foot,toe
bumphands kneel

# all fours: knees, shoe tops and both palms down, the palms laid flat with the fingers forward (--flat); the trunk and
# arms move with them (one stiff contact pulls the others: LM, not one bone at a time)
fit all-fours s_all_fours_1 --hand near=press,far=press
V="pelvis,spineLower,spineUpper,chest"; for sd in near far; do V="$V,wristFlex.$sd,hand.$sd,foreRot.$sd,upperArm.$sd,forearm.$sd"; done
floor all-fours --touch leg.near:4,leg.near:7,leg.far:4,leg.far:7,shoe.near:2,shoe.far:2,hand.near.palm:low,hand.far.palm:low --flat hand.near,hand.far --bones thigh,shin,foot,toe --vars $V --free root.0 --keep 0.3

# sitting on a kitchen chair, both feet flat (the far shoe at the standing rest pose's height, 0.162 H up: the floor seen a
# little from above, as on every pose)
fit sit-chair s_sit_chair_1 --props chair
floor sit-chair --touch shoe.near:5,shoe.near:6@-0.04,shoe.far:5@-0.162,shoe.far:6@-0.202 --bones shin,foot,toe
bumphands sit-chair

# sitting on a birth ball
fit sit-ball s_sit_ball_0 --props ball
floor sit-ball --touch shoe.near:5,shoe.near:6@-0.04,shoe.far:5@-0.162,shoe.far:6@-0.202 --bones shin,foot,toe

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

# squatting to pick up a toddler's ball beside her near foot. The still's arms are 20% longer than hers (shoulder to
# fingertip 1.7 hip-to-shoulder lengths against her 1.36), so they reach the floor from its half squat and hers can't:
# fitted to its hand she pitched over (round 1), and from its half squat she held the toy at her shins (round 2 "the toy
# 170 px up"). So she does what a real pregnant woman does: squats lower, the knees apart round the bump (fx.kneesApart),
# the back straight and leaning 27° (the still's 24-31°), the head up; the near arm hangs straight down outside her knee
# to a ball (16 cm: r 0.36 H) on the floor beside her foot, a step nearer us (toy near: in front of her leg, a little
# lower), her fingers on its crown; the far arm hidden behind her, as in the still.
fit bend-pick s_bend_pick_1 --far-hidden --twin legs --props toy:r=0.36:near=1:dx=-0.12 --hand near=press --fix fx.kneesApart=1
dirs bend-pick --twin legs --dir pelvis=-63,spineLower=-63,spineUpper=-63,chest=-65,neck=-72,head=-80,thigh.near=-20,shin.near=118,upperArm.near=78,forearm.near=78,hand.near=86
floor bend-pick --twin legs --touch shoe.near:5,shoe.near:6@-0.04 --bones shin,foot,toe
settle bend-pick --twin legs --fixroot --touch hand.near.palm:low@-0.67 --vars upperArm.near,forearm.near,hand.near --bones x --keep 0.3

# walking: the contact position (front heel down, back toe pushing off)
# (the arms swing against the legs: the still paces, its near arm back with the near leg, critic R1 "she paces")
fit walk-contact s_walk_contact_1
dirs walk-contact --dir upperArm.near=76,forearm.near=58,hand.near=68,upperArm.far=104,forearm.far=98,hand.far=100
floor walk-contact --touch shoe.near:low,shoe.far:low@-0.162 --bones foot,toe

# walking: the passing position (the estimator joins the front knee to the back ankle here: the legs read off the still
# with tools/grid_still.py and set by hand)
fit walk-pass s_walk_pass_1 --set kneeR:545:1135,ankleR:560:1440,heelR:525:1480,footR:695:1495,kneeL:390:1135,ankleL:255:1325,heelL:195:1335,footL:295:1460
dirs walk-pass --dir upperArm.near=95,forearm.near=82,hand.near=88,upperArm.far=95,forearm.far=88,hand.far=92
floor walk-pass --touch shoe.near:low --bones foot,toe
