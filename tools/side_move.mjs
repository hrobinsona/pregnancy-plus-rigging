// side_move.mjs — a MOVE between side-on poses (sitting down onto a chair, standing up, kneeling down): the poses as keys
// at their times, each one ALIGNED on her planted feet, the furniture fixed in the world, each hand travelling in hand
// space from what it rests on in one key to what it rests on in the next (engine/anim.js reach: her side, the chair's
// seat, a thigh, the bump), with her breath, blinks and a face track. Writes the aligned keys to
// poses/side/move/<name>/k<i>.json and the shot to anims/side-<name>.json.
//   node tools/side_move.mjs <char> <name> --keys <pose>@<t>[:b],... [--duration 7] [--props <pose>] [--face <pose>@<t>,...]
//     [--land <t>] [--far-shown] [--dphi near=-25] [--plant <i>] [--step far=<t0>-<t1>] [--no-step] [--print]
// --keys   the poses in order with their times (s); ':b' makes a key a BREAKDOWN (the move passes through it without
//          stopping: the hips' path flows from the hinge onto the seat); ':hips' aligns it on her hip, not her feet (her
//          bottom on the props pose's seat); 'shape=<hand>' the near hand's shape there, 'on=<bone>' what it moves with (default: found from the drawing; '-' no stop there), 'dphi=<deg>' its elbow's swivel there, 'skew=<0..1>' its move there front-loaded; 'hand=<t>' / 'hold=<t>' when the hand arrives on that key's contact and
//          until when it stays (default: the key's time, no hold); ':via' the hand passes through that key's arm; 'seat=<t>' the near hand passes through that key's
//          reach at hand=<t> and lands on the chair's seat beside her hip at <t>. The first key is usually a library or standing
//          pose (n-rest: breathe-stroke's standing rest, so a shot can cut from the standing film), the in-betweens are
//          fitted from their own stills (refs/fit_side.sh, MOVES), the last a library pose (side/sit-chair).
// --props  the pose that places the furniture (default: the last key with props); every key is aligned to ITS feet: the
//          near ankle at the same spot, so the chair under her in the last key is under her all shot, and plantFeet 'ik'
//          holds both ankles there each frame (a blend of leg angles slides the feet: engine/anim.js FOOT LOCK).
// --face   the face track's keys (face-* poses); default: calm, the eyes down to the seat on the way down, lips parted
//          as she lands, a sigh with the eyes shut, then calm again.
// Each hand's contact in each key is found from the posed drawing as tools/side_loop.mjs finds a breathing pose's: the
// palm in the bump → belly; a pressing or holding hand → the world (a chair's seat stays put); within 0.3 H of a thigh
// or shin → that bone; a hand away from everything → the pelvis (it rides her hips, as breathe-stroke's hand at her side).
// The far arm stays hidden all shot unless --far-shown (mum3 draws it only where a pose shows it, fx['show.far.arm']).
// Why: Harry 2026-10-14, the side-on library "including moves (walking, breathing, bending over, leaning, transitions like
// standing to sitting)"; the library had only breathing loops and a walk. PIPELINE lesson 76.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
import { ap } from '../engine/geom.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [char, name] = argv, D = `characters/${char}/`;
if (!char || !name || !arg('keys')) { console.error('usage: node tools/side_move.mjs <char> <name> --keys <pose>@<t>[:b],... [--duration 7] [--props <pose>] [--face <pose>@<t>,...] [--far-shown] [--print]'); process.exit(1); }
const C = (await import(`../${D}character.js`)).default, rig = createRig(C), J = C.joints, L = C.roles.legs;
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const read = (p) => JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), solve = (raw) => rig.solve(expandHands(structuredClone(raw), handLib, C.handSides));
const keys = arg('keys').split(',').map((s) => {
  const [p, rest] = s.split('@'), [t, ...fl] = rest.split(':'), num = (k) => { const e = fl.find((x) => x.startsWith(k + '=')); return e ? +e.split('=')[1] : undefined; };
  return { pose: p, t: +t, breakdown: fl.includes('b'), hips: fl.includes('hips'), via: fl.includes('via'), shape: fl.find((x) => x.startsWith('shape='))?.split('=')[1], on: fl.find((x) => x.startsWith('on='))?.split('=')[1], dphi: num('dphi'), skew: num('skew'), hand: num('hand'), hold: num('hold'), seat: num('seat') };
});
const dur = +arg('duration', Math.ceil(keys[keys.length - 1].t + 3)), farShown = argv.includes('--far-shown');
const propsPose = arg('props', [...keys].reverse().find((k) => read(k.pose).props?.items?.length)?.pose ?? keys[keys.length - 1].pose);

// ALIGN every key on the props pose's near foot: its ankle at the same x, the ball of the foot on the same floor row. A
// key marked ':hips' (her bottom on the same seat) aligns its near hip joint on the props pose's instead: sit-down-2's
// still lands with her feet further forward than sit-chair's, so aligned on the feet her bottom sat 0.3 H behind the seat
// and she leaned back against the chair's back (plantFeet 'ik' then brings its feet to the props pose's)
const footOf = (st) => ({ ankle: rig.carry(st, L.near.shin, L.near.ankle), ball: rig.carry(st, L.near.foot, L.near.ball), hip: st[L.near.thigh].pos });
const ref = footOf(solve(read(propsPose))), dir = `${D}poses/side/move/${name}`;
fs.mkdirSync(dir, { recursive: true });
for (const f of fs.readdirSync(dir)) if (/^k\d+\.json$/.test(f)) fs.unlinkSync(`${dir}/${f}`);
const aligned = keys.map((k, i) => {
  const raw = read(k.pose), f = footOf(solve(raw)), dx = k.hips ? ref.hip[0] - f.hip[0] : ref.ankle[0] - f.ankle[0], dy = k.hips ? ref.hip[1] - f.hip[1] : ref.ball[1] - f.ball[1];
  const out = { ...structuredClone(raw), root: [+((raw.root?.[0] ?? 0) + dx).toFixed(4), +((raw.root?.[1] ?? 0) + dy).toFixed(4)], fx: { ...(raw.fx || {}) }, _move: `${name} key ${i}: ${k.pose} aligned on ${propsPose}'s near ${k.hips ? 'hip' : 'foot'} (dx ${dx.toFixed(3)}, dy ${dy.toFixed(3)} H), tools/side_move.mjs` };
  if (!farShown) out.fx['show.far.arm'] = 0;
  // a hanging hand in the side library's relaxed shape (Harry, round 7: "fingers always pointed directly out", lesson 69):
  // n-rest's 'hang' is breathe-stroke's; side-on her hanging hands are 'idle', curled in the picture (walk-pass's)
  for (const sd of ['near', 'far']) if (out.hands?.[sd] === 'hang') { out.hands[sd] = 'idle'; out.fx.fingersIn ??= 0.8; }
  // 'shape=<hand>': the near hand's shape in that key (sit-down-1 presses on a seat its short arm never reaches: open and
  // soft, feeling for the chair); a resting shape curls in the picture as the library's do (fx.fingersIn, qa_checks curl:
  // sit-down-2's hand on her thigh read -5°, "fingers straight out", round 16)
  if (k.shape) (out.hands ||= {}).near = k.shape;
  if (['softrest', 'idle', 'rest', 'siderest'].includes(out.hands?.near)) out.fx.fingersIn ??= 0.5;
  if (k.pose !== propsPose) delete out.props;
  const nm = `side/move/${name}/k${i}`; fs.writeFileSync(`${D}poses/${nm}.json`, JSON.stringify(out, null, 1) + '\n');
  return { ...k, name: nm, raw: out, st: solve(out) };
});

// where each hand rests in each key (as tools/side_loop.mjs finds it)
const bump = C.params?.depth?.proxies?.find((q) => q.name === 'bump');
const inBump = (st, p) => {
  if (!bump) return false;
  const M = st[bump.bone].M, j = J[rig.BONE[bump.bone].joint], det = M[0] * M[3] - M[1] * M[2], dx = p[0] - M[4], dy = p[1] - M[5];
  const r = [(M[3] * dx - M[2] * dy) / det + j[0], (-M[1] * dx + M[0] * dy) / det + j[1]];
  return ((r[0] - bump.at[0]) / (bump.axes[0] + 0.15)) ** 2 + ((r[1] - bump.at[1]) / (bump.axes[1] + 0.15)) ** 2 <= 1;
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const segDist = (p, a, b) => { const d = [b[0] - a[0], b[1] - a[1]], u = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2))); return dist(p, [a[0] + u * d[0], a[1] + u * d[1]]); };
const contactOf = (k, side) => {
  const st = k.st, tip = rig.carry(st, 'hand.' + side, side === 'near' ? 'handNearTip' : 'handFarTip'), wr = st['hand.' + side].pos, palm = [(tip[0] + wr[0]) / 2, (tip[1] + wr[1]) / 2];
  if (inBump(st, palm)) return C.roles?.belly || 'belly';
  const h = k.raw.hands?.[side], how = typeof h === 'string' ? h : h?.pose;
  if (['press', 'grip', 'palmdown', 'hold', 'lay', 'flat', 'drape'].includes(how)) return 'world';
  if (['hang', 'idle'].includes(how)) return 'pelvis';   // (hanging at her side beside the thigh, not on it)
  // on a leg: its own side's first (the near hand on the near thigh lies over the far one too, seen side-on)
  for (const sd of [side, side === 'near' ? 'far' : 'near']) {
    let best = null;
    for (const [b, a, e] of [['thigh.' + sd, 'hip', 'knee'], ['shin.' + sd, 'knee', 'ankle']]) {
      const S = sd === 'near' ? 'Near' : 'Far', A = st[b].pos, E = rig.carry(st, b, e + S), d = Math.min(segDist(palm, A, E), segDist(wr, A, E));
      if (d < 0.3 && (!best || d < best.d)) best = { b, d };
    }
    if (best) return best.b;
  }
  return 'pelvis';
};
// each hand: a stop at every key on what it rests on there (two keys on the same thing in a row: a hold). A free hand rides
// her pelvis with breathe-stroke's swivel (dphi −25: its elbow just behind her back, the arm drawn full length, lesson 39)
const dphi = Object.fromEntries((arg('dphi', 'near=-25,far=-25')).split(',').map((kv) => kv.split('=')).map(([s, v]) => [s, +v]));
const reach = {};
// (key flags hand=<t>, hold=<t>: when the hand ARRIVES on that key's contact and until when it stays there; default the
// key's own time, no hold. Sitting down, the hand reaches the seat before her hips pass the hinge and stays on it, taking
// her weight, until her bottom is down; only then does it come off the seat to her thigh)
// key flag ':via': the hand passes through that key's arm without stopping (sit-down-1's reach back, feeling for the
// chair, on its way to her thigh).
// key flag seat=<t>: the hand, having reached back as that key's still draws it (passed through at hand=<t>, not stopped
// at), lands ON THE CHAIR'S SEAT at <t>, beside her hip as the props pose seats her (palm down on the seat's top, its
// middle 0.4 H ahead of her hip joint), and stays till hold=<t>. The in-between's still puts the chair under its own hand
// at its own proportions (her arms ~90% of a real woman's, the stills' ~105%, lesson 72): aligned on her feet,
// sit-down-1's hand reached back 0.85 H above the shot's seat, pressing on air; she finds the seat as her hips come down.
const chair = rig.build(expandHands(structuredClone(read(propsPose)), handLib, C.handSides)).find((p) => p.place?.type === 'chair' && (p.place.back ?? -1) < 0)?.place;
const hipP = solve(read(propsPose))[L.near.thigh].pos;
const onSeat = (k, side) => {
  const pts = rig.build(expandHands(structuredClone(k.raw), handLib, C.handSides)).filter((p) => p.id === `hand.${side}.palm`).flatMap((p) => p.geom.P.map((q) => ap(p.M, q)));
  if (!chair || !pts.length) throw new Error(`seat=: no chair in ${propsPose} or no palm in ${k.pose}`);
  const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, lo = Math.max(...pts.map((q) => q[1]));
  return [+(hipP[0] + 0.4 - cx).toFixed(3), +(chair.seatY - lo).toFixed(3)];
};
for (const side of farShown ? ['near', 'far'] : ['near']) reach[side] = aligned.flatMap((k) => {
  if (side === 'near' && k.on === '-') return [];   // 'on=-': the hand makes no stop at this key (the body passes through it)
  const on = (side === 'near' && k.on) || contactOf(k, side), a = k.hand ?? k.t;
  // (the swivel only where the arm hangs or reaches back: on the bump or a thigh the arm is the pose's own, as its breathing
  // loop draws it; with breathe-stroke's −25° and the bump's surface there, sit-chair's forearm pointed at the camera,
  // drawn at 74% of its length, the hand at 57%: qa_checks limbs, round 16)
  const e = { pose: k.name, on, ...(['pelvis', 'world'].includes(on) ? { dphi: dphi[side] ?? -25 } : {}), ...(side === 'near' && k.dphi !== undefined ? { dphi: k.dphi } : {}), ...(side === 'near' && k.skew !== undefined ? { skew: k.skew } : {}) };
  if (k.seat !== undefined && side === 'near') {
    // keyedArm: held on the seat while her body comes down past it, the 3D solve flipped the elbow's branch (an 11–17 px
    // elbow pop a frame at 2.63–2.70 s, the wrist still: qa_checks limbs); the keys' own arm, the wrist carried in 2D
    const s = { ...e, on: 'world', dp: onSeat(k, side) };
    return [{ t: a, ...e, on: 'world', via: true, note: `${k.pose}: reaching back for the seat` }, { t: k.seat, ...s, note: 'on the seat beside her hip' }, ...(k.hold > k.seat ? [{ t: k.hold, ...s, note: 'held: her weight on it as she lands' }] : [])];
  }
  if (k.via) return [{ t: a, ...e, via: true, note: `${k.pose}: passing through (${on})` }];
  return [{ t: a, ...e, note: `${k.pose}: on ${on}` }, ...(k.hold > a ? [{ t: k.hold, ...e, note: 'held' }] : [])];
});
for (const r of Object.values(reach)) for (let i = 1; i < r.length; i++) if (r[i].t <= r[i - 1].t) throw new Error(`reach stops out of order at ${r[i].t} (${r[i].note})`);
// a via's wrist bend: on the way between its neighbours' (engine/anim.js stop.local), not its own pose's (a press)
for (const [sd, r] of Object.entries(reach)) r.forEach((e, i) => {
  if (!e.via) return; const bend = (q) => read(q.pose).bones?.['hand.' + sd] ?? 0, a = r.slice(0, i).reverse().find((q) => !q.via), b = r.slice(i + 1).find((q) => !q.via);
  if (a && b) e.local = +(bend(a) + (e.t - a.t) / (b.t - a.t) * (bend(b) - bend(a))).toFixed(2);
});

// the face: calm; the eyes down toward the seat on the way down; lips parted as she lands; a sigh, eyes shut; calm
// (t0: she sets off, the last key still on the first pose; tLand: the key before the last, where her weight lands)
const t0 = [...keys].reverse().find((k) => k.pose === keys[0].pose).t, tLand = +arg('land', keys[keys.length - 2].t), tEnd = keys[keys.length - 1].t;
const face = arg('face') ? arg('face').split(',').map((s) => { const [p, t] = s.split('@'); return { t: +t, pose: p, ease: 'inOut' }; }) : [
  { t: 0, pose: 'face-calm', ease: 'inOut' },
  { t: t0, pose: 'face-calm', ease: 'inOut' },
  { t: t0 + 0.4, pose: 'face-gaze', ease: 'inOut', note: 'the eyes go down toward the seat as she starts down' },
  { t: tLand - 0.2, pose: 'face-gaze', ease: 'inOut' },
  { t: tLand + 0.15, pose: 'face-ease', ease: 'inOut', note: 'lips part as her weight lands' },
  { t: tLand + 0.6, pose: 'face-out', ease: 'inOut', note: 'the sigh: eyes softly shut' },
  { t: tEnd + 0.4, pose: 'face-release', ease: 'inOut' },
  { t: tEnd + 1.1, pose: 'face-calm', ease: 'inOut', note: 'the eyes open, a soft smile' },
].filter((k) => k.t <= dur);
// THE STANCE: her feet stand where the first key puts them (she starts from there), and a foot that stands elsewhere in
// the props pose STEPS there as she sets off (engine/anim.js plantFeetSteps: a min-jerk arc, lifted 0.035 H), as a woman
// steps back to feel the chair before she sits. Planted on the seated pose instead, the standing key's straight far leg
// couldn't reach its spot 0.63 H back and hung 12 px up, then dropped as she sat; dragged there, it slid (round 16).
// --plant <i> plants on key i; --step far=<t0>-<t1> times a step (default t0 + 0.05 for 0.55 s); --no-step skips them.
const plantI = +arg('plant', 0), stance = solve(aligned[plantI].raw), propsSt = solve(aligned.find((k) => k.pose === propsPose).raw);
const steps = argv.includes('--no-step') ? [] : ['near', 'far'].flatMap((sd) => {
  const a = rig.carry(stance, L[sd].shin, L[sd].ankle), b = rig.carry(propsSt, L[sd].shin, L[sd].ankle);
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) return [];
  const o = argv.find((x, i) => argv[i - 1] === '--step' && x.startsWith(sd + '='))?.split('=')[1].split('-').map(Number) ?? [+(t0 + 0.05).toFixed(2), +(t0 + 0.6).toFixed(2)];
  return [{ side: sd, t0: o[0], t1: o[1], to: aligned.find((k) => k.pose === propsPose).name, lift: 0.035, note: `the ${sd} foot steps ${((b[0] - a[0]) * (b[0] < a[0] ? -1 : 1)).toFixed(2)} H ${b[0] < a[0] ? 'back' : 'forward'} to where ${propsPose} stands it` }];
});
// LIFE once she has landed (qa_checks 'alive': a hand only carried by her body reads stuck on), as tools/side_loop.mjs
// gives a resting hand: the fingers settle onto what they rest on, then fan a little with the thumb easing out. A hand
// bearing her weight (on 'world') only fans. Without it the hand on her bump read FROZEN from 4.1 s to the end (round 16)
const life = (farShown ? ['near', 'far'] : ['near']).flatMap((sd) => {
  const w = contactOf(aligned[aligned.length - 1], sd) === 'world', a = tEnd + 0.2, b = Math.min(dur, tEnd + 2.9); if (b - a < 1.2) return [];
  return [
    { t0: a, t1: a + 0.55 * (b - a), cycles: 1, bones: { ...Object.fromEntries([1, 2, 3, 4].map((i) => [`hand.${sd}.f${i}a`, 3])), ...(w ? {} : { [`hand.${sd}`]: 5 }) }, note: `${sd}: the fingers settle onto what they rest on` },
    { t0: a + 0.45 * (b - a), t1: b, cycles: 1, bones: { [`hand.${sd}.f1s`]: -3, [`hand.${sd}.f3s`]: 1.5, [`hand.${sd}.f4s`]: 4, [`hand.${sd}.t0`]: 4, ...(w ? {} : { [`hand.${sd}`]: -4.5 }) }, note: `${sd}: the fingers fan a little, the thumb eases out` },
  ];
});
// framing: every key's bounds with the furniture, + 0.35 H
const bs = aligned.map((k) => rig.bounds(expandHands(structuredClone({ ...k.raw, props: read(propsPose).props }), handLib, C.handSides))), m = 0.35;
const bbox = [[Math.min(...bs.map((b) => b[0][0])) - m, Math.min(...bs.map((b) => b[0][1])) - m], [Math.max(...bs.map((b) => b[1][0])) + m, Math.max(0, ...bs.map((b) => b[1][1])) + m]].map((p) => p.map((v) => +v.toFixed(2)));
const spec = {
  name: `side-${name}`, fps: 30, duration: dur, loop: false,
  view: { bbox, note: 'every key\'s bounds with the furniture + 0.35 H (tools/side_move.mjs)' },
  story: `${name} in profile: ${keys.map((k) => k.pose).join(' → ')}, her feet planted, the furniture still, each hand moving from what it rests on to the next; she lands with parted lips and sighs. Made by tools/side_move.mjs.`,
  intensity: 'calm and careful: a pregnant woman moving slowly, her weight controlled',
  propsFrom: aligned.find((k) => k.pose === propsPose)?.name,
  plantFeet: 'ik', plantFeetRef: aligned[plantI].name, ...(steps.length ? { plantFeetSteps: steps } : {}), plantFeetRoot: false, plantFeetSink: true,
  // (each key's note names the still it was fitted from, so tools/ref_match.py puts the film beside it for the critics)
  keys: aligned.map((k) => { const st_ = k.raw._fit?.ref?.match(/([a-z0-9_]+_\d+)\.json$/)?.[1]; return { t: k.t, pose: k.name, ease: 'inOut', ...(k.breakdown ? { kind: 'breakdown' } : {}), note: k.pose + (st_ ? ` (still ${st_})` : '') }; }),
  reach,
  ...(life.length ? { fidget: life } : {}),
  // (a hand that starts HANGING rides her hips: as they set off back and down it trails ~7° before it swings forward to
  // where it lands, the follow-through of a carried hand, not a wrist flapping: qa_checks' 4° allowance is for a hand
  // moved at the wrist; side-sit-down, round 16)
  qa: { ...(farShown ? {} : { handed: [{ side: 'far', why: 'the far arm is hidden all shot (tools/side_move.mjs)' }] }), curl: { sides: farShown ? ['near', 'far'] : ['near'] },
    ...(Object.entries(reach).some(([, r]) => r[0]?.on === 'pelvis') ? { wristTurn: Object.fromEntries(Object.entries(reach).filter(([, r]) => r[0]?.on === 'pelvis').map(([sd]) => [sd, { max: 10, note: 'the hanging hand trails her hips as they set off, then swings forward (tools/side_move.mjs)' }])) } : {}) },
  tracks: { face: { channels: ['face.gaze', 'face.lid', 'face.mouth', 'face.brow'], keys: face } },
  breath: { period: 4, phase0: 0.15, amp: [{ t: 0, amp: 0.6 }],
    shape: { inhale: 0.55, exhale: 0.35, pause: 0.1, inEase: [0.42, 0, 0.9, 1], outEase: [0.15, 0, 0.65, 1] },
    delays: { belly: 0, chest: 3, shoulders: 5, head: 7 },
    gain: { chestAlong: 0.032, chestAcross: 0.03, chestDeg: -1, shoulderDeg: 2.2, headDeg: -1.2, belly: 0.012 } },
  blink: { close: 3, hold: 1, open: 5 },
  events: [{ type: 'blink', t: Math.min(dur - 0.5, tEnd + 1.8) }],
  drift: { amp: 1, seed: 7, harmonics: [1, 2, 3], chain: { bones: ['spineLower', 'spineUpper', 'chest', 'neck', 'head'], lagFrames: 3, deg: [0.12, 0.2, 0.25, 0.3, 0.45] }, bones: { head: 0.4 } },
};
const out = JSON.stringify(spec, null, 1);
if (argv.includes('--print')) console.log(out);
else { fs.writeFileSync(`${D}anims/side-${name}.json`, out + '\n'); console.log(`${D}anims/side-${name}.json: ${aligned.length} keys aligned on ${propsPose}, feet planted as in key ${plantI}${steps.map((x) => `, ${x.side} foot steps ${x.t0}-${x.t1} s`).join('')}; ${Object.entries(reach).map(([s, r]) => `${s}: ${r.map((e) => e.on).join(' → ')}`).join('; ')}`); }
