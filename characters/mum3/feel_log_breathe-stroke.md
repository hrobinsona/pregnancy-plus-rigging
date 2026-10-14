# Feel critic log — mum3 / breathe-stroke (look and feel only; no metrics)

The first shot of the fresh character (2026-10-12): standing in profile, hand to the bump, one deep breath, a look down and
one stroke, hand back to her side. A deliberately simple shot to run the whole workflow from a new master.

## Round 1 (v1) — FEEL: NOT YET · LASSETER 5.3/10 · HANDS 5/10
Three fresh reviewers (critic_F --lens all). Right: the lift to the bump (wrist leads, hand hangs, turns late, soft landing);
the resting place on the lower bump; the slide off and drop at the end; the 8.2 s look-down smile; the overall silhouette.
Off, as all three saw it:
1. Stroke top (7.7–8.5 s): the elbow wrenched out BEHIND her back, forearm flat ("chicken wing"); the hand a flat paddle
   whose fingertips stuck past the bump's front edge. Cause: my own prompt for still m3_k_high said "elbow … behind her
   back line", and the fit faithfully reproduced it.
2. The deep breath (3–7 s) didn't read: only the eyelids moved; chin lift ~3°, no chest or shoulder rise, the hand frozen.
3. The resting hand: four straight parallel fingers, tips past the under-curve of the bump, nothing moving for 5 s.
4. Look-down and stroke rushed: head down in 0.4 s together with the hand (no lead), the way down faster than the way up,
   the head lifting at the same moment the hand landed.
5. The hand dropped to her side in ~0.5 s and stopped dead; in flight it stayed one rigid open shape.
6. Drawing: a ragged strap tab at the back of the shoulder (8.2 s); a skin sliver down the back of the dress (the hidden far
   arm sliding out as she leaned); a lump under the wrist and a thumb hump on the stroke.
Client flags (reviewers' read): hand on the belly better (reads as a hand), still dead and over the edge; shoulders still
wrong at the stroke top; return path fixed; arm speed better but the drop brisk.

What was done (v2):
1. A new stroke still (m3_k_stroke): hand on the bump's FRONT at mid height, elbow under the shoulder, forearm angled up;
   fitted rms 0.036. Stroke 7.45 → 8.8 s up, a slow start down (the linger), down to 10.3 s; no landing wag at the stroke
   top (the hand never left the bump).
2. The breath: n-breath = the fitted breath still + chest −2°, spine −0.8°, clavicle +3°, chin up ~5°, the bump scaled
   1.025 (the hand on it rides out); in 3.0 → 4.7, held to 5.0, out to 7.0 settling a touch LOWER than the start (n-out).
   Idle breath gain ×1.6 (the reels' ~2 px; v1 moved ~1 px).
3. Hand: a new library shape `lay` (fingers together, softly curved onto the surface, so they foreshorten and the tips end
   on the bump); fingers curl (`limp`) in flight on the way up and down.
4. Timing: eyes open onto the bump at 7.05–7.25, the head follows from 7.28 (key shift), the hand from 7.45; she keeps
   looking until the hand has landed (head lifts 10.45 → 11.9); a small smile at the end of the breath out (face-release).
   The drop takes 10.6 → 11.9 s.
5. Drawing: the strap is built on the arm's own contour (it can't step off it); the dress's shoulder skinned to the
   clavicle; a far arm hidden by design is not drawn; the hand centred on the wrist (a sign error put it 0.075 H forward,
   leaving the forearm's back as a shelf); the forearm's wrist end barely rounds (no lump under a bent wrist).
6. Engine, found on the way: a hand that stays on the same body part (hold, stroke) no longer relaxes its wrist mid-move
   (`neutral` 0); a straight arm's swivel is taken from the bent end of the move; the lift and the drop get a JOINT-space
   breakdown (via + arm-only key) — a hand-space line from a hanging arm lifted the wrist toward the shoulder and snapped
   the elbow 11 px in one frame.

Blind A/B v1 vs v2 (fresh reviewer, relabelled): **v2 wins, 6.5 vs 4** — "stays a calm, gentle standing moment all the way
through"; v1's stroke "hunches her whole upper body forward … far bigger than the brief allows". Wrong in both: the breath
still reads only through the eyes (no visible chest, shoulder or bump rise); the resting hand cups the bump's underside
with the fingertips past its outline; v2's stroke barely travels.

## Round 2 (v2) — FEEL: NOT YET · LASSETER 6.5/10 · HANDS 5/10 (NOT YET)
Three fresh reviewers. Landed from round 1: the stroke-top elbow (under the shoulder now), the head-first look-down, the
slower drop with the hand curling in flight, the strap and the far-arm sliver. Off, as the three saw it:
1. The resting hand (2.2–7.4 s): a "pasted-on rake", tips past the bump's under-curve, frozen for 5 s through the breath.
   MEASURED (new `tools/tip_check.mjs`): tips 14–21 px PAST the outline at rest, 9–11 px at the stroke top.
2. The hanging hand at both ends of the loop (~2 s on screen): "a fork", four straight separate fingers, the thumb jutting.
3. The look-down face reads alert, not tender: round dot eyes under brows that sit high.
4. The breath: half landed (chin and eyes read, the chest and hand barely move); the in and out on the same ease, the out
   barely longer, the hold after the landing longer than the hold at the top. MEASURED: the shoulder moved 15 px back and
   5 px up, the head 20 px back: a sway.
5. The upper arm bows back with the elbow behind her back line while the hand is on the bump.
6. The stroke: a flat paddle at the top, a wiper (the down stroke the up played back), small hitches; it travels 33 px.
7. Overlap at the end: the head and the hand both finish at 11.9 s. The lift is the quickest move in the film.

What was done (v3):
1. Resting contact moved up onto the bump's lower FRONT (`dp` [-0.03,-0.22] on every resting stop): tips 35–45 px inside
   the outline throughout (tip_check PASS). The elbow swung in under the shoulder (`dphi -35` on every stop: lesson 34).
2. The breath re-derived as a vertical rise (ribcage lengthened, clavicle up, chin up): shoulder 12 px up, 2.7 px drift.
   Performed: a little air out first (`n-prep` 2.3–2.75), in 2.75–4.75, hold to 5.15, out as a sigh to 7.3; the hand rides
   it (up and out 3 px, then a touch lower) and the fingers spread at the top and press on the way out (`spec.fidget`).
3. Hands: `hang` (a loose curl growing from the index to the little finger, thumb on the index) at her side, the rest
   elbow bent 10°; `wrap` (cupped round the dome) at the stroke top; `flat` (heel leading) on the way down, the hand
   trailing the forearm by 5 frames.
4. Face: `lid.half` (a flat upper lid line) and `lid.smile` (the lower lid lifted) in the head; the tender face uses
   both and the brow follows the lid down. A slow blink at the stroke top (9.15 s).
5. Timing: the lift 1.05 → 2.3 (skew 0.1, a long arrival); the settled smile holds 7.3–7.7 and the eyes open in it; the
   head goes down over 0.75 s from 7.72, the hand from 7.85; the stroke goes ~60 px up to 9.0 and back by 10.4; the head
   is up by 11.3, the hand arrives last at 11.9.

Blind A/B v2 vs v3 (first cut, fresh reviewer, relabelled): **v3 wins, 6.5 vs 6** (confidence 60–65%) — "the hand lies
flat on the lower front face of the bump … never hovers past the outline"; v2's "cups the underside … fingers in the
air". Against v3: the head came back up from the deep look-down in ~0.2 s at its peak (a "head toss" as the hand left),
and v2's chin lift read more clearly. Wrong in both: the deepest look-down came after the stroke (the trunk returning
from the stroke still's lean), and the resting hand still read frozen (it moved < 1 px at sheet scale).

What was done after it (final v3):
1. The stroke top keeps the bump key's trunk (`pose_blend --keep`): the stroke still leaned her back 3°, carrying the
   shoulder 27 px back for a hand move. Now the shoulder moves < 2 px and the wrist travels 58 px up the bump.
2. The head bows ~30% less at the stroke, starts up as the hand lands (10.35) and is up by 11.45: peak head speed 6 px/f
   (was 11).
3. The chin lifts 5.5° on the breath in (was 3.5°).
4. The resting hand rides the breath ~7 px and its fingers fan, the thumb eases out, then the fingers press flat on the
   way out (`spec.fidget`).

Blind A/B first v3 cut vs final v3 (fresh reviewer): **final wins, 6.5 vs 6** (60/40) — "stays planted and upright …
a quiet, mindful stance"; the stroke "noticeably further up the front of the bump, ~1.6× … still small"; the first cut's
deeper bow and quicker head lift "breaks nothing fast". Wrong in both: the drop to her side (11.2–11.5 s) is the shot's
fastest move ("a drop rather than drifts"); the stroking hand is a rigid "flat mitt" with stacked fingers, no wrist or
finger change; the breath still shows mostly in the face at phone size.

Drawing fix after it (no A/B needed): the nape notch with the head down — the chest skin's back edge sat on the neck's
back line and jutted out once the neck bent forward (seen with the new `tools/part_tint.mjs`); its top now starts
inside the neck base.

## Round 3 (v3) — FEEL: NOT YET · LASSETER 6.7/10 · HANDS 6/10 (NOT YET)
Three fresh reviewers. Landed: the lift (wrist leads, late turn, soft landing, tips inside the outline), one body on the
breath (head, neck, shoulder, strap and upper arm rise together), the elbow under the shoulder, the acting order (eyes,
then head, then hand), the head no longer tossing back. Off, as the three saw it:
1. The hand changes size: 129 px hanging, 100–113 on the bump, 82 at the stroke top ("a stubby paw" whose fingers then
   flick open in 6–8 frames). All three named it; the hands critic called it the reels client's exact complaint.
2. The look-down is a quick dip (0.4 s, most of it in 8.07–8.23) and then parks.
3. The return drops rather than drifts: the hand leaves at ~10.95 and is at her hip by ~11.4, the quickest move in the
   film; the head rises mostly in 10.8–11.13 and the soft eyes pop open while it is still rising.
4. The breath reads in the face: the "air out" before it does not read, the eyes shut in 8 frames mid-breath, the out
   (2.15 s) is barely longer than the in (2.0 s) and slides at an even rate.
5. The hanging hand is still a rake (straight parallel fingers, a thumb peg); the tender face keeps the neutral brow;
   a knob on top of the hand at the wrist and a step under it; one-frame ticks as each hold starts or ends.

What was done (v4):
1. MEASURED the size change before touching the drawing: the 3D arm's projected lengths on the bump were forearm 0.6,
   hand 0.49–0.65 — the forearm points at the camera and the rig's wrist (deviation only) made the hand point with it.
   New wrist FLEXION DOF and `lie: 'bump'` on every bump stop: the palm lies in the bump's tangent plane (PIPELINE
   lesson 37). Hand 128 px on the bump, 123 at the stroke top, 129 hanging.
2. The stroke top uses `crest` (only the pads curve over the dome), a 0.2 s pause there in the same shape, then the
   fingers open over the whole way down (flat by 9.9) and settle back onto the curve by 10.45.
3. The held hand's ticks: the wrist scan switched its pull from 0.3 (hold) to 0.02 (move) at the stop and refined only
   to 1.5°. Now continuous and to 0.15° (lesson 38): no step over 0.7° anywhere.
4. Timing: the look-down 7.65 → 8.73 on a long ease-out; the head comes up through a breakdown at 10.75 (n-look, a third
   of the way) and is up by 11.4; the soft lids and smile hold to 11.1, the eyes open by 11.3; the hand peels off at
   10.5 and drifts down over 1.45 s (the lift takes 1.25).
5. The breath: a visible air-out first (shoulders down 7 px at 2.9 s, chin down), the eyes drift shut from 2.75 over
   18 frames, in 2.8 → 4.5 (shoulder up 17.7 px from the low), a hold, then the out as a sigh to 7.4 (2.55 s, two thirds
   of the drop by ~5.85 s). The hand rides it further (dp), the fingers fan on the in and press at the pads on the out
   (no longer straightening: v3's fingers crept), and soften after it.
6. Drawing: `hang` grades the curl steeply from the index to the little finger, the fingers converging, the thumb along
   the index; `brow.soft` drops the brow and flattens its arch (tender face); the thenar edge no longer stands up as a
   knob on top of the hand (it is a palm-side pad, and the hand is seen from the back).

Blind A/B v3 vs v4 (first cut, fresh reviewer, relabelled): **v4 wins, 6.5 vs 6** — "the hand drifts back to her side
without a drop", "a real stroking palm" on the lower front of the bump; the breath's lead-in sag and the eyes closing
at the start "make the breath read in the body, not only in the face" (small at phone size). Against v4: from 8.77 to
10.2 s (and faintly 5.1–6.9) the fingertips ran exactly along the bump's front edge — a tangent. Wrong in both: the
stroking hand moves as one rigid piece; the chest and bump outline barely change on the breath; the hand stops dead
at her side.

What was done after it: `tip_check.mjs` now also measures each tip's clearance to the outline in ANY direction (a finger
running along the edge was 6 px inside along itself but touching sideways); the resting and stroke contacts moved ~3 px
in and the down stroke bows inward: every tip ≥ 10 px clear. The stroke got life: the hand's angle trails the wrist by
6 frames going up, and the fingers part and drag a little while it travels, then close over the dome at the top.

Blind A/B of that fix (final v4) against the first v4 cut (fresh reviewer): **the first cut wins narrowly, 6.5 vs 6**,
with low confidence (60/40), on one thing: in the final cut the elbow eased BACK 4–5 px as the stroke began and swung
forward again as the hand arrived (8.1–9.0 s), out of step with the hand. Both: a rigid stroking mitt, a breath that
reads mostly in the face, a step where the forearm meets the hand. The final v4 shipped (its fingertips no longer ran
along the outline); the elbow path was rebuilt in v5 anyway.

## Round 5: Harry on v3 (18:06), answered in v5

Harry, verbatim: "When the arm moves it looks it sort of shrinks. The movement is decent but it makes her arm looked
deformed once moving"; "fingers almost there but slightly too 'all together' or not feeling like it follows the
protruding bump"; "ankles are a super weird shape". (They reached the thread after v4 was sent; v4 had fixed only the
hand's own size.)

What was done (v5):
1. MEASURED the arm: v4's forearm drew at 57–65% of its length on the bump, the upper arm at 80% at the stroke top. The
   fitted still had put the wrist 0.33 H in front of the bump, v3 had lifted the hand 45 px, and `dphi` −35 held the elbow
   under her shoulder. Now the wrist lies ON the bump (`surface`), the hand stays where the bump still has it (13 px
   lift), and the swivel comes from a scan of the drawn lengths (−25 resting, +20 at the stroke top, 53 px up): every arm
   segment 93–100% all shot, the elbow just behind her back as in the stills (PIPELINE lesson 39; new `limbs` gate in
   `qa_checks.mjs`, which fails v4 and passes v5).
2. The hand, after the bump stills: the thumb out, apart from the index; the fingers a little fanned; each finger curled
   just enough that the tips end in a line ~9 px inside the bump's outline, as if they run on round it (lay, crest and
   flat redrawn; limp curls as much so the tips don't graze the edge arriving or peeling off). Tried first: curling the
   fingers through the hand's real 3D frame; with this camera the curl moved the tips forward, hooked over the edge
   (lesson 40).
3. The ankles: the shin tube ran into a round cap at the ankle (a pinch in front, a knob behind). Now it runs on into the
   shoe and the foot's front edge leaves the shin tangentially along an instep measured on the master (lesson 41); the
   edges match the master within a few px row by row.

Checks: `qa_checks` PASS (with limbs), `tip_check` PASS over the whole shot (every tip ≥ 4 px inside and ≥ 9 px clear).

Blind A/B of v5 against v4 (fresh reviewer): **v5 wins, 6.5 vs 6**, moderate confidence (60–65%). Only the near arm and
hand differ. The reviewer's clearest point, measured: v4's forearm drew about 30% shorter whenever the hand was on the
bump, and the arm's area fell from ~1,720 px at rest to ~1,405 px at the stroke top ("reads as the arm shrinking and the
hand looking big"); v5 keeps its rest length all shot. Also for v5: the elbow breaks her back line and takes part in the
stroke; the hand reads as cupping the dome (thumb out, fingers fanned, tips on the outline). Against v5: the four fingers
stack a little comb-like at the stroke top (9.0 s); v4's tucked arm is softer, if stiffer. Both: the step where the
forearm meets the heel of the hand, the stroking hand as one rigid piece, a breath that shows only in the head. Caveat:
partway through, after the forearm measurement, the reviewer saw a CLAUDE.md notice describing v5, so the verdict is
not fully blind.

## Engine fix (2026-10-13, found on mum3q look-up v7): the hand's contact shadow now draws
The shot keys `fx.contact.near` (off while the hand hangs, on from 2.05 s once it lands), but `engine/anim.js` stored a
keyed `fx.contact.near` as `fx.contact`, so the shadow designed for this shot never drew in v1–v5. Fixed (lesson 52);
from the landing on, the hand casts its faint shadow (12 %, 4,6 px) on the bump. No pose changed (bone diff 0); QA PASS,
including the new `channels` gate, which fails on the old engine. The next render of this shot carries it.
