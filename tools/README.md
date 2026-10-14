# Tools index

Every tool has a usage line at the top of its file; run from the repo root. ★ = used in the current loop (see the skill, `.claude/skills/code-character-animation/SKILL.md`).

## Render and inspect (daily loop)
| Tool | What it's for |
|---|---|
| ★ `char_check.mjs <char>` | <1 s gate: the character loads, anchor contract holds (`--fix-anchors`), every hand the right way round in every pose (handedness, below). |
| `handed.mjs` | Handedness (lesson 53): per hand, the side its 3D arm puts the thumb (arm3's radial direction, `a3.gcam`) against the side the drawing puts the index knuckle; says whether to flip the spec's `thumbSide` (the other hand's copy) or swap in a drawing of the other face. Used by `char_check` (every pose) and `qa_checks` handed (every frame); exceptions with a reason in `C.qa.handed`. |
| ★ `char_anim.mjs --char c --anim a` | Render a shot → `out/frames/…` + `out/<c>_<a>.mp4`. `--from/--to` re-render a window; `--tracks-only` prints per-frame speeds (find pops); `--verify` checks determinism. |
| ★ `frame_at.mjs` | Single frames to PNG; `--mods JSON` overrides spec fields to isolate a layer. |
| ★ `frame_strip.py` | Strip of frames f0..f1 with a crop box — the way to *see* a move. |
| ★ `pose_probe.mjs` | A/B one channel (bone, `fx.*`, `scale.<bone>.<0\|1>`, `--add/--set`) at time t before keying it. |
| ★ `uv_check.mjs` | Where a wrist and elbow actually go in the torso frame, per frame (side `far` by default, or `near`); `--poses a,b` gives the same for fitted poses, to compare stills with the shot. For a profile character u is the spine's forward normal (both axes in shoulder-to-hip lengths). |
| ★ `anim_dump.mjs` | Channel values or body landmarks per frame ("lunge vs fold", "what pops at frame N"). |
| ★ `parts_dump.mjs` | Drawn parts of one frame: id, z, fill, stroke, clip — draw-order and bleed questions. |
| `char_still.mjs` | Render one pose to PNG (`--sil` for the silhouette). |
| `still_server.mjs --char <c> [--box …] [--hand-style JSON]` | The same render for search loops: one browser, one JSON line per still on stdin (`{pose, out}` → `ok`). Used by `hand_place.py` and `hand_shapes.py` (`--hand-style`: a hand drawing to try). |
| `char_bounds.mjs`, `char_joints.mjs` | Posed bounds; joint positions in reference px (crop boxes). |
| `depth_view.mjs` | Debug view of the 2.5D depth proxies that decide far-arm draw order. |
| `hand_sheet.mjs` | Every hand-library pose on both hands, next to the reference's hands. |
| `video_strip.py`, `vstrip.py`, `zoom.py`, `zoom_tour.py` | Strips of reference videos; zoomed comparisons. |
| `serve.mjs` | Static server for `engine/view.html` (ES modules can't load from file://). |
| `render_anim.mjs`, `still.mjs` | Legacy renderers for the first, seated `mum`. |

## References (make, register, measure)
| Tool | What it's for |
|---|---|
| ★ `new_pose.py gen\|fit <char> <name>` | Recipe "new pose": refgen 3 samples (Mac), then pose-estimate, fit each, keep the lowest rms, gate (rms ≤ 0.06 H, no bone on a limit), record in `refs/fit_keys.sh`, sheet `out/new_pose_<name>.png`. |
| `new_char.py <id> [--from mum3]` | Recipe "new character": scaffold a character from a template (drawing code, hand library, base poses, refs folders) and print the next steps. Template mum3 (profile, bare arms) by default. |
| `master_measure.py <id> <master.png>` | Measure a new master drawing: palette (named materials), MediaPipe joints, named profile points, torso stations, limb widths, both hands → `ref/landmarks.json` + `ref/measure.png` (look at every point). A ¾ or front master has no profile on its face's edge: those points are left out, measure the face with `face_measure.py`. |
| ★ `refgen.py <char> <name>` | Make reference stills with the Codex CLI on the ChatGPT login (image 1 sheet, 2 previous pose, 3 target), then register them. Runs where Codex is logged in (Harry's Mac). Tests: `test_refgen.py`. |
| ★ `refgen_worker.py --install\|--status` | Unattended refgen on Harry's Mac: launchd polls `claude/*` branches for `requests/refgen/<name>.json`, generates via Codex (ChatGPT login), pushes the stills and `requests/refgen/done/<name>.json`. Runs a pinned copy; no image budget. See `docs/REF_PROMPTS.md`. |
| ★ `ref_match.py <char> <anim> [--pair T=STILL]` | Each key of a rendered shot next to the reference stills named in its notes: whole figure, head, hands and bump, feet at the same crop. The standard for SHAPE (the fit only meets a few points). Feeds `critic_F.py --lens natural`. |
| ★ `ref_register.py` | Bring in stills from ANY image tool (Codex CLI / ChatGPT, fal, …): copies to `refs/images/`, writes the ledger, `--est` runs pose estimation. |
| ★ `pose_est.py` | MediaPipe body + hands landmarks for an image or video (models in `$MUM_MODELS`, `models/` or `~/models`). |
| `fal_gen.py`, `fal_batch.py` | fal.ai stills (and video) with a provenance ledger. Key from `~/.secrets/fal_key` or `$FAL_KEY` — never commit it. |
| `fal_video_batch.py`, `fal_video_fl.py` | Video references, first→last frame. Use sparingly: timing only (`docs/PIPELINE.md` §1 scoreboard). |
| `track_analyse.py` | Motion facts from a tracked reference video (speed profile, hand path). |
| `ref_sheet.py` | Labelled contact sheet of reference images (pick the best sample). |

## Fit and derive (poses)
| Tool | What it's for |
|---|---|
| ★ `fit_pose.mjs` | Fit the rig to a still's measured landmarks → `poses/fit-*.json`. Check rms and joint limits. |
| `head_pose.py <char> --fit <name>` | A ¾ or front HEAD on a fitted pose: keeps the body fit, sets the nod (`fx.headPitch`), neck and head rolls so a render's head pitch, roll and face centre match the still's (MediaPipe's face matrix). `head_pose.py <char> <img...>` prints each image's head angles vs the master. Run after `fit_pose` on every turned-face key (`fit_keys.sh`). |
| `hand_place.py <char> --fit <name> --side far --keys wx,wy[,kx,ky],tx,ty [--tips x1,y1,…,x4,y4] [--hand <shape>] [--hide arm/upper/none] [--fore x,y] [--elbow x,y] [--hand-len 0.85] [--palm-down 0.55] [--zbias arm.far.hand=40] [--natural --slack 10 --restarts 60] [--seed …]` | Place a hand on the still's points measured on it (wrist, middle knuckle, fingertip centroid; `--tips` each fingertip, index → little, so the hand can't roll about the centroid, lesson 54): solves the arm (`hand_keys.mjs`) so the hand lands on them. `--hide arm` keeps the arm's edges inside her silhouette (a forearm hidden behind the bump), `--hide none` draws the arm the still shows (`--fore` a point on the forearm, `--elbow` where the still shows the elbow). `--hand <shape>`: place WITH the shape that will be drawn, picked first with `hand_shapes.py`. `--hand-len 0.85`: the hand drawn nearly unforeshortened, as an illustration draws a resting hand (at 0.68 it read as a mitten). `--palm-down 0.55`: a hand on top of the bump faces down onto it, so its curl bends the fingers down over the dome on screen. `--natural` requires an arm a body can make (hanging, elbow at her side, back of the hand to us, joints clear of their limits). Writes the arm into `fit-<name>` (the note keeps one summary per side), check image `out/hand_place_<name>.png`. Record the command in `fit_keys.sh` (lessons 48, 49, 51). |
| ★ `hand_shapes.py <char> <pose> --still <name> --side far --region fx0,fy0,fx1,fy1 [--shapes a,b] [--try JSON] [--bones JSON] [--face JSON] [--fx JSON]` | Pick a hand (or eye) SHAPE and its DRAWING side by side with the still's: the key rendered once per candidate (library names, inline entries, or `"style"` overrides of the hand spec: line weight `rim`, `taper`, `tipK`…), cropped to the same figure-relative region as the still, tiled after it → `out/hand_shapes_<pose>_<side>.png`. Do it BEFORE `hand_place.py` (lessons 51–52). |
| `hand_keys.mjs` | `hand_place.py`'s solver (node, no rendering): arm bones for a hand on two or three still points, the arm's edges kept inside a silhouette, optionally a natural 3D arm from random restarts. |
| ★ `fit_video.py` | Fit a tracked video segment frame by frame → `refs/tracks/vtrack_<seg>.json`. |
| ★ `vtrack_apply.mjs` | Turn video tracks into timeline data (path moves, timing) in place in the anim JSON. Re-run after spec edits. |
| ★ `pose_blend.py`, `pose_set.py` | Derive accents/in-betweens from FITTED poses (`--add/--set/--fx/--scale/--hand`). |
| ★ `plant_feet.mjs` | Foot lock for key poses. |
| `contact_pose.mjs` | A key whose hand rests on the body at a chosen spot (3D arm solved). |
| `char_ik.mjs`, `pose_tool.mjs` | Author poses from IK targets (offline, numeric). |
| `sil_fit.mjs`, `seg_ref.py`, `segment.py`, `sil_view.py` | Refine a fit against the reference's material silhouette. |
| `fit_overlay.py`, `fit_sheet.py` | Fit vs reference overlays — check a fit by eye. |
| `hand_fit.py`, `hand_lab.py` | Fit and audition hand shapes (build these early for a new character). `hand_fit` skips a hand the character hides by design. |
| `face_measure.py <id> [--k 3]` | Measure a ¾ or front FACE after `master_measure.py`: MediaPipe's face landmarker on a 3× crop finds each feature, then the drawing's own blobs give its shape (eyes as ellipses with catch-lights, brows and mouth as 5 stations with widths, ear, nose tip/bridge, chin, the face's far edge row by row, the hairline in 9 columns) → `face` in `ref/landmarks.json` + `ref/face.png` (look at it). |
| `measure_ref.py` | mum2's character-sheet measurer (its palette is wired to mum2); for a new master use `master_measure.py`. |

## Review and audit
| Tool | What it's for |
|---|---|
| ★ `qa_checks.mjs --char c --anim a [--box …]` | The QA gate (from reels): frames rendered out of order match, no state leaks (pose and SVG markup alone vs after every earlier frame), pixel jumps and still stretches (`qa_frames.py`), hands (palm pops, wrist angle one way per move, hands < 15 px apart, size ratio), alive (each hand moves ≥ 5 px on her in every 2 s: life a viewer sees on a phone; a deliberate hold goes in `spec.qa.still`), limbs (each 3D arm segment's drawn length; an elbow hopping > 6 px in a frame while its wrist holds), channels (every keyed track channel reaches the pose; a gated contact shadow draws while keyed on, lesson 52), handed (each hand the right way round in every frame, lesson 53). Exit 1 on a fail. |
| ★ `mask_overlay.py <char> <pose> --still <name> --box x0,y0,x1,y1 [--scale 5] [--rgb r,g,b] [--tol 45]` | One colour's mask (default skin) of a pose over its still in the same box of still px: grey both, RED only the still, BLUE only the render, with both areas → `out/mask_<pose>.png`. Run it on whatever a reviewer names before tuning: mum3q v13's lower hand looked like the still's side by side, yet overlaid its thumb was ~8 px short and its fingers fat (1682 → 1166 px after the fix, lesson 56). |
| ★ `finger_angles.mjs --char c --side far (--pose p \| --anim a [--t …\|--every s]) [--want a1,a2,a3,a4] [--tol 6]` | Each finger's screen angle and drawn length (knuckle → tip) on a key or on the shot's frames, against the still's angles measured on it (index → little). The key can match the still while the film doesn't: the breath flattened mum3q's draped fingers 5°, the squeeze curled them into a paw (lesson 54). Exit 1 if a sampled frame is off by more than `--tol`. |
| ★ `tip_check.mjs --char c --anim a [--t …] [--from … --to … --every …]` | Do a resting hand's fingertips end INSIDE her silhouette? Draws her without that arm and hand and walks each tip along its finger: + px inside, − px past the outline. Exit 1 if a tip on her is under `--min` (4) px inside. |
| `part_tint.mjs c a t out.png id=#col …` | One frame with chosen parts tinted, to see which part makes an edge, notch or sliver (pair with `parts_dump.mjs`). |
| `qa_frames.py <frames dir>` | Pixel jumps (> 1.8× neighbours) and still stretches > 1 s on a rendered frame folder. |
| ★ `qa_closeups.mjs --t a,b,c` | Close-ups that follow the joints (shoulders, elbows, hands, face) at chosen times: details at size. |
| ★ `critic_F.py <char> <anim>` | Builds the feel-critic pack + prompt (brief, intensity, beats, zooms, refs). Pipe to `out/critic_prompt.md`, hand it to a subagent. |
| `critic_F.py … --lens lasseter\|hands\|natural\|all` | Extra lenses (default `feel`). `lasseter`: the 12 principles, a score and a timed fix each (finds timing, anticipation, staging faults). `hands`: hands at size, from zoomed tiles of both hands at one scale + an angle/size trace (`out/<c>_<a>_feel_hands_*.png`, from the tracks json). `natural`: does she look like a real person holding herself as she would, judged against the reference stills (`ref_match.py` sheets) and every item of `docs/HARRY_EYE.md`; must say NATURAL: RIGHT before Harry sees a render. `all`: a judge panel, one prompt per lens in `out/critic_prompt_<lens>.md` (one fresh reviewer each), all four printed together. |
| `critic_prompt_F.md` | The critic template: one block per lens + the shared framing (Harry's eye overrules a reviewer; brief and intensity beat taste). B = design vs reference, C = motion mechanics, legacy. |
| `blind_ab.py <a.mp4> <b.mp4>` | Blind A/B: relabels two renders X/Y at random (secret in `<out>/key.json`), pair sheets at matched times + every frame of each, and `<out>/prompt.md` for a fresh reviewer not told what changed. `--t0/--t1` window, `--crop`, `--anim c/a` for the brief; `--reveal <out>` unblinds. Use it to test principle-driven changes before keeping them. |
| ★ `anim_audit.py` | Bleed audit across frames: specks, slivers, gaps classed by surroundings → `out/<c>_<a>_bleed.{txt,png}`. |
| `detail_audit.py`, `corner_audit.py` | Single-pose drawing audits (thin slivers, broken corners). |
| `char_pose_sheet.py`, `pose_sheet.py` | Stress-pose sheets and silhouette tests for a rig. |
| `critic_B.py`, `critic_C.py`, `contact_sheet.py`, `review_pack.py/.sh`, `char_compare.py` | Older review packs (design and motion critics). |

## Design vs reference (first character era)
`align.py`, `metrics.py`, `sheet.py`, `profile_cmp.py`, `leg_gap.py`, `torso_cmp.sh`, `render_all.sh`, `spec_parts.mjs` — silhouette IoU, landmark error, palette ΔE, side-by-side crops. Useful again when building a new character from its sheet.

## Other
`edit.py` — batch exact-text replacements in a file, reporting misses.
