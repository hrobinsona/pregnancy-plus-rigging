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
bumphands() {   # bumphands <pose> [near wrist x,y] [near hand dir] [far wrist x,y] [far hand dir] [near elbow swivel]: both hands on the bump
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
  # (the near ELBOW's swivel, deg: − swings it out from her side, so the upper arm hangs down her side as the kneeling and
  # seated stills draw it; at the fit's own swivel the upper arm ran 12–17° back and the elbow stuck out behind her back,
  # round 6; tools/side_dirs.mjs measures it. Only as far as the QA limbs gate allows: at −40 the forearm and hand turned
  # toward the camera through the breath, drawn at 67–84% of their length, so kneel −30, sit-chair −20)
  # (the shape 'softrest': the fingers softly together, each a little curled round the bump, more toward the little finger;
  # siderest's one straight angle for every finger read as "stiff… fingers always pointed directly out at a specific
  # angle", Harry, round 8; with fx.fingersIn the curl shows in the picture: fxset below)
  node tools/contact_pose.mjs mum3 side/$n side/$n --side near --at ${2:-0.38,-4.31} --on belly --surface bump --handDir ${3:-43} --hand softrest --inside 0.03 ${6:+--phi $6} 2>/dev/null | tail -1
  node tools/contact_pose.mjs mum3 side/$n side/$n --side far --at ${4:-0.40,-4.36} --on belly --surface bump --handDir ${5:-43} --hand softrest --back --inside 0.05 2>/dev/null | tail -1
}
fxset() {   # fxset <pose> key=val,...: set pose fx on side/<pose> in place, after its solves (fingersIn, fingersInNear: how
  want "$1" || return 0   # much of a hand's finger curl shows in the picture, engine/rig.js)
  n=$1; python3 - "characters/mum3/poses/side/$n.json" "$2" <<'PYS'
import json, sys
f, kv = sys.argv[1], sys.argv[2]; p = json.load(open(f)); x = p.setdefault('fx', {})
for e in kv.split(','): k, v = e.split('='); x[k] = float(v)
json.dump(p, open(f, 'w'), indent=1); print(f'fx {f.split("/")[-1]}: {kv}')
PYS
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
onthigh() {   # onthigh <pose> <side> <wrist x,y in the thigh's rest space> <hand dir>: that hand resting along the top of its
  want "$1" || return 0   # thigh, palm down, the fingers softly curled over it toward the knee (softrest + fx.fingersIn<Side> 0.5)
  node tools/contact_pose.mjs mum3 side/$1 side/$1 --side $2 --on thigh.$2 --at $3 --handDir $4 --hand softrest 2>/dev/null | tail -1
}
onknee() {   # onknee <pose> <side> <wrist x,y in the shin's rest space> <hand dir> [knee side] [shape]: that hand resting on a knee
  want "$1" || return 0   # (its own by default; the other: reaching across her, the far hand on the near knee)
  node tools/contact_pose.mjs mum3 side/$1 side/$1 --side $2 --on shin.${5:-$2} --at $3 --handDir $4 --hand ${6:-lay} 2>/dev/null | tail -1
}
nudge() {   # nudge <pose> bone=deg,...: add degrees to bones of side/<pose> in place, after its floor solve (signs differ per
  want "$1" || return 0   # bone and side: check them with tools/bone_signs.mjs before writing one)
  n=$1; python3 - "characters/mum3/poses/side/$n.json" "$2" <<'PYS'
import json, sys
f, kv = sys.argv[1], sys.argv[2]; p = json.load(open(f)); b = p.setdefault('bones', {})
for e in kv.split(','): k, v = e.split('='); b[k] = round(b.get(k, 0) + float(v), 3)
json.dump(p, open(f, 'w'), indent=1); print(f'nudge {f.split("/")[-1]}: {kv}')
PYS
}
settle() {   # settle <pose> [floor_pose options]: a further solve on side/<pose> in place (a limb laid on a surface)
  want "$1" || return 0
  n=$1; shift
  node tools/floor_pose.mjs mum3 side/$n "$@" | head -2
}
farleg() {   # farleg <pose> <knee dx,dy> <ankle dx,dy>: the far knee and ankle placed at those offsets from the near ones
  want "$1" || return 0   # (H, far − near, + forward / down, read off the still's legs), by direction and drawn length
  node tools/far_leg.mjs mum3 side/$1 --set knee=$2,ankle=$3 | head -1
}

# kneeling up: both knees, the shins and the tops of both feet on the floor (a kneeling shin rests along it; the foot lies
# on its instep, the sole up: leg:9 is the instep, shoe:tip the toe. The shoes' vamp and tip on the floor stood them on
# end at 45° with the heels up, "boots standing on their toes", round 5)
# (the far knee and shoe on the far floor line, 0.162 H up, as the standing rest pose draws the far shoe: on one line the
# far shoe hid behind the near one, the still draws both; the far side seen from a little above, fx.farUp, so the far
# thigh stays upright to reach it)
# (the far HIP alone raised (fx.farUpLegs), not the far shoulder: with fx.farUp 0.12 the far strap stood up past her throat
# as a dark lobe, "a hook at the base of the throat", round 6; the far hand rests hidden behind the bump either way)
fit kneel s_kneel_up_1 --fix fx.farUpLegs=0.162
# (the chin up a touch, the head drawn 10° back of plumb, as the still holds it: fitted, her face looked down at the floor
# ahead, round 3 "the head pitched down in kneel and the seated poses")
# (the legs PARALLEL, the far one the near one's twin raised onto the far floor line (fx.farUpLegs): fitted 12° apart the far
# knee stood 98 px ahead of the near one as a second ball, round 5 "two knees side by side"; tools/far_leg.mjs, lesson 65)
dirs kneel --dir head=-100,thigh.near=86,thigh.far=86
# (the TOES left in line with the foot, as every kneeling still points them: free, the solve bent them 34–60° to reach the
# floor and the shoe curled over the foot as a dark hook, white between the two, round 7; a ballet flat barely bends)
floor kneel --touch leg.near:4,leg.near:7,leg.near:9,shoe.near:tip --bones shin,foot --twin legs
bumphands kneel 0.38,-4.31 43 0.40,-4.36 43 -30
fxset kneel fingersIn=0.5   # (the fingertips curling round the bump's underside, as the still's)
# (the far shin and shoe PARALLEL to the near ones and 0.2 H above all along, as the still draws them: on the far floor
# line the far toe sat only 15 px above the near one, the far shoe's heel a dark cap over the near heel, "two shoes stacked
# into one lump", round 6, every lens; tools/far_leg.mjs: knee −48, ankle −45, toe −45 px)
nudge kneel shin.far=-1.5,foot.far=-8

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
# (the far shin and shoe parallel, 0.2 H above the near ones all along, as kneeling: round 6 "the far shoe fused into it")
nudge all-fours shin.far=-1.5,foot.far=-8

# sitting on a kitchen chair, both feet flat (the far shoe at the standing rest pose's height, 0.162 H up: the floor seen a
# little from above, as on every pose)
# (the shins upright, the feet clear in front of the chair's front legs, her height found from her feet: with the shins
# free the floor solve raked them 15–20° back under the seat, critic R2–R3)
fit sit-chair s_sit_chair_1 --props chair --fix fx.farUpLegs=0.162
# (the legs PARALLEL, the far one the near one's twin, raised onto the far floor line (fx.farUpLegs) and as far AHEAD as
# the profile turn puts its hip (+27 px): its shoe above and ahead of the near shoe, its knee a sliver past the near one.
# Its toe poked past the near shoe on the near shin's line, round 4; its shin set back 10° crossed the near one in an X,
# round 5; its thigh foreshortened (0.85) pulled the far foot 30 px BEHIND the near heel, "one shoe with a hump, a cuff
# round the heel", round 6, every lens; the stills' far ankle sits 40 px ahead and 35 up, lesson 65)
dirs sit-chair --dir thigh.near=3,thigh.far=3,shin.near=94,shin.far=94,head=-97
floor sit-chair --touch shoe.near:ball,shoe.near:heel@-0.1,shoe.far:ball@-0.162,shoe.far:heel@-0.248 --bones foot,toe
# (round 8: the far leg where the still draws it, SET BACK: its knee hidden behind the near thigh, its shin a strip behind the
# near one, its shoe behind the near heel and a little up (the near shoe hides its toe). Ahead and up, its knee showed
# past the near one and its shoe ahead of the near shoe: "Far away knee/leg at the wrong position. Hence lands
# awkwardly - esp compared to the ref image", Harry. Round 6's far foot behind read as "one shoe with a hump" when the far
# shoe was drawn 36% deep, lesson 69; the still's landmarks put the far knee 0.18 H behind, and its shoes by eye)
farleg sit-chair -0.17,-0.02 -0.25,-0.07
# (the near hand at the bump's widest point, the forearm near level, as the still rests it; under the bump, the forearm
# hung steeply down to her lap, critic R3; the still's spot and its hand 17° down, round 5)
# (round 9: the hands 10° down, as the still lays its near hand nearly level across the bump; at 17° the fingers pointed
# down the bump's front, "a long flat paddle… straight at one angle", round 8; at 10° with the curl the fingers still
# "point ~30° down", round 9 natural, craft and body: 7° (at 4° the hand turned toward the camera on the breath, drawn
# at 84% of its length, qa_checks limbs), the curl kept for qa_checks curl, the wrist 0.035 H back so
# the tips stay inside the bump)
bumphands sit-chair 0.6,-4.369 7 0.63,-4.42 7 -20
fxset sit-chair fingersIn=0.5   # (the fingers curving round the bump in the picture; at 0.3 they measured 4° of curl, qa_checks curl)

# sitting on a birth ball, her hips a little above her knees (the thighs 13° down to the knee, as a birth ball is chosen
# for), the shins upright and her height found from her feet (with the shins free the floor solve raked them back under
# her): the ball's top is her seat, so the higher seat gives the still's big ball (level thighs drew it ~20% small,
# critic R2)
fit sit-ball s_sit_ball_0 --props ball --fix fx.farUpLegs=0.162
# (the legs PARALLEL as sit-chair's, the far one ahead and up: the far shin raked 15° forward of the near one splayed the
# lower legs into an X, round 5; on the near shin's line the shoes merged, round 4; behind (thigh 0.85) "the far shoe
# stacked on the near shoe's heel", round 6: the still's far ankle is +43, −34 px from the near one)
dirs sit-ball --dir pelvis=-95,spineLower=-87,spineUpper=-84,neck=-72,head=-95,thigh.near=13,thigh.far=13,shin.near=95,shin.far=95
floor sit-ball --touch shoe.near:ball,shoe.near:heel@-0.1,shoe.far:ball@-0.162,shoe.far:heel@-0.248 --bones foot,toe
# (round 8: the far leg where the still draws it, measured on it at 1:1: the far knee just ahead of the near one and the far
# foot well AHEAD and up, its heel clear of the near ankle (+0.3, −0.24 H; the twin's 0.08 ahead tucked the far toe onto
# the near one, "the feet fuse into one double-toed shoe", round 7): the ball's chair is lower, her feet set wider)
farleg sit-ball 0.08,-0.06 0.3,-0.24
# (both hands resting on her thighs by the knees, as the still: the fitted far hand hung in the air ahead of the knee, round 4
# "the clearest rig tell in the library")
onknee sit-ball far -0.5,-2.25 20
# (the NEAR hand lying along the top of her thigh by the knee, palm down, the wrist nearly straight, the fingers softly
# curled over the thigh, as the still rests it: fitted, it was propped on its fingertips with the wrist bent sharply down and
# the fingers fanned stiffly at the knee, "hands stiff vs relaxed on the leg", Harry, round 8; the still's spot through
# tools/side_zoom.py, 0.03 H off)
onthigh sit-ball near 0.317,-2.917 25
fxset sit-ball fingersInNear=0.5

# supported squat, holding a chair's back in front of her; both feet flat and both knees forward (--twin legs: the far leg
# the near one's twin, just behind it). The thighs at full length: the stills draw the near thigh long and level from the
# seat to the knee in front of the bump (foreshortened by --splay, the knee stayed under the bump: round 2 "the thighs
# missing, only the knees peek out")
# (--fix fx.kneesApart=1: her knees apart round the bump, a fact the profile can't show: the skirt hangs between them as a
# curtain, engine/drape.js)
fit squat s_squat_0 --twin legs --props chair:back=1 --hand near=hold,far=hold --fix fx.kneesApart=1,fx.fingersIn=1,fx.farUpLegs=0.162
# (both hands on the chair's back: the far arm the near one's twin; the still hides it behind the near arm and the fit
# left it hanging at her bump, round 4; each hand DRAPED over the top, the palm on it and the wrist flexed so the fingers
# curl down over its front, as the still's: two fists clenched on the crest, round 4; laid level, hand=8, the hand hovered
# past the post like a paddle, round 5: the palm on the crest and the fingers curling down its front IN the picture,
# fx.fingersIn, the hand's width squashed edge-on, as the still draws it, lesson 64)
# (round 8: HOLDING it, not draped: the wrist in line with the forearm (the hand drawn −12°, the forearm −18°), the palm on
# the top and the fingers wrapped over and down its far side, 'hold'; draped, the wrist dropped 40° and the fingers dangled
# past the post, "wrist/hands look odd and not holding the chair", Harry, round 8)
dirs squat --twin legs,arms --dir upperArm.near=19,forearm.near=-18,hand.near=-12
scale squat hand.near=1:0.6,hand.far=1:0.6
# (the far leg the near one's twin first, raised onto the far floor line (fx.farUpLegs), then placed by farleg below: its
# shoe above and ahead of the near shoe. On one line the shoes merged into one double-toed shoe, round 4; its own knee
# higher and shin more upright made a second full knee and splayed the shins 17°, round 5, lesson 65)
floor squat --touch shoe.near:ball,shoe.near:heel@-0.1 --bones foot,toe --twin legs
# (round 8: the legs APART, as a squat stands: the feet wide, so the far foot (on a far floor line further up) sits 0.3 H
# ahead and 0.4 up from the near one, under a far knee hidden just behind and above the near knee, its shin 11° steeper:
# the shins part in a V. The twin, 0.16 ahead and 0.2 up, ran the shins together and the far knee bulged above the near
# one, "the legs aren't separated enough which means the knee then forms at a wierd place/angle", Harry; the still's
# landmarks: knee −0.06, −0.23, ankle +0.29, −0.42)
farleg squat -0.05,-0.2 0.3,-0.4
# (round 9: the far arm HIDDEN behind the near one, as the still draws it: shown, its hand sat a hand's width ahead of the
# near one on the post as a second set of fingers, round 8)
fxset squat show.far.arm=0

# leaning her forearms on a kitchen counter: the forearms and hands laid level on its top (the fit left them sloping down
# to the hands, the forearms off the worktop)
# (both feet flat: the far shoe at the height the standing rest pose draws it, 0.162 H up, as on every standing pose; the
# palms pressed flat on the worktop)
# (the palms DOWN, the backs of the hands a low dome, the fingers curling just onto the worktop, the thumbs under out of
# sight: 'palmdown', fx.fingersIn; 'press' drew each hand thumb side up with its fingers straight out in the air, "hands
# are the wrong way around on the counter", Harry, round 8). fingersIn 0.2: the hand and forearm lie FLAT on the top; at 0.7
# the fingers curled down to the worktop's line, the slab sat at their tips and the forearm hovered over it, "the
# fingertips drooping over the corner… holding the edge, not resting on the slab" (round 9, natural and craft)
fit lean-counter s_lean_counter_1 --props counter --hand near=palmdown,far=palmdown --fix fx.fingersIn=0.2
scale lean-counter hand.near=1:0.6,hand.far=1:0.6   # (the palms on the worktop seen side-on, edge-on as all fours')
# (the knees SOFT, ~14° each, as the still: a woman leaning her weight on her forearms unlocks her knees; at 5° they read
# locked, round 4)
dirs lean-counter --dir thigh.near=94,shin.near=108,thigh.far=80,shin.far=95
floor lean-counter --touch shoe.near:ball,shoe.near:heel@-0.1,shoe.far:ball@-0.162,shoe.far:heel@-0.248 --bones shin,foot,toe
# (the hands sloping ~10° down from the wrist so the curled fingertips rest on the worktop, as the still's; level, the
# fingers stood out in the air above it, round 8)
settle lean-counter --fixroot --bones x --vars upperArm.near,forearm.near,upperArm.far,forearm.far,hand.near,hand.far --aim forearm.near=0,forearm.far=0,hand.near=10,hand.far=10
# (round 9: the far hand just BEHIND the near one on the worktop, as the still: its forearm a little more bent under the far
# shoulder, the hand at the near one's angle (wrist 0.06 H back, level). Left where the fit put it, it lay 0.25 H AHEAD of
# the still's, "a second row of fingertips poking out ahead of the near hand", round 8, every lens; tools/bone_signs.mjs)
nudge lean-counter upperArm.far=-14,forearm.far=22,hand.far=-8

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
# (bending down she ROUNDS her back, the still one C from the shoulder blade over the seat: fx.lumbar 0, no hollow at the
# waist; at the pitch's 0.1 H in it ran from the blade to the seat as a ramp, "a cape", round 6)
# ROUND 11: all three s_kneel_pick stills round her BACK like a second bump and hide the front one behind the hanging arm;
# fitted to them, every lens read ours as "the bump has gone… a stranger would not read her as pregnant", the back
# hunched (round 10). s_kneel_pick2_1 (asked for the bump in front and a straight back) shows it: the trunk ~15° forward
# with a long straight back, the head down to the ball, the arm hanging past the bump's side. Her shorter arm can't reach
# an orange-sized ball on the floor from there, so the ball is a child's play ball (r 0.47 H, ~21 cm) ON the floor under
# her palm: lifted at her fingertips the small one read "floating in mid-air", shadow or not (rounds 7–10)
# (the trunk nearly UPRIGHT, ~6° forward, the hips sitting back on the kneeling thigh for the reach: leaned 20° from the
# hips for the reach, the seat swung back into a second round mass behind her and the hanging arm covered the bump's
# front, at film size the bump read smaller than the seat, round 11)
fit kneel-pick s_kneel_pick2_1 --props toy:r=0.47:near=1 --hand near=softrest --fix fx.fingersIn=0.6
dirs kneel-pick --dir pelvis=-84,spineLower=-84,spineUpper=-82,chest=-80,neck=-56,head=-60,thigh.near=-8,shin.near=95,thigh.far=40,shin.far=-172,upperArm.near=92,forearm.near=88,hand.near=88,upperArm.far=70,forearm.far=20,hand.far=40
floor kneel-pick --touch leg.far:4@-0.162,leg.far:7@-0.162,leg.far:9@-0.162,shoe.far:tip@-0.162,shoe.near:ball,shoe.near:heel@-0.1 --bones shin,foot --sides far --vars thigh.far,thigh.near,foot.near
# (round 9: 'softrest', the fingers together and the thumb along the top: 'lay' (the bump's open hand, its thumb out apart
# from the index) stuck the thumb straight out past the kneecap, "the single worst mark in the library… a pointer", round 8)
onknee kneel-pick far -0.05,-2.26 45 near softrest

# walking: the contact position (front heel down, back toe pushing off)
# (every walking hand IDLE: following its forearm, the wrist drooping a few degrees toward plumb, the fingers a little curled
# from the index to the little finger with the tips apart and the thumb resting along the index, most of the curl in
# the picture (fx.fingersIn 0.8: the stills' soft C; at 0.5 the fingers still read straight beside them, at 1 with more
# curl the tips hooked sideways like claws; side_zoom.py --try, round 8); the hand bones had been set to the stills' wrist → FINGERTIP lines, so with straight fingers the
# whole hand bent 20–30° off the forearm at the wrist: "stiffness… the close hand pointed very down… held at an angle
# rather than following the arm then with a slight flop", Harry, round 8. side_walk.mjs trails the hand behind the swing)
# (the arms swing against the legs: the still paces, its near arm back with the near leg, critic R1 "she paces"; the far
# arm swung back far enough to show behind her, round 2 "a sliver"; the skirt trailing a little, fx.skirtSwing)
fit walk-contact s_walk_contact_1 --hand near=idle,far=idle --fix fx.skirtSwing=0.1,fx.fingersIn=0.8
dirs walk-contact --dir upperArm.near=76,forearm.near=58,hand.near=63,upperArm.far=118,forearm.far=108,hand.far=104
# (both feet on ONE floor line, as the still: striding, the far foot on the far floor line, 0.162 H up, read as a front
# heel floating 20 px off the ground, critic R2–R3)
# (the FEET of a step: the front heel striking with its toe up ~20°, the back foot up on its toes pushing off, the toes
# bent flat on the floor at the ball, the back knee giving to reach; both shoes flat read as standing with the legs
# apart, round 4)
dirs walk-contact --dir foot.far=38,foot.near=99,toe.near=4
floor walk-contact --touch shoe.far:low,shoe.near:tip,shoe.near:ball --bones toe --vars shin.near --keep 0.5

# walking: the down position, just after contact (the front foot flat, its knee giving ~20° under her weight, her body at
# its lowest; the back foot up on its toes; the arms past the peak of their swing). A key of the walk cycle
# (tools/side_walk.mjs); the still's near arm swings back with the near leg (pacing), set against the legs as contact's
fit walk-down s_walk_down_0 --hand near=idle,far=idle --fix fx.skirtSwing=0.1,fx.fingersIn=0.8
# (the back HEEL up ~35°: a foot's ankle → ball runs 59° on screen standing flat, so 58° here drew it planted, round 6
# "the back heel planted"; held, not solved, so the floor solve bends the shin and the toes to reach the floor. The arms
# past the peak of their swing, the front forearm lifting and the back arm well behind: at 10–16° they hung, "arms idle")
dirs walk-down --dir upperArm.near=74,forearm.near=50,hand.near=56,upperArm.far=118,forearm.far=110,hand.far=106,thigh.far=76,shin.far=94,thigh.near=102,shin.near=120,foot.near=95,toe.near=2
floor walk-down --touch shoe.far:ball,shoe.far:heel@-0.1,shoe.near:tip,shoe.near:ball --bones toe --sides near --vars shin.near,thigh.near,foot.far --keep 0.5

# walking: the passing position (the far arm swinging forward past the bump as the still's does, round 2 "missing"; the
# skirt still an A, trailing behind her as she walks: fx.skirtSwing) (the estimator joins the front knee to the back ankle here: the legs read off the still
# with tools/grid_still.py and set by hand)
fit walk-pass s_walk_pass_1 --hand near=idle,far=idle --fix fx.skirtSwing=0.2,fx.fingersIn=0.8 --set kneeR:545:1135,ankleR:560:1440,heelR:525:1480,footR:695:1495,kneeL:390:1135,ankleL:255:1325,heelL:195:1335,footL:295:1460
dirs walk-pass --dir upperArm.near=95,forearm.near=82,hand.near=86,upperArm.far=62,forearm.far=57,hand.far=62
floor walk-pass --touch shoe.near:low --bones foot,toe
