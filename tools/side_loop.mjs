// side_loop.mjs — make a side-on library pose BREATHE: writes characters/<char>/anims/side-<pose>-breathe.json, an 8 s loop
// held on that pose (two breaths: an easy one, then a deeper one whose breath in drifts her eyes shut and whose breath out
// parts her lips; a blink; the spine's slow drift). Every pose in the library gets the same loop, so a new pose is one
// command away from a living clip, and the reels can cut to any of them.
//   node tools/side_loop.mjs <char> <pose (under poses/side/)> [--pin near=belly,far=world] [--out name] [--print]
// HANDS: a hand resting on something stays on it while the breath lifts her chest and shoulders (engine/anim.js reach, a
// held contact per hand): on her bump (pinned to the belly, riding its breath), on a thigh or shin (that bone), or on
// the floor, a worktop, a chair or a ball ('world': the props stay put, anim.js propsAt). Found from the posed drawing: the
// palm inside the bump's outline → belly; a hand that presses or grips → world; within 0.3 H of a thigh or shin → that bone;
// any other hand lying flat or draped over something (a chair's back) → world; a relaxed hand away from everything hangs free. --pin overrides a side. A walk pose
// gets no breathing loop (no one stands mid-stride): it gets a walk cycle.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [char, poseName] = argv, D = `characters/${char}/`;
if (!char || !poseName) { console.error('usage: node tools/side_loop.mjs <char> <pose> [--pin near=belly,far=world] [--out name] [--print]'); process.exit(1); }
const C = (await import(`../${D}character.js`)).default, rig = createRig(C), J = C.joints;
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const raw = JSON.parse(fs.readFileSync(`${D}poses/side/${poseName}.json`)), pose = expandHands(structuredClone(raw), handLib, C.handSides);
const st = rig.solve(pose);

// where each hand rests
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const segDist = (p, a, b) => { const d = sub(b, a), u = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2))); return dist(p, [a[0] + u * d[0], a[1] + u * d[1]]); };
const bump = C.params?.depth?.proxies?.find((q) => q.name === 'bump');
// the palm inside the bump: tested in the belly bone's REST space (the posed palm carried back by that bone), against the bump's
// depth proxy (params depth.proxies 'bump') grown by 0.15 H: a hand lying on the bump's surface is just outside its outline
const inBump = (p) => {
  if (!bump) return false;
  const M = st[bump.bone].M, j = J[rig.BONE[bump.bone].joint], det = M[0] * M[3] - M[1] * M[2], dx = p[0] - M[4], dy = p[1] - M[5];
  const r = [(M[3] * dx - M[2] * dy) / det + j[0], (-M[1] * dx + M[0] * dy) / det + j[1]];
  return ((r[0] - bump.at[0]) / (bump.axes[0] + 0.15)) ** 2 + ((r[1] - bump.at[1]) / (bump.axes[1] + 0.15)) ** 2 <= 1;
};
const legBones = ['near', 'far'].flatMap((s) => [['thigh.' + s, 'hip', 'knee'], ['shin.' + s, 'knee', 'ankle']].map(([b, a, e]) => {
  const S = s === 'near' ? 'Near' : 'Far'; return { b, a: st[b].pos, e: rig.carry(st, b, e + S) }; }));
const states = raw.hands || {};
const pinFor = (side) => {
  const tip = rig.carry(st, 'hand.' + side, side === 'near' ? 'handNearTip' : 'handFarTip'), wr = st['hand.' + side].pos, palm = [(tip[0] + wr[0]) / 2, (tip[1] + wr[1]) / 2];
  if (inBump(palm)) return C.roles?.belly || 'belly';
  const how = typeof states[side] === 'string' ? states[side] : states[side]?.pose;
  if (['press', 'grip'].includes(how)) return 'world';   // pressing on something solid: the floor, a worktop, a ball, a chair
  let best = null; for (const L of legBones) { const d = Math.min(segDist(palm, L.a, L.e), segDist(wr, L.a, L.e)); if (d < 0.3 && (!best || d < best.d)) best = { b: L.b, d }; }
  if (best) return best.b;
  return ['lay', 'flat', 'drape'].includes(how) ? 'world' : null;   // (drape: over a chair's back, the squat)
};
const over = Object.fromEntries((arg('pin') || '').split(',').filter(Boolean).map((kv) => kv.split('=')));
const pins = Object.fromEntries(['near', 'far'].map((s) => [s, over[s] !== undefined ? (over[s] === 'free' ? null : over[s]) : pinFor(s)]));

const name = arg('out', `side-${poseName}-breathe`), reach = {};
// a hand on the bump's FAR side (fit_side.sh's contact_pose --back) is out of sight behind it: its 3D arm sees its palm
// through the bump, so the handedness gate would call the back-view drawing mirrored (side kneel, round 5)
const back = /--back/.test(raw._contact || '') ? (raw._contact.match(/--side (near|far)/)?.[1] ?? 'far') : null;
// LIFE in a resting hand (qa_checks 'alive': a hand only carried by her body reads stuck on): the fingers settle onto what
// they rest on with the easy breath (the wrist eases them down), fan a little and the thumb eases out on the deep breath in,
// then ease long on the breath out. Seen side-on the fingers' curl is mostly out of the picture (flexFx 0.1), so the
// visible life is the wrist's and the fan. ±3° moved the tips ~7 px at 225 px/H and read FROZEN on the kneeling and seated
// loops (qa_checks alive: under 5 px in any 2 s on her); 4–5° moves them 10–12 px, the SKILL's 10–20 px of a resting hand. A hand bearing her weight (the floor, a worktop:
// 'world') keeps its wrist (it is planted) and only fans: a deliberate hold (spec.qa.still)
const life = (s, w) => [
  { t0: 0.5, t1: 2.7, cycles: 1, bones: { ...Object.fromEntries([1, 2, 3, 4].map((i) => [`hand.${s}.f${i}a`, 3])), ...(w ? {} : { [`hand.${s}`]: 5 }) }, note: `${s}: the fingers settle onto what they rest on (the easy breath)` },
  { t0: 3.2, t1: 5.6, cycles: 1, bones: { [`hand.${s}.f1s`]: -3, [`hand.${s}.f3s`]: 1.5, [`hand.${s}.f4s`]: 4, [`hand.${s}.t0`]: 4, ...(w ? {} : { [`hand.${s}`]: -4.5 }) }, note: `${s}: the deep breath in: the fingers fan a little, the thumb eases out, the fingers lift a touch` },
  { t0: 5.4, t1: 7.8, cycles: 1, bones: { ...Object.fromEntries([1, 2, 3, 4].flatMap((i) => [[`hand.${s}.f${i}a`, -3], [`hand.${s}.f${i}b`, -2]])), ...(w ? {} : { [`hand.${s}`]: 4 }) }, note: `${s}: the breath out: the fingers ease long` },
];
const fidget = Object.entries(pins).filter(([s, on]) => on && s !== back).flatMap(([s, on]) => life(s, on === 'world'));
const still = Object.fromEntries(Object.entries(pins).filter(([s, on]) => on === 'world' && s !== back).map(([s]) => [s, [[0, 8, 'bears her weight (the floor, a worktop, a chair): planted, it only fans its fingers']]]));
const qa = { ...(back ? { handed: [{ side: back, why: 'the hand rests on the bump\'s far side, out of sight behind it (contact_pose --back)' }] } : {}), ...(Object.keys(still).length ? { still } : {}) };
// a resting hand is a HELD reach (engine/anim.js reachArm: the arm solved in 3D to the wrist each frame, then a damped
// solve; two equal stops = a hold): the plain 2D pin diverged on the far arms and the straight ones (26-75 px)
for (const [s, on] of Object.entries(pins)) if (on) reach[s] = [0, 4].map((t) => ({ t, pose: `side/${poseName}`, on }));
const desc = Object.entries(pins).map(([s, on]) => `her ${s} hand ${on === null ? 'hangs free' : on === 'world' ? 'stays put where it rests' : on === (C.roles?.belly || 'belly') ? 'rides her bump' : 'stays on her ' + on.replace('.', ' (') + ')'}`).join(', ');
// the shot's framing: the pose's posed bounds (props too) with a margin, fitted in the 1080×1920 frame (all fours is wider
// than she is tall: the still frame cut her feet off)
const B = rig.bounds(pose), m = 0.35, bbox = [[B[0][0] - m, B[0][1] - m], [B[1][0] + m, Math.max(B[1][1], 0) + m]].map((p) => p.map((v) => +v.toFixed(2)));
const spec = {
  name, fps: 30, duration: 8, loop: true,
  view: { bbox, note: 'the pose\'s bounds + 0.35 H (tools/side_loop.mjs), fitted in the frame' },
  story: `${poseName} in profile (the side-on library pose), breathing: an easy breath, then a deeper one, her eyes drifting shut on the breath in and her lips parting on the breath out, then her eyes open again, calm; ${desc}. Made by tools/side_loop.mjs.`,
  intensity: 'very gentle and calm: small, soft moves',
  keys: [{ t: 0, pose: `side/${poseName}`, note: 'the library pose, held; a hand resting on something stays there (spec.reach)' }],
  ...(Object.keys(reach).length ? { reach } : {}),
  ...(fidget.length ? { fidget } : {}),
  ...(Object.keys(qa).length ? { qa } : {}),
  tracks: { face: { channels: ['face.gaze', 'face.lid', 'face.mouth', 'face.brow'], keys: [
    { t: 0.0, pose: 'face-calm', ease: 'inOut' },
    { t: 3.5, pose: 'face-calm', ease: 'inOut' },
    { t: 4.3, pose: 'face-in', ease: 'inOut', note: 'the eyes drift shut WITH the deep breath in' },
    { t: 5.6, pose: 'face-in', ease: 'inOut' },
    { t: 6.2, pose: 'face-out', ease: 'inOut', note: 'lips part on the breath out' },
    { t: 6.7, pose: 'face-release', ease: 'inOut' },
    { t: 7.0, pose: 'face-release', ease: 'inOut' },
    { t: 7.6, pose: 'face-calm', ease: 'inOut', note: 'the eyes open at the bottom of the breath' },
  ] } },
  breath: { period: 4, phase0: 0.15,
    amp: [{ t: 0, amp: 0.75 }, { t: 3.0, amp: 0.75 }, { t: 3.4, amp: 1.3 }, { t: 7.0, amp: 1.3 }, { t: 7.4, amp: 0.75 }],
    ampNote: 'the deep breath is 3.4-7.0 s; the amplitude changes only in the pauses at the bottom of a breath (3.0-3.4 s, 7.0-7.4 s), where the wave is 0',
    shape: { inhale: 0.55, exhale: 0.35, pause: 0.1, inEase: [0.42, 0, 0.9, 1], outEase: [0.15, 0, 0.65, 1] },
    delays: { belly: 0, chest: 3, shoulders: 5, head: 7 },
    // a hand bearing weight (on the floor, a worktop, a ball) holds its shoulder down: the breath shows in the back and the
    // bump, not a shrug (a straight supporting arm can't stretch: kneel-pick's wrist slid 11 px off the ball at 2.2°)
    gain: { chestAlong: 0.032, chestAcross: 0.03, chestDeg: -1, shoulderDeg: Object.values(pins).includes('world') ? 0.8 : 2.2, headDeg: -1.2, belly: 0.012 } },
  blink: { close: 3, hold: 1, open: 5 },
  events: [{ type: 'blink', t: 1.9 }],
  drift: { amp: 1, seed: 7, harmonics: [1, 2, 3], chain: { bones: ['spineLower', 'spineUpper', 'chest', 'neck', 'head'], lagFrames: 3, deg: [0.12, 0.2, 0.25, 0.3, 0.45] }, bones: { head: 0.4 } },
};
const out = JSON.stringify(spec, null, 1);
if (argv.includes('--print')) console.log(out);
else { fs.writeFileSync(`${D}anims/${name}.json`, out + '\n'); console.log(`${D}anims/${name}.json: near ${pins.near ?? 'free'}, far ${pins.far ?? 'free'}`); }
