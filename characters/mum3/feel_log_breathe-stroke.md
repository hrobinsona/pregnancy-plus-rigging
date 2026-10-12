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
