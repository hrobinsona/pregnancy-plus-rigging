# Reference stills: how to make them, with any image tool

References are for **measurement only**. They are pose-estimated and the rig is fitted to them; nothing from them is ever drawn into a frame. Read `PIPELINE.md` §1 for what paid off: stills, yes; video, rarely.

## The tool doesn't matter, the inputs do

Any image model that takes **reference images plus a prompt** works: Codex CLI / ChatGPT images, fal `nano-banana/edit` (`tools/fal_gen.py`), or a designer. Every still is made from:

1. **Image 1: the character sheet.** For mum2 this is `characters/mum2/ref/standing_34.jpg`. It fixes identity, palette, proportions and style.
2. **Image 2: the previous pose in the move.** For a key, use the previous key. For an in-between, use the start of the move. It fixes the exact size and position in frame, so fits of neighbouring stills agree.
3. **Image 3 (in-betweens only): the pose the move ends on.** It tells the model where the motion goes.

Ask for **3 samples** at the same aspect as image 2 (mum2 keys are 768×1344). Plain white background, full body, head to feet.

## Prompt rules (learned the hard way)

- **Name hands by picture side, not near/far.** Write "the hand on the RIGHT of the picture". Near/far was swapped, and "the other hand stays on the bump" was dropped, in about half the samples.
- **Say what stays put** ("…stays on the lower front of the bump exactly as in image 2") and **what the wrist, fingers and elbow do**. Hand shape is the part that changes most between samples.
- Describe the moment, not the motion: "one third of the way: the hand is in front of her upper chest…".
- Keep the style sentence verbatim (see `docs/prompts/*.txt`).

## Registering what you generated

```sh
python3 tools/ref_register.py mum2 b_lower1 ~/Downloads/a.png ~/Downloads/b.png ~/Downloads/c.png \
  --provider codex --prompt-file docs/prompts/b_lower1.txt \
  --ref characters/mum2/ref/standing_34.jpg --ref characters/mum2/refs/images/k4_cover_v2_0.png \
  --ref characters/mum2/refs/images/k8_relief_v2_0.png --est
```

This copies the samples to `characters/mum2/refs/images/b_lower1_{0,1,2}.png`, appends the provenance to `refs/ledger.jsonl`, and pose-estimates each sample into `refs/pose/`.

Then fit each sample and keep the best:

```sh
F="--z arm.far.fore=55 --view far=back --order far.hand=front:jaw,far.fore=front:trunk"
node tools/fit_pose.mjs mum2 characters/mum2/refs/pose/b_lower1_0.json fit-b_lower1 --base bump-rest $F --hand far=relaxed
```

- **Picking a sample.** Keep the one with the lowest rms (printed) and correct contacts. Check it with `python3 tools/fit_sheet.py mum2 out/fit.png fit-b_lower1:characters/mum2/refs/images/b_lower1_0.png`.
- **Recording it.** Add the fit line to `characters/mum2/refs/fit_keys.sh` so the pipeline stays reproducible.
- **Using it as a waypoint.** Add `{"t": 0, "pose": "fit-b_lower1", "on": "chest", "via": true, "front": true}` to `spec.reach.far` between the move's two stops. The hand, wrist and elbow then pass through the measured in-between.

## Pending stills (next session)

| name | move | images 2 → 3 | why |
|---|---|---|---|
| `b_lower1`, `b_lower2` | hand mouth → bump (7.0–8.1 s) | `k4_cover_v2_0` → `k8_relief_v2_0` | replace the designed waypoint `n-fall-via`; a few frames still show fingers up (≈7.3–7.4 s) |
| `b_lift1`, `b_lift2` | hand bump → mouth (2.0–2.8 s) | `k1_calm_0` → `k4_cover_v2_0` | one loose curl the whole way; the mid-lift hand shape was tuned by hand for six rounds |

The prompts are in `docs/prompts/<name>.txt`.
