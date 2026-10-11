# mum: character spec (rest pose)

Pregnant woman, about 32–36 weeks. **Seated**, three-quarter view facing **screen-right**, both hands cupping the belly. The pose is matched to `ref/reference.png`. The rig's `facing: 'left'` flag mirrors the whole character. The reference is a visual target only; every part is redrawn as parametric cubic Bézier loops.

## Proportions (from `ref/measurements.json`)
- Head unit **H = 210 px** (skull top to chin). Seated figure height = **5.61 H** (1179 px). Origin is the ground point (sole of the near sock).
- Landmarks, measured in the reference with the same rules the metrics use:
  - Face: eyes at 0.92 H above the chin. Mouth width 0.20 H. Neck width 0.37 H.
  - Shoulder line 0.20 H below the chin. Neckline (scoop) 0.62 H below the chin.
  - Bust apex 0.78 H below the chin, at x +0.42 H from the neck.
  - Belly apex 1.52 H below the chin. It sits at the far-right extreme of the torso, low on the belly, in the lower third.
  - Belly bottom 1.81 H below the chin. Seat line 2.44 H below the chin.
  - Knees are level with the seat. Shins are near-vertical, 1.4 H long (knee to cuff). Feet point screen-right.
- Pregnancy posture (seated version): the pelvis sits back on the seat and the trunk leans slightly back from the hips. The belly rests on the tops of the thighs, so its underside overlaps them. Weight sits on the seat, and the feet are planted, not tiptoe. The shoulders are relaxed and slightly rounded, and the head tilts a little forward and toward screen-right.

## Shape language: soft-rounded
The reference is built from soft, pillowy masses with no outlines, and tapered brush strokes carry the interior detail. So every mass is a smooth loop.

Straights are paired against curves:
- the flat seat line against the round belly
- the straight inner seam of each sleeve against its round outer edge
- the near-vertical backs of the shins against their slightly bowed fronts
- the flat sock tops against the rounded toes

Rules: no mirror symmetry between the near and far sides, since the three-quarter view breaks it everywhere. Avoid parallel contours, for example the shins taper differently front and back. Bumps are spaced unevenly (fingertip lengths differ, and the bun lobes differ in size).

## Palette tokens (`palette.js`, flat, one shade per material)
| token | hex | | token | hex |
|---|---|---|---|---|
| skin | #d48055 | | skinShade | #cf6c49 |
| cheek | #e37158 | | hair | #633826 |
| hairShade | #502a19 | | garment (lilac top + joggers) | #cbaee9 |
| garmentShade | #b695dc | | cardigan | #feb8c3 |
| cardiganShade | #fb9caf | | accent (socks) | #fee076 |
| accentShade | #facb4b | | line (eyes) | #070201 |
| mouth | #763519 | | | |

The palette has no gradients. Shade tones only appear as tapered strokes or small shapes: folds, creases, and the undersides of the belly and bust.

## Part list, back to front (generated from the rig by tools/spec_parts.mjs)
<!-- parts:start -->
| z | part id (`mum.` prefix) | bone | anchors | fill |
|---|---|---|---|---|
| 10 | hair.back | head | 27 | hair |
| 11 | hair.loop | head | 10 | hair |
| 12 | hair.shade.nape | head | 8 | hairShade |
| 12 | hair.shade.bunCurl | head | 8 | hairShade |
| 13 | cardigan.far.hem | spineLower | 9 | cardigan |
| 13.5 | cardigan.far.hemFold | spineLower | 6 | cardiganShade |
| 14 | cardigan.far.sleeve | upperArm.far | 17 | cardigan |
| 15 | cardigan.far.fold.1 | upperArm.far | 4 | cardiganShade |
| 15 | cardigan.far.fold.2 | upperArm.far | 4 | cardiganShade |
| 15 | cardigan.far.fold.3 | upperArm.far | 6 | cardiganShade |
| 15 | cardigan.far.fold.4 | upperArm.far | 4 | cardiganShade |
| 20 | leg.far.ankle | foot.far | 4 | skin |
| 21 | leg.far.sock | foot.far | 13 | accent |
| 22 | leg.far.rib.1 | foot.far | 8 | accentShade |
| 22 | leg.far.rib.2 | foot.far | 8 | accentShade |
| 22 | leg.far.rib.3 | foot.far | 8 | accentShade |
| 22 | leg.far.rib.4 | foot.far | 8 | accentShade |
| 23 | leg.far.cuff | shin.far | 7 | garment |
| 24 | leg.far.shin | shin.far | 12 | garment |
| 25 | leg.far.cuffShade | shin.far | 4 | garmentShade |
| 26 | leg.far.thigh | thigh.far | 12 | garment |
| 27 | leg.far.kneeWedge | thigh.far | 5 | garmentShade |
| 30 | leg.near.ankle | foot.near | 4 | skin |
| 31 | leg.near.sock | foot.near | 13 | accent |
| 32 | leg.near.rib.1 | foot.near | 8 | accentShade |
| 32 | leg.near.rib.2 | foot.near | 8 | accentShade |
| 32 | leg.near.rib.3 | foot.near | 8 | accentShade |
| 32 | leg.near.rib.4 | foot.near | 8 | accentShade |
| 33 | leg.near.cuff | shin.near | 7 | garment |
| 34 | leg.near.shin | shin.near | 12 | garment |
| 35 | leg.near.cuffShade | shin.near | 4 | garmentShade |
| 36 | leg.near.thigh | thigh.near | 15 | garment |
| 37 | leg.near.kneeWedge | thigh.near | 5 | garmentShade |
| 37 | leg.near.thighEdge | thigh.near | 10 | garmentShade |
| 40 | neck | neck | 10 | skin |
| 41 | chest.skin | chest | 10 | skin |
| 42 | chest.cleavage | chest | 4 | skinShade |
| 44 | top.body | spineUpper | 20 | garment |
| 45 | top.lapCrease | spineUpper | 10 | garmentShade |
| 46 | belly.body | belly | 14 | garment |
| 47 | belly.underside | belly | 10 | garmentShade |
| 47 | belly.shade.nearHand | belly | 6 | garmentShade |
| 47 | belly.shade.farHand | belly | 6 | garmentShade |
| 48 | top.underBust.near | spineUpper | 6 | garmentShade |
| 48 | top.underBust.far | spineUpper | 8 | garmentShade |
| 49 | cardigan.far.cuff | upperArm.far | 6 | cardiganShade |
| 49.5 | forearm.far.skin | forearm.far | 9 | skin |
| 50 | hand.far | hand.far | 18 | skin |
| 50.2 | hand.far.finger.1 | hand.far | 10 | skinLine |
| 50.2 | hand.far.finger.2 | hand.far | 10 | skinLine |
| 50.2 | hand.far.finger.3 | hand.far | 10 | skinLine |
| 54 | cardigan.near.panel | spineUpper | 19 | cardigan |
| 55 | cardigan.near.panelFold | spineUpper | 6 | cardiganShade |
| 55 | cardigan.near.sleeveShadow | spineUpper | 6 | cardiganShade |
| 56 | cardigan.near.upper | upperArm.near | 13 | cardigan |
| 57 | cardigan.near.fold.shoulder | upperArm.near | 4 | cardiganShade |
| 57 | cardigan.near.fold.seam | upperArm.near | 6 | cardiganShade |
| 58 | cardigan.near.forearm | forearm.near | 10 | cardigan |
| 58.05 | cardigan.near.cuffRim | forearm.near | 6 | cardiganShade |
| 58.1 | forearm.near.skin | forearm.near | 9 | skin |
| 58.6 | hand.near | hand.near | 18 | skin |
| 58.800000000000004 | hand.near.finger.1 | hand.near | 10 | skinLine |
| 58.800000000000004 | hand.near.finger.2 | hand.near | 10 | skinLine |
| 58.800000000000004 | hand.near.finger.3 | hand.near | 10 | skinLine |
| 58.800000000000004 | hand.near.thumb | hand.near | 4 | skinLine |
| 59 | cardigan.near.fold.elbow1 | forearm.near | 4 | cardiganShade |
| 59 | cardigan.near.fold.elbow2 | forearm.near | 4 | cardiganShade |
| 70 | head.neckShadow | head | 8 | skinShade |
| 71 | head.face | head | 14 | skin |
| 72 | face.cheek.near | head | 4 | cheek |
| 72 | face.cheek.far | head | 4 | cheek |
| 73 | face.nose | head | 12 | skinLine |
| 74 | face.eye.near | head | 4 | line |
| 74 | face.eye.far | head | 4 | line |
| 74.5 | face.lid.near | head | 10 | line |
| 74.5 | face.lid.far | head | 10 | line |
| 75 | face.brow.near | head | 8 | hair |
| 75 | face.brow.far | head | 8 | hair |
| 76 | face.mouth | head | 12 | mouth |
| 80 | hair.fringe | head | 18 | hair |
| 81 | hair.shade.bunBase | head | 12 | hairShade |
| 81 | hair.shade.crownNotch | head | 3 | hairShade |
| 81 | hair.strand.sweep | head | 4 | hairShade |
| 82 | head.ear | head | 7 | skin |
| 83 | head.earInner | head | 4 | skinShade |
| 84 | hair.strand.far | head | 14 | hair |
| 84 | hair.strand.near | head | 18 | hair |
<!-- parts:end -->

Shape parameters live in `proportions.js` under `head`, `neck`, `chest`, `top`, `belly`, `cardigan`, `hands`, `legs` and `expressions`. Each one is an anchor table: points in the bone's local space, in H units, with the pivot at (0,0). Strokes are given as a centreline plus widths in px.

## Construction facts measured from the reference (do not reverse without new evidence)
- **Both forearms sit in FRONT of their sleeves.** The reference's skin end at the near cuff is convex: the leftmost skin is x 488 at y≈635, slanting back to x 511 at y 596. The far forearm's skin ends at x≤742, y≤602 with a rounded end. A cardiganShade crescent behind each skin end is the sleeve opening.
- **Near-hand fingers are stacked near-horizontal**, not bent down. The tips form a convex arc with the middle and ring fingers longest.
- **Wrist widths:** the near wrist narrows to about 44–46 px at x 550–570, and the far wrist to about 45 px at x 690–700.
- **Neck shadow** is a wedge about 6 px thick at the ear, growing to about 20 px at the throat.
- **Hairline** (fringe edge) was fitted row by row to the reference's face edge. It is a near-straight diagonal in the reference too.
- **Bun loop gap:** the reference's curl encloses a small background gap (78 px). The render's gap is intended (the "holes" metric lists it).

## Bones (`skeleton.js`)
The hierarchy runs root → pelvis (centre of mass) → spineLower → spineUpper → chest → neck → head.
- belly hangs off pelvis.
- Each thigh hangs off pelvis, with the chain thigh → shin → foot.
- Each clavicle hangs off chest, with the chain clavicle → upperArm → forearm → hand.

Local frames are world-aligned at rest (the cut-out convention). Rest angle = direction from the joint to its aim point. min/max are degrees relative to rest. `cap` is the radius of the joint disc that must stay covered at min and max.

| bone | pivot (ref px) | rest° | min/max | cap (H) |
|---|---|---|---|---|
| pelvis | (540,740) | −76 | ±8 | – |
| spineLower | (565,640) | −82 | ±8 | – |
| spineUpper | (580,530) | −90 | ±8 | – |
| chest | (580,430) | −102 | ±8 | – |
| neck | (558,330) | −93 | ±12 | 0.14 |
| head | (555,272) | −77 | ±18 | 0.14 |
| belly | (610,690) | −39 | ±5 | – |
| upperArm.near | (440,395) | 96 | ±25 | 0.20 |
| forearm.near | (420,590) | 22 | ±40 | 0.16 |
| hand.near | (500,622) | 6 | ±25 | 0.10 |
| upperArm.far | (690,395) | 66 | ±25 | – |
| forearm.far | (760,550) | 118 | ±40 | 0.10 |
| hand.far | (748,572) | −172 | ±25 | 0.08 |
| thigh.near / far | (500,742) / (600,718) | 4 / 8 | ±15 | – |
| shin.near / far | (655,752) / (790,745) | 92 / 93 | ±35 | 0.25 |
| foot.near / far | (637,1098) / (774,1096) | 39 / 38 | ±20 | 0.12 |

## Expressions and hand shapes
- Expressions: `soft-smile` (rest) and `neutral`. The mouth always has 8 anchors and the eyes are 4-anchor ellipses (`eyeSquash` closes them).
- Hands: `cupping-belly` (rest), with 18 anchors per hand. Other shapes must keep 18.
