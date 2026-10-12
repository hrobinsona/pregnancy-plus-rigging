# Mum: code-drawn character animation

This repo holds parametric SVG characters, rigged and animated in code, for Pregnancy+ reels. Every frame is a pure function of t. Generated reference images are used only to measure poses and timing; nothing from them is drawn.

- **Character:** `characters/mum2`, a standing pregnant woman.
- **Shot:** `characters/mum2/anims/nausea-to-belly.json`.
- **Latest render:** `renders/`.

## Quick start

```sh
scripts/setup.sh                                                  # playwright + chromium, python deps, MediaPipe models
node tools/char_check.mjs mum2                                    # fast gate
node tools/char_anim.mjs --char mum2 --anim nausea-to-belly       # → out/mum2_nausea-to-belly.mp4
```

## Docs
- `CLAUDE.md`: current status, rules and next steps (start here in Claude Code).
- `.claude/skills/code-character-animation/SKILL.md`: the workflow as a skill. Claude Code loads it from this folder.
- `docs/PIPELINE.md`: what worked, what didn't, and why. Includes the reference-generation scoreboard.
- `docs/REF_PROMPTS.md`: making and registering reference stills with any image tool (Codex CLI, fal, …).

## Requirements
Node ≥ 20, Python ≥ 3.10, ffmpeg. The Python packages are in `requirements.txt`. The MediaPipe pose and hand models go in `models/`; `scripts/setup.sh` downloads them.
