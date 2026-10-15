# Harry's eye: the checklist every render answers before it reaches him

Harry's notes, turned into the questions a reviewer must answer and the checks that answer them. The standard is the
**reference still** each key was fitted from (not a photo; there won't always be one) and one question above all: **does
this look like an illustration of a real person, and how she would really hold herself?**

How it is used:
- **Before building** a pose, move or shot: read it and note in the shot's `spec.preflight` which items apply and how the
  plan avoids them (SKILL.md "Learning from corrections").
- **Before review:** `qa_checks.mjs` runs the gated items; `critic_F.py --lens natural` (included in `--lens all`) gives a
  fresh reviewer this file with the render next to its reference stills (`tools/ref_match.py`). Nothing goes to Harry
  until every item is answered "no" or explained.
- **After every note from Harry**: add or sharpen an item here, with his words, and a gate if it can be measured. A note
  that slipped through means a missing item or a weak gate. Fix that as well as the shot.

Each item: the question · what went wrong (character, version, Harry's words) · the gate, or **eye** when only a reviewer
can judge it · the lesson in `docs/PIPELINE.md`.

## The whole figure

1. **Does she look like a real person standing, breathing and holding herself, not a puppet or a set of parts?** Weight
   on her feet, shoulders relaxed, head carried by the neck, nothing posed for the camera. mum2: "the hands and some of
   the shoulders look like they're on pins and moving, not as a piece of clothing over them". · eye (natural lens) · 4, 26
2. **Does each key match its reference still in SHAPE, not only in where its joints land?** Hand silhouette, finger
   direction and curl, wrist bend, how a hand sits on what it touches, posture. mum3q v5: the top hand was a boxy block
   with the fingers pointing back at her chest, fitted to q_k3_down, whose hand curls forward over the dome ("still looks
   creepy and lifeless"). v6's first try: fitted to the right still (q_k4_down) but with fingers curled 70–85°, which the
   3D fingers turn into the camera: short stacked stubs ending in a blunt column, "a mitten" twice; the lower hand's
   75–90° curl hooked into "a rake". Pick a hand shape SIDE BY SIDE with the still's hand (finger length, curl, how the
   tips step) before placing it (`hand_shapes.py`), then place it with that shape (`hand_place.py`; a hand on top of the
   bump palm down onto it, `--palm-down`, or its curl never shows: "straight planks"). Eyes too: open 0.6 + half-lid +
   smile squashed a look-down to "closed slits", open 0.8 read "wide-eyed, glancing sideways"; the stills draw open eyes
   under heavy half-lowered lids. · eye on `ref_match.py` sheets
   (natural lens) · 50, 51
3. **Does any limb shrink, stretch or change thickness as it moves?** mum3 v3: "when the arm moves it sort of shrinks…
   it makes her arm look deformed". · gate `qa_checks` limbs (each arm segment ≥ 0.85–0.9 of its length; a designed
   foreshortening must hold its size) · 39
4. **Are the joints clean shapes a body has?** No knob, pinch, step or round cap at an ankle, elbow or wrist. mum3 v4:
   "ankles are a super weird shape" (a round tube end at the ankle). mum3q v6: a sharp "pointed wrist corner" where a hand
   bent 50° meets its forearm (cured by a heel-of-the-hand pad, `params.arm*.wristRound`); mum3q v7 draft: that pad drawn
   wider than the forearm, "a ball", "a swollen joint". A joint is never wider than the limb it ends. mum3q v8 draft: a
   forearm pointing at the camera drawn as a tube became a hairpin under the upper arm, "a box", then a hook; seen along
   its length a forearm is its round cross-section (`parts/arms.js` draws it end-on). · eye + `qa_closeups.mjs` at the
   stress times · 41, 51, 52, 53
5. **Does anything bleed?** Clothing through limbs, limbs through clothing or the body, outlines running over skin.
   mum2: "the real bleeding through clothes and body parts, which looked super weird as they move". · `anim_audit.py` +
   eye · 17
6. **Is any limb doing nothing it would really do?** An idle arm hanging straight and swinging, a hand left dangling
   while the other one acts. mum3q v3: "her arm is just hanging lifeless and swings in a weird way. In reality it would
   likely be placed on her bump too"; "it's really that second hand… it just hangs there at a very odd angle". · eye (plan
   both hands in `spec.preflight`) · 47

## Hands

7. **Does a resting hand lie the way a hand really does?** The palm on the surface, fingers together and gently curved
   along it, the wrist bent so the forearm comes in from the side; a lower hand cups from beneath. Never a flat hand
   perched on an edge with straight, parted fingers pointing off it. mum3q v4: "no one's hand naturally lies like this"
   (with a photo); v5: "rather than being a little curled over the top of the bump". mum3q v6: a lower hand drawn as "a
   horizontal paddle" and then "a rake" (fingers fanned with gaps, hooking down) where the still lays them together along
   the curve, the thumb above. · eye + `ref_match.py` · 40, 49, 51
8. **Do the fingertips follow the bump?** They end along its outline, curving with it, not past the edge and not
   bunched. mum3 v3: "fingers almost there but slightly too all together or not feeling like it follows the protruding
   bump". · gate `tip_check.mjs` (tips ≥ 4 px inside) + eye · 33, 40
9. **Is every visible hand joined to its arm?** No hand without a wrist leading into it, unless the arm is hidden by
   design and the hand still reads as hers (heel of the hand tucked behind the bump's edge, as in its still). mum3q v5's
   top hand read as stuck on; v6 shows the arm the still shows (`hand_place.py --hide none`), and the blind reviewer
   picked it for that: "clearly attached". · eye · 48, 51
10. **Are the hands alive, visibly, at phone size?** A hand resting on her rides her breath, caresses, presses a little,
    settles a finger now and then, and answers what her face does (a squeeze as she smiles). Never frozen on her while
    the rest of her moves. mum3q v5: "creepy and lifeless". mum3q v6 passed a 1.5 px floor with 2–4 px finger settles and
    both fresh reviewers still saw "the hands look identical in every frame… held props": life a viewer sees is a 10–20 px
    caress or stroke, measured in the frames (v7: a 24° turn of a hand lying palm down moved its tips ~6 px, seen edge-on;
    its fingers' curl shows). · gate `qa_checks` alive (each hand moves ≥ 5 px on her in every 2 s; a deliberate hold goes in
    `spec.qa.still`) + eye on the phone-size film · 50, 51
11. **Does a hand ever flip, pop or point at the camera?** A palm flipping in a few frames, a hand seen end-on, the
    wrist springing back. mum2: the palm flip at 7.5 s; "the wrist angle looked wrong". · gate `qa_checks` hands (palm
    pops, wrist one way per move) + eye · 24, 25
12. **Are both hands the same hand?** The same size and style, keeping their size as they move, never reading as an
    "oath" (flat palm to camera) or a "fist" mid-move. mum2 client: "the hand on the belly looked dead — not really a
    hand". · gate `qa_checks` hands (palm area) + eye · 22

## Motion and acting

13. **Is the motion the size and speed the brief asks for?** mum2 client: "far too extreme and fast moving". mum3q v6:
    the look up did most of its travel in 0.3 s because its "half way" breakdown still was already 85% up: a breakdown
    key is half way in what moves, whatever its still shows. · eye against `spec.intensity` · 16, 51
14. **Do arms move along paths a body takes?** No swinging at the elbow like a clock hand, no hand travelling on a
    circle round the shoulder. mum2 client: "swinging at the elbow". · eye + `uv_check` · 2, 18
15. **Is it smooth?** No pops or ticks at holds, no linear moves, no limb hopping between two shapes. mum3q v6 draft: the
    far arm's elbow jumped 40–70 px between frames while its hand held still (the 3D arm solve flipping between two
    branches). · gate `qa_checks` frames + limbs (an elbow that moves > 6 px in a frame while its wrist barely moves
    fails) + `--tracks-only` · 38, 51

## Drawing quality

16. **Is the starting illustration good enough to be the standard?** If the master or a still is weak (muddy shapes,
    wrong proportions, a pose no one makes), fix the reference before fitting to it. mum2: "the underlying illustration
    itself is not good enough quality as a starting point". · eye, at the New character and New pose gates · 26, 29
17. **Are the hands DRAWN the way the stills draw hands, at the size the film is seen?** Each finger its own: a round tip,
    a small gap beside it toward the tip, the tips stepping; thin lines between the fingers; the thumb resting along the
    hand; a crease where a bent wrist meets the hand. Never thick dark lines the full length of each finger ("four even
    parallel stripes", "a comb"), blunt pads stacked in a column ("a mitten", "a paw"), fingers fused into one tapering
    shape ("a paddle", "a flipper": mum3q v7's first redraw, thin lines and pointed tips, lost its blind A/B), or a round
    wrist with no crease ("a swollen joint"). · eye on `hand_shapes.py --try '[{"style": …}]' --scale 1` beside the still, at
    the New character gate · 52
18. **Does a hand or arm resting on her cast the soft shadow the still shows?** Without it a hand reads pasted on, not
    resting. mum3q v1–v6 and mum3 v1–v5 had one configured that never drew (a keyed channel dropped by the engine). · gate
    `qa_checks` channels (every keyed channel reaches the pose; a gated shadow draws while keyed on) + eye · 52
19. **Is each hand the RIGHT hand, the right way round?** Say which edge of the hand the thumb and index are on and where
    the little finger is, in the still and in the render; the far hand is the other hand, the mirror of the near one, not
    a copy. mum3q v1–v7: the top hand's spec was copied from the near (right) hand, so a RIGHT hand lay on her left arm,
    thumb and index along its lower edge, the little finger on top. Four rounds tuned its curl, wrist and lines; the
    critics called it "a paw", "a claw", "a thumb pad"; Harry on v7: "a total mess. It looks like it's the wrong way
    round". · gate `char_check` and `qa_checks` handed (the thumb on the side the 3D arm puts it, every pose and frame;
    `tools/handed.mjs`) + eye · 53
20. **Do the fingers lie at the still's angle, their tips stepping like the still's, on the FILM, and does the wrist flow
    out of the arm?** Measure the still's hand in its own pixels (each tip, the lines between the fingers) and the same on
    the rendered frames. mum3q v8 met its keys to 1 px with the fingers 10° flatter and the tips in one column ("short,
    nearly horizontal, bunched"); v9's key matched but the breath flattened the fingers 5° on the film, its squeeze curled
    them into "a paw", and its end-on wrist read as "a ball". · `hand_place.py --tips` (warns over 5 px), reach
    `keepPalm`, finger angles measured on frames + eye beside the still · 54
21. **Does each form lie over the one the still puts it over, with a line only where the still draws one?** Say, for a
    joint the critics call a lump, which form is in front (the wrist over the hand's heel, the bump over the elbow) and
    where each line runs, in the still and in the render. mum3q v11's end-on wrist matched the still's silhouette to the
    pixel but lay behind the hand, the hand outlined round its end: "an oval ringed by a crease", "a knob"; v12 put it in
    front with an outline round it: "a C-shaped crease… a puffy cuff". · eye on the overlaps beside the still
    (`hand_shapes.py`, zoomed) · 55
22. **Between the points that match, does the form match: the curve, the tips' spacing, the thumb's length?** Overlay
    the region a reviewer names on the still, both masks, before tuning a number. mum3q v13 met its points and still read
    "a stubby paw" (the top tips stacked: a square knuckle line), "a corner" (the bump's rows matched, its tangents
    didn't), "a stub thumb" (8 px short, the fingers fat), and a look-down "bowed too deep" (a nod where the stills tip
    the head). · `mask_overlay.py` (still only / render only, px) + eye · 56
23. **Do the eyes read as looking where she looks, AT PHONE SIZE?** Judge the dark mass (iris and lash line) at film
    size: mum3q's look-down eyes with a white guessed from the still lost two blind A/Bs to a plain dark oval ("white all
    round… a side-glance"; "a short dark slash"); measured from it (the white a sliver on the iris's BACK side, the iris
    pushed toward what she looks at, the lids open) it won ("open and looking at her bump"). An eye pose belongs to its
    head pose: the look-down iris under a still-raised head read "side-eye". · blind A/B at film size + eye · 57
24. **On the FILM, is each hand where the still puts it, at its angle?** A key fitted to the still can leave it once the
    shot's trunk and reach act on it: mum3q's cradling hand sat 26 px behind the still's and 6° steeper ("a comb… the tips
    well inside the edge") while its key matched. And before calling a hand "frozen", check the motion sheets (magenta):
    still tiles at phone size hide 20 px moves. · `finger_angles.mjs` (QA `fingers`), tips on the film vs the still's,
    `motion_sheet.py` + eye · 58
25. **Do the hands keep the still's shape BETWEEN the keys?** A fidget that bends the fingers where the view flattens
    them breaks the shape for a second or two while every key matches: mum3q's cradling fingers, bent at the knuckles
    seen palm-on, read "a rake" at 3–4 s (6° flatter, 9% longer). · QA `fingers` `every`/`fan` (`finger_angles.mjs
    --every 0.5 --fan`) + eye · 59

## Side-on poses (the pose library: kneeling, all fours, sitting, squatting, leaning, bending, walking)

Harry, 2026-10-14, on the side-on library: "Every side on view should be incredibly high quality and look natural - the
same way a person would actually do it… in addition to the bump and dress often the legs look unnatural too - wrong
posture, overlapping so they look like their on hinges rather than a real rig… these should look completely natural,
like a real woman, just illustrated in 2D". The critic lenses for poses are in `tools/critic_prompt_side.md`
(`critic_F.py mum3 --side`); each pose is judged next to the still it was fitted to, at film size.

Harry's round 8 review (2026-10-15) named two faults "across many poses", so they come first: relaxed hands (31) and a
shoe with its volume (32). The critic pack shows every pose's hands and feet at 1:1 beside the still's for them.

31. **Are the hands relaxed?** Harry, round 8, across many poses: "the hands often look stiff and not relaxed. Fingers
    always pointed directly out at a specific angle. rather than a little curled like most people naturally hold their
    hands when walking, sitting etc."; walk-pass: "stiff hands… the hand should follow the arm with a slight flop"; sit-ball:
    "hands stiff vs relaxed on the leg". A hand at rest (hanging, swinging as she walks, lying on a thigh or the bump)
    curls a little, more toward the little finger, the fingers softly together with small gaps near the tips, the thumb
    resting along the index; a walking hand trails its forearm a little and flops as the swing turns. Only a hand doing
    work grips (35) or presses. Never one straight angle for every finger, a flat paddle, a hand pointing at the floor, a
    thumb sticking out. · gate `qa_checks` curl (a resting or swinging hand's fingers curl in the picture: their mean
    angle off the hand's line ≥ 4°, 8° walking; the straight shapes measured −3°) + the library's `idle`, `softrest`,
    `palmdown`, `hold` (poses/hands/) drawn with `fx.fingersIn`, `side_walk.mjs --lag` + eye at 1:1 (`side_zoom.py`) · 69
32. **Does every shoe keep its volume, at every angle?** Harry, round 8: "One shoe always looks really thin/cut off that
    then looks odd"; walk-pass "the shoe 'cut off' at the bottom, the foot very thin"; squat "particularly the foot in the
    background". The far shoe had been drawn with the near one's opening from its own, lower counter: 36% as deep at
    mid-foot. A shoe as deep as the master's from its opening to its sole whichever way the foot turns. · gate
    `qa_checks` shoes (each shoe's mid-foot depth ≥ 75% of the master's, every 3rd frame; `tools/shoe_gauge.mjs`) · 69
33. **Is the far leg where the still draws it, the legs apart where the pose stands them apart?** Harry, round 8, squat:
    "the legs aren't separated enough which means the knee then forms at a wierd place/angle"; sit-chair: "Far away
    knee/leg at the wrong position. Hence lands awkwardly - esp compared to the ref image". A squat's feet stand wide (the
    far foot well ahead and up, the shins parting in a V under a far knee hidden behind the near one); a chair's far foot
    is set back behind the near heel, its shin a strip behind; a ball's far foot ahead and up. Read the far knee and ankle
    off the still and place them (`far_leg.mjs --set`, `farleg` in `fit_side.sh`); the twin leg is right only standing and
    kneeling. · `far_leg.mjs` offsets against the still's + eye · 65, 69
34. **Does the arm come out of the shoulder in one clean line at every height?** Harry, round 8, lean-counter: "the top of
    the arm isn't connected smoothly to the shoulder"; squat: "the blend between the top arm and shoulder looks jagged and
    rough where as the reference still is small and clean". The strap is the armhole's edge: one band of even width round
    the arm's root, over its top and on down its front, with no ear of dress, sliver or skin wedge beside it. · eye at
    1:1 (`side_zoom.py <char> side/<pose> --at upperArm.near`, `--marks dress,dress.strap,chest.skin`) · 69
35. **Does a hand on a support hold it the way a hand would?** Harry, round 8, lean-counter: "Hands are the wrong way
    around on the counter"; squat: "wrist/hands look odd and not holding the chair"; walk-pass: "the far thumb in the wrong
    position". Palms down on a worktop (the backs of the hands a low dome, the fingertips just over its edge, the thumbs
    under); a chair's back gripped (the palm on the top, the fingers wrapped over and down, the wrist in line with the
    forearm); the thumb where the still shows it. · eye at 1:1 beside the still · 69

26. **Do the legs look like a real woman's legs in this pose?** A thigh that is thick at the hip and tapers to the knee,
    a knee that is a joint (kneecap in front, the crease behind, the calf pressed under the thigh when it folds), a calf
    with its swell, a slim ankle into the foot. Never two tubes pinned at a pivot ("on hinges"), never one leg's outline
    running through the other ("overlapping"), never a posture no one takes (a squat with the knees together over a bump,
    a kneel with the shins off the floor). · side_match (skin and silhouette against the still) + eye · 62
27. **Does the dress behave like cloth on her body?** It hangs by gravity from the bump and the back, lies over the lap
    and the thighs, hugs the buttocks when she bends or squats (a loop round her thighs, not a cape), rests on a seat or
    a ball. Never a rigid box, a plank, a tube with no lap, a flag behind her. The review thread: "the skirt stays a tube,
    no lap", "a rigid box", "the dress is a stiff plank". · side_match dress IoU + eye · 62
28. **Does the bump have weight?** It hangs toward the floor on all fours, sits on the thighs as she bends or squats,
    keeps its size and roundness, and the dress follows it. · eye · 62
29. **Does she touch what she touches?** Knees, shins and the tops of her feet on the floor when kneeling; palms flat,
    fingers forward, under the shoulders on all fours; buttocks on the seat or the ball; forearms on the counter; the hand
    at the toy. Nothing floats above or sinks through. · `floor_pose.mjs` report (px above, below the floor) + eye · 62
30. **Is it the pose a pregnant woman really takes, with her bump?** Knees apart to make room for it in a squat and a
    deep bend, the back long, the hips back when she leans, the head carried in line with the spine, a hand where she
    would put it for balance. · eye against the still · 62

