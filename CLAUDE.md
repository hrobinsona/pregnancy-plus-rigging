# Mum: code-drawn character animation for Pregnancy+ reels

Rigged, code-drawn characters (parametric SVG, no traced pixels) animated to a Headspace/BUCK bar, for short vertical Pregnancy+ article videos.

- **Character:** `characters/mum2`, a standing pregnant woman in ¾ view, facing right.
- **Shot in progress:** `characters/mum2/anims/nausea-to-belly.json` (12 s loop, 30 fps).
- **Legacy:** `characters/mum` is the first, seated version.

**Use the skill:** `.claude/skills/code-character-animation/SKILL.md` holds the workflow, commands and gotchas. The lessons behind it are in `docs/PIPELINE.md`; how to make reference stills is in `docs/REF_PROMPTS.md`.

## Setup (once)
`scripts/setup.sh` installs:
- Playwright 1.56 with Chromium;
- the Python deps (`requirements.txt`);
- the MediaPipe models (into `models/`).

It also needs Node ≥ 20, Python ≥ 3.10 and ffmpeg. Smoke test: `node tools/char_check.mjs mum2`, then `node tools/char_anim.mjs --char mum2 --anim nausea-to-belly`. The mp4 lands at `out/mum2_nausea-to-belly.mp4`.

## Rules
- Every frame is a pure function of t. References are for MEASUREMENT only and are never drawn. No linear easing. Hands move in hand space.
- Reference images: Harry generates them with the **Codex CLI on his ChatGPT subscription**. Save the samples and register them with `tools/ref_register.py … --est` (see `docs/REF_PROMPTS.md`).
  - fal.ai (`tools/fal_gen.py`) also works, with a funded key in `~/.secrets/fal_key` or `$FAL_KEY`. The balance ran out on 2026-10-12.
  - **Never commit, log or print API keys.**
- **Stills over videos.** One still per key plus two in-betweens per hand move. Video only for the timing of a fast move (`docs/PIPELINE.md` §1).
- **Ask Harry before pushing to GitHub.**
- **Review loop:**
  - Build the critic pack with `python3 tools/critic_F.py mum2 nausea-to-belly > out/critic_prompt.md`.
  - Spawn a subagent: "Read out/critic_prompt.md and follow it exactly…".
  - Log the round in `characters/mum2/feel_log_nausea-to-belly.md`.
- **Taste.** The client's brief and intensity (`spec.story`, `spec.intensity`) beat the critic's taste. Explore, don't tune (`PIPELINE.md` lesson 15).

## Status (2026-10-12): v14c, the gentle version
Latest render: `renders/mum2_nausea-to-belly_v14c.mp4`. The earlier violent-retch version, `renders/…_v13f_retch-version.mp4`, is kept for reference only.

**Beat:**

| Time (s) | What happens |
|---|---|
| 0–1.1 | Calm; near thumb strokes the bump |
| 1.1–2.0 | Unease, swallow |
| 2.0–2.8 | Far hand to the mouth (video-timed path) |
| 2.8–3.7 | Nausea cues: hunch and swallow behind the hand |
| 3.7–5.0 | One deep breath in (fitted from two stills) |
| 5.0–6.9 | Long breath out |
| 7.0–8.1 | Hand lowers to the bump (designed via `n-fall-via`; elbow drops and tucks) |
| 8.1–12 | Both hands hold the bump; near hand strokes it twice; she looks down at it |

**Client flags:**
- Hand on the belly: fixed.
- Wrist angle, arm speed and stiffness, shoulders: better.
- Return path: better.
- "Too extreme, too fast" and "swinging at the elbow": addressed in v14 and awaiting the client's verdict.
- Bleed: clothing through limbs and vice versa.
  - Fixed: outline lines running over neck skin; the far cuff poking past the bump rim as a ragged tab.
  - Harry has not yet said where he saw bleed. Ask him for timestamps.

**Next steps, in order:**
1. **In-between stills, then fit them as vias.** Generate `b_lower1`, `b_lower2`, `b_lift1` and `b_lift2` (prompts in `docs/prompts/`). Fit them, then replace `n-fall-via` in `spec.reach.far` with the fitted lowering stills. Add the lift ones as vias, or as a path `bendAt`/`twistAt` replacement. Target: a few frames around 7.3–7.4 s still show fingers up, and the mid-lift hand shape was tuned by hand.
2. **Bleed.** Get Harry's timestamps, then run `tools/anim_audit.py` and fix. Most remaining audit hits are deliberate lines: cardigan creases, finger gaps in the wrap, the hair-bun hole.
3. **Feel critic on the gentle version.** The brief now carries the intensity.
4. **Hand-view library.** An edge-on hand and a loose curl seen from the back, as fitted replacement drawings. The generic hand reads as an "oath" or "fist" mid-move.
5. **Second character**, to prove the skill end to end.

## Layout
- `engine/`: rig (`rig.js`), animation (`anim.js`: keys, reaches, paths, pins, breath, fidgets, foot IK), depth proxies and 3D arm (`depth.js`), head nod warp (`warp.js`), hands (`hand.js`, `handlib.js`), `view.html`.
- `characters/mum2/`:
  - `character.js`, `params.js` and `parts/`: the drawing.
  - `poses/`: fitted `fit-*`, derived `n-*` and face poses.
  - `anims/`: the shot timelines.
  - `refs/`:
    - `images` holds the generated stills (measurement only); `pose` holds their landmarks; `tracks` holds the video fits.
    - `fit_keys.sh` and `derive_nausea.sh` rebuild every pose.
    - `ledger.jsonl` records the provenance of each reference.
  - `feel_log_*.md`: the review history.
- `tools/`: render, fit, derive, probe, audit and review-pack tools. Each has a usage line at the top.
- `docs/`: `PIPELINE.md` (lessons), `REF_PROMPTS.md`, `prompts/`, `research.md`.
- `renders/`: current deliverable videos. `out/`, `review/` and `models/` are generated and gitignored.
