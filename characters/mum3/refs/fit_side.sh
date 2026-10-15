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
  # (a spot on the bump, in the belly bone's rest space, so a new fit keeps them there): the fit put the still's wrists
  # where its smaller bump is, and ours floated in front of hers (critic R1 "the hands float past the bump"). The spots and
  # directions are the STILL's (its wrist through contact_pose --print-rest, the direction wrist → knuckles), checked
  # beside it with tools/side_zoom.py; the shape 'siderest' (fingers nearly straight and together, lying along the bump,
  # the thumb along the top); --inside keeps the fingertips inside OUR bump's outline (the wrist slides back): at the
  # still's spot the sitting hand's fingers ran 0.26 H past our bump into the air. The far hand lies behind the bump
  # (--back), hidden as the stills hide it ('rest', cupped under the bump, curled the fingers into a row of knobs at its
  # edge and doubled the near hand's tips: round 5 "stripe fingers", lesson 64)
  n=$1
  node tools/contact_pose.mjs mum3 side/$n side/$n --side near --at ${2:-0.38,-4.31} --on belly --surface bump --handDir ${3:-43} --hand siderest --inside 0.03 2>/dev/null | tail -1
  node tools/contact_pose.mjs mum3 side/$n side/$n --side far --at ${4:-0.40,-4.36} --on belly --surface bump --handDir ${5:-43} --hand siderest --back --inside 0.05 2>/dev/null | tail -1
}
dirs() {   # dirs <pose> [pose_dirs options]: a posture written as segment directions, on side/fit/<pose> in place
  want "$1" || return 0
  n=$1; shift
  node tools/pose_dirs.mjs mum3 side/fit/$n "$@"
}
scale() {   # scale <pose> bone=s[:across],...: a segment's drawn length (pose.scale), on side/fit/<pose> in place: a thigh
  want "$1" || return 0   # turned out toward us or away (knees apart round the bump) is foreshortened in profile by the cosine
  # of the turn; :across squashes its width (a hand seen edge-on, palm down: its knuckles stack, the fingers overlap)
  n=$1; python3 - "characters/mum3/poses/side/fit/$n.json" "$2" <<'PYS'
import json, sys
f, kv = sys.argv[1], sys.argv[2]; p = json.load(open(f)); sc = p.setdefault('scale', {})
for e in kv.split(','): b, v = e.split('='); sc[b] = [float(x) for x in (v.split(':') + ['1'])[:2]]
json.dump(p, open(f, 'w'), indent=1); print(f'scale {f.split("/")[-1]}: {kv}')
PYS
}
onknee() {   # onknee <pose> <side> <wrist x,y in the shin's rest space> <hand dir> [knee side]: that hand resting on a knee
  want "$1" || return 0   # (its own by default; the other: reaching across her, the far hand on the near knee)
  node tools/contact_pose.mjs mum3 side/$1 side/$1 --side $2 --on shin.${5:-$2} --at $3 --handDir $4 --hand lay 2>/dev/null | tail -1
}
settle() {   # settle <pose> [floor_pose options]: a further solve on side/<pose> in place (a limb laid on a surface)
  want "$1" || return 0
  n=$1; shift
  node tools/floor_pose.mjs mum3 side/$n "$@" | head -2
}

# kneeling up: both knees, the shins and the tops of both feet on the floor (a kneeling shin rests along it; the foot lies
# on its instep, the sole up: leg:9 is the instep, shoe:tip the toe. The shoes' vamp and tip on the floor stood them on
# end at 45° with the heels up, "boots standing on their toes", round 5)
# (the far knee and shoe on the far floor line, 0.162 H up, as the standing rest pose draws the far shoe: on one line the
# far shoe hid behind the near one, the still draws both; the far side seen from a little above, fx.farUp, so the far
# thigh stays upright to reach it)
fit kneel s_kneel_up_1 --fix fx.farUp=0.12,fx.farUpLegs=0.162
# (the chin up a touch, the head drawn 10° back of plumb, as the still holds it: fitted, her face looked down at the floor
# ahead, round 3 "the head pitched down in kneel and the seated poses")
# (the legs PARALLEL, the far one the near one's twin raised onto the far floor line (fx.farUpLegs): fitted 12° apart the far
# knee stood 98 px ahead of the near one as a second ball, round 5 "two knees side by side"; tools/far_leg.mjs, lesson 65)
dirs kneel --dir head=-100,thigh.near=86,thigh.far=86
floor kneel --touch leg.near:4,leg.near:7,leg.near:9,shoe.near:tip --bones shin,foot,toe --twin legs
bumphands kneel

# all fours: knees, shoe tops and both palms down, the palms laid flat with the fingers forward (--flat); the trunk and
# arms move with them (one stiff contact pulls the others: LM, not one bone at a time)
# (the far knee, shoe and hand on the far floor line, as kneeling; both arms STRAIGHT and upright, the wrists under the
# shoulders (round 3: 12–15° forward, "the weight not over the hands"): held upright by heavy aims while the trunk and root
# move (left free, the solve leaned them forward; left out, it couldn't reach the floor and flipped a hand); the neck raised so the head sits up off her shoulders, as the still:
# fitted, the neck ran out level with the back, the head hanging, round 3)
fit all-fours s_all_fours_1 --hand near=press,far=press --fix fx.farUp=0.162
# (the palms flat on the floor seen side-on: the hand's width edge-on, its fingers stacked, as the still draws them; the
# full back of the hand read as a paddle, round 5, lesson 64)
scale all-fours hand.near=1:0.6,hand.far=1:0.6
dirs all-fours --dir neck=-58,head=-66,upperArm.near=88,forearm.near=88,upperArm.far=86,forearm.far=86
V="pelvis,spineLower,spineUpper,chest"; for sd in near far; do V="$V,wristFlex.$sd,hand.$sd,foreRot.$sd,upperArm.$sd,forearm.$sd"; done
floor all-fours --touch leg.near:4,leg.near:7,leg.far:4@-0.162,leg.far:7@-0.162,leg.near:9,shoe.near:tip,leg.far:9@-0.162,shoe.far:tip@-0.162,hand.near.palm:low,hand.far.palm:low@-0.162 --flat hand.near,hand.far --bones thigh,shin,foot,toe --vars $V --free root.0 --keep 0.3 --aim upperArm.near=88,forearm.near=86,upperArm.far=86,forearm.far=84,hand.near=0,hand.far=0 --aimw 6 --twin legs

# sitting on a kitchen chair, both feet flat (the far shoe at the standing rest pose's height, 0.162 H up: the floor seen a
# little from above, as on every pose)
# (the shins upright, the feet clear in front of the chair's front legs, her height found from her feet: with the shins
# free the floor solve raked them 15–20° back under the seat, critic R2–R3)
fit sit-chair s_sit_chair_1 --props chair --fix fx.farUpLegs=0.162
# (the legs PARALLEL, the far one a little BEHIND and up on the far floor line, as the still sets it: its thigh foreshortened
# (scale 0.85: the far knee turned a touch away) and raised (fx.farUpLegs). Its toe poked past the near shoe on the near
# shin's line, round 4; its shin set back 10° crossed the near one in an X, the far knee a crescent ahead, round 5, lesson 65)
dirs sit-chair --dir thigh.near=3,thigh.far=3,shin.near=94,shin.far=94,head=-97
scale sit-chair thigh.far=0.85
floor sit-chair --touch shoe.near:ball,shoe.near:heel@-0.1,shoe.far:ball@-0.162,shoe.far:heel@-0.248 --bones foot,toe
# (the near hand at the bump's widest point, the forearm near level, as the still rests it; under the bump, the forearm
# hung steeply down to her lap, critic R3; the still's spot and its hand 17° down, round 5)
bumphands sit-chair 0.635,-4.369 17 0.66,-4.42 17

# sitting on a birth ball, her hips a little above her knees (the thighs 13° down to the knee, as a birth ball is chosen
# for), the shins upright and her height found from her feet (with the shins free the floor solve raked them back under
# her): the ball's top is her seat, so the higher seat gives the still's big ball (level thighs drew it ~20% small,
# critic R2)
fit sit-ball s_sit_ball_0 --props ball --fix fx.farUpLegs=0.162
# (the legs PARALLEL as sit-chair's, the far one behind and up: the far shin raked 15° forward of the near one splayed the
# lower legs into an X, round 5; on the near shin's line the shoes merged, round 4)
dirs sit-ball --dir pelvis=-95,spineLower=-87,spineUpper=-84,neck=-72,head=-95,thigh.near=13,thigh.far=13,shin.near=95,shin.far=95
scale sit-ball thigh.far=0.85
floor sit-ball --touch shoe.near:ball,shoe.near:heel@-0.1,shoe.far:ball@-0.162,shoe.far:heel@-0.248 --bones foot,toe
# (both hands resting on her thighs by the knees, as the still: the fitted far hand hung in the air ahead of the knee, round 4
# "the clearest rig tell in the library")
onknee sit-ball far -0.5,-2.25 20

# supported squat, holding a chair's back in front of her; both feet flat and both knees forward (--twin legs: the far leg
# the near one's twin, just behind it). The thighs at full length: the stills draw the near thigh long and level from the
# seat to the knee in front of the bump (foreshortened by --splay, the knee stayed under the bump: round 2 "the thighs
# missing, only the knees peek out")
# (--fix fx.kneesApart=1: her knees apart round the bump, a fact the profile can't show: the skirt hangs between them as a
# curtain, engine/drape.js)
fit squat s_squat_0 --twin legs --props chair:back=1 --hand near=drape,far=drape --fix fx.kneesApart=1,fx.fingersIn=1,fx.farUpLegs=0.162
# (both hands on the chair's back: the far arm the near one's twin; the still hides it behind the near arm and the fit
# left it hanging at her bump, round 4; each hand DRAPED over the top, the palm on it and the wrist flexed so the fingers
# curl down over its front, as the still's: two fists clenched on the crest, round 4; laid level, hand=8, the hand hovered
# past the post like a paddle, round 5: the palm on the crest and the fingers curling down its front IN the picture,
# fx.fingersIn, the hand's width squashed edge-on, as the still draws it, lesson 64)
dirs squat --twin legs,arms --dir upperArm.near=19,forearm.near=-18,hand.near=22
scale squat hand.near=1:0.6,hand.far=1:0.6
# (the far leg the near one's twin, raised onto the far floor line (fx.farUpLegs): its knee a sliver above the near one, its
# shoe above and ahead of the near shoe. On one line the shoes merged into one double-toed shoe, round 4; its own knee
# higher and shin more upright made a second full knee and splayed the shins 17°, round 5, lesson 65)
floor squat --touch shoe.near:ball,shoe.near:heel@-0.1 --bones foot,toe --twin legs

# leaning her forearms on a kitchen counter: the forearms and hands laid level on its top (the fit left them sloping down
# to the hands, the forearms off the worktop)
# (both feet flat: the far shoe at the height the standing rest pose draws it, 0.162 H up, as on every standing pose; the
# palms pressed flat on the worktop)
fit lean-counter s_lean_counter_1 --props counter --hand near=press,far=press
scale lean-counter hand.near=1:0.6,hand.far=1:0.6   # (the palms on the worktop seen side-on, edge-on as all fours')
# (the knees SOFT, ~14° each, as the still: a woman leaning her weight on her forearms unlocks her knees; at 5° they read
# locked, round 4)
dirs lean-counter --dir thigh.near=94,shin.near=108,thigh.far=80,shin.far=95
floor lean-counter --touch shoe.near:ball,shoe.near:heel@-0.1,shoe.far:ball@-0.162,shoe.far:heel@-0.248 --bones shin,foot,toe
settle lean-counter --fixroot --bones x --vars upperArm.near,forearm.near,upperArm.far,forearm.far,hand.near,hand.far --aim forearm.near=0,forearm.far=0,hand.near=0,hand.far=0

# picking up a ball: kneeling on ONE knee, as a pregnant woman is told to (the far knee, shin and the top of the far shoe
# on the far floor line, sitting back toward that heel; the NEAR foot flat ahead, its thigh level and its knee up, the
# bump over it), lifting a child's play ball (11 cm, r 0.24 H, the still's) in her near hand, the far hand across on the
# near knee (s_kneel_pick_0). Why the NEAR leg forward: the still draws the forward thigh in front of the skirt, the hem
# draped over it; with the far leg forward (round 4) its thigh hid behind the bump and dress and its knee popped out beside
# the bump on a post (all three lenses: "the forward thigh is missing… on hinges"). Why the ball lifted to her shin, not
# on the floor: her arms are shorter than the stills' (shoulder to fingertip 2.7 H, theirs ~3.2; a real woman's ~3.1), so
# reaching the floor bent her 50-60° over the thigh and hid the bump; lifting it, she leans ~30°, the still's posture.
# (Not a deep squat to the floor, bend-pick, rounds 1–4: she hunched or held the ball at her shins, the thigh hid the bump.)
# (the hand ON the toy, the ball under it and the fingers over its crown as the still picks it up; the far hand draped
# over the kneecap: its fingers curl down the knee's front, in the picture: fx.fingersIn, round 5, lesson 64)
fit kneel-pick s_kneel_pick_0 --props toy:r=0.24:near=1:held=1 --hand near=grip --fix fx.fingersIn=0.6
dirs kneel-pick --dir pelvis=-64,spineLower=-62,spineUpper=-62,chest=-64,neck=-52,head=-58,thigh.near=-8,shin.near=95,thigh.far=58,shin.far=-172,upperArm.near=96,forearm.near=84,hand.near=86,upperArm.far=70,forearm.far=20,hand.far=40
floor kneel-pick --touch leg.far:4@-0.162,leg.far:7@-0.162,leg.far:9@-0.162,shoe.far:tip@-0.162,shoe.near:ball,shoe.near:heel@-0.1 --bones shin,foot,toe --sides far --vars thigh.far,thigh.near,foot.near
onknee kneel-pick far -0.05,-2.26 45 near

# walking: the contact position (front heel down, back toe pushing off)
# (the arms swing against the legs: the still paces, its near arm back with the near leg, critic R1 "she paces"; the far
# arm swung back far enough to show behind her, round 2 "a sliver"; the skirt trailing a little, fx.skirtSwing)
fit walk-contact s_walk_contact_1 --fix fx.skirtSwing=0.1
dirs walk-contact --dir upperArm.near=76,forearm.near=58,hand.near=68,upperArm.far=118,forearm.far=108,hand.far=110
# (both feet on ONE floor line, as the still: striding, the far foot on the far floor line, 0.162 H up, read as a front
# heel floating 20 px off the ground, critic R2–R3)
# (the FEET of a step: the front heel striking with its toe up ~20°, the back foot up on its toes pushing off, the toes
# bent flat on the floor at the ball, the back knee giving to reach; both shoes flat read as standing with the legs
# apart, round 4)
dirs walk-contact --dir foot.far=38,foot.near=90,toe.near=8
floor walk-contact --touch shoe.far:low,shoe.near:tip,shoe.near:ball --bones toe --vars shin.near --keep 0.5

# walking: the down position, just after contact (the front foot flat, its knee giving ~20° under her weight, her body at
# its lowest; the back foot up on its toes; the arms past the peak of their swing). A key of the walk cycle
# (tools/side_walk.mjs); the still's near arm swings back with the near leg (pacing), set against the legs as contact's
fit walk-down s_walk_down_0 --fix fx.skirtSwing=0.1
dirs walk-down --dir upperArm.near=80,forearm.near=64,hand.near=72,upperArm.far=112,forearm.far=104,hand.far=106,thigh.far=76,shin.far=94,thigh.near=102,shin.near=120,foot.near=58,toe.near=6
floor walk-down --touch shoe.far:ball,shoe.far:heel@-0.1,shoe.near:tip,shoe.near:ball --bones toe --sides near --vars shin.near,foot.near,foot.far --keep 0.5

# walking: the passing position (the far arm swinging forward past the bump as the still's does, round 2 "missing"; the
# skirt still an A, trailing behind her as she walks: fx.skirtSwing) (the estimator joins the front knee to the back ankle here: the legs read off the still
# with tools/grid_still.py and set by hand)
fit walk-pass s_walk_pass_1 --fix fx.skirtSwing=0.2 --set kneeR:545:1135,ankleR:560:1440,heelR:525:1480,footR:695:1495,kneeL:390:1135,ankleL:255:1325,heelL:195:1335,footL:295:1460
dirs walk-pass --dir upperArm.near=95,forearm.near=82,hand.near=88,upperArm.far=62,forearm.far=57,hand.far=85
floor walk-pass --touch shoe.near:low --bones foot,toe
