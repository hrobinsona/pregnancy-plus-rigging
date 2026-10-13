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

## v4 — both hands on the bump (Harry on v3)
Harry (2026-10-13): "Her arm is just hanging lifeless and swings in a weird way. In reality it would likely be placed on
her bump too" and "it's really that second hand that's the issue, as it just hangs there at a very odd angle while the
other one's on the bump". What was done:
1. New stills with both hands on (q_k2_down/mid/up, 3 samples each, via the Mac worker): the far hand rests on the TOP
   of the bump, fingers draped over its far edge, the forearm hidden behind her, the wrist just showing under the bust.
2. The far hand placed from three points marked on q_k2_down_2 (wrist, middle knuckle, fingertips): MediaPipe can't see
   that wrist and fitting the hand's skin blob failed (PIPELINE lesson 48). `tools/hand_place.py --keys` solved the arm
   at 7.9 px rms with the elbow tucked back at her side and nothing of the arm outside her outline. Shape `atop`:
   fingers draped with a light curl, a small fan, the thumb tucked under.
3. The keys keep v3's body and face (n-base = the look-down key with that far arm); the far hand is pinned to the
   belly by a reach (it rides the breath and the look up), strokes ~6 px down over the top as her gaze returns
   (5.75–7.45 s, not with the near hand's caress at 0.3–1.85), and its fingers open while she looks down and gather a
   beat after the near hand's "holding you". Both hands cast the contact shadow.
4. Engine: `keepSize` on the far stops. Pinned while her chest opened, the palm grew from 48% to 61% of its length and
   back; now 47% ± 1% all shot. QA declares the far forearm hidden and the far hand short by design (`spec.qa.limbs`).

Blind A/B v4 vs v3 (one fresh reviewer, upper-body crop): **v4 6.5, v3 5.5 — v4 preferred, high confidence.** Its
reasons: both hands cradle the bump (the brief's pose); v3's far hand "hangs below the bump and, at phone size, looks
like a stray hand poking out from under it", and it sways ~11 px with nothing in the body causing it; v4's far hand
stays in contact. Against v4 (small, "barely shows at phone size"): the far hand's top edge is a straight cut with no
forearm, "slightly pasted on" close up, and with the hand over it the bump's front reads a little boxier. Open in both:
the near hand's fingers still parallel and comb-like; the head lift is brisk (most of it in 0.3–0.4 s) against a 1.5 s
return; the open grin appears in about half a second as she reaches us. Kept v4. Render: `renders/mum3q_look-up_v4.mp4`.

## v5 — the far hand lies on the bump (Harry on v4)
Harry (2026-10-13), with a crop of v4's far hand and a photo of a pregnant woman holding her bump (kept out of this
public repo): "Sorry no ones hand naturally lies like this." In the photo the top hand's palm lies on the dome, the
fingers together and gently curved, wrapping toward the camera; the lower hand cups the underside. What was done:
1. New stills asking for the photo's hand, not a drape: q_k3_down (the far hand's palm flat on the top of the bump,
   fingers together, curving forward and down, every fingertip on the bump) and q_k4_down (both hands as in the photo,
   kept for later). v4's prompt had said "draping over the far edge" and got fingers hanging off it.
2. The far arm placed on q_k3_down_1 by `hand_place.py --natural` (lesson 49): the keys alone were met by an elbow
   inside her bust; now the upper arm hangs at her side, the forearm runs forward behind the bump, and the hand lies
   across its top, the heel just over the far edge, fingers toward us. Shape `hold`: fingers together and gently curved,
   the thumb tucked. Its fidget eases the index instead of fanning the fingers.
3. The far hand points nearly at us (palm 44% of its length), so it's touchy: the wrist needed room from its limit
   (mum3q's flexion now 80°, the solve keeps 15° clear) for keepSize to hold its size (1.01 all shot), and the stroke at
   5.75–7.45 s now runs along the hand toward the fingertips with `slide: true` (without it the fingertips swung 10 px
   in a frame as the stroke began).

Blind A/B v5 vs v4 (one fresh reviewer, upper-body crop; X = v4, Y = v5): **v5 6.5, v4 5.5, v5 more natural, ~75%
confident.** Its reasons: v4's hand "looks like a little raised paw hanging under her bust", its arm would have to come
down from her chest, and its fingertips poke past the bump's edge; v5's "reads as her far arm reaching round and holding
the top of the bump", palm and fingers on it, only the back of the hand over the far outline. Against v5: its fingers
are short, thick and parallel ("a bit like a comb or mitten") and its outline blocky (flat top edge, square heel); v4's
hand on its own was the better drawing. Open in both: the hands barely move through the look up and back; the far
hand's top edge is a flat line at the underbust with no wrist; the smile shows its teeth in one frame (2.9 → 3.0 s).
Kept v5. Render: `renders/mum3q_look-up_v5.mp4`.

## v6 — both hands holding the bump, the top one curled over it (Harry on v5)
Harry (2026-10-13 11:07–11:12) on v5: "Still looks creepy and lifeless. Rather than being a little a curled over the top of
the bump"; "We won't always have a photo so it should be the reference image. Does it feel natural, does the positioning
look like an illustration of a human and how they would hold themselves"; "please make sure the skill is really learning
from these corrections". New stills q_k4_down (both hands holding the bump) disagreed on which hand is on top; Harry
picked "keep far on top" on a decision card (11:28). What was done (lesson 51):
1. **Both arms placed on still q_k4_down_0 with the arm it shows** (`hand_place.py --hide none`, `--fore` for the far arm
   coming down past her bust, `--elbow` for the near one): the far hand curled over the top of the bump, the near hand
   holding its underside, the thumb above. Engine: a reach restores the keyed arm when the 3D solve lands on the mirror
   branch, and `keyedArm: true` stops keep the fitted arm (the far elbow had hopped 40–70 px between frames); `qa_checks`
   now fails an elbow that jumps while its wrist holds.
2. **Shapes picked side by side with the still** (new `tools/hand_shapes.py`). The first `hold` (70–85° curl) drew "a
   mitten", the first `cradle` (75–90°) "a rake". Now the top hand's fingers are long and step down in a diagonal, curled
   in the middle and end joints, and the hand lies palm DOWN onto the dome (`--palm-down 0.55`) so the curl bends them
   down over it on screen (facing away from us, any curl only shortened them: "straight planks"). The lower hand's
   fingers lie together, nearly straight along the curve. A heel pad rounds the far wrist (it had a pointed corner).
3. **Life a viewer sees.** Two fresh reviewers saw "the hands look identical in every frame" with 2–4 px settles. Now: a
   caress while she looks down (the top hand turns about its wrist and slides down the dome, the lower one strokes along
   the underside, half a beat behind), the cradle lifts the bump as she breathes in to look up, a squeeze as she smiles, a
   long stroke through the smile, a settle as her eyes come back. The alive gate is 5 px on her in every 2 s (was 1.5).
   The wrist slides only ~6 px: a 14–18 px slide pulled the far forearm in behind her bust (its strip lost 35% of its
   area); a forearm twist opened a white gap under her bust (73 px; now ≤ 13 with a fuller forearm edge).
4. **Face and timing.** Looking down, the eyes are open under heavy half-lowered lids (first "closed slits", then "wide-
   eyed") and the head bows a little deeper. The look up's breakdown is half way in the head (its still, q_k_mid_2, is
   85% up: the lift had happened in 0.3 s).

Checks on the final render: QA PASS (alive 5 px, limbs, elbow gate), tip_check PASS both hands, char_check ok, the far
arm's visible strip ±17% over the shot (it narrows slowly as her chest opens), mum3 and mum2 unchanged (pose diff 0).
mum3 breathe-stroke declares its deep breath (3.0–5.7 s) a deliberate hold for the new 5 px floor.

Reviews (fresh each round):
- Blind A/B v6 draft vs v5: **v6 6.5, v5 5.5** ("Y's far hand clearly belongs to an arm"); both hands frozen at phone size.
- Natural lens round 2: NOT YET (top hand a mitten, lower fingers a rake, hands invisible-alive, eyes closed, lift brisk).
- Blind A/B round 3 vs v5: **v6 6.5, v5 5, ~75%** (the far arm doing something, the eyes-first unhurried look up, the
  eyes visibly on the bump); against v6: the far hand mitten-like with a wrist lump, a white notch at 1.2–1.4 and
  5.1–5.5 s, the body hardly joins the look up.
- Natural lens round 3: NOT YET (top fingers straight planks, not curving down the dome; a knob at the far wrist, "a hand
  out of an elbow"; the look-down head too upright and wide-eyed). Answered by palm-down, the lids, the head bow, the
  fuller forearm.
