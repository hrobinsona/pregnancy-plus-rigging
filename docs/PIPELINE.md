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
6. **Lint the rig, not just the picture.** Hidden failures found the hard way:
   - joint limits silently CLAMP keyed values (clavicle ±10° ate every shrug for three rounds);
   - sign conventions differ per side (+ lowers the far clavicle);
   - normalised blend weights (`{lid: {open: 0.75}}` renders fully open);
   - per-key shifts that differ between neighbouring keys squeeze a channel's segment to 1 frame (a pop) —
     `makeAnim` now warns;
   - an IK tool that copies a whitelist of fields drops scale/fx.

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

## 3. Motion

- Keyframes in angle space for the body; hand-space reaches for the hands; procedural breath/drift/springs as seasoning.
- Spasm/startle: all trunk links fire together (+1f), not as a wave; breaths and sighs are waves (ribcage +3,
  shoulders +5, neck/head +7).
- Timing that read right to the feel critic: reach to the mouth ≈0.7 s with a front-loaded bell; return ≈1 s
  (peel off, fall from the elbow with a limp wrist, unfold onto the bump); retch = 4–6f wind-up, 3–5f hit, 2f hold,
  release, smaller second hit; controlled breaths ≈1 s in / 1.3–1.5 s out.

## 4. Review loop

- Feel pack (`tools/critic_F.py`): whole-figure film strip at phone size, per-beat onion skin (silhouette + skin
  outlines, blue→red) with every frame, key moments large. No metrics.
- Maths pack (`tools/critic_C.py`, `review_pack.py`): contact sheet, strips, arcs, per-move travel, effective offsets.
