# Feel critic log — mum3q / look-up (look and feel only; no metrics)

The ¾ view's first shot (2026-10-12): she stands turned toward us, her hand resting on the lower front of her bump,
looking down at it with a tender smile; she looks up to us and smiles warmly, holds our eyes, and looks back down. An
8 s loop. Keys from three stills (q_k_down_0, q_k_mid_2, q_k_up_1), bodies fitted (rms ≤ 0.032), heads set from each
still's face by `tools/head_pose.py` (within 1°).

## v1 — built
- Timeline: looking down 0–1.5 s; anticipation (a touch deeper into the nod, the shoulders settle) to 1.9; the eyes lead
  (on us by 2.2) and the head lifts through the mid key (a breakdown at 2.45) to the up key at 3.0, a long soft arrival;
  the smile opens just after (3.25); a moving hold with a warm head tilt (4.3) and a slow blink (4.6); the eyes go back
  down first (5.35–5.85), the head follows through the mid breakdown to the look down by 7.2. A breath in starts as she
  looks up and peaks in the eye contact; fingers fan while she looks down, press as she smiles, soften on the way back.
- New for the ¾ view, each from the stills:
  1. Mouth channel `beam`: the smile OPENS, a crescent of lip under the lip line with a band of teeth (q_k_mid/up show
     an open, toothy smile; the closed `warm` line read as a polite smirk). It grows from zero area, so it never pops.
  2. Lids for eye contact: 0.4 of `lid.smile` made the ¾ eyes look sleepy; face-warm keeps them open (smile 0.15).
  3. Hand shape `drape`: the profile's `lay` curls each finger ~100° so the tips end along the bump's outline; in ¾ the
     bump's front faces us and the still's fingers lie flat at full length (lay read as a short paw).
  4. No `lie` on the bump hold: projecting the palm into the bump proxy's tangent plane foreshortened the hand to 79% of
     its length in ¾ (`qa_checks` limbs); the fitted hand already lies along the bump as in the stills (90–100%).

## Round 1 (v1) — FEEL: NOT YET · LASSETER 6.2/10 · HANDS 5/10
Three fresh reviewers (critic_F --lens all). Right: the look up (the eyes reach us 0.2 s before the head moves; one eased
arc with a soft arrival; bun, ear and face turn as one head); the slow sink while she looks down; the clean loop seam; the
near hand's placement and full length (drape, no lie). Off, as all three saw it:
1. The return stalls: the eyes drop at 5.5 s but the head waits until 6.4 (the mid key is nearly the up key: nod 3.4 vs
   1.6, so up → mid moved nothing); 0.9 s of eyes down, head up, half lids reads aloof; the teeth vanish in 2–4 frames.
2. The hold is a posed photo: the same toothy beam 2.9–5.4 s, round eyes with nothing smiling in them; the teeth show by
   2.6 s, before the head lands (look and smile arrive as one idea).
3. The far hand swings on its own, in and out behind the skirt by half its width (each still's fit has its own far arm:
   forearm 10° → −3° → 3°): the biggest motion in every hold.
4. The near hand is a decal: frozen 8 s (the 2–3° fan/press/soften fidgets don't read); straight parallel fingers (a
   comb), the thumb a long tab.
5. The body doesn't join: the head pivots on a still torso (shoulders, straps identical down and up); the breath shows
   only in the far hand.
6. (feel, low confidence) the eyes' lead goes from slits to wide in 2 frames: a touch startled.

What was done (v2):
1. Return: the head starts ~5 frames after the eyes (n-up hold to 5.65) and drifts down over 1.45 s through its own
   breakdown (n-ret: forward and tipped toward the bump, nod 13), not the look up reversed; the upper lids stay open
   until the head drops (face-drop); the lips close over 0.55 s on their own track, slower than the eyes.
2. The smile staged after the look: the tender closed smile while the head rises, the beam blooms 2.95–3.35 s with the
   LOWER lids lifting (face-beam), then settles to lips barely parted by 4.3 (face-warm). Eyes and mouth are separate
   tracks.
3. The far arm and legs are the look-down key's in every key, and the far upper arm counter-rotates the trunk's change so
   it hangs plumb (far hand tip ≤ 1.7 px/frame).
4. Near hand: one slow caress down the bump while she looks down (~8 px, with a thumb sweep), it rides up with the breath
   in (3.7 s) and back down, the fingers press flatter and spread at the smile, and re-settle index first as her gaze
   returns. `drape` redrawn: graded curl (index nearly straight → little finger most), fanned −9…8°, thumb folded and
   nearer the index.
5. Body: the up key opens the chest (−1°, ribcage lengthened 2%) and lifts the shoulders 2.5°, trailing the head by 4
   frames; the down key rounds the upper back (chest +1.5°, upper spine +0.8°); the shoulders soften after the head lands
   on the way down; the breath gain up ~40%.
6. The eyes lift with the gaze over 0.45 s, only a little wider (wide 0.1).

Blind A/B v2 vs v1 (one fresh reviewer, crop of the upper body): v1 6.5, v2 6 — v1 preferred, low confidence (55–60%).
- v2 better: the body joins the look up (back, shoulders, upper arm ease back with the head).
- v1 better: the expression arc. v2's beam settled to 0.4 by 4.3 s, below where the teeth clear the lip line, so the
  hold read as "a wide-eyed, unchanging closed smile" for 2 s; and v2's open upper lids on the way down kept the eyes
  reading as ON us until 6.1 s (the gaze shift alone doesn't read with the head up).
- v1 better: v2's descent read as even steps with a dead stop at 7.1 s.
- Both: the near hand glides as one rigid piece (v2's finger curls of 4–6° are in DEPTH for a hand seen from the back:
  they foreshorten by ~1% and never read); the far hand is static.

What was done (v3):
1. The hold keeps the open smile with teeth (beam 0.9 at the peak, settling to 0.65, still clear of the lip line);
   it blooms as the head lands (3.15 s).
2. Smiling eyes: `lid.smile` now ARCHES the lower lid up in the middle (a crescent) instead of flattening the oval;
   0.18 at the peak (the stills keep the eyes round and open: 0.25 already read as squinting).
3. The return: the lids lower WITH the eyes' drop (5.4–5.8), the head starts at 5.5, through n-ret at 6.4 to a long soft
   landing at 7.3 (1.8 s).
4. The near hand's life moved into what a back-of-hand view shows: the fan (fingers spread and the thumb sweeps out
   with the caress, gather back on the return), and a "holding you" gather at the smile (curl 8–14° per joint: the
   fingers shorten ~8% and draw together), then a spread re-settle index first.

Blind A/B v3 vs v1 (one fresh reviewer): **v3 6.5, v1 6 — v3 preferred** (moderate to low confidence). Its reasons, in
order: the upper body takes a small breath-like lift into the look up (v1 "a head turning on a mannequin"); the smile
blooms after the eyes meet ours (eyes, then head, then smile: a reaction to the contact); the gaze drifts back down
over 1.6 s; the look down at the start reads as looking AT the bump. Open in both: the near hand still reads as
straight, parallel, evenly spread fingers at the reviewer's scale (the fan and gather were not seen); the far hand does
nothing; the hold 3.2–4.6 s starts to feel held before the slow blink. Kept v3. Render: `renders/mum3q_look-up_v3.mp4`.
