# Mum: code-drawn character animation for Pregnancy+ reels

Rigged, code-drawn characters (parametric SVG, no traced pixels) animated to a Headspace/BUCK bar, for short vertical Pregnancy+ article videos.

- **Character:** `characters/mum3`, a standing pregnant woman in near profile, facing right, designed for the rig (bare arms, sleeveless dress, far arm hidden).
- **Shot in progress:** `characters/mum3/anims/breathe-stroke.json` (12 s loop, 30 fps).
- **Paused:** `characters/mum2` (¾ view, the nausea shot, v17) is kept as a test bed. **Legacy:** `characters/mum` is the first, seated version.

**Use the skill:** `.claude/skills/code-character-animation/SKILL.md` holds the workflow, commands and gotchas. The lessons behind it are in `docs/PIPELINE.md`; how to make reference stills is in `docs/REF_PROMPTS.md`.

## Setup (once)
`scripts/setup.sh` installs:
- Playwright 1.56 with Chromium;
- the Python deps (`requirements.txt`);
- the MediaPipe models (into `models/`).

It also needs Node ≥ 20, Python ≥ 3.10 and ffmpeg. Smoke test: `node tools/char_check.mjs mum3`, then `node tools/char_anim.mjs --char mum3 --anim breathe-stroke`. The mp4 lands at `out/mum3_breathe-stroke.mp4`.

## Rules
- Every frame is a pure function of t. References are for MEASUREMENT only and are never drawn. No linear easing. Hands move in hand space.
- Reference images: Harry generates them with the **Codex CLI on his ChatGPT subscription**. `tools/refgen.py` runs Codex and registers the samples in one go; it needs Codex logged in, so it runs on his Mac (see `docs/REF_PROMPTS.md`). Cloud sessions don't need Harry: push a request to `requests/refgen/<name>.json` and the worker on his Mac (`tools/refgen_worker.py`, launchd) generates and pushes the stills within minutes.
  - fal.ai (`tools/fal_gen.py`) also works, with a funded key in `~/.secrets/fal_key` or `$FAL_KEY`. The balance ran out on 2026-10-12.
  - **Never commit, log or print API keys.**
- **Stills over videos.** One still per key plus two in-betweens per hand move. Video only for the timing of a fast move (`docs/PIPELINE.md` §1).
- **Git:** the repo is `github.com/hrobinsona/pregnancy-plus-rigging`, branch `main`. Commit each finished round and push it; Harry pulls from there. No more zips.
- **Review loop:**
  - Build the critic pack with `python3 tools/critic_F.py mum3 breathe-stroke --lens all` (three fresh reviewers: feel, Lasseter, hands).
  - Spawn a subagent per lens: "Read out/critic_prompt.md and follow it exactly…".
  - Check each change with `tools/blind_ab.py` against the previous version (one fresh reviewer, then `--reveal`).
  - Log the round in `characters/<char>/feel_log_<anim>.md`.
- **Taste.** The client's brief and intensity (`spec.story`, `spec.intensity`) beat the critic's taste. Explore, don't tune (`PIPELINE.md` lesson 15).

## Status (2026-10-12): mum3 v3, the first shot of the new character
mum2's worst faults were structural to a cut-out rig (a flat hand flipping toward the camera, sleeves pivoting over joints, a weak master), so Harry chose a fresh character designed for the rig, run through the whole workflow on a simple first shot. Latest render: `renders/mum3_breathe-stroke_v3.mp4`. Each version won a blind A/B against the one before (v2 over v1 6.5 vs 4; v3 over v2 6.5 vs 6; the final v3 over its first cut 6.5 vs 6). Round 2 reviewers on v2: Lasseter 6.5/10, hands 5/10, feel "not yet"; v3 answers their asks (feel log).

**Beat:**

| Time (s) | What happens |
|---|---|
| 0–1.05 | Calm, arm at her side, hand loosely curled |
| 1.05–2.3 | Hand to the lower front of the bump (joint-space lift, long soft arrival) |
| 2.3–2.75 | A little air out (the breath's anticipation) |
| 2.75–5.15 | Deep breath in: ribcage and shoulders rise 12 px, chin up, eyes close; the hand rides the bump; a short hold |
| 5.15–7.3 | Breath out as a sigh, settling a touch lower; a small smile |
| 7.3–7.85 | The settled smile holds; the eyes open onto the bump, the head follows |
| 7.85–10.4 | Strokes 58 px up the bump's front (fingers cupped) and slowly back down, heel leading |
| 10.35–11.9 | Head up; hand slides off and drifts down to her side |

**Next steps, in order** (feel log, round 2):
1. Fresh critics on v3 (`critic_F --lens all`); show Harry the render.
2. From the last A/B: the drop to her side is the fastest move (slow it), the stroking hand reads as a rigid mitt (finger and wrist life), the breath still reads mostly in the face. Drawing leftovers: the strap's inner edge notches at extreme poses; the hand drawing is shorter and blunter than the master (`hand_fit` IoU 0.74).
3. A second shot with mum3, then point the reels article-video skill at this repo for figures.

**mum2 (paused at v17):** `renders/mum2_nausea-to-belly_v17.mp4`. Open there: the palm flip at 7.50–7.63 s (the hand points at the camera; three cures lost blind A/Bs, lesson 24); the far cuff swelling at 7.77–7.83 s; Harry has not yet given timestamps for the bleed he saw. Details in `characters/mum2/feel_log_nausea-to-belly.md`.

## Layout
- `engine/`: rig (`rig.js`), animation (`anim.js`: keys, reaches, paths, pins, breath, fidgets, foot IK), depth proxies and 3D arm (`depth.js`), head nod warp (`warp.js`), hands (`hand.js`, `handlib.js`), `view.html`.
- `characters/mum3/` (and the same layout in `mum2/`):
  - `character.js`, `params.js` and `parts/`: the drawing; `ref/master.png` is the master illustration (measurement only).
  - `poses/`: fitted `fit-*`, derived `n-*` and face poses.
  - `anims/`: the shot timelines.
  - `refs/`:
    - `images` holds the generated stills (measurement only); `pose` holds their landmarks; `tracks` holds the video fits.
    - `fit_keys.sh` and `derive_breathe.sh` (mum2: `derive_nausea.sh`) rebuild every pose.
    - `ledger.jsonl` records the provenance of each reference.
  - `feel_log_*.md`: the review history.
- `tools/`: render, fit, derive, probe, audit and review-pack tools. Index: `tools/README.md`. Each has a usage line at the top.
- `docs/`: `PIPELINE.md` (lessons), `REF_PROMPTS.md`, `prompts/`, `research.md`.
- `renders/`: current deliverable videos. `out/`, `review/` and `models/` are generated and gitignored.
