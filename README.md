# Mum: code-drawn character animation

This repo holds parametric SVG characters, rigged and animated in code, for Pregnancy+ reels. Every frame is a pure function of t. Generated reference images are used only to measure poses and timing; nothing from them is drawn.

- **Character:** `characters/mum2`, a standing pregnant woman.
- **Shot:** `characters/mum2/anims/nausea-to-belly.json`.
- **Latest render:** `renders/`.

## Quick start

```sh
git clone https://github.com/hrobinsona/pregnancy-plus-rigging.git && cd pregnancy-plus-rigging
scripts/setup.sh                                                  # playwright + chromium, python deps, MediaPipe models
node tools/char_check.mjs mum2                                    # fast gate
node tools/char_anim.mjs --char mum2 --anim nausea-to-belly       # → out/mum2_nausea-to-belly.mp4
```

## Using a character in a reel
This is the only repo that rigs and animates characters. `pregnancy-plus-reels` (the article-to-video pipeline) has no
rig of its own: it serves a checkout of this repo at `/rigging/` and imports `engine/shot.js`, which loads a character
and a shot and returns its SVG for any t (usage in its header). A film needs the character and the shot to exist here
first; build them with the skill, then the reel places her in its set. Anything a reel needs from a character (a new
pose, shot, outfit or character) is made here.

## Docs
- `CLAUDE.md`: current status, rules and next steps (start here in Claude Code).
- `.claude/skills/code-character-animation/SKILL.md`: the workflow as a skill. Claude Code loads it from this folder.
- `docs/PIPELINE.md`: what worked, what didn't, and why. Includes the reference-generation scoreboard.
- `docs/REF_PROMPTS.md`: making and registering reference stills with any image tool (Codex CLI, fal, …).
- `tools/README.md`: index of every tool, grouped by stage.
- `characters/mum2/feel_log_nausea-to-belly.md`: every review round and client redirect, with what was done.

Reference videos (`characters/*/refs/videos/`) are not in git; only their fitted tracks (`refs/tracks/`) are. The pipeline needs only the tracks.

## Requirements
Node ≥ 20, Python ≥ 3.10, ffmpeg. The Python packages are in `requirements.txt`. The MediaPipe pose and hand models go in `models/`; `scripts/setup.sh` downloads them.
