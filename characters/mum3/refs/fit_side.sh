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
fit() {   # fit <pose> <still> [fit_pose options]
  n=$1; s=$2; shift 2
  [ -f $R/pose/$s.json ] || python3 tools/pose_est.py $R/images/$s.png --out $R/pose/$s.json --hands
  node tools/fit_pose.mjs mum3 $R/pose/$s.json side/fit/$n --base rest --floor --show far.arm --dirs 0.5 "$@" | tail -1
}
floor() {   # floor <pose> [floor_pose options]: side/fit/<pose> → side/<pose>
  n=$1; shift
  node tools/floor_pose.mjs mum3 side/fit/$n --out side/$n "$@" | head -2
}
settle() {   # settle <pose> [floor_pose options]: a further solve on side/<pose> in place (a limb laid on a surface)
  n=$1; shift
  node tools/floor_pose.mjs mum3 side/$n "$@" | head -2
}

# kneeling up: both knees and the tops of both shoes on the floor (a kneeling shin rests along it)
fit kneel s_kneel_up_1
floor kneel --touch leg.near:4,leg.near:7,leg.far:4,leg.far:7,shoe.near:2,shoe.near:4,shoe.far:2,shoe.far:4 --bones shin,foot,toe

# all fours: knees, shoe tops and both palms down, the palms laid flat with the fingers forward (--flat); the trunk and
# arms move with them (one stiff contact pulls the others: LM, not one bone at a time)
fit all-fours s_all_fours_1 --hand near=press,far=press
V="pelvis,spineLower,spineUpper,chest"; for sd in near far; do V="$V,wristFlex.$sd,hand.$sd,foreRot.$sd,upperArm.$sd,forearm.$sd"; done
floor all-fours --touch leg.near:4,leg.near:7,leg.far:4,leg.far:7,shoe.near:2,shoe.far:2,hand.near.palm:low,hand.far.palm:low --flat hand.near,hand.far --bones thigh,shin,foot,toe --vars $V --free root.0 --keep 0.3

# sitting on a kitchen chair, both feet flat
fit sit-chair s_sit_chair_1 --props chair
floor sit-chair --touch shoe.near:low,shoe.far:low --bones foot,toe

# sitting on a birth ball
fit sit-ball s_sit_ball_0 --props ball
floor sit-ball --touch shoe.near:low,shoe.far:low --bones foot,toe

# supported squat, holding a chair's back in front of her; knees turned out (the thighs foreshortened: --splay)
fit squat s_squat_0 --splay --props chair:back=1 --hand near=grip,far=grip
floor squat --touch shoe.near:low,shoe.far:low --bones foot,toe

# leaning her forearms on a kitchen counter: the forearms and hands laid level on its top (the fit left them sloping down
# to the hands, the forearms off the worktop)
fit lean-counter s_lean_counter_1 --props counter
floor lean-counter --touch shoe.near:low,shoe.far:low --bones foot,toe
settle lean-counter --fixroot --bones x --vars upperArm.near,forearm.near,upperArm.far,forearm.far,hand.near,hand.far --aim forearm.near=0,forearm.far=0,hand.near=0,hand.far=0

# squatting, knees apart round the bump, with the toy she has just picked up (her arms can't reach the floor from a squat
# the still's longer-armed figure makes: the hand on the ball at the floor pitched her over and hid the bump). The
# estimator swapped the knees (the far knee pokes forward past the near one in a squat seen a little from the front), so
# the legs and the near arm are read off the still (tools/grid_still.py); the back kept long (--fix spine)
fit bend-pick s_bend_pick_1 --props toy:held=1 --hand near=grip --splay --fix spineLower=0,spineUpper=0,chest=0 --set kneeR:565:1005,ankleR:405:1285,heelR:378:1328,footR:570:1345,kneeL:650:990,ankleL:470:1250,heelL:425:1285,footL:575:1300,elbowR:440:950,wristR:560:1190,indexR:600:1260,pinkyR:585:1255,thumbR:590:1225
floor bend-pick --touch shoe.near:5,shoe.near:6@-0.04,shoe.far:5,shoe.far:6@-0.04 --bones thigh,shin,foot,toe

# walking: the contact position (front heel down, back toe pushing off)
fit walk-contact s_walk_contact_1
floor walk-contact --touch shoe.near:low,shoe.far:low --bones foot,toe

# walking: the passing position (the estimator joins the front knee to the back ankle here: the legs read off the still
# with tools/grid_still.py and set by hand)
fit walk-pass s_walk_pass_1 --set kneeR:545:1135,ankleR:560:1440,heelR:525:1480,footR:695:1495,kneeL:390:1135,ankleL:255:1325,heelL:195:1335,footL:295:1460
floor walk-pass --touch shoe.near:low --bones foot,toe
