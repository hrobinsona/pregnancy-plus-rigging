# Tools index

Every tool has a usage line at the top of its file; run from the repo root. ★ = used in the current loop (see the skill, `.claude/skills/code-character-animation/SKILL.md`).

## Render and inspect (daily loop)
| Tool | What it's for |
|---|---|
| ★ `char_check.mjs <char>` | <1 s gate: the character loads, anchor contract holds (`--fix-anchors`). |
| ★ `char_anim.mjs --char c --anim a` | Render a shot → `out/frames/…` + `out/<c>_<a>.mp4`. `--from/--to` re-render a window; `--tracks-only` prints per-frame speeds (find pops); `--verify` checks determinism. |
| ★ `frame_at.mjs` | Single frames to PNG; `--mods JSON` overrides spec fields to isolate a layer. |
| ★ `frame_strip.py` | Strip of frames f0..f1 with a crop box — the way to *see* a move. |
| ★ `pose_probe.mjs` | A/B one channel (bone, `fx.*`, `scale.<bone>.<0\|1>`, `--add/--set`) at time t before keying it. |
| ★ `uv_check.mjs` | Where the far wrist and elbow actually go in the torso frame, per frame; `--poses a,b` gives the same for fitted poses, to compare stills with the shot. |
| ★ `anim_dump.mjs` | Channel values or body landmarks per frame ("lunge vs fold", "what pops at frame N"). |
| ★ `parts_dump.mjs` | Drawn parts of one frame: id, z, fill, stroke, clip — draw-order and bleed questions. |
| `char_still.mjs` | Render one pose to PNG (`--sil` for the silhouette). |
| `char_bounds.mjs`, `char_joints.mjs` | Posed bounds; joint positions in reference px (crop boxes). |
| `depth_view.mjs` | Debug view of the 2.5D depth proxies that decide far-arm draw order. |
| `hand_sheet.mjs` | Every hand-library pose on both hands, next to the reference's hands. |
| `video_strip.py`, `vstrip.py`, `zoom.py`, `zoom_tour.py` | Strips of reference videos; zoomed comparisons. |
| `serve.mjs` | Static server for `engine/view.html` (ES modules can't load from file://). |
| `render_anim.mjs`, `still.mjs` | Legacy renderers for the first, seated `mum`. |

## References (make, register, measure)
| Tool | What it's for |
|---|---|
| ★ `refgen.py <char> <name>` | Make reference stills with the Codex CLI on the ChatGPT login (image 1 sheet, 2 previous pose, 3 target), then register them. Runs where Codex is logged in (Harry's Mac). Tests: `test_refgen.py`. |
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
| ★ `fit_video.py` | Fit a tracked video segment frame by frame → `refs/tracks/vtrack_<seg>.json`. |
| ★ `vtrack_apply.mjs` | Turn video tracks into timeline data (path moves, timing) in place in the anim JSON. Re-run after spec edits. |
| ★ `pose_blend.py`, `pose_set.py` | Derive accents/in-betweens from FITTED poses (`--add/--set/--fx/--scale/--hand`). |
| ★ `plant_feet.mjs` | Foot lock for key poses. |
| `contact_pose.mjs` | A key whose hand rests on the body at a chosen spot (3D arm solved). |
| `char_ik.mjs`, `pose_tool.mjs` | Author poses from IK targets (offline, numeric). |
| `sil_fit.mjs`, `seg_ref.py`, `segment.py`, `sil_view.py` | Refine a fit against the reference's material silhouette. |
| `fit_overlay.py`, `fit_sheet.py` | Fit vs reference overlays — check a fit by eye. |
| `hand_fit.py`, `hand_lab.py` | Fit and audition hand shapes (build these early for a new character). |
| `measure_ref.py` | Measure a character-sheet image (proportions, palette) for a new character. |

## Review and audit
| Tool | What it's for |
|---|---|
| ★ `critic_F.py <char> <anim>` | Builds the feel-critic pack + prompt (brief, intensity, beats, zooms, refs). Pipe to `out/critic_prompt.md`, hand it to a subagent. |
| `critic_prompt_F.md` | The feel-critic template (B = design vs reference, C = motion mechanics, legacy). |
| ★ `anim_audit.py` | Bleed audit across frames: specks, slivers, gaps classed by surroundings → `out/<c>_<a>_bleed.{txt,png}`. |
| `detail_audit.py`, `corner_audit.py` | Single-pose drawing audits (thin slivers, broken corners). |
| `char_pose_sheet.py`, `pose_sheet.py` | Stress-pose sheets and silhouette tests for a rig. |
| `critic_B.py`, `critic_C.py`, `contact_sheet.py`, `review_pack.py/.sh`, `char_compare.py` | Older review packs (design and motion critics). |

## Design vs reference (first character era)
`align.py`, `metrics.py`, `sheet.py`, `profile_cmp.py`, `leg_gap.py`, `torso_cmp.sh`, `render_all.sh`, `spec_parts.mjs` — silhouette IoU, landmark error, palette ΔE, side-by-side crops. Useful again when building a new character from its sheet.

## Other
`edit.py` — batch exact-text replacements in a file, reporting misses.
