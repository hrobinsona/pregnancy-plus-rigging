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
- Blind A/B round 4 (the committed v6) vs v5: **v6 6.5, v5 5.5, ~70%** (the far hand belongs to an arm, the near hand
  cradles from beneath, the unhurried eyes-first look up, the eyes half-closed on the bump); against v6: the far hand
  "starts right at the elbow bulge" (its forearm fully foreshortened); in both, the hands still read as frozen at phone
  size and the fingers as "evenly spaced parallel strokes, comb-like".
- Natural lens round 4: **NOT YET.** The top hand now reads as "a paw": with the curl in the end joints its fingers are
  short stubs curling down (round 3 called the flatter version "planks"); the far wrist a round knob wider than the
  forearm; the lower hand's fingers "four even parallel stripes", a comb; the hands' 5–18 px moves invisible on the
  contact sheets; the bump's lower front flat; the look-down eyes a little drowsy.

Kept v6 (it beat v5 in every blind A/B). Render: `renders/mum3q_look-up_v6.mp4`. The finger curl has now swung between
"mitten", "planks" and "paw" over three rounds: tuning that ping-pongs means change the method (lesson 15). Next: the
hand DRAWING, not its pose. engine/hand.js draws a back-view hand as one silhouette with crease lines for the fingers;
the stills draw each finger as its own tapered shape, the tips stepping. Redraw the fingers that way (both hands, every
pose), judge it on `hand_shapes.py` against q_k4_down_0, then re-place. Then: the far wrist (a crease where it bends
over the edge, not a pad), visible life checked on the phone-size video rather than contact sheets, the bump's lower
front.

## v7 — the hands drawn like the stills' hands, their shadows, life you can see (round 5)
Round 4's natural lens on v6: the top hand "a paw", the far wrist "a round knob", the lower fingers "four even parallel
stripes", the hands frozen at phone size. The curl had swung mitten → planks → paw, so this round changed the DRAWING
(lesson 52), judged beside still q_k4_down_0 with `hand_shapes.py --try '[{"style": …}]'`, then re-placed both hands.
1. **Drawing, three tries.**
   - First (thin lines `rim` 0.009, pointed tips, steep graded curls): **lost** its blind A/B to v6, **v6 6.5, v7 6**:
     "the fingers fused into one wedge… a flat paddle"; the natural lens: "a fused mitten with lines drawn on", the lower
     fingers "converge to one point… a flipper".
   - Second (`rim` 0.012, `taper` [1, .92, .84, .76], round tips `tipK` 1.0, fingers fanned a few degrees, a wrist
     crease, the shadows): **won narrowly, v7 6, v6 5.5** (55–60%): the shadows give the hands "weight… the torso has
     volume"; against it, the creased wrist "a ball, a fist… a puffy glove cuff". The natural lens: NOT YET (the wrist
     "a teardrop swelling into a ball… no back of the hand", the top fingers fanned ±10° "a claw" with "dashes", the
     lower tips "blunt… in a column", the hands' moves invisible at phone size, the bump's flat lower front, drowsy
     look-down eyes).
   - Third (kept): the far wrist pad at 0.65 (it had been wider than the forearm: its radius came from the back edge v6
     widened; `arms.js` now clamps a pad to the wrist's width), a short fine crease, the top fingers together (±6°, 30° →
     70°) with long lines, the lower fingers fanned up to 6° so their round tips step, the little finger shortest, the
     lower thumb's end joints bent toward the bump.
2. **The shadows were never drawn.** The look-up (and mum3's breathe-stroke) keyed `fx.contact.near/far`, but
   `anim.js` stored them as `fx.contact`, so no contact shadow ever drew. Fixed, with a `qa_checks` gate (`channels`) that
   fails on the old engine. The near forearm casts one too, as in the still (dress only, 16 %, 5,9 px); the far wrist pad
   is in its hand's shadow group (left out, the hand's shadow was painted on it).
3. **Life.** The top hand's turn about its wrist (15–24°) moved its fingertips only ~6 px: lying palm down, the turn is
   seen edge-on. Its life is now in its fingers: they lift and settle while she looks down, gather into a squeeze as she
   smiles (2–3× the old angles). The lower thumb strokes 26°, the lower fingers gather as she lifts her eyes, the cradle
   lifts ~11 px with the breath, and a small thumb stroke crosses the loop's seam (v6: dead still 7.4 → 0.4 s). The
   lower hand's forward strokes are a little shorter (6 px): the longer middle fingertip came within 7 px of the bump's
   front edge (tip_check).

Checks on the final render: QA PASS (including the new channels gate), tip_check PASS both hands, char_check ok, the
underbust slit ≤ 18 px of near-white (invisible at phone size). mum2's SVG output is identical (33 sampled frames); mum3
changes only by its contact shadow, now drawn from the landing on (QA PASS).

Blind A/B of the kept v7 vs v6 (fresh reviewer): **v7 6, v6 5.5**, low confidence (55–60%): v7's lower hand "reads as a
relaxed hand cradling the bump", its thumb "slightly hooked… looks alive", its contact shadows make "the hands seem to
press on the bump"; v6's top fingers read better ("clear gaps… curve down over the dome"), v7's "a flat paddle scored
with thin lines" whose lines break into dashes as the fingers curl (`hand.js` fades a back-view line past 55° of curl).
In both: the far wrist still a round lump where the forearm meets the hand; the hands' caress a pixel or two at phone
size beside the head's move; a brief wide-eyed stare at 2.8–3.1 s before the smile blooms. "Harry's eye should decide."
Kept v7 (it beat v6 in two of three blind A/Bs, each narrowly). Render: `renders/mum3q_look-up_v7.mp4`.
Natural lens on the kept v7: **NOT YET.** Landed: the contact shadows (item 18), no arm shrink, the unhurried look up.
Open: the top hand's fingers short and hooked at the tips ("a paw") out of a wrist that still reads as a ball wider
than the foreshortened forearm entering it; the lower fingers' three long even lines ("a comb") and short thumb; each
hand's centroid moves ~3 px on the phone-size film against the head's 37 (the visible life is the lower thumb and the top
fingers tilting); the look-down head bowed too deep (the chin at the neckline, the neck short) with sleepy lids; the
bump's lower front a straight diagonal into a corner.

Next: the far wrist as the still draws it (the forearm narrowing into a wrist that bends over the dome's edge, not a
pad over a tube's end); the top fingers' lines kept whole through a curl; gestures large enough to read beside the
head's move, measured in the frames; the bump's lower front; the look-down lids.

## v8–v11 — the top hand is her LEFT hand, measured on the still (Harry on v7)
Harry on v7's top hand (2026-10-14): "This hand is still a total mess. It looks like it's the wrong way round. How does it
compare to the reference image?"

**v8: the cause.** It was the wrong hand. `params.js` built the far hand as a copy of the near (right) one, so v1–v7 laid a
RIGHT hand on her left arm: thumb and index along its lower edge, the little finger on top, where q_k4_down_0 has the index
on top. Mirrored (`thumbSide` −1, `thumbFx` flipped, the shot's raw finger spreads flipped), with a gate: `tools/handed.mjs`
in `char_check` and `qa_checks handed` (fails v7 on all 240 frames). Read the same way, the strip past her bust is the
hanging UPPER arm, the elbow at her side on the bump's edge and the forearm pointing at us (the still's round mass): re-placed
with `--elbow`, the forearm drawn end-on (lesson 53). Blind A/B v8 vs v7: **v8 5.5, v7 6** ("a pale round knob" of a wrist,
"fingers short, nearly horizontal… tips bunched"). Natural lens: NOT YET (a paw on the end of a tube).

**v9: measured, not tuned.** On the still's pixels (a 10 px grid, the lines between the fingers found by colour) the
fingers lie at 38/35/30/28° from index to little, the tips step down a diagonal, the knuckles square to the fingers. v8 had
met its keys to 1 px with the fingers at 28–17° and the tips in one column: the tips' centroid let the hand roll, and the
knuckle key was 12 px low. `hand_place.py --tips` (each fingertip a key); the shape couldn't meet them until the hand DRAPED,
bent at its knuckles over the dome (MCP 48–56°, PIP 8–14°), its spec stepping the knuckle arc and shortening the outer
fingers, and `lineMcpK` keeping the lines whole (lesson 54). 4.5 px. Blind A/B v9 vs v7: **v9 6, v7 6.5** (the wrist "a
round ball that hangs past the bump's outline and casts its own shadow", "a straight seam… like a cuff"). Natural lens:
NOT YET, and two things the key never showed: the breath turned the end-on forearm and laid the fingers 5° flatter on the
film than on the key (26° at 0 s), and the squeeze curled the drape into "a paw".

**v10.** `keepPalm` on the reach (the hand keeps its palm's facing as the breath moves the shoulder; the fingers back to
32°); the squeeze presses at the knuckles (+4–6°, the finger joints straightening; the fingers steepen to 40° at full
length); the end-on mass along the upper arm, flowing out of its outer edge round the bump's edge (`endOn.axis 'upper'`,
picked beside the still from 15 variants), casting no shadow (`noCast`). Blind A/B v10 vs v7: **v10 5.5, v7 6** ("a large
smooth dome… a swollen wrist… bulges past the bump's front outline"; "a thin strip of arm ends on a hard horizontal line…
like a cuff"). Natural lens: NOT YET (the wrist "a ball… the hand growing out of an elbow knob"; the lower two top fingers
"hooked into stubs"; and the open points below).

**v11.** The hand's heel outlined over the wrist's mass as the still draws it (the wrist bending back toward us), the mass a
little smaller (r 0.85, bulging less past the bump); the fingers fanned like the still's and the lower two straighter
(`tools/finger_angles.mjs` on the film: 36/33/30/27° against the still's 38/35/30/28 at 0, 2.75 and 7.3 s; v10 32/33/33/27).
QA PASS, tip_check PASS both hands, handedness PASS, mum2 and mum3 SVG identical to before (33 sampled frames each).
Comparison: `/mnt/project-files/rigging/mum3/mum3q_top_hand_still_v7_v11.png`.
Blind A/B v11 vs v7: **v11 5.5, v7 6** (65%): the only differences are the far wrist and hand; v11's "round knob hanging
off its right end… a swelling or a puffy mitten, and you can't tell how the forearm joins the hand", the hand "a flat
paddle", heavier than the near hand; v7's "forearm widens into a bent wrist… with a small crease", its fingertips curling
down and settling. Four rounds (v8–v11) each lost to v7 by 0.5, every time on the wrist: fresh eyes read the still's strip
past her bust as a FOREARM running into a bent wrist (the natural lens on v10 read the still that way too), and the still's
round end-on mass, drawn flat, as a lump. It looked like a choice of drawing for Harry (the still's round wrist, or a
forearm into a bent wrist as v7's); it was the drawing order (v12–v13 below).

Natural lens on v11: **NOT YET**. The top hand itself now matches the still (palm down, fingers together, tips stepping, the
finger angle within 1° at 7.3 s, her left hand), but the wrist is "an oval about 35×42 px… ringed by a crease; its bottom
hangs about 10 px below the hand's lower edge and outside the bump's outline". Also open: the hands lifeless at phone size
(top tips move 2–3 px), the bump's lower front a corner, the sleepy look-down eyes, the half-lidded sideways glance at
5.7–6.4 s, a nub in the top hand's lower outline.

## v12–v13 — the wrist over the hand's heel, behind the bump (natural lens on v11)

The wrist wasn't put to Harry after all: measured on the still at 4× first. v11's silhouette already met the still's wrist
to the pixel (right edge 655 vs 655 px, bottom 592 vs 592); what differed was the ORDER. In q_k4_down_0 the forearm's round
end lies OVER the heel of the hand (the back of the hand runs into it, one short arc where it folds in) and BEHIND the bump
(the bump's outline cuts its lower side). v11 drew it behind the hand, the hand outlined round its end (lesson 55).

**v12.** `endOn.front` (over the hand) and `endOn.cut: 'dress'` (shown only outside the dress: `clipOut`), the mass
outlined over the hand and arm, the line faded mid-edge (`fade.at`, new in `rig.js`). Blind A/B v12 vs v11: **v11 6, v12
5.5** ("a curved line arcing across the back of the hand… a puffy cuff or mitten, or a thumb seen from behind"); v12 vs
v7: **v7 6.5, v12 6**. Natural lens: NOT YET ("a narrow upright capsule, cut off from the back of the hand by a C-shaped
crease").

**v13.** No outline round the mass: `endOn.lines` draws only the arc the still draws at its top, where the back of the hand
folds into it (an outline group drew over the hand anyway: its occluders are only parts of another colour). QA PASS,
tip_check PASS both hands, finger angles PASS (worst 2° at 0, 2.75, 7.3 s), handedness PASS, mum2 and mum3 SVG identical.
Blind A/B v13 vs v11: **v13 6.5, v11 6** ("forearm, bent wrist and hand read as one continuous limb"; v11's "a separate
lump or mitten heel"). Blind A/B v13 vs v7: **v13 6.5, v7 6**, the first top hand to beat v7 ("reads as a hand curled over
the top of the bump, cradling it as the brief asks"; v7's "a pointed, hinge-like wrist… like an elbow knob"). Its one
complaint: "a faint straight seam across the forearm where it meets the hand, like a cuff".
Natural lens on v13: **NOT YET**. The wrist is down to "YES (mild)": "a rounded lobe… a short crease separates it from the
back of the hand" (the still's crease "long, the mass flowing into the hand's heel"). Its list, in Harry's likely order:
1. "a stubby paw": the top fingertips blunt and bunched in a steep column (~50°) where the still's are slim, tapered, with
   gaps, stepping along ~30°;
2. the look-down head bowed past both stills (eye-to-chin ~25% short, the chin on the neckline, the lids nearly shut);
3. the bump's lower front a chamfer into a corner;
4. the hands' life invisible at phone size (top hand ≤ 4.6 px all shot, the head 38 px); the lower thumb a stub, its tips a
   blunt column; the top hand's shadow harder than the still's.

## v14 — the v13 natural lens's four drawings, each measured on the still (lesson 56)

Each had met its points with the wrong form between them:
- **Top fingertips.** The still's knuckle line slants down toward the little finger (its lines start 564,538 → 573,551 →
  583,561 px) and the little finger is short: `knuckleArc` [1, .97, .9, .8], `fingerLen` [1.05, 1, .86, .68], f4 bent 62°
  at its knuckle; refit to the four tips 4.7 → 3 px rms, the tips stepping 516 → 520 → 534 → 552 px across. Finger angles
  on the film 37/33/29/27° against the still's 38/35/30/28.
- **Look-down head.** n-down rolls the head 8° toward the bump with half the nod (headPitch 28 → 14; n-dip 17, n-mid 8,
  n-ret 9): the stills tip the head and keep the face.
- **Bump's lower front.** Tangents measured on the master (61°, 85°, 110°, and 121° at a new point `low`) in place of the
  designed 55/90/125: one convex curve into the skirt. Rest IoU 0.965 (v13 0.965).
- **Lower hand.** Overlaid on the still (new `tools/mask_overlay.py`): thumb ~8 px short, fingers fat, fanned past the
  bump's edge, 1682 px of mismatch. Thumb longer and slimmer (prox .43, dist .37), fingers slimmer and tapered (fingerK
  .9, taper to .66), the index longest, cradle fan −3…3, refit to the still's four tips (623,756 · 620,764 · 608,772 ·
  588,780): 1166 px. It's drawn at 76% of its length all shot (v13 84%): `spec.qa.limbs` hand.near min .74 with the
  reason; held at 91% (`--hand-len 0.85`) it matched worse (1431 px).

QA PASS (limbs with that exception), tip_check PASS both hands, finger angles PASS (worst 2°), handedness PASS, mum2 and
mum3 SVG identical. Blind A/B v14 vs v13: **v14 6.5, v13 6** ("its top hand reads as a hand lying over the bump with
fingers you can make out… a relaxed hand resting on the bump"; v13's "a cap or paw"; the lower hand "slightly more like
cradling", the bump "a touch rounder at the bottom front"). In both: the hands dead still at phone size, the look-up mostly
the head, the look-down "very bowed".

Natural lens on v14: **NOT YET**. Checked against the stills myself (face at 2×, `out/mum3q_look-up_refmatch_00.png`):
1. **The look-down eyes and neck (real).** The stills' eyes are OPEN, the iris resting on the lower lid, looking down; ours
   are half-lidded, the iris under a flat low lid, so she reads "sleepy or smug, not tender". The stills keep a long neck
   (~43 still px from chin to neckline; ours ~25): the head bows at the top of the neck, it doesn't sink onto it.
2. **The hands' life at phone size (real, open since v6).** Both hands look identical in all 120 phone-size frames; the
   head travels ~40 px. They need a press or gather on the outline as the smile blooms, a ride on the breath, a settle.
3. Top fingertips "stubby, stacked", the lower hand "a comb, stub thumb": NOT what the still overlay shows now (top tips
   within 3 px of the still's, lower 1166 px from 1682). The reviewer judged "from the crops… small at the size shown";
   re-check after 1–2 at a larger crop before tuning again.
4. The bump's lower front "a straighter diagonal… a corner": the rows now follow the master; low confidence at that size.
5. Small: the eyes go round and wide at 2.0 s from a still-bowed head ("peeking"); at 5.9–6.3 s lowered lids with the
   head up read as a sideways glance; the top hand's shadow harder than the still's.

## v15–v16 — eyes with a white (natural lens on v14: "slits… sleepy or smug")

`parts/head.js` gained an eye white (the opening the lids shape) and an iris the gaze moves inside it (`P.eyeLook`; at rest
the master's dark oval to the pixel). Zoomed beside q_k_down_0 it matched: the white above and behind the iris, the iris
toward the bump.
- **v15** (lids .75/.25, gaze .012,.03, the iris ×1.6): blind A/B v15 vs v14: **v14 6.5, v15 6** ("wide open with white
  all round… a cartoon eyes-down, a side-glance"). Its natural lens (NOT YET) said the eyes "landed" and the neck no
  longer sunk; still open: the hands' life, the body not joining the look up, the lower fingertips 15–20 px short of the
  bump's edge, hard contact shadows, the smile not reaching the eyes at 3.5 s, the eyes "peeking" at 2.0 s.
- **v16** (v14's heavy lids .6/.4, a white wedge, gaze .012,.02): blind A/B v16 vs v14: **v14 6.5, v16 6** ("a short dark
  slash… heavier, sleepier"; v14's "dark iris showing low… looking at her bump").
At phone size the white vanishes into the skin and only the dark mass reads: mum3q keeps `eyeLook` {1, 1, 1}, v14's eyes
(lesson 57).

## v17 — the body joins the look up; the hands' moves larger; the lower tips reach the edge

From the reviews of v14–v16 (all three named them):
- **The lower fingertips** stopped ~24 px inside the bump's front edge on the film (tip_check; v13 23): the fitted hand on
  n-down's trunk sits back from where the still has it. Every near reach stop moves 0.06 H forward: 12 px at 0 s, 9 at
  the stroke's end (tip_check clear ≥ 9 PASS).
- **The body joins the look up:** n-up's chest lifts and opens 3° more than its still's fit (`--add chest=-3,spineUpper=-1`),
  n-mid half of it.
- **The hands' life:** the top hand's two strokes (1.2 s, 4.7 s) slide 1.6× as far, the cradle's lift and strokes 1.6× as
  high; the smile's squeeze presses half again as much on the top hand and gathers the cradling fingers. Fingertip moves
  on the bump: near 20 → 26 px over the shot (up to 20 px in a second), far 24 → 26 (16 in a second). Finger-joint
  fidgets alone barely move a pixel at phone size; whole-hand moves do.
QA, tip_check both hands, finger angles (worst 2°), handedness PASS; mum2 and mum3 SVG unchanged.

Results on v17:
- **Natural lens: NOT YET.** (1) The look-down eyes are "lidded dark irises, no white" where both stills draw an open
  almond with white behind an iris aimed at the bump, and the mouth "a wide crescent with a filled lip": "sleepy, or a
  bit smug, not loving" (0–1.8, 6.4–8 s). (2) The lower fingers "straight and parallel, the tips in a near-even row… a
  comb" against the still's (0, 2.75, 7.3 s). (3) "The two hands look identical in every frame" at phone size. Also: hard,
  dark contact shadows; the eyes going round while the head is still bowed (1.9–2.0 s, "peeking"). Its "no"s: weight,
  arms, wrists, handedness, the top hand's shape and angle, the body opening on the look up.
- **Blind A/B v17 vs v14: "NO CLEAR DIFFERENCE"** (6 vs 6): "the close-ups are only about 170 px per figure… a real but
  small hand or eye change could be there without me seeing it". Measured: the review packs showed the figure at a third
  of film size, so a 20 px hand move was ~7 px between two still tiles. `tools/motion_sheet.py` now draws the hands at
  1:1 and what moved each second (magenta) into both packs (`spec.handsBox`; lesson 58).
- **Re-run with those sheets: v14 6.5, v17 6** (low confidence). v17's lower hand, 12 px forward, read "chunkier… its
  fingertips meeting the bump's edge, an awkward tangent"; v17's head "further back" on the look up. In both: "the lower
  thumb is the only visibly moving digit… a thumb tic", the look-down eyes sleepy.
Checked: the film's lower fingers lay 6° steeper than the fitted key at the look-down frames (`finger_angles.mjs`: 24/19/
13/4° against the key's and still's 18/13/7/−2): the reach pins the hand to the belly at n-down's angle, and n-down's
trunk had turned it. The fitted key matches the still (mask_overlay 939 px).

## v18 — the still's look-down eye; the lower fingers at the still's angle; the thumb tic calmed

- **Look-down eyes, measured on q_k_down_0 at film size:** a big dark iris pushed forward toward the bump under a heavy
  lash line, the white a sliver on its BACK side only. `eyeLook` {lidK 0, irisK 1, irisR .92}; face-tender lids .75/.25,
  gaze (.022, .014) (forward more than down: v15's mostly-down gaze showed white all round), the mouth warm .6 + soft .4
  (a closed smile a touch slimmer). The look up's eyes start at 1.85 s and land at 2.3 (were 1.6–2.05: "peeking").
- **Lower hand:** back to v14's place (v17's forward shift lost blind) and laid at the still's angle: n-down's hand.near
  30.4 → 35.4 (`derive_lookup.sh`), the film's fingers 18/13/6/−2° at 0 and 7.3 s. New QA gate `fingers`
  (`spec.qa.fingers`: near within 3° of 18/13/7/−2, far within 4° of 38/35/30/28; it fails v17).
- **Thumb:** each lone thumb stroke halved, the whole hand turning 4° with it.
- **Contact shadows** 16 % at (5, 9) px → 11 % at (4, 7).

Results on v18:
- **Blind A/B v18 vs v14: v18 6.5, v14 6.** The most visible difference, the eyes: "open with the iris dropped toward
  the lower lid, so she is plainly looking down at the bump… X's read as half-shut or drowsy… a little smug". Also: the
  head's small tilt in the hold "warmer". In both: the lower thumb lifting off "as a long straight stalk"; the top hand
  "a flat, nearly static paddle"; the look-down neck short.
- **QA:** one fail, hand.near drawn at 71% at 1.03 s (min 0.74): the still's angle plus the thumb stroke's hand turn.
- **Natural lens: NOT YET.** The lower hand "about a fifth shorter… its tips ~28 px inside the outline" where the
  still's reach it; the top hand's back flatter than the still's and its shadow crisp; "a side-eye on the way back
  down" (5.6–6.4 s: the eyes reached the look-down pose 0.6 s before the head).

## v19–v21 — the thumb, the lower hand on the still's tips, the top shadow, the eyes down with the head

- **v19:** the lone thumb strokes became a small curl (t1, t2) with a 3° hand turn. **Blind v19 vs v18: v18 6.5, v19 6**:
  v18's "thumb rises 10–12 px… a tender thumb stroke while she gazes down"; v19's hand "only rides the breath… pasted
  on". So the reviewers split on the thumb's swing (a tic to two, a tender stroke to one) and a curl too small to see
  lost: v21 keeps v18's halved swing with the 4° hand turn.
- **Measured the film against the still** (`mask_overlay.py mum3q look-up@0`, new): the bump's front matched the still's
  to 2 px but the cradling hand's tips sat 26 px behind the still's (596.9,760.2 against 623.4,759.6 for the index; the
  same for every tip): the fitted arm on n-down's trunk. **v20** moves every near reach stop by (+0.124, −0.005) H: the
  tips land on the still's, the index at the bump's edge as the still draws it; the top hand's shadow 60 % at (3, 5) px
  (`contactShadow` groups take `k` and `offset` now); the eyes go back down at 6.2 s with the head (were 5.8), the lips at
  6.4. **Blind v20 vs v19: v20 6.5, v19 6**: "the hand sits further forward at the bottom front of the bump… the bump
  looks as if it rests in the hand, the arm one relaxed curve"; against it, the middle tip poked a few px past the
  edge at 1.0 s (the stroke toward the front).
- **v21:** v18's thumb back; the lower stroke goes up the underside, not forward (1.35 s: dp .124,−.026; 5.4 s: .13,−.06),
  so no tip passes the edge (tip_check min 4 PASS; clear 6 px at the index, as the still draws it at the edge).
  **Blind v21 vs v20: v21 6.5, v20 6**: "the hand stays on the bump… a gentle caress up the bump… a tender thumb
  stroke"; v20's tips "slide off the front edge". Risk named: the 7.1 s and 0.3 s strokes 0.4 s apart across the loop
  could read as patting.
- QA v21: PASS with hand.near's designed least length 0.70 (the thumb stroke's turn, holding its size within 1.03);
  fingers gate PASS (near worst 2°, far 2°); mum2 and mum3 SVG unchanged.
- **Natural lens on v20: NOT YET.** (1) The look-down eyes: "a flat lash line, the iris high under it… looking off to
  her right" where the stills' heavy lid comes down over a low iris; side-glance still at 6.0–6.5 s. (2) The hands'
  life: the top hand identical at phone size; nothing answers the smile. (3) "What's that lump on top of the bump?": the
  top wrist's mass hangs ~10 px below the still's, with a notch in the hand's lower edge (overlay: 729 px). Also the
  lower fingers at 3.0–3.5 s "a rake". Its "no"s now include the neck, the shadows, both hands' handedness and angles,
  the top hand's shape, the timing.

## v22 — the still's heavy look-down lid; the top wrist's mass raised to the still's

- **Look-down lids** .75/.25 → .6/.4 (v14's heavy lid) WITH v18's white and forward iris, gaze (.022, .02): a flat lid
  line over an iris low on the lower lid, as q_k_down_0 (side by side at film size: v18's .75/.25 arched clear of a high
  iris, "looking off to her right", natural lens v20). The eyes go back down with the head at 6.4 s, the lips at 6.55.
- **The top wrist's mass** (endOn shift [−0.02, −0.03]): overlaid at the film's 0 s its end hung ~10 px below the
  still's; 729 → 582 px of mismatch.
- **Blind v22 vs v21: v22 6.5, v21 6.** "Y's eyes read as cast down at her bump. X's round dark eye-dots read as open
  and looking off to the right… a real downward gaze brings the upper lid down with the eye"; the lids lift at 1.9–2.1 s
  "just before the head starts up… the eyes lead the head"; the mass "tucked tighter and rounder… less like a soft blob".
  Risk named: at 7.8–7.9 s the flat lid over a forward iris comes close to "side-eye". In both: the top wrist's mass
  still past the bump's silhouette, "a mitten-like lump"; the lower fingers "a rake" at 3–4 s, the lower hand moving as
  one block at 2–3 s; the top hand not visibly alive at phone size.
- So the heavy lid that read "sleepy, smug" on v14–v17 reads "cast down at her bump" once the eye has the still's white
  and forward iris: the lid and the iris are one shape (lesson 57).
- QA PASS; mum2 and mum3 SVG unchanged (no engine change).

## v23 (lost) — the eyes drop first, the top fingers' fan, the wrist's mass at the wrist

- Three changes for the open notes on v22: (1) on the way down the eyes drop first, iris LOW and CENTRED (`face-ret`,
  6.2 s), then turn to the bump with the head; (2) the top hand's fidget spreads turned round (`f*s` signs flipped: the
  raw spread values are not passed through `spreadSign`, so on the mirrored left hand they open the other way) so the
  fan kept the still's convergence; (3) the end-on wrist's mass anchored at the wrist instead of along the forearm, so
  it stops sliding off the hand's heel as the chest lifts the elbow ~15 px on n-up (the palm's corner pokes out at 4.5
  and 6.5 s). Also the cradling fingers' gather moved from the knuckles to the end joints.
- **Blind v23 vs v22: v22 6.5, v23 6.** (1) v23's eyes: "the lids lower… while the irises stay on the viewer… she looks
  up at us from under heavy lids… sleepy or coy"; v22's "lids and irises drop together… the eyes lead the head". In ¾ a
  centred iris IS a look at the camera, whatever the lids do. (2) v23's top fingers "stay bunched together"; v22's "lift
  and fan, small gaps opening between them": the flipped signs were right in code and wrong on the film. (3) the wrist
  1–2 px wider past the bump's outline, still "a mitten". (4) v23's lower fingers "almost frozen" 3–5 s (QA alive FAIL
  first, the PIP-only gather too small): v22's "slowly lengthen and fan… a bit more 'rake'".
- All dropped; params.js back to v22 (endOn shift [−0.02, −0.03]). The anchor change needs its own A/B.

## v24 — the cradling hand cups up instead of raking

- **Measured** the lower hand every 0.5 s (`finger_angles.mjs --anim --every 0.5`): QA `fingers` passed at its keys
  (0, 7.3 s) while at 3–4 s the fan sat 6° flatter and the fingers 9% longer. Cause: the 2.3 s gather bent the fingers
  at the KNUCKLES (f*a +10–13°). On a hand seen palm-on, a knuckle bend turns the fingers toward the camera: on the
  film they flatten toward the palm's line and lengthen, straight and parallel, "a rake". A bend at the END joints
  (f*b) or a turn of the whole hand keeps the fan's shape.
- **v24:** the gather = the hand turning up 4° (cupping the bump) + the end joints graded 6/8/10/12° (index least) +
  the thumb; the 3.4 s press the thumb only. QA `fingers` now checks the near hand every 0.5 s (angles within 5°) and
  the fan's shape (each finger minus the four's mean, within 3°; `finger_angles.mjs --fan`). v22 fails the every check
  (6°); v24 passes (worst 5°, fan 2°).
- **Blind v24 vs v22: tie, 6 vs 6, leaning v24.** "Neither… at phone size I could not tell X and Y apart"; up close
  v24's fingers "stay compact and slightly converging, which reads as a hand holding the bump", v22's "fan out, more
  evenly spaced and parallel… more like a rake"; v24's "small curl reads as life in a resting hand". Kept (a tie that
  removes a named fault).
- Still wrong in both (the reviewer, "anything wrong in both"): the top wrist "a rounded, mitten-like bulb… past the
  bump's silhouette"; the lower fingers straight and parallel at 6.5–7.5 s too. The top fingers' fan is NOT gated all
  shot (v23 showed its moving fan reads alive).
- QA PASS (fingers every/fan new); mum2 and mum3 SVG unchanged. Render `renders/mum3q_look-up_v24.mp4`.
- Next: the top wrist's mass (the anchor alone, A/B); the lower fingers at 6.5–7.5 s; the natural lens before calling
  it finished.

## v25 — the top wrist's line only the still's hook

- Overlaid on q_k4_down_0 (`mask_overlay.py mum3q look-up@0 / @4.5 --box 500,500,700,640`) the top hand and wrist's
  silhouette matches the still at 0 s (1047 px of mismatch); what differs is the drawing on it: the still draws ONE
  short hook where the back of the hand folds into the wrist, v24's line ([235, 150] round the end-on mass) ran on over
  its top as a second hump beside the hand's top edge, "a mitten… its top edge wavy". v25: [205, 150], the short hook.
- **Blind v25 vs v24: tie, 6 vs 6, leaning v25.** "one fewer line wrapping the lump, so it reads a little less like a
  stitched mitten or cuff and more like one forearm turning into a hand"; invisible at phone size. Kept (a tie removing
  a named fault). QA PASS.
- Still wrong in both, and the bigger fault: "the top hand's wrist and heel mass… bulges past the bump's silhouette as a
  big rounded lump… a mitten or cuff, not a wrist bending over the top of the bump". Side by side wider
  (`/mnt/project-files/rigging/mum3/mum3q_top_arm_still_vs_v25.png`): the still's far arm comes down past her bust as a
  slim arm of even width on a steeper diagonal (~31° from vertical by eye) into the wrist; ours is more upright and
  widens toward the wrist (a cone), so the round mass sits on the end of a club. Next: measure the far arm's edges on the
  still (angle and width every 20 px) and fit `upperArm.far` and `armFar.w` to them; then the lower hand's thumb swing at
  0.5–1.5 s ("a twitch", 10 px in a second).

## v26 — the far upper arm slim on its body side

- Measured row by row on q_k4_down_0, the far arm shows 14–18 px of still past her bust, on a ~31° diagonal; v25 showed
  26–31 px, widening down into the wrist's round mass, so the mass sat on the end of a club. v26 slims the arm's FRONT
  (its body side, which the bust hides at rest, so the rest drawing is unchanged) by 0.05 H on its first three segments
  (`armFar.w`).
- **Blind v26 vs v25: v26 6.5, v25 6** (about 60/40). The pixel diff touched only the arm's strip. v26's forearm "a slim
  wedge… reads as a woman's wrist and lets the hand read as a hand"; v25's "flares into the wrist… the forearm and the
  hand's outer knob merge into one lump", "a stiff cone with no elbow". v26 "implies a bent arm reaching around the
  bump". One reservation: at 0–1.5 s and 5–8 s v26's strip pinches at the widest point of the bust "thin enough that the
  strip looks like a thread on a phone". Kept. QA PASS; mum2 and mum3 SVG unchanged.
- Still wrong in both: the top hand's outer knob a "mitten-like lump past the bump's silhouette"; its four fingers
  near-parallel and evenly spaced; it hardly changes shape as it moves ("stiff rather than resting"); the lower fingers
  a rake at 3.0–4.5 s and re-shaping at 2–3 s and 5–6 s.
- Next: the strip's width at the bust against the still's (not under 14 px); the far shoulder lower and further in
  (≈10 px and 22 px of still), which needs a refit of the arm so the hand stays on the still's tips.

## v27 (lost) — the far arm's outer edge fitted to the still

- Measured with the new `mask_overlay.py --edge right` (rows 400–520, every 10 px) at 0 s: v26's outer edge +17 px at
  a hump above the strap down to −11 px where it meets the wrist's mass; 8° more upright than the still's straight
  diagonal (6.5 px rms). Sweeping the far shoulder (`clavicle.far` −14 … +9, the arm refit to the hand's points each
  time) and the arm's widths: + LOWERS the far clavicle; moving the joint alone hid the arm behind the bust. v27: the
  shoulder 10 px lower and in (`clavicle.far` 1), no deltoid cap and the arm widening toward the elbow while the forearm
  is end-on (new `endOn.w`, `endOn.capA`): 1.1 px rms at 0 s, 3142 px of mismatch (was 4171). QA PASS.
- **Blind v27 vs v26: v26 6.5, v27 6.** "X's far arm reads as one arm, running from a visible far shoulder down to the
  top hand. In Y the arm appears only below her bust, as an upright wedge… a mitten on a post"; v26's "visible shoulder
  cap and arm strip lift with the shoulders, so the far side of her body visibly joins in the look up". Dropped (the
  diff is kept outside the repo). The edge at 2.75, 4.5 and 6.4 s had shown v27's strip hidden at more rows than v26's.
- Found on the way: n-up's `clavicle.far=2` ("the shoulders up a touch") lowered the far shoulder 2.4 px since v17.
  v28 tries the fix alone (`clavicle.far=-2`): the far shoulder 5 px higher at the look-up.

## v28 (tie, not kept) — the far shoulder up with the near one

- v26 with n-up's `clavicle.far=-2` (was +2): the far shoulder 5 px higher at 4.5 s; nothing else differs. QA PASS.
- **Blind v28 vs v26: tie, 6 vs 6, leaning v26** "by a hair": at 3–6 s v28's far shoulder cap "stays a slightly rounder
  hump… 1–2 px higher", v26's "tucks into a slimmer sliver… a touch less hunched behind the strap". "A viewer will not see
  a difference." Kept v26's frames; derive_lookup.sh now says what +2 does (the far shoulder a touch DOWN).
- Still wrong in both: the top hand's end "a rounded lump that reads as a mitten", its fingers "parallel stripes rather
  than separate fingers draped over the bump"; the lower hand re-poses every second or two (0–1, 2–3, 5–6, 7–8 s: the
  fingers fan out again, the thumb lifts "as a separate flat bar" at 1.0 and 6.0 s), "fidgeting or sliding rather than a
  resting cradle"; the head tips back a little past level at 3.0–3.3 s before settling.
- Next: the lower hand's fidgets (calm the cradle: fewer, smaller re-poses, the thumb with the fingers); then the top
  hand's fingers as separate fingers draped over the dome.
- Still wrong in both (reviewer): the lower thumb and fingers curl and uncurl at 0–1, 2–3, 5–6 and 7–8 s ("a pulsing or
  kneading grip rather than a calm cradle"); the top hand's outer knob past the bump's outline; at 6.1–6.3 s the lids
  drop and the eyes go down while the head still faces us ("a sidelong or coy glance").
- Tools: `mask_overlay.py --edge`, `bone_signs.mjs` (lesson 61).
