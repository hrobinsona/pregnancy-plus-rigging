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
