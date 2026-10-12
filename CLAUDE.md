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

## Status (2026-10-12): mum3 v5, the first shot of the new character
mum2's worst faults were structural to a cut-out rig (a flat hand flipping toward the camera, sleeves pivoting over joints, a weak master), so Harry chose a fresh character designed for the rig, run through the whole workflow on a simple first shot. Latest render: `renders/mum3_breathe-stroke_v5.mp4`. Each version won a blind A/B against the one before (v2 over v1 6.5 vs 4; v3 over v2 6.5 vs 6; v4 over v3 6.5 vs 6). Round 3 reviewers on v3: Lasseter 6.7/10, hands 6/10, feel "not yet"; v4 answers their asks (feel log). New in the engine with v4: wrist flexion and `lie` (the palm lies on the bump and keeps its size, PIPELINE lesson 37), no ticks at holds (lesson 38). v5 answers Harry's notes on v3: the arm no longer shrinks as it moves (the wrist lies on the bump, every arm segment drawn at 93–100% of its length; QA now gates it, lesson 39), the resting hand follows the bump like the stills (thumb out, fingers fanned, tips along the outline, lesson 40), and the ankles run smoothly into the instep (lesson 41).

**Beat:**

| Time (s) | What happens |
|---|---|
| 0–1.05 | Calm, arm at her side, the hand in a loose graded curl |
| 1.05–2.3 | Hand to the lower front of the bump (joint-space lift, long soft arrival); the palm lies on it at full size, the arm full length, the elbow just behind her back |
| 2.3–2.8 | A little air out: the shoulders settle, the chin dips (the breath's anticipation) |
| 2.8–4.85 | Deep breath in: the eyes drift shut, ribcage and shoulders rise, chin up; the hand rides the bump; a short hold |
| 4.85–7.4 | Breath out as a sigh (fast release, long settle, a touch lower); lips part, then a small smile |
| 7.4–7.85 | The settled smile; the eyes open onto the bump, the head starts down |
| 7.85–10.35 | Strokes 53 px up the bump's front (pads curving over the dome), a short pause, back down with the heel leading |
| 10.3–11.95 | Head up through a breakdown, the soft eyes last; the hand peels off and drifts down to her side |

**Next steps, in order** (feel log, round 5):
1. Harry's eye on v5; fresh critics on v5 (`critic_F --lens all`).
2. From the last A/B: the stroking hand still moves as one rigid piece; the chest and bump outline barely change on the breath; the hand stops dead at her side. Drawing: a step where the forearm's underside meets the heel of the hand; the strap's inner edge notches at extreme poses.
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
