# mum3 ease-sway: feel log

A 6 s clip for the Braxton Hicks story (direction A, "The bag by the door"), asked for by the story thread: as a
tightening eases she sways her weight from the back foot to the front, the bump settles, her eyes lift to her bag on the
floor by the door and she smiles; it ends on a held pose. No stills: keys derived from n-bump (`refs/derive_breathe.sh`).

## v1 — the sway, a rub of the bump, the look and the smile

- Keys n-sway-back / front / settle / bag; plantFeet `ik`. The feet first rose 3 px at the forward sway (both legs tilted
  from the ankles can't stretch): `spec.plantFeetSink` moves the hips instead, the ankles within 0.6 px (lesson 60).
- QA PASS. Render `renders/mum3_ease-sway_v1.mp4`.
- **Feel review (fresh reviewer): NOT YET.** (1) "The sway reads as the figure being tipped or slid… everything above
  the hem moves as one rigid block… the two legs stay straight and lean as parallel poles hinged at the ankles": the
  back knee's "soft" shin +3 was a hyperextension, clamped. (2) "The breath out… doesn't read": no shoulder drop or
  chest sink. (3) The look to the bag: "the heavy-lidded down-look switches to a plain round dot eye… alert, almost
  blank"; the smile not new. (4) The fingers "shift together as one stacked block… like a comb". (5) "Held from the neck
  down" in the hold. (6) The opening weight back doesn't register (a standstill to 0.4 s). Right: the feet planted, the
  hand glued to the bump, the tempo for "very gentle", the bump's overlap at 2.5–3.5 s, the blink on the look.

## v2 (lost) — a weight shift, not a tilt

- Opens mid-drift back (n-sway-start, half way from settled to the back foot, an ease that starts moving).
- The hips lead: a trunk fidget leans back ~1.6° as the hips go forward and follows through 0.6° as they stop; the head
  travels 0.18 H to the hips' 0.21 H, ~0.3 s behind (anim_dump). The back knee bends 5° (shin −5: a knee bends NEGATIVE),
  the front one 2° on the back sway; the thigh tilt scaled from 2.5° to 1.5° so the hips still travel 47 px.
- The breath out: 1.7× breath through the sway, the shoulders settle 2.5° in n-sway-front, the lips part and the lids
  lower a touch (face-sigh, 2.1–2.6 s); the hold breathes at 1.25× with a faint drift of the weight back.
- The look to the bag: the upper lid part way down (face-bag open .55, half .33), the smile reaching the eyes (lid smile
  .45).
- The fingers: every curl and lift in a cascade, little finger first, 0.08 s apart; the thumb presses with the hand.
- Feet drift ≤ 0.7 px (feet_probe).
- **Blind v2 vs v1: v1 6.5, v2 5.5.** v2 "a back-forward-back rock… a visible bounce at 2.8–3.2 s"; "the whole figure
  tips like a plank from the ankles and the head travels as far as the hips or further… the head bobs" (the trunk's
  trail moved the head BACK in space first); its end eye "narrows into a thin dark slit… reads as eyes closing again…
  the 'eyes lift to her bag' beat is lost". v1: "the pelvis carries the shift under a fairly steady head (head about 6 px
  against hips about 10 px)", one sway, "you can tell she looks up at something and smiles" (a little wide, "a slight
  stare"). Wrong in both: the bump moves rigidly with the pelvis (no visible settle), the lower fingers a parallel stack,
  the gaze level rather than down-forward to the floor, the breath out hard to see.
- **v1 stands** (keys, poses and spec back to commit 1d87e7b; derive script's notes corrected: v1's shin +3 is a clamped
  hyperextension, not a soft knee). Render `renders/mum3_ease-sway_v1.mp4`. Lesson 60.
- Next if it comes back: a visible bump settle (the belly fidget ±1.2° doesn't show), the gaze a touch lower with the iris
  showing, a cascade in the fingers (untested alone), each on its own A/B.
