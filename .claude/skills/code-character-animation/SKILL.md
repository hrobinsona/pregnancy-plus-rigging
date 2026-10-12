---
name: code-character-animation
description: Build, rig and animate a code-drawn flat-vector character (pure-code SVG, every frame a pure function of t) to Headspace/BUCK quality from MEASURED reference stills. Use when extending Mum with new poses or shots, iterating a shot from client or critic feedback, or adding a new character in this repo.
---

# Code-drawn character animation

You are working in a repo where characters are parametric SVG rigs. Shots are timelines of fitted key poses, hand-space reaches and procedural life, rendered deterministically. The current character is **mum2**, a standing pregnant woman in ¾ view. The current shot is `characters/mum2/anims/nausea-to-belly.json`.

**Read first:**
- `CLAUDE.md` for the current status and next steps.
- `docs/PIPELINE.md` "0. The big lessons" and "1. Reference generation".
- `docs/REF_PROMPTS.md` before making any reference image.
- `tools/README.md` for the full tool index (★ = current loop).

## Non-negotiables

- **Pure code.** Every frame is a pure function of t. No state, no randomness without a seed, no iteration-to-tolerance. `char_anim --verify` checks determinism.
- **References are for measurement only.** Pose-estimate them and fit the rig to them; never trace, composite or draw them into a frame.
- **No linear easing.** Use min-jerk, cubic-bezier eases, Catmull-Rom with time knots, or breath curves.
- **Hands move in hand space** (`spec.reach`): stops, vias and paths. Never blend arm angles between distant poses; that swings the hand on a circle round the shoulder.
- **The client's brief and intensity win.** Put both in `spec.story` and `spec.intensity`; the feel critic sees them. Don't polish an extreme the client didn't ask for.
- **Secrets.** API keys live in `~/.secrets/` or the environment. Never put them in the repo, logs, docs or memory.

## The loop

1. **Brief.** Write the story beat by beat with times, and the intensity in one sentence. Agree it with the client before building.
2. **References: stills, not videos.**
   - Generate one still per key and **two in-betweens per hand move**, using the framing-locked prompts in `docs/REF_PROMPTS.md`. Any image tool works; Codex CLI / ChatGPT images is the user's default.
   - Make them with `tools/refgen.py <char> <name> --prompt-file … --ref sheet --ref prev --ref next -n 3` (Codex CLI on the ChatGPT login; runs on Harry's Mac, not in a cloud container). It registers them through `tools/ref_register.py`. Stills from any other tool: `tools/ref_register.py … --canvas WxH --est`.
   - Use video only to get the TIMING of a fast move: one model, one generation, its own key stills as first and last frame. Take its speed profile, never its path (`PIPELINE.md` §1 scoreboard: 18 of 21 videos were unused).
3. **Fit.** Run `node tools/fit_pose.mjs <char> refs/pose/<x>.json fit-<name> --base bump-rest [flags]`. Keep the sample with the lowest rms and correct contacts, and record the command in `refs/fit_keys.sh`.
   - If rms > 0.06 H or joints sit on their limits, a DOF is missing. Add it rather than accepting the miss: this is how the head nod (`fx.headPitch`, `engine/warp.js`) and the trunk fold (`--fold` scale DOFs) arrived.
4. **Derive.** Build accents and in-betweens from FITTED poses with `tools/pose_blend.py` and `tools/pose_set.py` (`--add/--set/--fx/--scale/--hand`). Then `tools/plant_feet.mjs`, all in `refs/derive_<shot>.sh`. Re-run the whole script after any change; it is the source of truth for derived poses.
5. **Timeline** (`anims/<shot>.json`):
   - `keys`: body poses with eases. `shift` per channel offsets a key against `spec.lags` for overlap. `only`/`except` restrict a key to some channels, e.g. a fingers-only key.
   - `reach.far`:
     - stops `{t, pose, on}`, plus vias `{via: true}` that are fitted in-betweens;
     - per-stop `limp`/`limpBend`, `skew`, `reg`, `front`;
     - path moves from `tools/vtrack_apply.mjs` (`spec.video`), options documented in `engine/anim.js` pathTarget.
   - `tracks.face`, `fidget` (out-and-back life: fingers, `fx.slide.near.*` strokes, swallows), `breath`, `swaps` (hand views), `pins` (planted near hand), `plantFeet: "ik"`.
6. **Render and measure** (see Commands). Check the per-frame speeds for pops before any review. Use `pose_probe` to A/B a DOF on one frame before keying it, and `uv_check` to see where the wrist and elbow actually go in the torso frame. For a fitted in-between, use its position (`uv_check --poses`) and a path `bias`, not its fitted twist (PIPELINE lesson 21).
7. **Review.**
   - Run `python3 tools/critic_F.py <char> <shot> > out/critic_prompt.md`. Then spawn a subagent with: *"Read out/critic_prompt.md and follow it exactly; open every image it lists; return the review."*
   - Log the round and "What was done" in `characters/<char>/feel_log_<shot>.md`.
   - Run `tools/anim_audit.py` for bleed (clothing showing through limbs and vice versa) and `tools/detail_audit.py` for single poses.
8. **Iterate.**
   - Fix what the client flags first.
   - Anchor every fix on a measurement or a reference.
   - **Explore, don't tune.** If two or three rounds only move a parameter back and forth (the critic oscillates: elbow out = "wing", in = "propped"; wrist 38° = "fist", 18° = "oath"), change the method. Add a fitted in-between still, a DOF or a drawing.

## Commands (repo root)

```sh
scripts/setup.sh                                                   # once: playwright, python deps, MediaPipe models
node tools/char_check.mjs mum2                                     # <1 s gate: loads, anchor contract
sh characters/mum2/refs/derive_nausea.sh                           # rebuild derived poses
node tools/vtrack_apply.mjs mum2 nausea-to-belly                   # re-apply video-derived data after spec edits
node tools/char_anim.mjs --char mum2 --anim nausea-to-belly        # render frames + mp4 (out/)
node tools/char_anim.mjs --char mum2 --anim nausea-to-belly --from 200 --to 250   # re-render a window
node tools/char_anim.mjs --char mum2 --anim nausea-to-belly --tracks-only         # per-frame speeds: find pops (>2× neighbours)
python3 tools/frame_strip.py out/frames/mum2_nausea-to-belly out/strip.png 200 250 --step 2 --box 380,150,1000,1050
node tools/pose_probe.mjs --anim nausea-to-belly --t 7.37 --vary hand.far=-40,0,40 --crop 450,250,1000,950
node tools/uv_check.mjs mum2 nausea-to-belly 7.0 8.1              # wrist/elbow in the torso frame, frame by frame
node tools/uv_check.mjs mum2 nausea-to-belly --poses fit-bf1,fit-bf2   # where fitted stills put them: compare, then bias the path
python3 tools/critic_F.py mum2 nausea-to-belly > out/critic_prompt.md
python3 tools/anim_audit.py mum2 nausea-to-belly --every 3        # bleed audit → out/mum2_nausea-to-belly_bleed.{txt,png}
node tools/parts_dump.mjs mum2 nausea-to-belly 10.0 "cuff|wrap"   # what is drawn where (id, z, fill, clip) at one frame
```

## Engine facts that bite

- **Sign conventions.**
  - Clavicle: + raises near, − raises far.
  - Legs: thigh +a, shin −2a, foot +a keeps the hips over the ankles.
  - Spine: chest + rounds forward.
  - Joint limits silently CLAMP keyed values; check the numbers on screen.
- **Lags and shifts.** `spec.lags` delays channels (`fx.headPitch` can be lagged by its full name). A key's `shift` offsets it per channel.
  - A convulsion leads with the shoulders and head (net 0), hips +1, knees +2.
  - Breaths and sighs are waves.
- **Held hands.**
  - A held contact keeps its fitted wrist bend (`reach.holdReg`).
  - A hand trails its wrist by `handLag × sin(πu)`, so it is never late at the end.
  - The limp wrist follows TIME, so the wrist drops first.
  - Pass `limpBend` to avoid the bend × twist scan, which flips branches.
- **Draw order of the far arm.** It is automatic from the 3D depth proxies. `front` states that a hand is in front; path `behindFrom` states that it is behind.
  - The wrap is continuous (`parts/wrap.js`, `wrapW`); the cuff is cut away round the bump while wrapping.
  - Outline groups are masked to the VISIBLE material, so no line runs over skin that covers it.
- **Elbow.** In path moves, `elbowPath: 'chord'` takes the elbow straight between its two contact positions, so the whole arm lowers.
  - Holding the elbow at a video's position makes the forearm swing round it like a clock hand.
  - With no target, the swivel interpolation can take the elbow out wide.
- **Measured motion.** `uv_check` (torso frame), `--tracks-only` (speeds) and `tools/anim_dump.mjs` (channels, head and hip positions) settle arguments: "lunge vs fold", "the head only drops".

## New character checklist

Copy mum2's structure: `character.js` (parts, roles, warps, outline groups, hand library), `params.js`, `parts/*.js`, depth proxies, `poses/hands/*`.

1. Start from a clean character sheet image. Measure it with `tools/measure_ref.py` and fit the rest pose. Make limb lengths left = right (rest art foreshortens).
2. Build the hands early, fitted (`tools/hand_fit.py`, `hand_lab.py`). Generic bending hands read as paws.
3. Prove the rig with stress poses (`char_pose_sheet.py`, `detail_audit.py`, `corner_audit.py`) before animating.
4. Then follow the loop above. Log every lesson in `docs/PIPELINE.md`.
