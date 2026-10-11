# DECISIONS — mum

1. **Pose = seated, facing screen-right (matches reference), not "standing, facing left" (Prompt A).** IoU/landmark metrics are only meaningful against the reference pose; `pose.facing:'left'` mirrors the whole rig at the root.
2. **Scope = rest pose only** (per Harry). Pose library (Phase 5), extra hand shapes (relaxed, lower-back) and expressions beyond `soft-smile`/`neutral` are deferred; anchor counts are fixed so they can be added without topology changes.
3. **Model units = reference px, origin at the measured ground point; H = 210 px.** Proportions are stored in H units; the rig emits paths in reference px so the `ref` frame render overlays the reference pixel-for-pixel with no resampling.
4. **Compare/metrics use the native `ref` frame render**, not the 1080×1920 still re-aligned by ground point: the "lowest row" ground-x estimate drifted ~8 px with sole shape and polluted IoU. The still is the same geometry scaled (character = 80% of 1920).
5. **Local frames are world-aligned at rest (cut-out convention).** Parts are authored as construction points in the bone's local space (pivot at 0,0); rest angles are metadata (joint→aim). Pose = rotations relative to rest.
6. **Shape language: soft-rounded**, no outlines; interior detail as tapered strokes in shade tokens (matches the reference's brush strokes).
7. **Landmark rule `seat`** changed from "lowest pixel" to "midpoint of the bottom 3 rows": the seat is a flat edge, so lowest-pixel x was arbitrary (same rule applied to reference and render).
8. **Near hand sits under the sleeve cuff (z 57.5 < 58)** so the wrist emerges from the cuff and has hidden overlap for wrist rotation; the far hand sits over its sleeve (matches the reference's convex wrist edge).
9. **Socks:** near toe and far heel kept ≥ 8 px apart — when they touched, the gap between the shins became an enclosed hole and the silhouette lost its negative space.
10. `tools/sheet.py` (Python/PIL) instead of `sheet.mjs`: compositing + XOR is simpler with numpy; `still.mjs` remains the only renderer.
11. **Critic conflicts are settled by measuring the reference**, not by the latest critic. Recorded cases:
    - neck shadow: R1 asked "thin at ear, thick at throat", R4 the reverse → measured: ~6 px at the ear growing to ~20 px at the throat (R1 kept).
    - near sleeve width: R3 "5–9 px too wide", R6 "7–8 px too narrow" → measured left edge row by row and fitted.
    - far strand: R1 "move out", R2 "move toward cheek" → measured runs per row and fitted.
    - far wrist: R1–R4 "cuff over the wrist", R5–R7 "wrist in front with forearm" → reference shows the forearm skin IN FRONT of the sleeve with a rounded end; built that way for both arms.
    - near-hand fingers: R2 "bend 20° down", R7 "stack horizontal like the reference" → reference has horizontal stacked fingers.
    - near cuff: R7 "concave cut", R8 "convex lip" → reference has neither: forearm skin sits in front of the sleeve.
12. **`skinLine` token added** (#b56645): the reference's finger creases and nose are darker than `skinShade`; measured as the stroke-core colour (darkest 10% of skin-shade pixels). The critic's suggested #a24a37 was darker than anything in the reference.
13. **Forearm skin is its own part on the forearm bone** (`forearm.*.skin`), with the hand pivoting at a real wrist — so a wrist bend cannot drag the forearm off the sleeve. Wrist pivots moved to the visible wrist (near 558,638; far 716,562); far elbow pivot sits where the forearm leaves the sleeve.
14. **Interior-hole metric added** (`metrics.txt`): `figure_mask` fills holes, so IoU could not see background gaps (R3 found a 467 px hole at the far hip). The only remaining hole is the bun loop's gap, which the reference also has (78 px there, 187 px here).
15. **Spec part table is generated from the rig** (`tools/spec_parts.mjs`) after a critic reviewed a stale z-order.
16. Shape fixes fitted to measured contours: hairline (row-wise face-edge), skull/bun top (column-wise), far hip notch, sock heel/instep, far forearm extent (skin max x 742 / y 602).
