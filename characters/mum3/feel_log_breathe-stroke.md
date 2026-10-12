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
