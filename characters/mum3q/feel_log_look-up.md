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
