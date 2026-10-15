# mum3 side-on pose library: review log

The library is built by `characters/mum3/refs/fit_side.sh` and reviewed with `python3 tools/critic_F.py mum3 --side`
(three fresh critics: natural, body, craft; each scores every pose /10 against its reference still). Harry's bar
(2026-10-14 20:36): every side-on pose "incredibly high quality and look natural", legs, dress and bump like a real
woman, a critic review of at least 8/10, then he looks.

## Round 1 (2026-10-14, the first full library: fits by segment direction, skirt drape with tube, gravity sag, props)

| pose | natural | body | craft |
|---|---|---|---|
| all-fours | 5 | 6 | 5.5 |
| bend-pick | 3 | 4 | 3.5 |
| kneel | 6 | 6.5 | 6 |
| lean-counter | 5 | 4 | 5 |
| sit-ball | 5 | 5.5 | 5 |
| sit-chair | 6 | 7 | 5 |
| squat | 4 | 4 | 4 |
| walk-contact | 5 | 5.5 | 5 |
| walk-pass | 6 | 6 | 5.5 |

All three: NOT YET. What they agree on, most poses first:
- **The dress is a box, a tent or a cape**: its back one straight line from the shoulder blade to a flat-cut hem, no
  lumbar curve, no buttocks under it; no A-line flare or swing in the walks; hem kicks and notches (lean, squat,
  sit-ball, all-fours); the kneeling skirt tapers in like a sack (the tube constraint pulling the back hem in) and hangs
  60 px too low; on all fours it clings instead of falling as a curtain over the thighs.
- **No seat mass**: the buttocks never round out past the back of the thighs.
- **Folded legs on hinges** (squat, bend-pick): only the far knee comes forward; the near thigh is hidden in the skirt
  (foreshortened by `--splay`, its knee behind the far one), the near shin a kneeless stilt. Both knees must come
  forward, the near one on top.
- **Leg shapes**: thighs thin even tubes, shins straight posts with no calf swell, knees balls.
- **Far-side pieces that read as a rig**: a skin knob behind the near shoulder (the far shoulder: bend, squat, sit-ball,
  lean), the far forearm sprouting from under the bump (walks: its upper arm is hidden), shoes merging into one blob,
  a far shoe on end (squat) or toe-down (sit-ball, lean).
- **Hands**: float past the bump (sit-chair, kneel: they should cup its underside), fingers as straight parallel
  stripes; lean-counter's hands stand on edge with the elbows bent 90° (the still: near-straight arms, palms flat).
- **Pose**: bend-pick doesn't pick (the toy at knee height); walk-contact paces (the near arm and leg both back); the
  sit-ball ball is behind her (she perches on its front); all-fours' head droops on a long neck, its back a ramp.
- **Neck** thinner and longer than the stills' everywhere; a light hook at the base of the throat.
- **Props**: the chair's crest a knob on one post, legs off the seat; the counter twice the still's width, no overhang.

**Standing regression (blind A/B, breathe-stroke, the side-on engine vs renders/v5):** no clear difference at phone
size; enlarged, a slight lean to v5: its straight near leg has "a small, readable knee dip and then the calf", the
posed-space leg (engine/leg.js) reads "a little like a tube" and changes shape slightly through the lean. So the
straight leg must keep the old tube's knee dip and calf: round 2's leg work answers it.

## Round 2 (2026-10-15: truer profile `fx.turn 0.4`, twin legs in the folds, postures by direction, hands on the bump)

| pose | natural | body | craft |
|---|---|---|---|
| all-fours | 5 | 5.5 | 5 |
| bend-pick | 4 | 4 | 3 |
| kneel | 6 | 6 | 6.5 |
| lean-counter | 5.5 | 5.5 | 5.5 |
| sit-ball | 5 | 5.5 | 5 |
| sit-chair | 5.5 | 6 | 5.5 |
| squat | 4.5 | 4 | 4 |
| walk-contact | 5 | 5 | 5 |
| walk-pass | 5.5 | 5.5 | 5.5 |

All three: NOT YET. Landed from round 1: the walk no longer paces; she sits on top of the ball; the all-fours back
is no longer a ramp; the hem kicks are gone; the folded poses have seat mass (bend-pick too much); the lean forearms
lie flat; the kneel and sit-chair hands cup the bump. Not landed, all three agree:
- **The dress is still an outline, not cloth.** Seated (chair, ball) the skirt stops at the hip crease and the thigh
  is bare: it should lie along the thigh to 40–60 px short of the knee, a diagonal hem. Squat and bend-pick: a closed
  balloon; the near thigh should come out on top with the hem rising from the seat to the knee and a curtain between
  the knees. All fours: a box; an open curtain from the seat to mid-thigh. Kneel: a straight box standing off the
  thigh, 40 px too long. Walks: a tube, the hem 135–155 px against the stills' 205–215 (1.4× the hips), no swing.
  Everywhere: an inward corner under the bump, a straight back with no lumbar hollow or seat.
- **New fault: skin scallops** under the seat's hem (sit-chair, where they come through the seat; sit-ball,
  bend-pick, squat): the thigh roots below a hem that ends at the hip.
- **Folded legs** (squat, bend-pick) still hide both thighs, one ball knee, shins posts. Bend-pick stoops (35°) and
  holds the toy 170 px up; the still squats with the torso ~15° and the toy on the floor.
- **Leg landmarks**: shins posts, no kneecap step, a knob behind the walking knee instead of a hollow; sit-chair shins
  rake back under the seat (should be ~vertical).
- **Rig tells**: shoes merge (all-fours, kneel, squat, bend); the far-shoulder knob (bend, squat, lean, sit-ball);
  the walk's far arm a sliver (contact) or missing (pass); the walk-contact front heel 15–20 px up.
- **Contacts and props**: the lean forearm 15 px into the counter's band (no overhang); the all-fours far arm 20°
  forward (should be vertical), head low; the sit-ball ball ~20% small; the chair crest a knob.
- **Hands**: stripe fingers; kneel and sit-chair fingers should run ~40° steeper along the bump, thumb along the hand.

## Round 3 (2026-10-15: the lap and the curtain as cloth, walks flare and swing, all-fours skirt off the rump, the far side raised on the floor's far line, the shoes parted, a bigger ball)

| pose | natural | body | craft |
|---|---|---|---|
| all-fours | 5.5 | 5.5 | 5.5 |
| bend-pick | 4 | 4 | 4 |
| kneel | 6 | 5.5 | 6 |
| lean-counter | 5.5 | 6 | 5.5 |
| sit-ball | 6 | 6.5 | 6 |
| sit-chair | 6 | 6.5 | 6 |
| squat | 4.5 | 5 | 4.5 |
| walk-contact | 5.5 | 5.5 | 5 |
| walk-pass | 6 | 6 | 5 |

All three: NOT YET. Landed: the skirt along the seated thigh with a diagonal hem, no skin scallops, the walk's far arm,
the pacing, the bend no longer stoops, the toy on the floor, the all-fours back level and head up, the lean forearms
on the worktop (body lens). Not landed, all three agree:
- **One cloth rule.** The walks' flare starts at the armpit (a cape, a lampshade): the back must follow the body over
  the waist and the seat and flare only below the hip, the hem ~210 px, tilted by the stride. The hard inward corner
  under the bump (walks, lean, kneel, all-fours' notch): the front falls plumb from the bump's lowest point. Kneel: the
  hem 60–80 px too long, the sides taper in (a sack); plumb sides, a straight hem, ~80 px of thigh. All fours: the back
  a vertical cut (flare 15–20 px more, a fold), the bump a low teardrop (round, its bottom about level with the hem).
  Squat and bend: a balloon with a dark pointed tail; the cloth stretched over the seat, the near thigh on top, a
  curtain between the knees. The seat too full when seated (sit-ball 80 px behind the back against the still's 40).
- **Folded legs**: squat and bend-pick show one ball knee and parallel posts: two knees apart (the far one forward and
  up 80–120 px), the feet staggered, the knee the corner of a thick thigh, the calf pressing into the thigh.
- **Leg anatomy** everywhere: no calf swell, no kneecap step, a knob behind the walking knee (a hollow wanted), lean's
  knees locked (soft knees), the all-fours thigh half the still's width.
- **Contacts**: bend-pick's toy under her heels (ahead of the toes, 0.65× the size, a diagonal reach, the seat over the
  heels); the walk-contact front heel on the far floor line reads as floating (the still: one floor line); all-fours
  arms 12–15° forward, the near palm's heel up; sit-chair shins rake back 15–20° (vertical, the feet ahead of the
  chair's legs); the sit-ball ball squashed (round, 15% larger).
- **Hands**: stripe fingers in every pose (tapered, short separations at the tips); kneel and sit-chair fingers should
  rise 30–40° along the bump.
- **Props**: the chair's crest a block (a slat between the posts), its seat too deep; the counter slab thin.
- **Neck** long and thin with a hook at the base of the throat; the head pitched down in kneel and the seated poses.


## Round 4 (2026-10-15: kneel-pick replaces bend-pick, the skirt leaves the bump where it turns back, the walks flare below the seat, the chin up kneeling and seated, a thicker worktop)

| pose | natural | body | craft |
|---|---|---|---|
| all-fours | 5 | 5 | 5 |
| kneel | 6 | 6 | 6 |
| kneel-pick | 4.5 | 4.5 | 4.5 |
| lean-counter | 6 | 5.5 | 5.5 |
| sit-ball | 5.5 | 6 | 6 |
| sit-chair | 6.5 | 6.5 | 6 |
| squat | 5.5 | 5 | 5 |
| walk-contact | 6 | 5.5 | 5.5 |
| walk-pass | 6.5 | 6 | 5.5 |

All three: NOT YET. Landed: the walks flare from the hip (the hem ~200 px, the still's 215), the front falls plumb from
the bump (lean), the walk-contact front foot on one floor line, the sit-ball ball round and near size, the toy on the
floor ahead of the knee, the counter's slab. Not landed, all three agree:
- **Legs are posts on hinges** (every pose, every lens's first or third fix). Thighs 0.6–0.7 of the stills' in the
  folded poses (all-fours 55 vs 90 px, kneel-pick 65 vs 100, squat 62 vs 97); no calf belly (it should peak a third
  of the way down the shin, the ankle ~45% of it); no kneecap step on a straight leg; lean's knees locked.
- **Twin legs**: the far leg hides behind the near one, the shoes merge into one double-toed shoe (squat, sit-ball,
  sit-chair, kneel, all-fours). The stills set the far foot ~50–60 px forward and ~30–40 px up, the squat's far knee
  forward and higher.
- **kneel-pick has no front thigh**: a knee pops out beside the bump on a post. The still's front thigh runs nearly
  level from the hip to a knee ~110 px ahead of the bump, the skirt draped over it; the far arm shows from the
  shoulder and its hand drapes over the kneecap; the toy is small (~65 px) and the fingers curl round it.
- **The dress back is a ruler or a ramp** (kneel, lean, walks, kneel-pick): a rounded upper back, a lumbar hollow, the
  seat, then the flare. Hems are bowls with rounded corners (kneel, walks, lean): near-straight with crisp corners.
- **All fours**: bump and skirt are one wedge. A round bump hanging under the ribs, its lowest point ~100–120 px off
  the floor (~50 px higher), the skirt falling behind it as a curtain, its back flaring ~20 px with a fold.
- **Hands**: stripe fingers on paddles everywhere. Kneel and sit-chair: the fingers along the bump's underside (lens
  disagree on up or down: check the still), the thumb along the hand, not up. Sit-ball: the far hand floats (rest it
  on the far thigh by the knee). Squat: two fists on the crest (an open hand over the post). Lean: the forearm 15 px
  into the slab, the bump 8 px from the cabinet (leave 30–40).
- **Neck**: long and thin, a hook at the base of the throat, strap tabs (all poses).
- **Walk-contact** feet nearly flat (heel strike, toe up 20°; back foot up on its toe); walk-pass's far forearm
  sprouts from under the bump (swing it forward so the upper arm shows).
- **Props**: the chair's far front leg stands off the seat's end; the squat chair seat too high (a bar stool).

## Round 5 (2026-10-15: measured legs, the all-fours bump and skirt, walking heel strike, hands drawn finer)

| pose | natural | body | craft |
|---|---|---|---|
| all-fours | 6 | 6 | 5.5 |
| kneel | 6 | 5.5 | 6 |
| kneel-pick | 4.5 | 5 | 4.5 |
| lean-counter | 6 | 6.5 | 5.5 |
| sit-ball | 6 | 6 | 6 |
| sit-chair | 6.5 | 6.5 | 6 |
| squat | 6 | 5.5 | 5 |
| walk-contact | 6 | 6.5 | 6 |
| walk-pass | 6.5 | 6.5 | 6 |

All three: NOT YET. Their top fixes, all three agreeing:
- **Hands** (craft and natural #1): stripe paddles; the tips should step, the thumb lie along the hand, each hand lie on
  what it touches with its tips inside the silhouette; kneel-pick's grip a decal on the toy.
- **The far leg** (body #1): a second full knee beside the near one, an X in the seated shins. One rule: the far leg
  the near one's twin, offset up and forward as the still offsets it, the far knee a sliver past the near one.
- **The dress back and hems** (all three): a ruler or a ramp from the waist to the hem; hems bowls with kicked back
  corners; the walks an A-line lampshade from the armpit (22° against the stills' ~7–10°).
- **Knees and feet**: hinge kinks and dents at the knee, no calf belly; kneeling feet stood on their toes like boots;
  thick high-backed clogs where the master draws thin ballet flats.
- **Kneel-pick**: no front thigh, the toy not picked up. Squat: no curtain, a hem notch, the hand not over the post.
  Sit-ball: a skin spike, the seat not moulded to the ball. The far-shoulder knob and strap tabs (all-fours, kneel,
  kneel-pick, lean, squat).

What round 6 changed (before its critics):
- Hands: the drawing stays (fuller fingers lost blind on breathe-stroke 5.5 vs 6.5, a shorter thumb 6 vs 6.5, lesson
  64); the side hands fixed by shape and place (siderest, drape, `contact_pose --inside`); the wrist settles in the
  loops (`tools/side_loop.mjs`), a weight-bearing hand excused with `qa.still`.
- Far leg: twins, the far hip raised alone (`fx.farUpLegs`), thighs and shins within 2° (`tools/far_leg.mjs`, lesson 65).
- Shoes: the master's ballet flat, traced as anchors with names (`shoe:tip`, `shoe:ball`, `shoe:heel`); kneeling feet
  on the instep.
- Dress back: the cloth fitted to her back (`parts/skirt.js` hug): in at the waist, round the seat to its fullest
  point, hanging from there. Standing it matches the master's back to 0.01 H (it was a chord from the waist). The walk
  flare cut to ~10° (`engine/drape.js` flB). Kneeling, the hem wraps each thigh by its own reach (no bowl). Seated,
  the cloth tucked under the bump in the lap isn't spent along the thigh (the skirt reaches near the knee), and the
  side panel covers the thigh back from its diagonal (no white wedge). A soft tuck where the bump meets the skirt.
- Shoulder: the chest skin clipped to the dress's posed back line (no pale tab); the back of the shoulder moves with
  the clavicle (no spike behind the strap).

## Round 6 (2026-10-15: the dress fitted to her back, flat hems, seated skirts to the knee, the shoulder line; critics on Fable)

From this round every reviewer runs on **Fable** (Harry, 2026-10-15 09:45: "Use Fable as the critic"), so the scores are
not comparable with rounds 1–5 (other models). Same pack and prompts (`critic_F.py mum3 --side`), ten poses (walk-down added).

| pose | natural | body | craft |
|---|---|---|---|
| all-fours | 6 | 6 | 5.5 |
| kneel | 6.5 | 7 | 6.5 |
| kneel-pick | 5 | 5 | 5 |
| lean-counter | 6.5 | 7 | 6.5 |
| sit-ball | 6 | 6.5 | 6 |
| sit-chair | 6.5 | 7 | 6.5 |
| squat | 5 | 6 | 5 |
| walk-contact | 6 | 7 | 6.5 |
| walk-down | 5.5 | 6 | 6 |
| walk-pass | 6 | 7 | 6.5 |

All three: NOT YET. Landed (body lens's history check): the walks' flare cut, near-straight hems with corners, the lumbar
hollow and seat standing and leaning, two knees and a curtain in the squat, kneeling feet on the instep, heel strike, the
seated lap and diagonal hem, the toy picked up, the pale shoulder tab and the sit-ball skin spike gone. All three agree:
- **The far foot is fused with the near one** (kneel, all-fours, sit-chair, sit-ball, squat, kneel-pick): "one lumpy
  shoe", a pale instep patch between, a cuff round the heel. Measured (`fit_side` targets): sit-ball's far ankle sits
  +43, −34 px from the near one in the still, ours −31, −63 (behind): the far thigh's 0.85 scale pulls it back.
- **The cloth in the folded poses**: squat a sack with a pointed tail and no hem; kneel-pick a cape (a ramp from the
  shoulder to a hem corner in the air) with nothing over the raised thigh; sit-ball's seat a balloon; all-fours' hem
  notching into the bump, the bump hung below the hem.
- **Hands**: paddles with four long stripes, the far hand a second fan; the stills' lines are short, from the middle
  joint to near the tip, the fingers together (`side_zoom.py`: the lines start at the knuckles in ours).
- **Legs**: no kneecap plane, no calf belly; kneel-pick's front thigh a thin post; the walks' trailing leg straight,
  walk-down's back heel planted and its arms idle.
- **The neck** long and thin with a hook (kneel: the far strap shows past the throat); the bust-to-bump concave corner.

Standing regression (blind A/B on breathe-stroke, Fable): round 6 vs HEAD 67c62c8, **no clear difference** (6.5 vs 6.5);
the one visible change the shoes, a lean to the old ones: the new (master-traced) heel counter stood up as a pointed tab
0.04 H behind the ankle, "a snag". Fixed: the counter now sits on the leg's back line (`parts/legs.js counterX`).
QA: the alive gate measured in the standing frame, not the shot's (a side loop frames its own pose), and the side loops'
resting hands moved ~7 px: both fixed (`qa_checks` uses `spec.view.bbox`; `side_loop.mjs` hand life 4–5°).

## Round 7 (2026-10-15: the far feet apart, the folded poses' cloth measured, the bump round on all fours, elbows and heels by the stills)

Fixes, each against round 6's agreed faults (lesson 68):
- **The far foot apart from the near one**: kneeling and on all fours the far shin and shoe run parallel 0.2 H above the
  near ones (`nudge … shin.far=-1.5,foot.far=-8`, `far_leg.mjs`); a pointed foot's shoe heel tucked in (`parts/legs.js`
  `hk`); the far strap no longer a lobe at the throat (kneel: `fx.farUpLegs`, the far hip alone raised); the kneeling toes
  left in line with the foot (free, the solve bent them 34–60° and the shoe curled over the foot as a hook with white
  inside, found zooming the critic sheet before sending it).
- **Cloth**: the squat's skirt falls in a tail 0.15 H behind and 0.39 H below the thighs' crossing (`SQ.tail`, the
  still's), a shaded curtain between the thighs; kneel-pick's back hem pulled 0.27 H forward (`KP.pull`) and her back
  rounded as she bends (`fx.lumbar=0`); sit-ball's hem rests on the ball (the ball's floors are arcs, `SEATED.drop`)
  and the ball sized by her seat; sit-chair's hem on the seat.
- **All fours**: the bump sags as a dome (per-anchor sag vectors, the handles re-aimed), not a wedge.
- **Posture by the stills** (`side_dirs.mjs`): the seated and kneeling near elbows swung in to hang at her side (−40°);
  walk-down's back heel raised (95°: 58° had been a flat foot), its arms swinging.
- **Hands**: the finger lines started at the knuckles (round 6's "four long stripes") LOST blind on breathe-stroke
  (6 vs 6.5, Fable: "a mitten-shaped lump"), reverted; the reviewer's notes on both, still open on the standing shot:
  8.4–9.8 s the stroking hand slides as one rigid shape; 4.0–4.8 s the breath hold is dead still; 1.05–2.3 s the hand
  hangs as a flat paddle, then curls all at once.

Critics, round 7 (three fresh reviewers on **Fable**, `critic_F.py mum3 --side`, the sheets rebuilt after the finger-line
revert and the kneeling toes):

| pose | natural | body | craft | round 6 (n/b/c) |
|---|---|---|---|---|
| all-fours | 5.5 | 6 | 6 | 6 / 6 / 5.5 |
| kneel | 6.5 | 7 | 6.5 | 6.5 / 7 / 6.5 |
| kneel-pick | 4.5 | 5 | 5 | 5 / 5 / 5 |
| lean-counter | 6.5 | 6.5 | 6.5 | 6.5 / 7 / 6.5 |
| sit-ball | 6 | 6 | 6 | 6 / 6.5 / 6 |
| sit-chair | 6.5 | 7 | 6.5 | 6.5 / 7 / 6.5 |
| squat | 5.5 | 5 | 5.5 | 5 / 6 / 5 |
| walk-contact | 6.5 | 6.5 | 6.5 | 6 / 7 / 6.5 |
| walk-down | 6 | 6 | 6 | 5.5 / 6 / 6 |
| walk-pass | 6.5 | 6.5 | 6.5 | 6 / 7 / 6.5 |

All three: NOT YET. The scores are flat on round 6 (±0.5): the fixes landed (the body lens's history check lists the
kneel hem, walks' flare, seated lap, all-fours back and head, the toy lifted, feet parted on the instep) but each pose's
worst fault is one the round didn't touch. All three agree on:
- **Hands** in every pose: four long stripes on a paddle; the stills' fingers together, short tip lines (the knuckle-start
  lines lost blind on the standing shot, so the fix is the hand's shape, not its lines).
- **The far foot** seated and squatting: behind and stacked on the near shoe (a double toe, a pale patch); the stills set
  it ~50–60 px FORWARD and ~35–40 px up as a full second shoe. (Kneeling and on all fours the parallel-above rule reads.)
- **Cloth in the folded poses**: the squat's measured tail still reads "a sack with a pointed tail" (the stills' cloth is
  pulled taut over the seat, a short hem behind the thigh, a curtain between the knees); kneel-pick a balloon back with
  nothing over the raised thigh; sit-ball's lap pouches under the thigh. Walk-down and walk-pass: the skirt front slants in
  under the bump (body lens, new).
- **Legs**: no kneecap corner, no calf belly, the walks' trailing knees straight, lean's knees locked; kneel-pick's and the
  squat's thighs ~65–70 px against the stills' ~100.
- Everywhere: the neck long and thin with a hook at the throat; the dress's concave corner between bust and bump.
- kneel-pick's toy held ~70 px off the floor (her shorter arms): both natural and craft read it as floating.

QA: every breathing loop and the walk pass (`--skip order,frames`): the near elbow's swivel limited by the limbs gate
(kneel −30°, sit-chair −20°: at −40° the forearm and hand turned to the camera, 67–84%), and a hand ≥ 95% hidden by her
body is excused from the handedness gate (`side_loop.mjs`: sit-ball's far hand under the legs and the lap).

Harry (2026-10-15 10:57): "after this round with the critic lets do a manual review with me": round 7 goes to him with the
critics' notes beside each pose, before round 8.

## Round 8 (2026-10-15): Harry's review of round 7

Harry reviewed round 7 on the review page (one comment per note) and in the thread (14:38): "Two really key takeaways that
came across across many poses, 1. the hands often look stiff and not relaxed. Fingers always pointed directly out at a
specific angle. rather than a little curled like most people naturally hold their hands when walking, sitting etc. 2. One
shoe always looks really thin/cut off that then looks odd". Per pose: walk-pass "stiff hands… the close hand pointed very
down… the far thumb in the wrong position… follow the arm with a slight flop" and "the shoe 'cut off' at the bottom, the
foot very thin"; lean-counter "Hands are the wrong way around on the counter and the top of the arm isn't connected
smoothly to the shoulder"; squat "the blend between the top arm and shoulder looks jagged and rough where as the reference
still is small and clean" and "Shoes again look cut off… the legs aren't separated enough which means the knee then forms
at a wierd place/angle. As always wrist/hands look odd and not holding the chair"; sit-ball "hands stiff vs relaxed on the
leg"; sit-chair "Far away knee/leg at the wrong position. Hence lands awkwardly - esp compared to the ref image".

What changed (lesson 69, HARRY_EYE 31–35):
- **The thin shoe**: the far shoe had the near one's opening from its own lower counter, 36% as deep at mid-foot; each shoe
  now has its own traced opening, 81–83% in every pose (`shoe_gauge.mjs`, gate `shoes`).
- **Hands**: new library shapes picked beside the stills at 1:1: `idle` (walking, a graded curl, the thumb along the index,
  fx.fingersIn 0.8, trailing the swing with `side_walk.mjs --lag 0.06`), `softrest` (on the bump, kneeling and seated; on
  sit-ball's near thigh, palm down by the knee), `palmdown` (lean-counter: palms down, the backs a low dome), `hold`
  (squat: the chair's back gripped, the wrist in line with the forearm). Gate `curl` (a resting or swinging hand's fingers
  curl in the picture; round 7's measured −3° and fail).
- **Shoulder**: lifted, the strap is one even band on the arm's contour, over its top and down its front, tapering out; the
  bodice's shoulder points and the trapezius' end are tucked under it (no ear, sliver or skin wedge).
- **Far leg** read off each still at 1:1 (`far_leg.mjs --set`): squat's feet wide (far ankle +0.3, −0.4 H, the shins in a V);
  sit-chair's far foot set back behind the near heel (−0.25, −0.07; round 7's "ahead and up" came from landmarks that
  confuse the far toe with the near one); sit-ball's far foot ahead and up (+0.3, −0.24).
- The critic pack now shows each pose's hands and feet at 1:1 beside the still's (Harry's two faults were invisible at
  film size for seven rounds).

Blind A/B on breathe-stroke (one fresh reviewer on **Fable**, the shared shoe and shoulder changes, whole figure in frame):
no clear difference, 6.5 vs 6.5; kept (the standing far shoe is mostly behind the near one; the shoulder points move
≤ 0.0055 H). Both: the breath lives in the chin more than the body; the stroke's fingers comb-like at 8.8–9.5 s.

Round 8 critics (three fresh reviewers on **Fable**, the pack with the new hand-and-foot close-ups), natural / body / craft:

| pose | natural | body | craft | round 7 |
|---|---|---|---|---|
| kneel | 6.5 | 7 | 6.5 | 6.5 / 7 / 6.5 |
| kneel-pick | 4.5 | 5 | 4.5 | 4.5 / 5 / 5 |
| all-fours | 5.5 | 6 | 5.5 | 5.5 / 6 / 6 |
| sit-chair | 6.5 | 7 | 6.5 | 6.5 / 7 / 6.5 |
| sit-ball | 6.5 | 6 | 6 | 6 / 6 / 6 |
| squat | 5.5 | 5 | 5 | 5.5 / 5 / 5.5 |
| lean-counter | 6.5 | 7 | 6.5 | 6.5 / 6.5 / 6.5 |
| walk-contact | 6.5 | 6.5 | 6.5 | 6.5 / 6.5 / 6.5 |
| walk-down | 6 | 6.5 | 6 | 6 / 6 / 6 |
| walk-pass | 6.5 | 6.5 | 6.5 | 6.5 / 6.5 / 6.5 |

Landed, every lens: the far shoe a whole flat in every pose (item 32), the far leg where the still puts it (33: squat wide
and up, sit-chair set back, sit-ball ahead and up), the shoulder one line with the strap a band (34), the worktop palms
down. Not landed: the hands. All three, unprompted, at the 1:1 close-ups: every hand "a flat paddle carrying four long
parallel lines from mid-hand to the tips", the curl "too small to see" ("the current gate (mean ≥ 4°) passes a curl
nobody can see; the still's bend is 25°+"), and the far hand "a full duplicate of the near one", a second fan, wherever
both rest on one surface (kneel, sit-chair, sit-ball, lean); the squat's `hold` "a cluster of lumps… paws on a stick",
kneel-pick's far hand "a pointer". Side-by-side tries beside the stills (tools/side_zoom.py --try, sit-chair and
walk-pass): a deeper in-picture curl turns the hanging hand into a claw curling FORWARD, while the walk-pass still's near
hand hangs nearly straight; the sit-chair still's hand points forward level where ours points 30° down, its fingers shorter
and fuller. So the gap is the hand's ANGLE, its far hand's PLACE and the fingers' proportions, measured per still, not
more curl: the next round places each hand on its still (the mum3q method, lesson 54) rather than tuning shapes.
Also: sit-ball's near hand now rests on the near thigh (the far leg moved) and fails QA `alive` (its tips move 4–5 px a
2 s window, the pin holding the palm); the far shin there hangs behind the near one while the far shoe sits ahead (body
lens). Squat's feet: the craft reviewer read the near shoe as floating above the far one; at 1:1 the near foot stands on
the floor with its shadow and the far one is up and ahead as in the still (a misread, not changed).

## Round 9 (2026-10-15): each hand shaped for what it does

Answers the three hand threads Harry left open on round 8 (walk-pass "stiff, the close hand points very down, the far
thumb wrong"; squat "not holding the chair"; sit-ball "stiff vs relaxed on the leg") and round 8's critics (every hand
"a flat paddle with four long lines", the far hand "a second fan").

- **The finger drawing (S3: fuller, 10% shorter, the lines from the middle phalanx) lost blind on breathe-stroke**, one
  fresh reviewer on **Fable**, 6 vs 6.5: "a short bunched cluster of nubs… a doll's mitten", where the kept drawing
  "reads as a hand with fingers" at phone size. The third loss for that direction (rounds 5 and 7, lesson 64). Kept
  the drawing; every change below is a shape, a place or a prop (lesson 70).
- Shapes: `idle` fingers together (spread −0.5…1: at −1…2 the swinging far hand read "a splayed fan"), `softrest`
  together, `hold` hooked at the knuckles (85/20/0), a new `ball` for kneel-pick's toy (30/30/20 along its curve; `grip`
  closed into a fist on top of it).
- Placement: the chair's rail under the palm's UNDERSIDE over the rail and its far edge just past the knuckles (it stood
  0.03 H under the hand, the fingers hanging in the air); the worktop hands and forearms flat (fingersIn 0.2: at 0.7 the
  fingers curled to the slab's line and the forearm hovered over it); sit-chair's hand at 7° (at 10° with its curl it
  still "pointed 30° down"; at 4° the 3D arm turned the hand toward the camera on the breath, 84% of its length,
  QA limbs); the squat's far arm hidden; kneel-pick's knee hand `softrest`; the toy the still's orange.
- Life: a hand resting on a leg slides a little with the breath (sit-ball's was FROZEN, QA alive: wrist 7 px, tips
  13 px); a hand holding the toy turns at the wrist twice as far as a resting hand (FROZEN at ±5°).
- Tooling: the critic pack's close-up shows a grey panel where the far hand is hidden (`side_zoom.py --hidden-far`).
  Cropped at the hidden far hand it showed the near hand a second time, and all three critics read "the far hand a full
  duplicate of the near one, a second fan" (kneel, sit-chair, sit-ball, lean-counter).

Round 9 critics (three fresh reviewers on **Fable**, run twice: before and after the hidden-hand panel, the flat
worktop hands and the walking fingers together; the second pass below):

| pose | natural | body | craft | round 8 |
|---|---|---|---|---|
| kneel | 6.5 | 7 | 6.5 | 6.5 / 7 / 6.5 |
| kneel-pick | 4.5 | 5 | 4.5 | 4.5 / 5 / 4.5 |
| all-fours | 5.5 | 6 | 5.5 | 5.5 / 6 / 5.5 |
| sit-chair | 6.5 | 7 | 6.5 | 6.5 / 7 / 6.5 |
| sit-ball | 6 | 6.5 | 6 | 6.5 / 6 / 6 |
| squat | 5 | 5.5 | 5 | 5.5 / 5 / 5 |
| lean-counter | 6.5 | 7 | 6.5 | 6.5 / 7 / 6.5 |
| walk-contact | 6.5 | 6.5 | 6.5 | 6.5 / 6.5 / 6.5 |
| walk-down | 6 | 6 | 6 | 6 / 6.5 / 6 |
| walk-pass | 6.5 | 6.5 | 6.5 | 6.5 / 6.5 / 6.5 |

Flat, as the first pass was. What holds them there, named by every lens in every pose and NOT a hand: legs as even
tubes (no calf belly, no kneecap plane, folded thighs ~0.65 of the stills'), a long thin neck with a hook at the
throat, the folded poses' cloth (squat's sack and tail, kneel-pick's balloon and bare raised thigh, sit-ball's pouch,
all-fours' bump below the hem), the walks' straight trailing knee and the skirt's front slanting in under the bump. On
the hands, the critics now see the placements land (lean-counter's palms "on the top, no gap", the far hands hidden)
but still read every hand as "a flat wedge, four even lines from mid-hand": the drawing the film's blind reviewer
keeps choosing. That conflict is Harry's to settle: the review page asks him A (today's) or B (S3) beside the stills.
The far hand hidden also costs: the natural and craft lenses ask for the still's second set of fingertips on the
squat's post and the worktop. Next (round 10): the shared shapes, one change at a time, each A/B'd blind on
breathe-stroke where it reaches the standing shot: the leg's calf and kneecap and the folded thigh's mass; the neck;
the folded poses' cloth; kneel-pick's reach (the toy on the floor).

## Round 10 (2026-10-15): the shapes every lens names, legs, neck, folded cloth

Harry's call on the finger drawing (17:26, decision card): **A, today's separate fingers**; the critic prompt now says
so, and hands are judged on shape, angle, place and contact (lesson 70). Round 10 takes the shapes round 9's lenses
named in every pose (lesson 71):

- **Legs.** Measured station by station the depths were already the stills' (×0.97–1.03); the fault was the outline
  where the forms meet. Bent, the knee's fillet ended proud of the tapered thigh and shin (a ball of a knee with a waist
  under it) and the folded calf ran a straight ramp into the crease (a hinge). Now the fillet ends on each bone's own
  front line, a bent shin's front runs straight down from the knee, and a folded calf rounds over into the crease
  (`P.knee` onProfile, fill, calfIn; tried per pose with `side_zoom.py --try` `fx.legTry`). Standing, nothing changes.
- **Neck.** The master's throat runs back almost level under the chin, then down (a jaw shelf); ours ended under the
  jawbone's rising line, the white under the jaw cutting in as "a hook at the throat". The neck now runs forward under
  the jaw to inside the chin, skinned to the head, and the nape runs on into the shoulder (a knob at the back of the neck
  bent forward). Blind A/B on breathe-stroke, one fresh reviewer on **Fable**: **the new throat won, 6.5 vs 6** ("the
  throat runs as one continuous curve from under the chin… X: a small white notch, a wedge chipped out of the throat",
  the only difference it found; the knee doesn't reach the standing shot). Kept: `renders/mum3_breathe-stroke_v8.mp4`.
  Wrong in both, for breathe-stroke's next round: the lifting hand a flat paddle at 1.5–1.9 s, the fingers a comb at
  the stroke's top (8.9–9.5 s, a freeze not a settle), the hand drops still fanned (11.0–11.6 s).
- **Squat's skirt tail.** The back's cloth and the inside's lower edge met at ~40°, a point ("a sack with a tail"); the
  back now leaves the tail turned toward level and the inside continues it (`skirt` `tailRound` 0.75), one round with a
  crisp inner fold.
- **Kneel-pick's toy.** A deeper bend reached the floor but was the hunched, bump-hidden pose rounds 1–4 rejected
  (written in `fit_side.sh` above that line): reverted. The toy stays lifted in her hand and casts a small soft shadow
  under it, fainter the higher it is (with none it read "floating in mid-air", rounds 7–9).
- Deferred: sit-ball's pouch, all-fours' bump under the hem, kneel-pick's skirt balloon, the walks' trailing knee, the
  skirt's front slant under the bump.

Round 10 critics (three fresh reviewers on **Fable**):

| pose | natural | body | craft | round 9 |
|---|---|---|---|---|
| kneel | 6.5 | 7 | 7 | 6.5 / 7 / 6.5 |
| kneel-pick | 4.5 | 5 | 5 | 4.5 / 5 / 4.5 |
| all-fours | 5.5 | 6 | 6 | 5.5 / 6 / 5.5 |
| sit-chair | 7 | 7 | 7 | 6.5 / 7 / 6.5 |
| sit-ball | 6 | 6 | 6.5 | 6 / 6.5 / 6 |
| squat | 5.5 | 5.5 | 5 | 5 / 5.5 / 5 |
| lean-counter | 6.5 | 7 | 7 | 6.5 / 7 / 6.5 |
| walk-contact | 6.5 | 6.5 | 7 | 6.5 / 6.5 / 6.5 |
| walk-down | 6 | 6.5 | 6.5 | 6 / 6 / 6 |
| walk-pass | 6.5 | 6.5 | 6.5 | 6.5 / 6.5 / 6.5 |

Up half a point in ten cells, down half in one (sit-ball, body). Landed, every lens: the throat one curve under the chin
(the hook gone), the squat's tail round. Not landed: the bent knees still read "a rounded ball, no kneecap plane"
(body, natural on sit-chair); kneel-pick's toy still "held in mid-air" with its shadow. What holds the library below 8,
in the order the lenses weigh it:
1. **The folded poses' cloth**, "the single worst fault in the four lowest poses" (craft): the squat's skirt a sack
   hanging behind to mid-shin (the still: taut over the seat, the hem just below the thighs, a curtain between the
   knees); kneel-pick's balloon with nothing on the raised thigh; sit-ball's pouch under the thigh; all-fours' bump
   below the hem with a notch where they meet.
2. **Kneel-pick's bump reads as gone** (all three: "a stranger would not read ours as pregnant from the side"), the
   back hunched and the head bowed, the front thigh thin. (The still's big round shape on the left is its BACK; the
   lenses read it as the bump. Still, ours must show her bump.)
3. **Hands**: all three still see "four fingers spread as a fan with gaps from the knuckles", the stills' "together with
   a gap only at the tips". The drawing is Harry's settled pick (A); what the lenses ask that is SHAPE: all-fours' palms
   flat under the shoulders, the wrist at 90° (ours slope 20° on a lifted heel); the kneel hand cupping under the dome;
   a thumb along the index; the squat's grip with the thumb on the near side of the post.
4. **The walks**: the skirt's front slants in under the bump (the hem's front ~25–40 px behind the bump's, the stills'
   plumb); every loaded or trailing knee locked straight (walk-down's front knee first).
5. Smaller: the stacked kneeling shoes' opening a hairline (one dark lump), the bust-to-bump V (kneel, sit-ball,
   sit-chair), a strap tab at the squat and all-fours shoulders, lean-counter standing 30–40 px too close (the bump flat
   on the cabinet), sit-ball's far shin leaving the near kneecap.
Next (round 11): the folded cloth and kneel-pick's bump first, then the walks' front and knees.

## Round 11 (2026-10-15): the folded cloth, kneel-pick's bump, the walks' skirt front

Round 10's lenses put the folded poses' cloth and kneel-pick's hidden bump first, then the walks. Round 11:

- **Kneel-pick, new stills.** All three old stills rounded her BACK like a second bump and hid the front one behind the
  hanging arm (the lenses read the back as the bump). `s_kneel_pick2` asked for the bump in front and a straight back;
  `_1` shows it. Refitted to it with the trunk nearly upright (~6° forward): leaned 20° from the hips for the reach, the
  seat swung back into a second round mass and the hanging arm covered the bump's front. Upright, her palm hung 0.25 H
  above the play ball's crown, so a floor ball now grows to meet the palm (`toy reach=1`, `parts/props.js`).
- **Squat.** The skirt's side panel covers less of the thigh (`SQ.top` 0.2) and the tail sits higher and nearer
  (`SQ.tail` −0.05, 0.22): it had hung to mid-shin. Squat shape per pose through `clothTry.sq`.
- **Sit-ball.** The lap panel meets the ball at a corner (`skirt` `seatCorner` 0.6), not one smooth point (a U, "a
  pouch").
- **The walks** (and lean-counter, legs apart): the skirt's front flares by the stride (`frontWalk` 0.2), the hem's
  front ~10 px behind the bump's at film size where it was 35–40 (the stills 3–20).
- Kneel, all-fours, sit-chair and breathe-stroke: pixel-identical.

Round 11 critics (three fresh reviewers on **Fable**):

| pose | natural | body | craft | round 10 |
|---|---|---|---|---|
| kneel | 6.5 | 7 | 7 | 6.5 / 7 / 7 |
| kneel-pick | 4.5 | 5 | 5 | 4.5 / 5 / 5 |
| all-fours | 5.5 | 6 | 6 | 5.5 / 6 / 6 |
| sit-chair | 7 | 7 | 7 | 7 / 7 / 7 |
| sit-ball | 6 | 6.5 | 6.5 | 6 / 6 / 6.5 |
| squat | 5 | 5.5 | 5.5 | 5.5 / 5.5 / 5 |
| lean-counter | 6.5 | 7 | 7 | 6.5 / 7 / 7 |
| walk-contact | 6.5 | 6.5 | 7 | 6.5 / 6.5 / 7 |
| walk-down | 6 | 6.5 | 6.5 | 6 / 6.5 / 6.5 |
| walk-pass | 6.5 | 6.5 | 7 | 6.5 / 6.5 / 6.5 |

Flat for the third round (up half a point in three cells, down half in one). None of the cloth changes landed as the
lenses weigh it: the squat "still a sack", sit-ball's corner now "a triangular flap hanging in the air", the walks'
front "a touch behind" (better, still named). Kneel-pick swapped "floating" for "a beach ball… the action reads 'rest a
hand on a ball', not 'pick up a toy'"; every lens: make the reach with the body (drop the near shoulder, hinge from the
hips with a long back, the head tipped not bowed) and keep the toy liftable, and they still read the bowed head and neck
as a hunch.

**What the reach faults have in common: her arms.** In the master her fingertips hang at 41% of her height (the
pixels, crown to sole); a real woman's hang at ~38%, so hers end ~0.2 H (~5 cm) higher: her arm is ~90% of a real one
(the rig, joint to joint: shoulder to fingertip 2.68 H, the hand 0.63, about 80% of a real hand's 0.108 × stature). The
stills draw the arm longer still (3.2 H joint to fingertip, ~105% of real), so every still's reach is ~0.5 H beyond hers.
Every reach the library asks of her runs out of arm: kneel-pick's ball (grown or lifted), the squat's arm a level rod
to the chair, lean-counter resting on the forearm instead of pressing on a straight arm, all-fours' arms vertical
posts. The critic prompt calls her arms design and doesn't score them, but the lenses score what they force. Harry's
brief is "like a real woman, just illustrated in 2D": whether to lengthen them is his call (decision card, round 11).

What the lenses still put first, all three: (1) the knee: a kneecap plane and a calf belly on every bent or loaded leg,
the walks' loaded knees soft and trailing knees bent 15–30° (every walk leg reads locked); (2) hands shaped to what they
touch (bending at the knuckles to the bump's underside, the knee, the post, a flat palm on the floor), the swinging far
hand closed, and the second hand where the still shows it (lean-counter's far fingertips, sit-chair's under the bump);
(3) the folded cloth taut over the form and ending where it ends (squat, kneel-pick over the raised thigh, sit-ball's
hem on the ball, all-fours' bump round with the hem a curtain behind it); the stacked kneeling shoes parted.
Next (round 12): the walks' knees (pose directions, every lens), kneel-pick's reach with the body and a liftable toy,
the stacked shoes; the arms when Harry decides.
