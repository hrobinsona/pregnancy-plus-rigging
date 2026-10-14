// HANDEDNESS: is each drawn hand the right hand, the right way round? (lesson 53)
//   import { handedness } from './handed.mjs'; handedness(C, st, pose) → [{ side, id, want, drawn, k, ok, view, seen }]
// A 2D hand drawing is chiral: a right hand seen from the back is a left hand seen from the palm, mirrored. mum3q's far
// (left) hand was built as a copy of the near (right) hand's spec, thumbSide and all, so for seven versions a RIGHT hand lay
// on her left arm: thumb and index along the hand's lower edge, the little finger on top. Four rounds tuned its curl,
// wrist and lines before Harry saw it was "the wrong way round". The 3D arm knows where the thumb is (arm3's g, the radial
// direction: forward at rest, carried by pronation and the wrist's bends); the drawing puts it where thumbSide says. This
// compares the two on screen:
//   want  = the side of the hand's screen direction its thumb must be on (sign of hand × radial, both projected)
//   drawn = the side the drawn index knuckle sits on, relative to the little finger's (sign of axis × (index − pinky))
//   k     = how clearly the palm's plane faces the camera (|sin| of the angle between the two projected directions); below
//           0.25 the hand is edge-on and either side reads, so it is not judged
//   view  = which face the camera sees by the 3D palm normal ('back' | 'palm'); the drawing's own view should agree (a
//           'back' drawing showing a palm is a swap the character needs: mum2's farBack)
import { expandHands } from '../engine/handlib.js';
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
export function handedness(C, st, pose = {}) {
  const out = [];
  for (const side of ['near', 'far']) {
    const a3 = st[`hand.${side}`]?.a3, sd = C.handSides?.[side];
    if (!a3?.gcam || !sd) continue;
    const back = sd.back && pose.handView?.[side] === 'back', id = back ? sd.back.prefix : sd.prefix;
    const H = Object.values(C.hands || {}).find((h) => h.id === id), i1 = st[`${id}.f1a`]?.pos, i4 = st[`${id}.f4a`]?.pos, w = st[`hand.${side}`].pos;
    if (!H || !i1 || !i4) continue;
    const v = [a3.cam[0], a3.cam[1]], g = [a3.gcam[0], a3.gcam[1]], k = Math.abs(cross(v, g)) / (Math.hypot(...v) * Math.hypot(...g) || 1);
    const axis = [(i1[0] + i4[0]) / 2 - w[0], (i1[1] + i4[1]) / 2 - w[1]], want = Math.sign(cross(v, g)), drawn = Math.sign(cross(axis, [i1[0] - i4[0], i1[1] - i4[1]]));
    const view = a3.ncam ? (a3.ncam[2] > 0 ? 'back' : 'palm') : null;
    out.push({ side, id, want, drawn, k, ok: k < 0.25 || want === drawn, view, drawnView: H.view, viewOk: !view || k < 0.25 || view === H.view });
  }
  return out;
}
// a mismatch the character excuses (C.qa.handed = [{side, view, why}]): a drawing that is right for the shots but not for a
// view the 3D shows elsewhere (mum3q: the far hand is drawn from the back, for the bump; hanging, the 3D shows its palm, a
// sliver beside the skirt, until a palm drawing swaps in as mum2's farBack does)
export const excuse = (C, r) => (C.qa?.handed || []).find((e) => e.side === r.side && (!e.view || e.view === r.view));
// one line per wrong hand, for a gate: 'far hand MIRRORED: the drawing puts the thumb on the …'
export function explain(r) {
  return `${r.side} hand (${r.id}) MIRRORED: the 3D arm puts the thumb on the other side of the hand (k ${r.k.toFixed(2)})` +
    (r.view === r.drawnView ? ` — the drawing is the OTHER hand: flip its spec's thumbSide (and thumbFx; spread fidgets keyed raw on ${r.id}.f*s flip too)`
                            : ` — the camera sees its ${r.view} but the drawing is a ${r.drawnView} view: it needs a ${r.view} drawing swapped in (handView, as mum2's farBack)`);
}
// every pose in a list, for char_check: [{ name, side, ... }] of the hands judged wrong (excused ones flagged)
export function handednessOfPoses(C, rig, poses, lib) {
  const bad = [];
  for (const [name, pose0] of poses) {
    const pose = expandHands(pose0, lib, C.handSides);
    for (const r of handedness(C, rig.solve(pose), pose)) if (!r.ok) bad.push({ name, ...r, excused: excuse(C, r) });
  }
  return bad;
}
