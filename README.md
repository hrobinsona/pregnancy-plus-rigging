# mum: code-drawn character, rest pose

A seated pregnant woman, drawn as a parametric SVG rig with no traced pixels. The pose matches `characters/mum/ref/reference.png`.

## Commands (run from this folder)
- **Render the still:** `node tools/still.mjs` writes `out/mum_rest.png` (1080×1920, figure at 80% of the height).
  - Add `--frame ref --out out/mum_rest_ref.png` to render in the reference's pixel frame instead (1254×1254, origin at the ground point).
  - Add `--bones '{"head":10}'` to rotate bones.
  - Add `--facing left` to mirror the character.
- **One review round:** `tools/render_all.sh` renders both frames, rebuilds the spec's part table, and writes `out/mum_compare.png` and `out/metrics.txt`.
- **Tests:** `node characters/mum/tests/run.mjs` runs three checks:
  - determinism: the PNG hash and `toSVG` output are identical across runs;
  - anchor counts stay constant across 47 poses and variants;
  - the joint disc stays covered at every bone's min and max.
- **Re-measure the reference:** `cd tools && python3 measure_ref.py` writes `ref/measurements.json` and `ref/annotated.png`.

Playwright resolves from `node_modules/playwright`, which is a symlink to an existing install; on another machine run `npm i -D playwright@1.56.0`. The Python tools need numpy, scipy, scikit-image, scikit-learn and Pillow.

## Files
- `characters/mum/`:
  - `palette.js`, `proportions.js`, `skeleton.js`, `rig.js`, `geom.js`, `parts/*.js`, `poses/rest.json`, `sheet.html`;
  - `spec.md`, `DECISIONS.md`, `REVIEW_LOG.md`.
- `tools/`: `still.mjs`, `serve.mjs`, `measure_ref.py`, `segment.py`, `sheet.py`, `metrics.py`, `spec_parts.mjs`, `render_all.sh`.

In the browser, `window.renderAt(t)` is a pure function of `t`. In Node, `toSVG(pose, opts)` from `rig.js` returns the SVG string.
