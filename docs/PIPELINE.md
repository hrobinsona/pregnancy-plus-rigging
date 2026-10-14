# Code-drawn character animation pipeline — running notes

Living notes for the skill/repo: what works, what failed, why. Newest lessons at the top of each section.
Constraint: every frame is drawn by code (parametric shapes on a 2D rig), a pure function of t. References (images,
video) are used ONLY for measurement — landmarks, silhouettes, proportions, palette, timing, joint paths — never traced
or composited.

## 0. The big lessons (read first)

1. **Don't invent poses — measure them.** Hands improved only once they were fitted to the reference with numbers
   (hand_fit: widths, runs, IoU). Every pose that was invented by eye (bump hands, the reach to the mouth, the far hand)
   stayed "low quality". → Generate a style-consistent reference for EVERY key pose (fal, nano-banana edit with the
   character sheet as input) and fit the rig to it.
2. **Plan hand moves in hand space.** Blending arm ANGLES between key poses swings the hand on arcs around the shoulder
   ("weird circular motion"). People plan reaches with the hand: near-straight, slightly curved path, bell-shaped speed
   (minimum jerk, Flash & Hogan 1985). Engine: `spec.reach[side]` (stops + vias, Catmull-Rom path, min-jerk on the
   whole move, skew for fast-off/cushion-in), the arm solved per frame by fixed-count Newton steps seeded by the keyed
   angles (keeps the natural elbow). Still a pure function of t.
3. **A 2D rig can't turn things in depth.** Forearm roll, a hand wrapping round the far side of the bump, a hand seen
   edge-on: these are DRAWING changes, not bone rotations. Use a library of view-specific drawings (replacement /
   cut-out practice) fitted to references; swap or blend them on frames. A generic bending hand pushed into those views
   reads as a paw, a blob or a "wooden" arm.
4. **One body, not parts on pins.**
   - shoulder rhythm (rig `drivers`): the clavicle lifts ≈1° per 4–5° of arm flexion past 30°;
   - the cardigan's shoulder line is region-skinned to the clavicles (`skin.regions`) so collar, shoulder and sleeve
     cap move together;
   - the sleeve is ONE bendy tube built in posed space with a filleted elbow (radius ≥ 2.2× the inner half-width or the
     inner contour folds over) and inner-elbow creases;
   - a free arm is a damped pendulum driven by the torso's rotation (closed-form spring), switched off (`fx.armFree`)
     while the hand holds something. A hand with nothing to do reads as dead: give it a job (rest on the bump, grip).
5. **Critics: one for maths, one for feel.** Critic C (metrics: px/f, lag offsets, arcs) optimised proxies for six
   rounds while the client saw a stiff, detached, dead-handed arm. Critic F (look and feel only, NO numbers, asked to
   first describe how a real person does the action, then compare; checks the client's own past flags) caught what
   mattered. Use F as the gate, C as a technical lint.
6. **Lint the rig, not just the picture.** Hidden failures found the hard way:
   - joint limits silently CLAMP keyed values (clavicle ±10° ate every shrug for three rounds);
   - sign conventions differ per side (+ lowers the far clavicle);
   - normalised blend weights (`{lid: {open: 0.75}}` renders fully open);
   - per-key shifts that differ between neighbouring keys squeeze a channel's segment to 1 frame (a pop) —
     `makeAnim` now warns;
   - an IK tool that copies a whitelist of fields drops scale/fx.
7. **Arms are 3D, even in a flat 2D style.** A sagittal-hinge arm cannot draw a hand brought to the mouth with the elbow
   down at the side: in a ¾ view the forearm folds back OVER the upper arm (projected elbow bend ≈ 190°). Every fit of
   those poses failed (rms 0.12–0.15 H, the solver yanking clavicles to cheat) until the arm became a 3D chain projected
   with the body's yaw (`plane: 'arm3'`: elevation, plane of elevation, humeral rotation, elbow, pronation, wrist). With
   the extra DOFs at 0 it is bit-identical to the old sagittal arm, so nothing else had to change; fits dropped to
   0.04–0.07 H. The 3D frame also gives depth (draw order) and the palm normal (hand view) for free.
8. **Rest drawings lie about limb length.** A limb drawn foreshortened in the rest art (the far hand wrapping the bump)
   bakes the foreshortened length into the rig: the far forearm was 0.79 H vs 0.89 H near, the far hand 0.38 vs 0.47 —
   a raised hand then fell short of the mouth and looked like a child's hand. Measure segment lengths across ALL refs
   (where the limb lies in the picture plane), make left = right, and let projection do the foreshortening.
9. **Fit silhouettes, not just landmarks.** Pose estimators guess hidden joints (a far shoulder behind the hair). The
   material-class silhouette fit (`tools/seg_ref.py` + `tools/sil_fit.mjs`, canvas raster of the rig's own parts in the
   browser) compares what the reference SHOWS — sleeve outline, top visible between arm and body — and refines the DOFs.
   2D cannot tell an elbow raised forward-across from out-and-back (mirror solutions in depth): use an anatomical prior
   (scapular plane, moderate rotation) and the overlap order SEEN in the reference (`--z`, `--view` flags).
10. **Get motion from video, but take only what transfers.** First→last-frame video generation (fal: seedance,
   kling o1, hailuo, veo 3.1 — `tools/fal_video_fl.py`) with the shot's OWN key stills as the two frames gives a
   style-matched performance of the exact move. Fit the rig to every frame (`tools/fit_video.py`, each frame seeded
   from the last), then `tools/vtrack_apply.mjs` turns the tracks into data in the timeline:
   - **path moves** (hand space, relative to a body bone, warped onto the two contacts, at the video's timing);
   - **layers** (a channel's deviation from its own chord, added on the keys: motion warping);
   - a monotone time map puts the video's beats on the shot's beats; windows are eased at both ends (a window cut from a
     video starts mid-motion: the hand jumped on the first frame).
   What transferred: TIMING of the lift (fast off, cushioned in), the retch's hit POSE (refitted with foreshortening),
   the measured head/shoulder/hip displacements. What did not: paths drawn by a differently built body (the hand
   climbed her outline / dog-legged across her chest), the video's hand orientation (too small to measure; the fit's
   wrist sat on its limits), and a return whose flick-then-drift read as a jump and a hang. Keep the shape designed (an
   L-corner Bézier or a bowed chord between the contacts), the timing measured — and drop the video where it fights the
   story.
11. **Give the rig the DOFs the pictures need — the fitter tells you.** A 2D rotation of a ¾ head reads as a ROLL;
   looking down needs a NOD: lift the head's drawing onto an ellipsoid, turn it about the ear axis, project back
   (`engine/warp.js`, `C.warps`, `fx.headPitch`; contacts on the head ride the warp). Added to the fitter as a DOF, every
   bowed key fitted better (k6 rms 0.070 → 0.051) and the "head rolled 30°" fits became "head 2° + nod 19°". Same for
   the trunk: a ¾ figure doubling over bends TOWARD the camera — measured on the video, the nose drops 1.2 H and moves
   only 0.6 H forward; flat spine rotations can only swing the shoulders sideways ("topples like a post", six rounds).
   Along-scale of chest and neck as fit DOFs (`--fold`) reproduced it. Not the upper spine: it carries the bump, which
   must keep its size. When the critic says the same thing round after round, look for a missing degree of freedom.
12. **Measure the motion before arguing with the critic.** Per-frame fingertip/head speed (`char_anim --tracks-only`)
   found the one-frame jumps the critic described vaguely (153 px/frame: a video window starting mid-motion plus a
   wrist scan flipping branches). Positions of nose/shoulders/hips in the reference video settled "lunge vs fold".
   The feel critic oscillates on taste (hips back / hips not back; fingers trailing / fingers together) — anchor each
   fix on a measurement or a reference frame, and don't chase a direction the previous round rejected.
13. **Feet: lock each foot, not just the average.** A root shift keeps the feet planted on average; when the legs bend
   differently (a crouch, a fitted key whose reference was cropped at the knees) each sock slides. Per-leg IK (hip
   abduction, thigh, shin; damped least squares inside the joint limits — with damping ≪ J², or it barely moves) to the
   shot's own stance: drift 0.24 → 0.03 H. A knee bend that keeps the hips over the ankles is thigh +a, shin −2a, foot +a
   (sagittal bones); hips BEHIND the heels needs the thigh larger than half the shin.
14. **Small engine bugs that read as acting faults:** two stops with the same pose but different offsets were treated
   as a hold (the hand teleported at the end); a blend toward a KEYED hit was much shallower than the peak with squeeze
   and shudders added (the "partial" release stood her up); a second hit blended to 60% after a 65% rebound was an
   un-fold. Check keyed numbers against what is actually on screen.
15. **Explore, don't tune.** When two or three review rounds on the same move only move parameters around (wrist bend
   38° = "cocked fist", 18° = "oath palm"; elbow out = "wing", elbow in = "propped"; accelerating fall vs decelerating
   fall), the critic is oscillating and the method is the problem. Change the method — measure the in-between (a fitted
   breakdown still), add a DOF, add a drawing — instead of trying a seventh number. Log which taste calls flipped so the
   next round does not chase them back.
16. **The brief beats the reviewer.** The feel critic pushed the retch to a violent, accurate heave; the client wanted
   a gentle beat (nausea cues, one deep breath in, a long breath out, relief, a loving hold). Put the intended INTENSITY
   in the brief the critic sees, and check it with the client before polishing an extreme.
17. **Audit for bleed frame by frame, and mask outlines to what is visible.** "Clothing bleeding through limbs" was
   invisible in stills: an outline group clipped to the WHOLE shape of the same-material parts behind it drew a pink
   hairline over the neck where the neck covers the cardigan's collar; the far cuff poked past the bump's rim as a
   ragged tab while the hand wrapped. `tools/anim_audit.py` (every Nth rendered frame: specks, slivers, gaps, each
   classed by what surrounds it and merged into tracks across frames) finds them; the engine now masks outlines to the
   VISIBLE region of the material (occluders between painted black, in z order). Most remaining hits are deliberate
   lines — check the crops before "fixing" a crease.
18. **Elbows: neither pinned nor free — on a chord.** Holding the elbow at a video's measured position made the forearm
   swing round it like a clock hand (client: "swinging at the elbow"); with no target the swivel interpolation took the
   elbow out wide and round. Steering it STRAIGHT from where it is at one contact to where it is at the other (torso
   frame, `elbowPath: 'chord'`) — or passing the hand through a fitted/designed waypoint whose elbow is where you want
   it — lowers the whole arm: the upper arm swings back as the forearm opens.
19. **Slow, gentle moves: design them through a waypoint; copy timing only from fast ones.** A video path walked at a
   slower, designed pace still carried its shape problems (the hand dragged down the middle of her chest, then shot to
   the rim in 2 frames). A plain hand-space move from the cover to the bump through ONE waypoint in front of the chest
   (minimum jerk, limp wrist by time, a designed limp bend) read calmer than every video-derived version. The waypoint
   should be a fitted in-between still (`docs/REF_PROMPTS.md`) — the designed one is a stopgap.

20. **A via moves the wrist; the arm comes from keys.** A fitted in-between as a reach via (`{via: true}`) only steers
   the WRIST's path (and its local bend); elevation, humeral rotation and pronation still come from the body keys, so a
   measured in-between whose point is the FOREARM (across the chest, fingers down) changed nothing visible as a via
   (fingers up to 7.53 s). Use the same fitted pose twice: as the via, and as an arm-only breakdown key (`only` the far
   arm's bones) at the time the hand passes it. Then check `--tracks-only`: pinning the arm mid-move can bunch a turn
   into the next stretch (a two-frame pronation catch-up) — spread it with the next still's forearm turn as its own
   `only` key rather than tuning eases. Where the upper arm passes straight down the plane of elevation flips (a 3D-arm
   singularity): expect a fast turn there and look at those frames first.

21. **Fitted twist is not usable for motion; fitted position is.** `fit_pose --view far=back` forces the hand's view,
   so the fitted pronation of a lift still came out near 0, which renders an open "oath" palm while the hand moves. Use
   such a still for WHERE the hand is, not how it turns: compare it with the shot in the torso frame
   (`tools/uv_check.mjs <char> <shot> --poses fit-bf1,fit-bf2`), then move a video path with a `bias` window
   (`{s0,s1,dp}`) where they disagree. Lift v14e: at the chin the shot already matched (0.03 u); at chest height the
   still's hand was 0.11 u further out in front of the far shoulder, so the hand now rises in front and then comes in.

22. **Ported performance defaults are subtle; measure whether a change is VISIBLE before claiming it.** The reels landing
   (press, settle, wag, index first), the finger ripple, the 85 % wrist taper and the 12 % contact shadow went in as
   engine defaults (v15). Two blind A/Bs against v14e: "no clear difference" at phone size (the far hand lands half
   hidden by the bump; the near hand never moves far). They stay as defaults so a new move doesn't start frozen, but the
   visible faults the same reviewers named were all shot-level: the forearm turn at 7.5 s, the cuff sliver at the rim
   7.8–8.0 s, a one-eyed blink at 1.0 s, a lift a bit brisk for "gentle". A side effect the A/B did catch: fingers lagged
   by the hand's own lag landed 4 frames late on her mouth and uncovered it — ripple from the index, not from the hand.

23. **A key moves every channel its pose has unless told otherwise — make its scope match its note.** Part of v15's
   worst moment (the far forearm turning 58° in two frames at 7.67–7.73 s) was a breakdown whose note said "shoulders
   settle": it keyed the derived pose `n-sigh` with only the hands excepted, so its far-arm pronation (40°) landed
   0.05 s after the fitted in-between's (−17°). `anim_dump` with the reach turned off (`reach: {}`) shows key-driven
   jumps at once. Prefer `only` lists for accent keys. The rest of that moment (the palm flipping upright → flat at
   7.50–7.60 s) IS the upper arm passing straight down, and the blind A/B still named it after the key fix — two causes
   in one "flip". And check a reviewer's claim on the frames before fixing it: the v15 "wink" was both eyes together.
24. **A hand that passes end-on to the camera turns fast whatever you do, and every cure tried looked worse than the
   turn (v17 trials, 2026-10-12, all lost blind A/Bs to v16).** Measured: as the far hand lowers at 7.5 s the HAND itself
   (not only the forearm) points at the camera (projected length 0.14), so its screen angle sweeps ~150° in 5 frames
   (peak 28°/frame). Tried:
   - **Swinging it forward** (extra pronation, a `spec.layers` bump): peak 15°/frame, but the hand floated out past her
     silhouette, flat, "presenting", and showed an open palm leaving the mouth.
   - **A wider inward turn** (pronation plus wrist bend): it held the hand pointing backwards and then flipped later.
   - **Foreshortening the fingers with the hand** (a world squash below projected length 0.45): it is physically right,
     but at phone size the hand "shrinks to a broken shape". Reviewers read a full-size hand rolling over as a wrist turn.
   - **Generated stills of the end-on hand:** 6 full-body stills all drifted to the end pose (hand already on the bump).
     A full-body in-between prompt pulls the generator toward image 3.

   What's left is the PATH: re-key the lowering so the hand never points at the camera (elbow by her side, fingers
   turning in the picture plane), or accept the turn.

25. **A depth switch needs a replacement drawing of the same SIZE, led by the fingers (v17, won a blind A/B).** The far
   hand arriving round the bump's far rim jumps from "in front" to "behind" in one frame, and only the part outside the
   outline stays visible: a full hand became a sliver. What fixed it was drawing the arriving hand as the wrap at the full
   hand's size, then shrinking it to the settled size over ~0.6 s, ending exactly at the size of the drawing it hands back
   to. Neither path changes (a via out to the rim: "hovers") nor moving the switch (`frontBy`: the snap just moved) did
   it. Size it with the FINGERS: a big back of the hand with no finger lines reads as a "mitten" or "lump" (lost), while
   longer fingers curling over the rim read as "a hand holding her".

26. **Design the character for the rig before drawing a line (mum3, 2026-10-12).** mum2's worst faults were structural to a
   cut-out rig drawn from a ¾ master: sleeves and cuffs as separate pieces pivoting on pins (bleed, "pinned on"), a far
   hand that had to turn toward the camera (the palm flip), a weak master. mum3's master was CHOSEN for the rig: near
   profile (forwardX 0.95), bare arms (one skin tube shoulder → wrist, nothing to slide over a joint), a sleeveless dress,
   the far arm hidden behind her, and moves that travel across the picture plane. Her first render had none of mum2's
   bleed or flips; all three v1 reviewers' complaints were about acting, not construction.
27. **Measure the master with a tool, then LOOK at every measured point.** `tools/master_measure.py` (palette by k-means
   into named materials, MediaPipe joints, named profile points, 21 torso stations, limb widths) writes
   `ref/measure.png`; nine of its first points were wrong in ways only the overlay showed (a sign error put the bump's
   bottom at the hem, the garment top on the lips, the skull top on the forehead slope, the bun centroid in the back
   hair, MediaPipe's ear 40 px off). The drawing then reached silhouette IoU 0.96 against the master
   (`char_compare.py`). A measured point is a claim: check it on the overlay before building on it.
28. **A limb hidden by design must be declared hidden** (`C.fit.hidden: ['far.arm']`). The pose estimator always guesses
   a far arm; fitting those guesses pulled mum3's far arm out past her back. Declared, its landmarks and variables are
   skipped in the fit, it is not drawn (it still slid out past her back as she leaned), and `qa_checks` / `critic_F`
   skip its hand.
29. **Your prompt is the pose.** v1's stroke top had the elbow wrenched behind her back, and all three reviewers called it
   "chicken wing". The fit was faithful: my prompt had said "elbow … behind her back line". A new still asked for "elbow
   under the shoulder, NOT behind her back" and fixed it. Before blaming the fit or the rig, re-read the prompt.
30. **In-between stills drift to the target (image 3).** m3_lift2 ("two thirds of the way") came back as the key itself
   (wrist 0.15,0.82 vs the key's 0.15,0.84 in spine lengths); m3_lift1 was a true in-between, and the shot's path already
   passed it within 0.01. Check a still with `uv_check --poses` before adding it as a via: a via the path already passes
   adds nothing.
31. **A hanging arm is a singularity: lift it in JOINT space.** A hand-space line from a straight arm lifts the wrist
   toward the shoulder, and near full extension the elbow's bend goes as √(distance): it snapped 11 px in one frame. A
   joint-space breakdown (`n-lift` = a third of rest → key) as a via AND an arm-only key at the same time (lesson 20)
   makes the forearm swing forward from the elbow first, as a real arm does; the same on the way down. A straight arm
   also has no defined elbow swivel: the engine now takes it from the bent end of the move.
32. **A hand that stays on her is not carried.** Mid-move the wrist relaxes toward straight (`neutral`), right for a hand
   in flight; for a hold or a stroke on the same body part it dipped the wrist 8° and back. Default now 0 when both stops
   are `on` the same bone. And a stop that only changes `gap` is a zero-length MOVE, not a hold: drop it.
33. **Measure where the fingertips end; don't argue it from the frames.** Two rounds of reviewers said "tips past the bump's
   outline"; `tools/tip_check.mjs` draws her without that arm and walks each fingertip along its finger: v2's resting
   tips were 14–21 px PAST the under-curve, its stroke top 9–11 px. The cure was the contact, not the hand: `dp`
   [-0.03, -0.22] on every resting stop put the hand on the bump's lower FRONT (tips 35–45 px inside) and a cupped hand
   shape (`wrap`) at the stroke's top. Gate: every tip ≥ 4 px inside while the hand is on her. And ≥ 9 px CLEAR of the
   outline in any direction (`clear` column): v4's tips were 6 px inside along the finger while the finger ran along the
   bump's edge, its side touching it, and the A/B reviewer saw "tips clipped against the outline, a tangent".
34. **The elbow's swivel is part of the pose: put the same `dphi` on EVERY stop of the arm's path.** A hand on the bump
   from a fitted still bowed the upper arm back with the elbow behind her back line (v2 feel critic); `dphi: -35` swings
   the elbow in under the shoulder. Given only to the bump stops, the vias kept their own swivel (the elbow jittered
   6 px/frame at the lift's start) and the rest stop's HOLD took the pose's own swivel (the elbow snapped 5 px as the drop
   arrived). Same offset on the rest stops, the vias and the contacts: no pops. And a relaxed hanging arm is never locked
   straight: bend the rest pose's elbow ~10° (`n-rest`), or the lift starts in the singularity of lesson 31.
35. **A dot eye that only shrinks reads alert, not tender.** Lowering the lids by squashing the eye left a smaller round
   dot under a brow that now sat higher above it: "studying, slightly surprised" (v2 feel critic). Give the eye lid
   LINES: `lid.half` flattens its top into a lowered upper lid, `lid.smile` lifts the lower lid into a crescent, and the
   brow follows a lowering lid down.
36. **A breath is a VERTICAL rise with a lead-in and a sigh; check its direction in numbers.** v2's breath accents (chest
   and spine rotated back) moved the shoulder 15 px BACK and 5 px up and the head 20 px back: reviewers saw a sway or
   nothing. Lengthen the ribcage instead (`pose_set --scale chest=1.04:1.03,spineUpper=1.03:1.02`) and lift the clavicle:
   v3 rises 12 px with 2.7 px of drift (`tools/anim_dump.mjs` over the breath's frames). Then perform it: a little air
   out first (`n-prep`, half way to the breath-out pose), ~2 s in, a short hold, the out as a sigh (ease
   [0.3, 0.15, 0.25, 1]: most of the drop early, a long sink), the hand on the bump riding out and back (`dp` on the
   breath's reach stops) and one small finger spread and press (`spec.fidget`) so the resting hand isn't frozen.
37. **A hand that rests on her must be able to lie ON her: the wrist needs flexion, not just deviation.** All three v3
   critics: "the hand changes size", 129 px hanging, 100–113 on the bump, 82 at the stroke top ("a stubby paw"). MEASURED
   before touching the drawing: the 3D arm's projected lengths (`st[bone].a3.len`) were forearm 0.6, hand 0.49–0.65. The
   rig's wrist bent only in the palm's own plane (radial/ulnar deviation, what a back-view hand shows on screen), so the
   palm stayed in the forearm's plane, and the contact's forearm pointed at the camera: the hand pointed at it too.
   A real wrist extends so the palm lies on what it touches. Now: a second wrist DOF (`flex: 'wristFlex.<side>'` on the
   hand bone, + = extension) and `lie: '<proxy>'` on a contact stop. The hand keeps the screen angle the reach chose
   and takes the depth of that proxy's TANGENT plane under the wrist (closed form in the forearm's frame, then the
   deviation re-matched): on the bump's near face it draws at full length (128 px vs 129 hanging), toward the outline it
   wraps away and foreshortens, as a real hand does. Moves blend `lie` in and out. (v4 also concluded that swinging the
   elbow, `dphi`, could not fix the forearm. Wrong: the wrist's DEPTH was the fault, see lesson 39.)
38. **A held hand ticks when its solver changes regime at the stop.** v3's resting hand stepped 1–2° in one frame as each
   hold began or ended (hands critic: "ticks" at 2.65, 7.30, 7.85, 10.30 s). Two causes, both in the wrist scan: it pulled
   toward the key's bend hard in a hold (0.3) and weakly in a move (0.02), switching at the stop; and it refined only to a
   1.5° grid. Now the pull blends continuously across a move's ends and the scan refines to 0.15°. Check with a per-frame
   trace of the drawn hand (wrist→middle-tip angle and length) across every move↔hold switch: no step over ~0.5°.
39. **An arm that "shrinks when it moves" is a segment pointing at the camera; in a flat style keep every segment at
   ≥ 0.9 of its length.** Harry on v3: "when the arm moves it sort of shrinks… it makes her arm look deformed". Nothing
   in a flat-shaded drawing says "foreshortened", so a short forearm reads as a deformed one. Measured (`a3.len`): v4's
   forearm drew at 57–65% on the bump and the upper arm at 80% at the stroke top. Three causes, all fixable in the
   timeline. (1) The fitted still put the wrist 0.33 H in front of the bump, toward us (pose estimators' depth is
   unreliable), so the forearm ran from her side out at the camera: put a resting wrist ON the surface it touches
   (`surface: 'bump'`, `gap` 0.04). (2) v3 lifted the hand 45 px up the bump to keep the fingertips inside, which bent
   the arm more: keep the hand where the still has it (13 px) and solve the tips with the fingers (lesson 40). (3)
   `dphi` −35 held the elbow under her shoulder. First principles: with the shoulder and wrist fixed on screen, a
   full-length arm has exactly ONE elbow position (the flat two-bone triangle), here just behind her back, which is
   where the bump stills draw it. Choose the swivel by scanning `a3.len` (−25 on the bump, +20 at the stroke top): every
   segment now 93–100% all shot. Gate: `qa_checks.mjs` limbs (≥ 0.85; a ¾ character can opt out with `C.qa.limbMin`).
40. **Fingers on a convex surface end along its outline; don't move the hand to keep them inside.** Harry: the fingers
   were "slightly too all together… not following the protruding bump". The bump stills show it: the thumb OUT, apart
   from the index; the fingers a little fanned; the tips staggered along the outline, as if they run on round the curve.
   v5's `lay`, `crest` and `flat` do that: `ts` 14–16, spread −7…+5, each finger curled just enough (index and middle,
   nearest the front edge, most) that its tip ends ~9 px inside the outline (`tip_check --clear 9`); the in-flight
   `limp` curls as much, or the tips graze the edge as the hand arrives and peels off. Tried and dropped: projecting the
   finger curl through the hand's real 3D frame. It is physically right, but with this near-profile camera a curl INTO
   the bump moves the tips FORWARD on screen, so they hooked over the edge. A real finger past the silhouette is hidden
   by the bump; a cut-out finger is not, so the drawing rule wins.
41. **A limb's round end must never sit at a joint the viewer can see.** v4's shin tube ended in a round cap at the ankle
   and the foot started below it: a pinch in front of the ankle and a knob behind it (Harry: "ankles are a super weird
   shape"). Now the tube runs on into the shoe at the ankle's width (the back of the ankle is one line into the heel), and
   the foot's front edge leaves the shin's front line tangentially and bends into the instep along points measured row by
   row on the master (`P.instep`). Same fill, so the overlap is invisible; only the union's outline is seen.
42. **A new view is a sibling character on the same skeleton, at ONE scale.** mum3q (¾) copies mum3's bone list and
   imports its palette; only `params.js` and `parts/` are redrawn. Its `Hpx` is the profile's (210 px): both stills
   measure 1499 px skull top to sole, so every bone keeps its length and a pose or hand shape means the same thing in
   either view (the ¾ head itself measures 220 px: the chin drops as the face turns toward us). Yaw comes from the
   drawing: the shoulders span 0.82 H on screen = 2·0.6·sin(yaw) → 43°, `forwardX = cos(yaw)` 0.74; a depth proxy's
   centre sits √((a·fx)² + (c·sin yaw)²) inside its silhouette edge (the bump's 0.47 H inside its apex).
43. **A turned face has its features inside it: measure them as named points, then draw.** The profile measurer reads
   the face off its front edge; a ¾ face has no such edge, so `face_measure.py` finds each feature with MediaPipe's face
   landmarker and takes its shape from the drawing's own blobs (eye ellipses, brow and mouth stations, ear, the far
   cheek's edge row by row, the hairline in columns). The parts use NAMED points from those (edge at the eye row, the
   mouth row, half way to the chin; hairline temple, mid, peak, far), never a sampled contour (shapes.js rule). Two
   corrections the numbers needed: a dark-run scan misses each edge's anti-aliased pixel (brows +0.008 H), and the
   rows showed what the eye missed (a straight jaw where the still's is a bowl; a calf peaking a third of the way down,
   averaged away by too few stations).
44. **The rest pose can pass at 97% and still break when she moves: gate a view on stress poses too.** mum3q's rest
   matched (IoU 0.969, edges within 0.02 H), then `char_pose_sheet` on `x-*` poses found two faults the still can't
   show: the taller shoulder cap the still needs pushed a lump out BEHIND the shoulder when the arm rose forward (the
   round end now flattens with elevation), and the armpit fill drawn to close a gap at rest became a skin sliver down
   her back with the arm raised (the arm's own front now meets the dress, as the still's deltoid does; the fill stops
   where the armpit's crease ends).
45. **On a turned face the body fitter cannot tell a nod from a roll: set the head from the face's own 3D pose.** Both move
   the eye, ear and mouth landmarks down the picture. On mum3q's look-down still `fit_pose` chose the head tilted
   sideways with the chin UP (pitch −9.7, neck +12.9); holding the nod and refitting the body made the trunk roll
   instead (rms 0.05–0.07). `head_pose.py` reads MediaPipe's facial transformation matrix on a 3× crop, relative to the
   master, keeps the body fit and searches only (nod, neck, head) on renders until the render's head pitch and roll and
   its face centre match the still's (within 1° on all three keys). Nelder–Mead from two seeds (the fit's head, and a
   bow: nod 2.5× the still's pitch, neck forward, head counter-rolled): the valley is diagonal (more nod, less roll),
   single-axis steps stopped at a 15° roll. Measure at the rig's scale (`C.ref.Hpx`), not the view's own head size.
46. **A hand seen from the back shows its life in the FAN, not the curl; and in ¾ a resting palm keeps the still's
   angle, not the proxy's.** mum3q's hand on the bump: the reviewers called v1 and v2 "frozen" and "a decal" although
   the fingers flexed 4–6° (v2 even 6–12°): for a hand seen from the back flexion is in DEPTH and shortens a finger by
   1 − cos θ (~1%). What reads is in the picture plane: the spread (fingers fan open with a caress, ±5°), the thumb's
   sweep (`ts`), the whole hand sliding on the bump (reach stops with `dp`, `surface`), and a curl big enough to shorten
   the fingers ~8% (8–14° per joint: a "gather"). The profile's `lie` (the palm laid in the bump proxy's tangent plane)
   foreshortened the ¾ hand to 79% (`qa_checks` limbs): the ¾ bump's front faces us, the still's palm lies flat at full
   length, so the fitted hand angle is kept (`hands/drape`: flat, graded, fanned) and only the wrist sits on the surface.
47. **Fitted keys carry their own idle limbs: a limb the brief doesn't move takes ONE key's values, and a hanging arm
   counter-rotates the trunk.** Each still's fit gave the far arm its own angles (forearm 10° → −3° → 3°), so in the
   shot the far hand swung in and out behind her skirt by half its width: the biggest motion in every hold (all three
   reviewers). `pose_blend --keep <far arm, legs>` holds them from the look-down key; then the far upper arm takes the
   trunk's change with the opposite sign (the far side's angles run opposite) so it stays plumb when the chest opens
   (far fingertip ≤ 1.7 px/frame, from 5.8 with the wrong sign).
48. **A hand whose wrist the camera can't see is placed from three points marked on the still, with "the arm stays
   hidden" as the constraint; and a hand pinned to her keeps its drawn SIZE as her body moves under it.** Harry on
   mum3q look-up v3: the far arm "just hanging lifeless", the hand "at a very odd angle while the other one's on the
   bump". New stills put the far hand on the top of the bump, its forearm hidden behind her, the wrist just showing
   under the bust. MediaPipe put that hidden wrist at the fingertips (70 px off), and fitting the hand's skin blob
   (centre, axis, area, then mask overlap) converged on a blocky hand inside the outline with the upper arm poking out
   of the notch under the bust: the drawn hand never has the still's shape, so area terms pull anywhere. Three points
   by eye (wrist, middle knuckle, fingertip centroid) plus a penalty for any arm sample within its half-width of the
   body's outline (`tools/hand_place.py --keys`, solved in node by `tools/hand_keys.mjs` in 0.3 s) gave the still's
   placement at 7.9 px rms with the elbow tucked back at her side. Then, pinned to the bump by a reach while she looked
   up, the arm's 3D solve turned the hand toward the camera and the flat-shaded palm grew from 48% to 61% of its length
   and back: the shrinking arm of lesson 39 in a hold. Reach stops with `keepSize: true` search the wrist's flexion and
   deviation together (locally: two flexions give the same length, a global scan flipped the hand 166 px) for the
   contact pose's own length at the angle the reach settled on; 47% ± 1% all shot. `lie` was no cure here: on the far
   top of the bump it laid the hand flat to us at 99%, long and past the outline. A segment hidden behind her, or
   foreshortened by design as in the stills, is declared in the shot (`spec.qa.limbs`) and the QA gate then checks it
   holds its size (≤ 1.1) instead of a minimum. The hand shape `atop`: fingers draped with a light curl (crest's ~90°
   read as a paw from the back), a small fan, the thumb tucked under on the far side (crest's stuck out into the air).
49. **A hand resting on her must rest the way a hand does: judge the arm in 3D, not only by where its points land, and
   ask the stills for the pose, not for a drape.** Harry on mum3q look-up v4's far hand: "no one's hand naturally lies
   like this", with a photo of a pregnant woman holding her bump (the top hand's palm on the dome, fingers together and
   gently curved, wrapping toward the camera; the lower hand cupping beneath). v4's stills (q_k2) had been asked for
   fingers "draping over the far edge" and got them hanging off it; new stills (q_k3) asked for the photo's hand. Fitting
   them, lesson 48's solver met its points at 1.6 px rms with the elbow inside her bust and the upper arm reaching across
   her chest toward the camera: every 2D cost met by a body no one has. `hand_place.py --natural` adds the 3D judgement
   (rig.js arm3's frame): the upper arm hangs (down ≥ 0.55) with the elbow out at her side (lateral ≥ 0.1), the back of
   the hand faces us (the drawn hand is always its back), and every joint keeps `--slack` degrees from its limits (at the
   wrist's limit the reach's keepSize couldn't hold the hand's size: 36–45%, a 12× flip at 15° → 8° slack on another
   key). From `--restarts 60` seeds it found an arm hanging at her side, the forearm forward behind the bump and the hand
   across its top, 0.4 px rms. Leave the knuckle key out when the still's palm curves toward us: the drawn fingers never
   foreshorten, so wrist, knuckle and fingertips can't all be met (22 px rms with it). "Hidden" means the arm's EDGES (its
   drawn half-widths): with a flat 9 px the upper arm's front edge showed in the notch under her bust. A hand pointing
   nearly at the camera (palm 44% of its length) is ill-conditioned: its screen angle hardly depends on the wrist bend, so
   a move's in-flight blend toward the key's bend swung the fingertips 10 px/frame as a 4 px stroke began; a stroke on the
   surface the hand rests on marks its stops `slide: true` (the contact angle and the hold's pull all the way). The shape
   `hold`: fingers together and gently curved, graded index → little, the thumb tucked; its fidgets ease, never fan.
   mum3q's wrist flexion reaches 80°, a real wrist's (mum3 keeps 60°).

50. **A correction that ends as prose is made again: turn each of Harry's notes into a checklist item and a gate that
   FAILS on the render he flagged.** By mum3q look-up v5, 49 lessons existed and Harry still had to say "creepy and
   lifeless". v5 passed every gate: the whole-frame still check saw her head and breath move, and the fit met the top
   hand's three points while drawing a boxy block with its fingers pointing back at her chest, where its still
   (q_k3_down_1) has the hand curling forward over the dome. Two blind A/B reviewers preferred it. Now: `docs/HARRY_EYE.md`
   lists his notes as questions; `spec.preflight` says how a plan avoids each one before anything is built; the
   `qa_checks` `alive` gate measures each hand's movement ON her (relative to the belly), and fails v5's far hand at
   0–3.2 s; `tools/ref_match.py` puts each key next to its stills; `critic_F.py --lens natural` asks a fresh reviewer every
   checklist item against those sheets. Run blind on v5, that reviewer named all three of Harry's points before seeing
   them ("a little mitten with no wrist", "fingers straight and spread like a comb", "only her head moves when she looks
   up"). Measuring finger curl from the bone points does NOT work (every finger reads straight, even on hands Harry
   liked): curl and shape are for the natural lens on the stills, not a number.
51. **Every hand on her is fitted to its still in three steps: the SHAPE side by side with the still's hand, then the
   PLACE solved with that shape, then LIFE big enough to see on a phone.** mum3q look-up v6 (Harry on v5: "still looks
   creepy and lifeless. Rather than being a little curled over the top of the bump"; he picked "far hand on top" from new
   stills q_k4_down). Each step failed once on the way:
   - *Shape.* The first `hold` curled its fingers 70–85°. mum3q's fingers are 3D (`flexFx: {from: 'hand.<side>'}`: a
     finger turns in the plane of its hand's camera direction and normal), so a hand seen from its back curls INTO the
     camera: short stacked stubs ending in a blunt column, "a mitten" to the natural reviewer twice. The `cradle`'s 75–90°
     hooked into "a rake". Rendering ~8 shapes of the key next to the still's hand at the same crop took minutes and
     showed it plainly: the still's top hand has long fingers, fanned a few degrees so the tips step down in a diagonal,
     each curved only 45–65° tip to knuckle; the lower hand's lie together and nearly straight along the curve. A hand
     must also be drawn at the length the still draws it: at a3.len 0.68 (the solver's free choice) the top hand read as a
     stub; `hand_place.py --hand-len 0.85` keeps an illustration's resting hand nearly unforeshortened. And the curl only
     SHOWS when the hand faces the surface it lies on: placed "back of the hand to us", its palm normal pointed away from
     the camera (ncam (−0.41, 0.39, 0.82)) and any curl, 30° or 85°, only shortened the fingers ("straight planks", round 3).
     `hand_place.py --palm-down 0.55` turns a hand on top of the dome palm down onto it (ncam y 0.39 → 0.55); then a curl
     in the middle and end joints (~65–85° tip to knuckle) bends the fingertips down over the dome on screen. Eyes are shape
     too: lid open 0.6 + half + smile squashed a look-down to "closed slits" where the stills draw open eyes looking down.
   - *Place.* The shape is chosen first because the placement is solved WITH it (`hand_place.py --hand <shape>`); the arm
     the still shows is drawn (`--hide none`, `--fore x,y` a point on the forearm, `--elbow x,y` where the still shows
     it). Two engine fixes came out of holding that arm: a 3D arm at 122° abduction missed its own key by 26 px and hopped
     between IK branches frame to frame (elbow 40–70 px), so the reach now restores the keyed arm when the solve lands on
     the mirror branch, a stop can say `keyedArm: true` (the arm stays the key's, only the damped solve moves the wrist),
     and `qa_checks` fails an elbow that moves > 6 px in a frame while its wrist barely moves. A hand bent 50° at the wrist
     drew a "pointed wrist corner": `params.arm<Side>.wristRound` adds a heel-of-the-hand pad.
   - *Life.* The alive gate passed at 1.5 px with 2–4 px finger settles and both fresh reviewers still wrote "the hands
     look identical in every frame… held props". A reach's `dp` is in H (mum3q: 1 H ≈ 225 px), so the "lift" of 0.02 H
     was 4.5 px. Life a viewer sees is a 10–20 px caress or stroke, timed to the face (a caress while she looks down, a
     squeeze as she smiles, a stroke through the smile, a settle as her eyes come back). The gate is now 5 px in every
     2 s. Slide the WRIST little: a 14–18 px slide pulled the far forearm in behind her bust (the strip past its edge lost
     35% of its area, the shrinking arm of lesson 39); the hand turning about its wrist (a `hand.<side>` fidget, applied
     after the reach so the arm stays put) sweeps the fingertips as far while the arm holds. A forearm twist (`foreRot`)
     swept them too but moved the forearm's drawn edges off the underbust: a white gap up to 73 px opened between bust,
     arm and hand (the far forearm's back edge is now fuller toward the wrist, `P.armFar.w`; ≤ 13 px).
   - *Timing.* The "half way up" breakdown still (q_k_mid_2) is 85% up, so the look up did most of its travel in 0.3 s;
     a breakdown is half way in what moves, whatever its still shows (`derive_lookup.sh` holds its head back).
   An arrangement choice (which hand on top) goes to the client on a decision card with the stills, never decided alone.
   Rounds: blind A/B against v5 6.5 vs 5.5 (draft), 6.5 vs 5, 6.5 vs 5.5 (final). The natural lens said NOT YET four
   times; the top hand's curl swung "mitten" → "planks" → "paw". When a shape ping-pongs like that the fault is the
   DRAWING, not the pose (lesson 15: change the method): a back-view hand drawn as one silhouette with crease lines reads
   as a mitten or a comb at any curl; the stills draw each finger as its own tapered shape (the next step, feel log).
52. **Match the DRAWING to the still, not only the pose: line weight, finger taper and tips, the gaps between fingers, the
   wrist crease, and the shadow a resting hand casts. And every channel a shot keys must reach the drawing.** mum3q
   look-up v7. Correction to 51: `hand.js` already draws each finger as its own tapered tube; what read as "a mitten",
   "a comb" and "four even parallel stripes" was the drawing's settings and how the fingers sat together. Side by side
   with still q_k4_down_0 at the same crop (`hand_shapes.py --try '[{"style": {...}}]'`): our lines between the fingers
   were thick, dark and ran each finger's whole length (`rim` 0.02 H ≈ 4.5 px); the still's are thin and faint.
   - *Both ways wrong.* The first redraw went all the way to the still's look at zoom (`rim` 0.009, strong taper, pointed
     tips `tipK` 0.82, a steep graded curl) and LOST its blind A/B to v6 (6 vs 6.5): at phone size the fingers fused into
     one tapering shape, "a flat paddle", "a flipper", "a fused mitten with lines drawn on". Thin lines alone don't
     separate fingers; at phone size a finger reads by its own ROUND tip and a small gap beside it. The second redraw:
     `rim` 0.012, `taper` [1, 0.92, 0.84, 0.76], `tipK` 1.0 (round tips), the fingers fanned a few degrees so small gaps
     open toward the tips (lower hand up to 6°), the curl graded so the tips step (index straightest), the lower thumb's
     end joints bent toward the bump (straight, "a stiff bar"). It won its blind A/B, narrowly (6 vs 5.5). Too far the
     other way on the top hand: fanned ±10° with ~90° on the little finger it read as "a claw", its lines broken into
     dashes (`hand.js` fades a line where the finger beside it curls hard); it now lies together (±6°, 30° → 70°) with
     long lines. Judge a hand drawing at the size the film is seen (`--scale 1`), not only zoomed: the zoomed sheet
     favoured the version that lost.
   - *The wrist.* The round pad over the far wrist read "a big rounded lump… a swollen joint", "a teardrop swelling into a
     ball" that hid the back of the hand. Its radius was taken from the forearm's back edge at the wrist, which v6 had
     widened to fill the underbust notch, so the pad was WIDER than the forearm: a joint must never be wider than the limb
     it ends. Now 0.65 × (`P.armFar.wristRound.r`), with a short fine crease where the back of the hand bends off it
     (`.crease`); a long full arc cut the pad off into "a ball, a fist".
   - *The shadow.* The still shows each resting hand and the near forearm casting a soft shadow on the dress. mum3q had a
     contact shadow configured since its first shot and it had NEVER drawn: `anim.js` stored a keyed track channel
     `fx.contact.near` as `fx.contact` (it kept only the first word after `fx.`), so the shadow's gate stayed 0, in mum3's
     breathe-stroke as well, through every version and every review. Fixed, with a `qa_checks` gate (`channels`: every
     keyed channel reaches the pose under its whole name; a contact shadow gated on a keyed channel draws while it is on).
     The near group now includes its forearm (`arm.near`, on the dress only: on `chest.skin` it drew a stripe inside the
     upper arm), 16 %, (5, 9) px as the still reads. A shadow group must hold every part of its hand including the wrist
     pad: the shadow is drawn just below the group's lowest part, so a pad left out got the hand's shadow painted on it.
   - *Life, again.* The natural lens measured the hands' moves at 3–4 px on a 600 px figure against the head's 15, and
     both hands dead still over the loop's seam (7.4 → 0.4 s). Raising the top hand's turn about its wrist from 15° to
     24° moved its fingertips ~6 px: the hand lies palm down on the dome, so a turn in its own plane is seen nearly
     edge-on. Measure a gesture in the rendered frames before trusting its degrees. Its life is now in the fingers (their
     curl shows on screen once the hand is palm down): they lift and settle, gather into a squeeze as she smiles, 2–3×
     the old angles; the lower thumb strokes 26°, the lower fingers gather as she lifts her eyes, and a small thumb stroke
     crosses the seam.
   Rules: pick a character's hand DRAWING beside its stills at the New character gate, at film size, as you pick a hand
   shape at the New pose gate; when a configured effect never shows, check that its channel arrives before tuning it.
53. **A hand drawing is chiral: the far hand is the OTHER hand, and a spec copied from the near one draws its mirror
   image. Read the still's hand by its anatomy (which edge the thumb and index are on, where the little finger is, which
   face we see, where the arm comes from) before its shape or its style.** mum3q look-up v1–v7. Harry on v7's top hand: "a
   total mess. It looks like it's the wrong way round. How does it compare to the reference image?" It was: `params.js`
   built the far hand as `{ ...handSpecs.near, … }`, keeping the near (right) hand's `thumbSide`, so a RIGHT hand lay on
   her left arm, thumb and index along its lower edge and the little finger on top, where the still has the index on top
   and the little finger lowest. A right hand seen from the back is a left hand seen from the palm, so the copy was right
   while the far hand hung palm in (a sliver beside the skirt) and wrong from the first key that laid it on the bump.
   Four rounds (curl, wrist pad, crease, line weight, finger fan) tuned a mirrored hand; the critics named symptoms ("a
   paw", "a claw", "the wrist a ball", the pad's crease read as "a thumb pad"), never the cause, and every gate passed.
   - *The fix:* the far spec takes `thumbSide` −1 and its `thumbFx` flipped (mum2's back-view far hand already did). Spreads
     keyed raw in the shot (`hand.far.f*s` fidgets) flip with it; library shapes go through `spreadSign` and flip alone.
   - *The arm, read the same way.* Beside the still at the same crop, the strip coming down past her bust is the UPPER arm,
     hanging; the elbow is at her side on the bump's edge and the forearm points at us over the top of the bump: that is
     the still's round mass. v7's placement had taken the strip for the forearm (`--fore` on it): the solve lifted the
     elbow back to her bust (the upper arm drawn at 57%, abducted 122°, "a chicken wing") and the forearm's end became a
     ball with a crease. Re-placed with `--elbow` under the mass and `--hang 0.8`. A forearm drawn at under half its
     length is now drawn END-ON (`parts/arms.js`: its tube thins inside a round mass, the cross-section seen along it): as
     a tube, a 0.15 H forearm was a hairpin under the upper arm, "a box", then a hook. The wrist pad and crease went.
   - *Then the drawing came close in a few tries,* each picked beside the still (`hand_shapes.py`, zoomed and at film
     size): the fingers together (the spread closed toward the middle finger, the curl graded mildly: on a palm-down
     hand a 3D curl swings the more curled fingers sideways, which had opened the gaps); the thumb-side edge flat
     (`thenarEdge` 0.9) as the still's top edge runs straight to the wrist; the hand's edge over its own upper arm drawn
     as a fine line (an outline group), so the back of the hand reads apart from the arm, as the still draws it. With
     the arm hanging, the caress's 24° turn grew the drawn hand 12% (the limbs gate): 14–17° keeps it within 10%.
   - *Gates.* `tools/handed.mjs`: per hand, the side the 3D arm puts the thumb (arm3's radial direction, now `a3.gcam`)
     against the side the drawing puts the index knuckle, with the remedy (flip the spec, or swap in a drawing of the
     other face). `char_check` runs it on every pose, `qa_checks handed` on every frame; it fails v7 on all 240 frames.
     Exceptions carry a reason in `C.qa.handed`: mum3q's hanging far hand (drawn from the back for the bump; it needs a
     palm drawing before a shot shows it hanging), mum2's far hand (turned by drawing swaps, not its 3D arm). HARRY_EYE 19;
     `new_char.py` and the skill's step zero say it.
   - *The sign-off.* The natural lens said NOT YET on v7's top hand ("a paw… the wrist a ball") and v7 still went to Harry
     with that point "explained". A point about something the still draws differently is fixed before he sees it.
   Rules: when tuning a hand doesn't converge, ask which hand it is and which face we see before anything else; never
   copy one hand's spec to the other without mirroring it; say what each visible segment of an arm IS before placing it.
54. **Measure the still's hand in its own pixels and place the hand by EACH fingertip; a hand draped over a dome bends at
   its knuckles, not its finger joints.** mum3q look-up v8 → v9. v8, the right hand at last, lost its blind A/B to v7 (5.5 vs
   6): "a pale round knob" of a wrist, "fingers short and nearly horizontal… tips bunched into a lumpy, scalloped edge".
   Measured on q_k4_down_0 (a 10 px grid; the lines between the fingers found by colour): the fingers lie at 38/35/30/28°
   below the horizontal from index to little, their tips step down a diagonal (each 0–16 px behind the index's along the
   fingers: a normal hand's lengths), and the knuckles sit on a line square to the fingers. v8 met its keys to 1 px and
   still drew a different hand: its fingers at 28–17°, its tips stacked down one column. Two causes:
   - *A centroid lets the hand roll.* W, K and T (the tips' centroid) leave the hand free to turn about T, and K had been
     marked by eye 12 px low (on the hand's middle, not where the lines between the fingers start), which flattened every
     finger. `hand_place.py --tips` takes each fingertip as a key (index → little); K is re-marked on the measured lines.
   - *The shape couldn't meet them* (6.6–8 px rms whatever the arm did), because the still's hand DRAPES: the back of the
     hand lies on the dome's top and the straight fingers bend down its curve at the knuckles (MCP 44–50°, PIP 8–14°). v8's
     mild curl (6–14°) kept them flat; earlier, deeper curls in the finger joints made "a mitten" and "a paw". Its
     little-finger side wraps down and away, so the far hand's own spec steps the knuckle arc back and shortens the outer
     fingers on screen (`knuckleArc` [1, 1, .95, .85], `fingerLen` [1, 1, .9, .74]): 4.5 px rms. `hand.js` faded a
     back-view finger line by the knuckle's and the PIP's curl summed, which cut the lines to stubs at 55°: `lineMcpK`
     (0.25 here, default 1, so mum2 and mum3 draw the same) weighs the knuckle's share; only a PIP folds a finger over its
     own line.
   - *What the shot did to it (v9).* The fitted key matched the still; the film didn't. v9 lost its blind A/B to v7 (6 vs
     6.5) and the natural lens said NOT YET, on three things the key never showed:
     - *The breath flattened the fingers.* The breath lifts her shoulder ~10 px while the wrist stays pinned on the bump;
       over a forearm seen end-on the damped solve turned it 10° in 3D, and keepSize held the hand's length and screen angle
       with a different palm facing, so the fingers lay at 26° on the film against 31° on the key. `keepPalm: true` on the
       reach stops keeps the palm's facing too (a3.ncam; keepSize then searches the forearm's pronation with the wrist): 32°.
     - *The squeeze curled the drape into a paw.* Its fidgets added 12–16° into the finger joints of a hand already bent
       48° at the knuckles (68–70° + 24–26°: "a short bunched block, knobbly tips stacked in a column"). A draped hand
       presses at its knuckles: +4–6° there, the finger joints straightening; the fingers then steepen 32° → 40° at full
       length.
     - *The wrist was a ball.* The end-on mass, an ellipse along the short forearm, stood off the arm's outer edge with a
       notch above it and a corner under the hand, and cast its own shadow: "a pale round knob… a lump", "a ball… casting
       its own shadow". The still's wrist flows out of the upper arm's outer edge round to the bump's edge: `P.armFar.endOn`
       lays the mass along the UPPER arm (`axis: 'upper'`, picked beside the still from 15 variants), and the shadow group's
       `noCast` keeps it in the hand's shadow depth without casting (it stands in the air beside the bump).
   Rules: before tuning a hand's numbers, measure the still's hand (each tip, each line between fingers, the knuckle line,
   the angles) and fit to those points; an rms on a centroid can be 1 px on the wrong hand. If the tips can't be met, the
   shape is wrong, not the arm. A hand resting on a curved body bends at the knuckles, and presses there. Then measure the
   same angles on the FILM's frames: what the shot adds (breath, reach, fidgets) can undo the key.
55. **An end-on wrist is one form with the hand: read the still's OVERLAPS (what lies over what, which edge is a line)
   before its outline.** mum3q look-up v11 → v13. On the still's pixels (a 10 px grid at 4×) v11's silhouette already met
   the still's wrist: right edge 655 vs 655 px, bottom 592 vs 592. Fresh eyes still read "an oval ringed by a crease…
   hanging below the hand" (natural lens), "a round knob hanging off its right end" (blind A/B, lost to v7 again), because
   the drawing ORDER was wrong, not the shape:
   - *The wrist lies over the hand's heel, and behind the bump.* The still's forearm comes toward us over the dome's edge,
     so its round end covers the heel of the hand (the back of the hand runs into it), while the bump's outline cuts its
     lower side (the elbow is behind the bump). v11 drew the mass behind the hand and outlined the hand over it (a C round
     the hand's end), and the mass's own round end hung below the hand. `endOn.front` puts it over the hand; `endOn.cut:
     'dress'` (the renderer's `clipOut`) shows it only outside the dress's outline, so the bump's edge bounds it as in the
     still. The far hand's outline group no longer counts the mass as behind it.
   - *Only the lines the still draws.* An outline group round the mass over the hand (v12, even faded mid-edge with
     `fade.at`) drew "a C-shaped crease… a puffy cuff, or a thumb seen from behind" and lost to v11 (5.5 vs 6). The still
     has ONE short arc where the back of the hand folds into the wrist's top: `endOn.lines` draws arcs of the mass's own
     edge (degrees round it), tapered, and nothing else. An outline group's line also shows over a same-colour part in
     FRONT of its `behind` parts (the hand over the arm's tube): occluders are only parts of another colour.
   v13 (front, cut, one arc) beat v11 (6.5 vs 6, "forearm, bent wrist and hand read as one continuous limb") and, the first
   top hand to, v7 (6.5 vs 6), after v8–v12 each lost to v7 by 0.5 on the wrist.
   Rules: before reshaping a part the critics call a lump, mark on the still which form lies over which and where each line
   runs, and match that order; a silhouette can match to the pixel and still read wrong. Draw a line only where the still
   draws one.
56. **Points can match while the form between them doesn't: measure the curve, the spacing and the length the reviewer
   names, and overlay the still before tuning.** mum3q look-up v13 → v14. The natural lens on v13 (NOT YET) named four
   drawings that the still draws differently; each had been fitted to the right points with the wrong form between them:
   - *The top fingertips, "a stubby paw".* The fit met the four tips to 4.7 px rms, but with a square knuckle line the
     index and middle tips stacked in one column. The still's knuckle line slants down toward the little finger (where its
     lines start: 564,538 → 573,551 → 583,561 px) and its little finger is short: `knuckleArc` [1, .97, .9, .8] and
     `fingerLen` [1.05, 1, .86, .68] step the tips 516 → 520 → 534 → 552 px across (2.8 px rms; the little finger bent 62°
     at its knuckle to keep the still's 25–28°). The lines between the fingers now run into the notches between the tips
     (`lineTipGap` .3, `lineEnd` .95).
   - *The look-down head, "bowed too deep".* `fx.headPitch` is a nod warp: at 28 it squashed the face toward the bump.
     The stills look down with the head TIPPED ~20° toward the bump and the face still readable, so n-down rolls the head
     8° (`--add head=8`) with half the nod (headPitch 14; n-dip 17, n-mid 8, n-ret 9).
   - *The bump's lower front, "a rounded box… a corner".* Its named rows were within 5 px of the master's, but the
     designed tangents (55°, 90°, 125°) turned down too early: a flat front, then a straight chamfer into the skirt. The
     tangents measured on the master at each row (61°, 85°, 110°, and 121° at a new point `low`, 85% of the way to the
     bottom) make one convex curve into the skirt, as the master and the stills draw it.
   - *The lower hand, "a stub thumb, tips stacked in a column".* Side by side the two hands looked alike. Overlaid on the
     still's skin (`tools/mask_overlay.py`: red only in the still, blue only in the render), the thumb was ~8 px short and
     the fingers fat and fanned past the bump's edge: 1682 px of mismatch. A longer, slimmer thumb (`prox` .43, `dist`
     .37), slimmer tapered fingers (`fingerK` .9, `taper` to .66), the index the longest (`fingerLen` [1, .95, .86, .72]),
     the fan tightened (cradle `s` −3…3) and the hand refitted to the still's four tips: 1166 px, the tips meeting the
     bump's edge in one diagonal. Fitting the tips turned the hand 8% further from us (76% of its length, still all shot:
     `spec.qa.limbs`); held near full length (`--hand-len 0.85`) it matched worse (1431 px, the little finger hidden).
   v14 beat v13 blind (6.5 vs 6; "a relaxed hand resting on the bump… the tips follow the bump's lower curve").
   Rules: when a reviewer names a shape, overlay that region on the still (`mask_overlay.py`) before tuning; the two
   numbers show each fix at once. Measure a curve's tangents, not only its rows; a tip's spacing and a thumb's length,
   not only the tips' centroid. Look down with a roll of the head before a deeper nod.
57. **At phone size an eye reads by its dark mass, not its white: test a feature's redraw blind at film size before
   keeping it.** mum3q look-up v14 → v16. The natural lens on v14 read the look-down eyes as "slits… looking forward and
   to the side, sleepy or smug", against stills that show the white above and behind an iris resting on the lower lid.
   The eye was one dark oval that the gaze slid whole, so it couldn't show a white. `parts/head.js` can now draw a white
   opening the lids shape and an iris the gaze moves inside it (`P.eyeLook`: the opening rides the gaze ×`lidK`, the iris
   ×`irisK`, shrinking to `irisR` off-centre; the white fades in with the offset, so at rest the eye is the master's dark
   oval to the pixel). Zoomed beside the still it matched. Blind, at phone size, it lost twice to the dark oval:
   - v15 (lids .75/.25, the iris well down): "wide open with white all round… a cartoon eyes-down, a side-glance";
   - v16 (v14's heavy lids, a white wedge beside the iris): "a short dark slash… heavier, sleepier".
   The white is light on light skin and vanishes at phone size; what's left is a smaller dark shape. The natural lens on
   v15 said the eyes "landed", yet both A/Bs preferred v14. mum3q keeps `eyeLook` {1, 1, 1} (the old drawing).
   Rules: judge a feature's redraw at the size the film is watched, blind against the version before, not only zoomed
   beside the still. A light detail (a white, a highlight) only reads if the dark shape around it still does.
   **Then measured, it won (v18).** v15–v16 had guessed the eye; v18 read q_k_down_0's at film size: a big dark iris
   pushed FORWARD toward the bump under a heavy lash line, the white a sliver on its back side only, the lids open
   (.75/.25). So the opening stays put (`lidK` 0), the iris slides with a mostly-forward gaze (.022, .014) at .92 of the
   opening. Blind v18 vs v14: v18 6.5, v14 6, the eyes the most visible difference: "open, plainly looking down at the
   bump… X's read half-shut or drowsy". The white works when it sits where the still puts it and the dark mass stays big;
   v15's mostly-DOWN gaze put white above and around the iris. An eye pose belongs to its head pose: the forward-down
   look-down iris under a still-raised head read "side-eye" (natural lens v18: the eyes went down 0.6 s before the head).
   v22 then lowered the lid to v14's heavy .6/.4 over the measured white and iris and won again ("cast down at her
   bump… a real downward gaze brings the upper lid down with the eye"): the lid that read "sleepy, smug" over a dark oval
   reads tender over the still's eye. The lid and the iris are one shape; measure them together.
58. **Review what the viewer sees: draw the small moves at film size, and check the FILM against the still, not the key.**
   mum3q look-up v14–v17. QA measured both hands moving 20–26 px on her each second and the chest lifting on the look
   up, yet three reviewers in a row called the hands "frozen" and a blind A/B said "a real but small hand or eye change
   could be there without me seeing it". The packs showed the figure at a third of film size as still tiles: a 20 px move
   was ~7 px between two tiles a row apart. `tools/motion_sheet.py` now puts into both packs the hands at 1:1 every
   0.5 s (`spec.handsBox`) and, per second, the first frame faded with every changed pixel in magenta. With them the
   next reviewers sized the moves ("the thumb rises 10–12 px… settles back by 1.5 s") and judged them: one A/B read the
   thumb's swing alone as "a tic… a straight stalk", another preferred it to a curl too small to see (v19 lost 6 vs 6.5).
   The same sheets showed the cradling hand wrong ON THE FILM while its key matched the still (`mask_overlay` 939 px):
   the reach pins the hand to the belly at the look-down key's place and angle, and that key's trunk (another still's
   fit) had put it 26 px behind the still's and 6° steeper ("a comb… the tips well inside the edge"). v18 set the key's
   hand bone to the still's finger angles (18/13/7/−2°); v20 moved the reach stops by the measured 26 px and won blind
   ("the bump looks as if it rests in the hand"; v21 kept its stroke inside the edge and won again).
   Rules: give every shot a `handsBox`; before acting on "frozen" or "static", read the motion sheet. When a derived key
   or a reach acts on a fitted hand, measure the film against the still: `finger_angles.mjs --anim` (gated by QA
   `fingers`, `spec.qa.fingers`) and `mask_overlay.py <char> <anim>@<t>` (the shot's pose at t over the still).
59. **Gate a fitted hand all shot, not at its keys; bend fingers where the view keeps their shape; judge signs and eyes on
   the film.** mum3q look-up v22–v24. QA `fingers` passed at the look-down keys while reviewers called the cradling
   fingers "a rake" at 3–4 s. Measured every 0.5 s, the fan there sat 6° flatter and 9% longer: a fidget bent the
   fingers at the KNUCKLES (+10–13°), and on a hand seen palm-on a knuckle bend turns the fingers toward the camera, so on
   the film they flatten toward the palm's line and lengthen, straight and parallel. Bent at the end joints, with the
   whole hand turned 4° to cup the bump, the fan kept its shape ("compact, slightly converging… a hand holding the
   bump"; v24, a blind tie leaning to it). Two "fixes" in the same round lost (v23): the top hand's fidget spreads
   turned round because raw `f*s` values skip `spreadSign` on a mirrored hand (true in code; on the film v22's opening
   gaps read alive, v23's "bunched"), and the eyes dropped first with the iris centred (in ¾ a centred iris is a look at
   the camera: "looking at us from under heavy lids… coy").
   Rules: QA `fingers` takes `every: {step, tol}` (the angles every step) and `fan: {every, tol}` (each finger minus the
   four's mean: a whole-hand turn passes, a shape change fails; `finger_angles.mjs --fan`); gate the hand the reviewer
   names, not a moving fan that reads alive. On a palm-on hand, put a gather in the end joints and the hand's turn, not
   the knuckles. Check a sign "bug" on the film before flipping it. An eye's direction in ¾ is the iris's place in the
   eye: centred means at us.
60. **A weight shift tilts the legs from the ankles: let the hips move, not the feet.** mum3 ease-sway (2026-10-14). Both
   thighs tilted together (plantFeet `ik`) carry the hips 46 px from the back sway to the front one, the feet planted in x, but
   a straight leg can neither stretch nor fold back, so the IK left both feet 3 px off the floor at the forward sway and
   2.5 px into it at the back one (a softer back knee did not fix it: it's the leg's length). `spec.plantFeetSink: true`
   moves the hips by what the foot nearest the floor still lacks: the ankles hold within 0.6 px all shot. Opt-in, so
   earlier shots keep their frames. Probe the feet on any shot that moves the hips: `node tools/feet_probe.mjs <char> <anim>`.
## From the reels rig (merged 2026-10-12)

The reels rig (`pregnancy-plus-reels`, `kits/rig`) traced one illustration into a one-piece arm bent along its bones and
spent ~30 blind-review rounds on PERFORMANCE (scores /10, 7 = would ship; Maya / Amara). Tracing- and cutting-only
lessons are left out (tracing, palette snapping, parts sheets, body layer, traced shoulder hull, `herSoft` clips,
`kits/figure` swaps). Each entry: rule; evidence; source (`LESSONS.md` = reels `kits/rig/LESSONS.md`; `perform.js`,
`acts.js` = reels `kits/rig/demo/perform.js`, `kits/rig/acts.js`; LEDGER = reels `.claude/skills/LEDGER.md`); whether
the code rig does it (checked in `engine/` and mum2, 2026-10-12). Pixels at 1080×1920.

### Performance and acting
- **One main action at a time.** Idle drift tiny (head and sway ±0.25°), smaller again once she settles; find what moves
  when it shouldn't by motion per region (frame differences in boxes, ignoring sub-pixel anti-aliasing). Client: "a lot
  of movement on independent body parts". `LESSONS.md §Performance`, `perform.js:120,127` — code rig: partly
  (`drift.amp` is a track, but mum2 runs head 0.4°, chain to 0.45°, far hand 0.6° at amp 1 all shot; no per-region
  motion check).
- **Into tenderness: eyes open, a pause, the head bows, THEN the hand moves.** Eyes, head and hand starting together
  read as surprise (judge panel, Lasseter 6.0 / 6.5). Then act it: head bowed and held, a soft closed-mouth smile as the
  hand lands (A/B: better; mum2 has this part). `LESSONS.md §Performance`, `perform.js:35-37` — code rig: partly (v14d
  staggers them, but hand first with eyes shut 7.0–8.1 s, eyes 8.3, head 9.0: reels order untried).
- **A relief breath is three steps:** in with the mouth closed (chest widens, shoulders and head rise ~13 px, a hand on
  the chest rides up), held, then the mouth opens and she breathes out quick-then-slow (body sinks ~24 px). Started
  while the hand was still landing it didn't read; anything pressing on the chest follows the breath OUT, never against
  the in. Client's own words. `LESSONS.md §Performance`, `perform.js:30-34,74-78` — code rig: partly (in after the hand
  lands, PIPELINE §3; no hold, see Timing).
- **Breathing is local.** The quiet cycle widens the rib cage ~0.3 % and lifts the shoulders ~1 px; a heave (gulp, sigh)
  is a separate, bigger rise; nothing scales about the seat (client: "her entire body increases and decreases").
  `LESSONS.md §Performance` — code rig: has it (breath wave on chest, clavicles, head, belly lattice; heaves are keys).
- **The ending must not freeze.** Settled breath ~2 px (at ~1 px it looked frozen), a head dip and glance down on the
  first stroke, content heavy-lidded eyes, blinks every 2–3 s. Judge panel 2. `LESSONS.md §Hands`,
  `perform.js:136,197,204` — code rig: partly (breath amp back to 1 at 8.3 s, two strokes, head down at 9.0; but one
  blink in the last 4 s and no dip-and-glance on a stroke).
- **The other hand answers, by a few degrees and late.** Its fingers lift as the stroking hand comes under them, it
  turns a few degrees with each stroke (10° floated it up 13–20 px), ~0.3 s behind (in time it bobbed like a metronome);
  static, the hands read as colliding. `LESSONS.md §Performance`, `perform.js:207-213` — code rig: not yet (the far hand
  relaxes once, fidget 8.3–10.2 s; nothing is driven by the near hand's slide).
- **The shoulder takes part:** drops ~1° as the hand comes down to the chest, lifts ~2° as the elbow swings out; still,
  the arm looked hinged at the armpit. `perform.js:122-126` — code rig: has it (rig `drivers`, also PIPELINE lesson 4).
- **Strokes move the whole arm, 40–70 px on screen** (upper arm 8–12°, forearm 2.5–4°, wrist 8°); a forearm-only stroke
  moved the hand 10–20 px and a 15 px stroke was invisible on a phone. `LESSONS.md §Performance` — code rig: has it
  (`fx.slide` moves the pinned wrist, the pin IK the arm, PIPELINE §3); on-screen size unmeasured.
- **Two strokes of different length and speed, each an oval, then a settle.** Out slower than back, the second shorter,
  pressing a little lower going out; four even halves read as "a wiper". Each whole, rest → out → rest. Blind A/B:
  preferred for both characters. `LESSONS.md §Performance`, `perform.js:48-54` — code rig: partly (two strokes, 0.12 and
  0.08 H, but each fidget is ½(1−cos) on one straight line: out = back, no oval).
- **Tangents read as touching:** fingertips exactly on a cheek line or neckline; keep ~10 px clear or overlap clearly.
  LEDGER §Film — code rig: not yet (`anim_audit` finds slivers and gaps, not tangents).

### Hands
- **The hand keeps its size off the body; its SHADOW says it is lifted.** A lift effect that grew it 10 % read as
  "changes size as they move down". Check the hand's true area per frame (±3 %). `LESSONS.md §Hands` — code rig: has it
  (no lift scale; `roll` narrows on purpose); area per frame not checked.
- **A near-hard contact shadow under a hand on her** (~12 % opacity, blur ≤ 1 px, offset a few px, on her clothes and
  painted skin only), parting from the hand as it lifts (up to ~9,16 px): that says "in front of her neck", not "on it".
  Blurred and offset it read as a sticker lifting off; no blur filters on per-frame paths (they rendered differently out
  of order), and no motion blur (it doubles flat edges). `LESSONS.md §Hands, §Edges and layers, §Determinism` — code
  rig: has it (`C.contactShadow`, lesson 22; a group's `gate: '<fx channel>'` keyed by a contact track, so a hand hanging
  at her side casts none).
- **A thin hand edge in her own skin shade, never a heavy dark outline** (dark = "stickers in another style").
  `LESSONS.md §Hands` — code rig: has it (`outlineGroups`, `skinLine`, w 0.012). Conflict: reels outlined the hand
  everywhere (an edge fading as the hand left her face read as a swap); the code rig outlines only over the same
  material (no-outline style, PIPELINE lesson 17). Keep the code rule; check the frame the hand leaves her face.
- **The wrist narrower than palm (~85 %) and cuff, bending smoothly, ≤ 30°.** As wide as the cuff the hand read "plugged
  in", "not her real hands" (client). `LESSONS.md §Hands` — code rig: partly (the palm's wrist end tucks under the cuff
  as a semicircle, but near `wristW` = `palmW` = 0.29; far 0.25 / 0.265; wrist range −50…40°).
- **No spring in the hand.** Under-damped springs (ζ 0.42–0.52) and a mid-move wrist bend out and back made "an odd sort
  of spring" (client); damped (ζ 0.82–0.85, fingers 0.72) the hand lags and catches up. Check that the hand's screen
  angle runs one way through a move. `LESSONS.md §Hands` — code rig: partly (no arm springs, `handLag` never overshoots;
  but a spline reach's `neutral` (default 0.5) relaxes the wrist toward straight mid-flight, an out-and-back).
- **Fingers relax in flight and open to land one by one, index first** (~40 ms apart); all at once the hand "read as a
  drawing". `LESSONS.md §Hands`, `acts.js:330,357-361` — code rig: partly (fingers-only keys relax the hand in flight;
  all four move together; per-finger `spec.lags` could stagger them, none set).
- **Each finger on its own.** Hands scored 6 every round while the fingers bent as one block: outer fingers trail and
  curl a little more; they press at slightly different moments, squeeze in turn on a gulp, settle one after another.
  `LESSONS.md §Hands`, `perform.js:70-71,100-102` — code rig: partly (separate finger bones, fidgets set them per
  finger; the hand library blends all four as one).
- **Fingers trail the hand.** A fingertip target on a loose spring (4.5 Hz, ζ 0.42, gain 1.25, ±16°); the fingers bend
  toward it from the knuckles, trail by a few frames, swing past and settle. Bent by speed alone (no lag): rigid, "hands
  6"; gain 1.6: a claw. `LESSONS.md §Hands`, `acts.js:396-406` — code rig: not yet (and `anim.js` springs are loop-only:
  a non-loop shot needs the keyed-motion spring first).
- **Land once: a small press, a settle, then only the breath.** The fingers spread a little as the hand takes weight,
  then settle, swinging side to side over ~6 frames (2.6 Hz, e^−4.5t, +40 ms per finger). Still at once: "frozen";
  press-and-release plus the breath: "a soft bounce". `LESSONS.md §Hands`, `perform.js:61-63,90-92` — code rig: partly
  (`EASES.settle` overshoots; `press` events dent the belly lattice; no hand settle or wag).
- **A resting hand is never a fixed drawing:** fingers press and ease on her face (harder on a gulp), ease with each
  breath on her chest, lift a little at each stroke's turn. `perform.js:67-71,81-82` — code rig: partly (keyed fidgets
  at story beats; nothing tied to the breath wave).
- **Peel off a surface:** the fingertips stay a few frames while the wrist pulls away, spreading a little as they curl
  (curled together they fused into a mitten). But off the FACE go at once and out to the side: peeled down her chin it
  read as "a clutch at the throat". `LESSONS.md §Hands, §Performance`, `acts.js:358-365` — code rig: partly (the return
  leaves the lips outward first, path `shape: 'corner'`; no fingertip peel off the bump).
- **Keep the two hands ≥ 15 px apart every frame**; route round the other hand, never deep under it (it dipped onto her
  lap and bounced); stroke across the bump and a touch down, away from it. `LESSONS.md §Hands, §Paths and timing` — code
  rig: has it (`qa_checks` hands: the closest the two hands come, listed for a look).
- **One hand style and size for both hands** (an odd resting hand "stands out now vs everything else"). `LESSONS.md
  §Hands` — code rig: has it (both from `makeHand`; per-view sizes per PIPELINE lesson 8).
- **One hand scale per character, never per pose; the moving hand within ~10 % of the resting hand.** `LESSONS.md
  §Hands` — code rig: has it by construction (one `makeHand` spec per side); `qa_checks` prints the far/near ratio
  but doesn't gate it.
- **Never steer the hand on its own or swap hand drawings.** Turned up to 90° from its forearm = a cut-out on a pin;
  swapped drawings (any number of in-betweens, cut or crossfaded) read as swaps, crossfades as ghost hands. `LESSONS.md
  §Hands` — code rig: partly (the hand rides the forearm inside the wrist's range; `spec.swaps` are still discrete).
  Conflict with PIPELINE lesson 3: reels evidence is stronger for swaps ON A MOVING hand (5.5–6.5 over eight rounds);
  the continuous wrap (`wrapW`) is the reels way. Prefer drawings that change continuously; time any swap where the hand
  is clear of the body.

### Face
- **Blinks: down in three frames, up slower with an ease-in-out;** over two frames they snapped, eased out the first
  open frame "snaps open". A blink can hide a change of gaze or lids (one on the look-up). `LESSONS.md §Face` — code
  rig: has it (`blink` close 3 / hold 1 / open 5, smoothstep); blink-on-a-change: unused.
- **Eyes opening after a long close: brows first, then the lids, like the end of a blink** over ~5–9 even frames (eased,
  "closed to open in one frame"; held half open, bored; slower, sleepy or smug). `LESSONS.md §Face`,
  `perform.js:161-164` — code rig: partly (face-sigh → face-relief over 15 f on one eased track; brows and lids keyed
  together, though `tracks` could time them apart).
- **Half-open lids are arches over the eye, and only while opening.** Held half-lowered on solid dark eyes they read
  smug or a stare; closed ◡ for looking down reads as eyes shut; a smile under lowered lids reads sly. `LESSONS.md
  §Face` — code rig: partly (critic R4 found mum2's half lids read wide open; check face-tender's 0.58 against this).
- **Looking down tenderly:** eyes ~0.5 open, pupils low and toward what she watches, the lid a little over the eye,
  inner brows lifted, a soft centred smile, the head bowed (dy) more than rolled; level pupils still read as looking at
  the camera. `LESSONS.md §Face` — code rig: has it (face-tender gaze low; n-look nods 16°).
- **The eyes lead a reach; the head goes toward the hand she watches,** tilting to where it lands only as it lands;
  following it while it still lay on her chest read as "side-eye". `perform.js:180-182,195-196` — code rig: partly
  (`face.gaze` is keyed per face pose; nothing ties it to the wrist).
- **The gulp in two beats:** cheeks fill (the blush swells) for a few frames, then the swallow — a short curve on the
  throat that appears, dips and goes, the head dips and the chin pulls back 3–4 px, brows pinch. A dip alone read as a
  nod. The version the client liked heaved ~17 px up, then tucked ~29 px over ~0.5 s: measure against what was liked.
  `LESSONS.md §Face, §Performance`, `perform.js:107-117,145-147` — code rig: partly (chin dip and `fx.headPitch` fidget;
  no throat line, no cheek fill).
- **Every face preset carries every key** (a preset missing `puff` blended to NaN), **the mouth hidden under a hand comes
  back at full size, not as a dot**, and **pupils show from nearly shut** (at 12 % open they popped in). `LESSONS.md
  §Face` — code rig: partly (`FACE_DEFAULT` fills missing keys; mouth size and pupil threshold unchecked).
- **Never warp the face outline for puffed cheeks** (read as "badly rigged"), and don't move painted features with an
  expression (the blush lifted with the smile showed a dark crescent). `LESSONS.md §Face, §Performance` — code rig: has
  it (only the nod warps the head).
- **The "o" grows from a pursed line at the line's size** (lips purse to a third first), ≥ 17×20 px at full (12 px read
  as a dot); a soft smile drawn centred (off-centre under a tilted head: a smirk). `LESSONS.md §Face, §Performance` —
  code rig: partly (mouth shapes blend with equal point counts; size and purse step unchecked).

### Timing and easing
- **Time the film from the breath, not the breath from the film.** A deep breath is ~1.3 s in (an even sine: a cubic
  barely moved for its first 0.4 s), ~0.25 s held, ~1.7 s out (quick then slow); 0.6 s in / 0.75 s out read as a huff
  (client: "very quick, rather than a deep inhale/exhale"). `LESSONS.md §Performance`, `perform.js:33-39` — code rig:
  partly (1.3 s in, 1.9 s out, PIPELINE §3; no hold: n-inhale 5.0 → n-exhale 6.9; the `breath` ease is a cubic).
- **Beats of different lengths; the relief beat longer than the move into it.** Two equal 24-frame moves made relief and
  tenderness feel alike; fast out, slow in (`skew`), not one even ease for every move; 0.45 s off the mouth was rushed.
  A/B: better. `perform.js:27-28` — code rig: has it (lift 0.8 s, lowering 1.1 s, `skew`; also PIPELINE lesson 2).
- **Ease every added motion in (sin², not sin):** a finger curl starting at speed mid-move read as a hitch. `LESSONS.md
  §Performance` — code rig: has it (fidgets ½(1−cos), `bias` windows sin²).
- **A hold that eases out must overlap the next move's start;** ending exactly as the move began left a two-frame dead
  stop. `LESSONS.md §Face` — code rig: partly (breakdown keys pass through; a plain key stops at zero speed: find dead
  stops with `--tracks-only`).
- **Waypoints go sideways to the travel; no bumps against it** (`push` / `arc` slowed the hand mid-move: a hitch); a bow
  far out off the face flicked out and back; the elbow's swing runs on the wrist's clock (also PIPELINE lesson 18).
  Measure every route: one speed hump, the forearm ≥ half its length on screen, no contact with the other hand.
  `LESSONS.md §Paths and timing` — code rig: has it (vias, min-jerk on the whole move, `--tracks-only`); forearm-length
  and hand-contact checks: not yet.

### Review
- **Blind every round: a fresh reviewer, relabelled clips, not told what changed.** Reviewers differ by ~1 point, so
  look for agreement across rounds. `LESSONS.md §Process` — code rig: partly (critic F is fresh each round but sees the
  brief and past flags; no relabelled A/B).
- **Put every principles-driven change through a blind A/B.** Lasseter's 11 principles (a score and a fix each) found
  timing, anticipation and staging faults the rubric missed, and its top changes won the A/B for both characters (7 vs
  6.5); its one miss (shrink the gulp: "barely registers" on a phone) would have shipped without it. `LESSONS.md
  §Performance`, LEDGER §Review — code rig: has it (`critic_F.py --lens lasseter`, `blind_ab.py`).
- **A panel of three lenses:** overall rubric, Lasseter, hands (with measurements). Check every claim on the frames
  before acting: several were wrong (blinks, cheek lift, sizes; "upper arm widens 25–30 %"). LEDGER §Review — code rig:
  has it (`critic_F.py --lens all`: feel, Lasseter, hands, one fresh reviewer each; critic C as lint).
- **When to stop: every rubric category ≥ 7 and the overall ≥ 7, judged by agreement across rounds** (one reviewer's 7
  is noise; two rounds agreeing is a result). LEDGER §Review — code rig: has it as the rule; the scores come from
  critic_F's lenses (Lasseter and hands score per category; feel says READY / NOT YET).
- **The client's eye overrules a reviewer, so get it early.** Three client notes on the hands found more than eight
  blind rounds had. A question from the client is a question: answer it and ask before changing anything (the gulp was
  shrunk on "was it meant to be…?" and had to be put back). `LESSONS.md §Hands, §Performance` — also PIPELINE lesson 16.
- **Check every detail close up, at every pose,** with tiles that follow the joints (shoulder, elbow, wrist, fingers,
  thumb, contact, cuff, face): the client spotted crinkled fingers at phone size. `LESSONS.md §Process, §Tools`
  (`closeups.py`) — code rig: partly (`zoom_tour.py`, `detail_audit.py`, `corner_audit.py` on stills; no joint-following
  close-ups of a shot). When a fault's cause isn't obvious, recolour one layer at a time: it found the "kite" lines in
  one look after several blind guesses (code rig: `parts_dump.mjs` lists parts; no recolour view).
- **Determinism, tested hard:** frames rendered out of order at their exact times (`repr(i / FPS)`: 6-place rounding
  moved an edge 0.1 px), markup identical alone vs after its predecessors (a stroke width set in one frame leaked into
  later ones), and a jump check against the mean of the neighbours that exist. `LESSONS.md §Determinism, §Tools` — code
  rig: partly (`char_anim --verify k` re-renders every k-th frame; no out-of-order or markup check).

### Drawing a continuous limb
- **Why one continuous limb.** Whole posed drawings swapped (`kits/figure`) and drawn pieces with swapped hands stopped
  at 5.5–6.5 over eight rounds ("pins", "cut-out on a pin", "swapped"); ~28 more drawings per character only moved where
  the swap showed; one drawing bent along its bones reached 7–8 ("one model 8"). Live2D, Spine and Harmony agree: one
  drawing per part, deformed continuously; shape changes are keyforms, never cuts. `LESSONS.md §The big picture` — code
  rig: has it (one bendy sleeve, PIPELINE lesson 4; the hand is one generated drawing posed by its finger bones).
- **Bend over a zone, not a point:** the outside sweeps round, the inside folds into a crease; the forearm a little
  narrower than the upper arm with a tighter elbow zone (an even tube bent tight ballooned). Foreshortening is scaling
  along the bone; the tube keeps its width. `LESSONS.md §The limb, §Elbow` — code rig: has it (filleted elbow, lesson 4;
  projected 3D arm, lesson 7).
- **Lines constant, hidden by overlap, never faded by bend angle** (fading read as lines popping on, as drawings
  swapping); draw a folded forearm again over the upper arm, or one outline shows the hidden edge ("kite" lines). A
  sleeve the colour of the top needs its edge the whole length, or only "a cuff floating over her" reads. `LESSONS.md
  §Line work, §Edges and layers` — code rig: has it (outlines masked to the visible material, lesson 17; the sleeve's
  `fade` is by distance, not angle).
- **Lines are tapered pen strokes** (round caps read as cut off, floating). A line through a tight joint keeps its
  longest stretch that doesn't double back and is cut where it turns > 100° within 18 px (else a Z or a hook); inside
  the elbow both edges stop short of the crease, outside they run round. `LESSONS.md §Line work, §Edges and layers` —
  code rig: partly (hand rims and creases are `taper()`; sleeve outlines are constant-width strokes).
- **Folds grow in length with the bend (width tied to length)** from ~25°, angled back toward the elbow from the V
  between the inner edges; widened only, they read as fading; straight off the edge, as scratches. `LESSONS.md §Line
  work` — code rig: has it for the near sleeve (`parts/arms.js` creases); none on the far sleeve.
- **Her top answers the arm:** as the elbow swings out, two tapered pull folds grow on her top from the armpit toward
  the bump, gone below a minimum size (a short fold is a speck). `LESSONS.md §Performance` — code rig: not yet.
- **An SVG clip goes on an unmoved group that holds the moved shape;** a clip on the moved shape travels with its own
  transform. `LESSONS.md §Edges and layers` — code rig: has it (every clip wraps the part in an untransformed `<g>`, and
  the clip shapes carry their own transforms: `engine/rig.js`).
- **Fingers are separate shapes:** drawn together a hand read as "a mitten with three stripes"; evenly fanned with the
  thumb parallel, as a fan; spread over the mouth, the mouth showed through. `LESSONS.md §Hands` — code rig: has it
  (fingers touch by construction, shade rims only where they overlap, `hand.js`).

## 1. Reference generation (fal.ai) — see `tools/fal_gen.py`, ledger in `characters/<c>/refs/ledger.jsonl`

### Scoreboard (mum2, nausea shot): what paid off and what did not

| Generated | Count | Used in the shot | What it bought |
|---|---|---|---|
| Key-pose STILLS (nano-banana edit) | 44 (8 keys × 3–5 samples) | all 8 keys, 1 sample each | the poses themselves (fitted, not invented); the hands; the missing DOFs (nod, fold) found by fit residuals |
| Whole-shot VIDEOS (text/image→video, 6 models) | 6 | 0 | nothing usable: wrong body, wrong staging, no control over beats |
| First→last-frame VIDEOS (5 models × 3 moves) | 15 | 3 | lift TIMING (fast off, cushioned in); the retch hit pose + head forward/down ratio; elbow/wrist landmarks for one retarget |

**Stills are the workhorse; video is a narrow measuring tool.** 18 of 21 videos went unused, and of the 3 used only the
timing of a fast move and one extreme pose survived to the end. Everything about SHAPE from video failed: the generated
body is built differently (the hand climbed her outline), the hand is too small to measure its turn, slow moves come
out as flick-then-drift. Stills keep identity, proportions and framing, so every number measured on them transfers.

### Rules
1. **A still for every pose the shot must hit — keys AND the breakdowns of every hand move** (2–3 per move: where the
   hand, wrist, elbow and fingers are a third and two thirds of the way). Fit each (`pose_est.py` → `fit_pose.mjs`)
   and use the fitted poses as reach vias. Paths, elbows and hand shapes then come from measurement, not from tuning
   bend/twist/bias numbers against the critic (six rounds R22–R27 of that oscillated without converging).
2. **Video only for TIMING of a fast or multi-part action** that cannot be keyed from experience — ONE model
   (seedance or kling o1 gave the best first→last-frame results), first and last frames = your own fitted key stills,
   one generation; take its speed profile, never its path. Skip video entirely for slow or simple moves: a designed
   minimum-jerk curve is better and free.
3. **Framing-locked prompts**: image 1 = the character sheet (identity, style), image 2 = the previous key (exact size
   and position in frame). Without image 2 the figure drifts in scale and position between keys and fits disagree.
4. **Name hands by picture side, not near/far** ("the hand on the right of the picture"): the generator swapped near
   and far, and dropped the "other hand stays on the bump" in about half the samples. Generate 3, keep the one whose
   fit residual is lowest and whose contacts are right; a hand that is wrong in the still is fixed in the fit (pin it).
5. **Fit residuals are a probe**: a still the rig cannot match (rms > 0.06 H, joints on their limits) is telling you a
   DOF is missing — add it (lesson 11) rather than accepting the miss.

- **nano-banana edit** (`fal-ai/nano-banana/edit`) with the original character image as input and the prompt "Same
  character, same flat vector illustration style, same colours, same 3/4 view facing right, plain white background …
  Full body." keeps identity, palette and proportions very well (first try, 768×1344). It draws the far hand on the bump
  the way an illustrator would: only the fingers wrap round the far side, the wrist hidden behind the bump.

## 2. Rig and drawing

(see the big lessons; details accumulate here)
- Head NOD = a 2.5D warp of the head's drawing (`engine/warp.js`, ellipsoid lifted, turned about the ear axis,
  projected back); contacts on the head ride the warp. A flat rotation of a ¾ head reads as a roll.
- Trunk FOLD toward the camera = along-scale of chest and neck (`fit_pose --fold`), never the upper spine (it carries
  the bump, which must keep its size).
- The far hand wrapped round the bump is a REPLACEMENT drawing (`parts/wrap.js`) that grows continuously with how far
  round the hand is (`wrapW`); its cuff is cut away round the bump while wrapping.
- Far-arm draw order is automatic from the 3D depth proxies; a path can STATE front (`front`) or behind
  (`behindFrom`) where single-frame judgments flicker.
- Outline groups (same material over same material: sleeve over cardigan, hand over face) are masked to the VISIBLE
  material — never let a line run over skin that covers the cloth.

## 3. Motion

- Keyframes in angle space for the body; hand-space reaches for the hands; procedural breath/drift/springs as seasoning.
- Reach options worth knowing (engine/anim.js): stops/vias, `skew`, `handLag` (tapered: never late at the end),
  `limp` + `limpBend` (designed, by TIME so the wrist drops first), `reg` (pull the wrist scan toward the planned bend),
  `reach.holdReg` (a held hand keeps its fitted bend). Path moves add: torso-frame retarget (`uv/euv`), `elbowPath`,
  `bendAt` / `twistAt` / `rollAt` profiles (`'A'`/`'B'` = the contacts' own values), `front`, `behindFrom`, `bias`.
- Keys: `shift` per channel against `spec.lags` (overlap); `only` / `except` for channel-limited keys (a fingers-only key
  keeps a hand curled until contact); fx channels can be lagged by full name (`fx.headPitch`).
- Fidgets: out-and-back life; `fx.slide.<side>.x/y` slides a PINNED hand along its surface (a visible stroke — a thumb
  sweep alone was invisible at phone size).
- Gentle beat that the client accepted in direction (v14): cues at the mouth (hunch + swallow) → ONE deep breath in
  (≈1.3 s, shoulders and ribcage up, head lifts) → long breath out (≈1.9 s) → hand lowers (≈1.1 s) → loving hold with
  two slow strokes.
- Spasm/startle: all trunk links fire together (+1f), not as a wave; breaths and sighs are waves (ribcage +3,
  shoulders +5, neck/head +7).
- Timing that read right to the feel critic: reach to the mouth ≈0.7 s with a front-loaded bell; return ≈1 s
  (peel off, fall from the elbow with a limp wrist, unfold onto the bump); retch = 4–6f wind-up, 3–5f hit, 2f hold,
  release, smaller second hit; controlled breaths ≈1 s in / 1.3–1.5 s out.

## 4. Review loop

- Feel pack (`tools/critic_F.py`): whole-figure film strip at phone size, per-beat onion skin (silhouette + skin
  outlines, blue→red) with every frame, key moments large. No metrics.
- Maths pack (`tools/critic_C.py`, `review_pack.py`): contact sheet, strips, arcs, per-move travel, effective offsets.
