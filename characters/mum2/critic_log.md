# Critic B log — mum2 standing master
Scores: proportion / silhouette / shape / rig / palette / face&hands (1–5)

## R1 — 2/3/2/2/3/2 — NOT YET
Asked: shoulder caps as circles at the pivot; collars hugging the neck; pregnancy posture (lumbar, trunk back); separate abduction from flexion; hand spread fix; chain skinning on the torso; palette.

## R2 — 3/2/3/3/3/2 — NOT YET
Asked: stronger counter-lean; far arm clear of the bump; far leg splay; bigger hands; palette value ladder.

## R3 — 3/2/3/3/3/3 — NOT YET
Asked: negative space between far arm and bump; bigger hands with an opposed thumb in `open`; non-twin feet and leg wedge; value ladder; sock + bump-crescent cleanup.

## Between R3 and R4 (user review: "the bump looks so wrong — shape and position"; bar raised to BUCK/Headspace)
- Bump rebuilt: no longer an egg glued to the torso. The bump is the lower front torso (belly bone + 4×4 lattice): bust → notch → flatter upper slope → apex below mid-height → fuller lower curve → hem "smile" under it; bust overlaps it; cast shadow on the joggers under the hem; shade crescent clipped to the bump.
- Far cardigan panel now hangs behind the bust/bump; a lapel piece carries the edge above the bust.
- Chunkify pass: detail budget (no sleeve fold, cuff ribs, leg-cuff lines, sock seams); no hair flyaway; thicker face strands; fingers ≈ ¼ palm width, shorter, no creases, fanned so tips separate; longer near thumb.
- Crotch is a rounded arch (no notch); jaw shadow is a wedge clipped to the neck; neck extended under the ear (no gap).
- Legs refit from measured reference row extents: thighs nearly touch at the crotch and open as a narrow wedge (no parallel slot); far leg 0.94× near; near knee bulges inward. Joggers lightened (#9c7fb5). Far arm abduction -3, far leg splay -1.5.
- Hands 0.68 H / 0.63 H; one crease (≥0.025 H, clipped to its finger) separates the fingers.
- Engine: parts can `clip` to other parts; corner anchors take explicit handle angles.

## R4 — 3/2/3/4/4/4 — NOT YET
Asked: (HIGH) far-arm negative space so the bump is on the solid silhouette; bump as an egg (upperFull 0.85, apex lower, lowerFull 1.15, smooth roll-under at hemFront, softer top dip); root/thicken hair.loop and far strand tail; one curved + one straight side per leg (outer curves); shoulder lines inside the caps, lapel sharing the panel's edge.
Done: all five. Note on fix 1: measured, +5° could not clear the bump (in ¾ the bump projects past a hanging far arm), so the master is a rig A-pose: far arm abduction -12, extension -4, elbow 14; near arm +9 opens the near armpit. Far panel's outer edge pulled 0.1 H in.

## R5 — 4/3/3/4/4/4 — NOT YET (no HIGH items)
Asked: (med) leg wedge + one convex outer curve per leg (inner straight taper); (med) near armpit hairline + off-palette cast band; (med) far cardigan tab tucked under the bump with a rounded corner; (med) collars higher, far collar behind the throat; (low) near finger seam.
Done: all five. Legs verified numerically (tools/leg_gap.py): render gap 0.047 / 0.087 / 0.121 / 0.142 H at y −2.0 / −1.8 / −1.6 / −1.2 vs reference 0.047 / 0.092 / 0.111 / 0.158. cast.near is now opacity 1 and clipped to cardigan.near. Near arm +15. Far tab outer edge −0.12/−0.18 H, rounded. collarN/F y −0.13, shoulderLine[0] y −5.02. Near fingers 0.09.

## R6 — 4/4/4/4/4/4 — SHIP (no HIGH)
Polish asked and applied: shoulder lines end ON the cap circles with the cap tangent (one convex shoulder arc); back of skull runs under the bun (V and pinhole gone); far tab hem flares 0.07 H (no strap/parallels); socks toned down (#e0c079 / #cea155: no longer the lightest, most saturated mass); lapel spur rounded in.

## Between R6 and R7 (user: "the neck looks mega messed up — need more attention to detail")
Root cause: the critic only saw the 1080 still; construction faults hid at that size. Process fix: every round now gets a ZOOM TOUR (3–4× close-ups of every region) and an automated pixel AUDIT (pinholes, specks, thin spurs).
- Neck rebuilt: straight column (throat straight, nape one curve) + décolletage under the top; the visible neckline is the top's smooth U-scoop (no skin lobes); chin shadow follows the sampled jaw contour, deepest at the throat front.
- Audit fixes: frame fits the posed bounds (hands were cropped); hair pinhole at the bun; far strand clear of the face edge; cheeks clipped to the face, far cheek inside the contour; far lapel is a collar band ending above the bust with a rounded end; far panel hidden behind bust/bump (no pink shards/strips); bust rolls into the bump (no enclosed notch); scoop ends meet the cardigan/lapel at wide angles; shoulder lines slope down from the collar (no humps); bump shade and cast shadow sampled finely, cast is a crescent with a short tip; finger crease is a short straight round-capped line on the proximal segment; near thumb visible below the cuff; crotch arch softened.
