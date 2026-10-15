# Mum: code-drawn character animation for Pregnancy+ reels

Rigged, code-drawn characters (parametric SVG, no traced pixels) animated to a Headspace/BUCK bar, for short vertical Pregnancy+ article videos.

- **Character:** `characters/mum3`, a standing pregnant woman in near profile, facing right, designed for the rig (bare arms, sleeveless dress, far arm hidden).
- **Shot in progress:** `characters/mum3/anims/breathe-stroke.json` (12 s loop, 30 fps).
- **New view in progress:** `characters/mum3q`, the same woman in ¾ (turned ~43° toward us) on mum3's skeleton and palette, drawn from Harry's pick of the turnaround (`characters/mum3/refs/images/m3_view34_1.png`). Rest drawing done (IoU 0.969, stress poses `x-*` pass). First shot `characters/mum3q/anims/look-up.json` (8 s loop: she looks up from her bump to the viewer and smiles), latest `renders/mum3q_look-up_v29.mp4` (FROZEN 2026-10-14: Harry moved the rig to a side-on library first): both hands hold her bump as still q_k4_down_0 draws it, the far one draped over its top, the near one under it. Harry on v7 (2026-10-14): "a total mess… the wrong way round": it was. v1–v7 drew a RIGHT hand on her left arm (the far spec was a copy of the near one); v8 mirrored it, gated by `tools/handed.mjs` (lesson 53). v9–v11 measured the still's hand in its pixels and placed it by each fingertip (`hand_place.py --tips`), draped at the knuckles, kept through the breath (`keepPalm`), checked on the film (`tools/finger_angles.mjs`: within 2° of the still's) (lesson 54). v12–v13 drew the end-on wrist in the still's ORDER: over the hand's heel, behind the bump, one short arc (`endOn.front/cut/lines`, lesson 55); v13 is the first top hand to beat v7 blind (6.5 vs 6). v14 answers the natural lens on v13 by measuring each form on the still, not only its points: the top knuckle line slanted so the tips step, the look-down head tipped rather than bowed, the bump's front on the master's measured tangents, the lower hand overlaid on the still (`tools/mask_overlay.py`) and slimmed, its thumb longer (lesson 56); v14 beat v13 blind (6.5 vs 6). v15–v22 (each beat the one before blind, 6.5 vs 6, except v15–v16, v17 and v19, which lost and were dropped): the review packs now draw small moves at film size (`tools/motion_sheet.py`, `spec.handsBox`: the hands at 1:1 and what moved each second), so "frozen hands" can be checked; the look-down eye measured on the still (the white a sliver behind an iris pushed toward the bump, under the still's heavy lid, lesson 57); the cradling hand where the still puts it ON THE FILM, at its angle (QA `fingers`, `mask_overlay.py <char> <anim>@<t>`; it sat 26 px back and 6° steep, lesson 58); a softer contact shadow, the top hand's softer still. v23 lost blind (its eyes dropped first with a centred iris: "looking at us… coy"; its top-finger spreads flipped: "bunched"). v24 fixes the lower fingers' "rake" at 3–4 s: a knuckle bend on a hand seen palm-on flattens and lengthens its fingers, so it cups with the whole hand and the end joints; QA `fingers` now checks the angles and the fan's shape every 0.5 s (lesson 59); a blind tie leaning v24. v25 draws the top wrist's line as the still's one short hook (a tie leaning v25). v26 slims the far upper arm's body side to the still's strip (beat v25 blind, 6.5 vs 6: "a slim wedge… lets the hand read as a hand"). v27 fitted the arm's outer edge to the still's at its frame (1.1 px, `mask_overlay.py --edge`) and lost blind: the lower shoulder hid the arm above her bust through the look up (lesson 61); v28 (the far shoulder raised as she looks up, fixing a sign slip found with `tools/bone_signs.mjs`) tied leaning v26. Open: the top hand's outer knob still reads "a mitten-like lump" past the bump, its fingers "parallel stripes"; v29 calms the lower hand to a resting cradle (beat v26 blind: "a resting cradle that is still alive"); still open there: the lower hand's slide up the bump at 2–3 s, the breath while she looks down; the top hand's life at phone size; the lower fingers at 6.5–7.5 s.
- **Story clips (mum3, for the Braxton Hicks story):** `characters/mum3/anims/sigh-look.json` (5 s: breathe-stroke's sigh into the look down at her bump, then a hold) and `ease-sway.json` (6 s: her weight sways from the back foot to the front, the bump settles, her eyes lift to the bag by the door and she smiles; the hips move, the feet stay planted with `plantFeetSink`, lesson 60). Renders `renders/mum3_sigh-look_v2.mp4` (v2 beat v1 blind: a front-loaded sigh, a slow eye-open, the hold on a breath out), `renders/mum3_ease-sway_v1.mp4` (ease-sway v2 lost blind: "the head bobs", lesson 60). And `breathe-open-neutral.json`: breathe-stroke's opening (0–3.35 s) with a neutral mouth for the story's hook, the body identical to 0.03 px (`tools/anim_compare.mjs`).
- **Side-on library (mum3, since 2026-10-14):** Harry: every side-on pose natural, "like a real woman, just illustrated in 2D", and a reproducible workflow to add poses and moves. Ten poses in `characters/mum3/poses/side/` (kneel, kneel-pick, all-fours, sit-chair, sit-ball, squat, lean-counter, walk-contact, walk-pass, walk-down), rebuilt from their stills by `characters/mum3/refs/fit_side.sh`; each breathes (`tools/side_loop.mjs` → `anims/side-<pose>-breathe.json`) and she walks (`tools/side_walk.mjs` → `anims/side-walk.json`). Reviewed by three fresh critics on Fable (`critic_F.py mum3 --side`: natural, body, craft) each round; scores and fixes in `characters/mum3/feel_log_side.md`, lessons 62–68. The bar is every lens ≥ 8 on every pose; Harry asked for a manual review with him after round 7 (2026-10-15). The library's shared drawing changes (legs, shoes, dress back) reach breathe-stroke too, so each is blind A/B'd on it.
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
  - Spawn a subagent per lens: "Read out/critic_prompt.md and follow it exactly…". **Every critic runs on Fable**
    (Harry, 2026-10-15): the Agent tool's `model: "fable"` (API id `claude-fable-5-1`), for every lens, the side-on pack
    and every blind A/B reviewer. If Fable is unavailable, say so in the feel log rather than silently using another model.
  - Check each change with `tools/blind_ab.py` against the previous version (one fresh reviewer, then `--reveal`).
  - Log the round in `characters/<char>/feel_log_<anim>.md`.
- **Taste.** The client's brief and intensity (`spec.story`, `spec.intensity`) beat the critic's taste. Explore, don't tune (`PIPELINE.md` lesson 15).

## Status (2026-10-12): mum3 v5, the first shot of the new character
mum2's worst faults were structural to a cut-out rig (a flat hand flipping toward the camera, sleeves pivoting over joints, a weak master), so Harry chose a fresh character designed for the rig, run through the whole workflow on a simple first shot. Latest render: `renders/mum3_breathe-stroke_v5.mp4`. Each version won a blind A/B against the one before (v2 over v1 6.5 vs 4; v3 over v2 6.5 vs 6; v4 over v3 6.5 vs 6; v5 over v4 6.5 vs 6). Round 3 reviewers on v3: Lasseter 6.7/10, hands 6/10, feel "not yet"; v4 answers their asks (feel log). New in the engine with v4: wrist flexion and `lie` (the palm lies on the bump and keeps its size, PIPELINE lesson 37), no ticks at holds (lesson 38). v5 answers Harry's notes on v3: the arm no longer shrinks as it moves (the wrist lies on the bump, every arm segment drawn at 93–100% of its length; QA now gates it, lesson 39), the resting hand follows the bump like the stills (thumb out, fingers fanned, tips along the outline, lesson 40), and the ankles run smoothly into the instep (lesson 41).

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
2. From the last A/B: the stroking hand still moves as one rigid piece, its fingers a little comb-like at the stroke top (9.0 s); the chest and bump outline barely change on the breath; the hand stops dead at her side. Drawing: a step where the forearm's underside meets the heel of the hand; the strap's inner edge notches at extreme poses.
3. Harry chose a ¾ view next (2026-10-12): `mum3q` (lessons 42–47). Its first shot, look-up, is at v24: the top hand is her left hand, fitted to the still's fingertips, its wrist drawn in the still's order, each form measured on the still, both hands where the still puts them on the film and keeping their shape between the keys (lessons 53–59). Next: the top wrist's mass, the top hand's life, the lower fingers at 6.5–7.5 s; then foreshortening cues and hand views, proven on mum2's palm flip.
4. Point the reels article-video skill at this repo for figures.

**mum2 (paused at v17):** `renders/mum2_nausea-to-belly_v17.mp4`. Open there: the palm flip at 7.50–7.63 s (the hand points at the camera; three cures lost blind A/Bs, lesson 24); the far cuff swelling at 7.77–7.83 s; Harry has not yet given timestamps for the bleed he saw. Details in `characters/mum2/feel_log_nausea-to-belly.md`.

## Layout
- `engine/`: rig (`rig.js`), animation (`anim.js`: keys, reaches, paths, pins, breath, fidgets, foot IK), depth proxies and 3D arm (`depth.js`), head nod warp (`warp.js`), hands (`hand.js`, `handlib.js`), `view.html`.
- `characters/mum3/` (and the same layout in `mum2/` and `mum3q/`; `mum3q` adds `ref/face.png` from `face_measure.py` and the stress poses `poses/x-*`):
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
