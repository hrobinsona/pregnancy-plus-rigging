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
