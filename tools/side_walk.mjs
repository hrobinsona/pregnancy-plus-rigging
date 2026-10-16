// side_walk.mjs — a WALK CYCLE for a side-on character, its legs driven by MEASURED HUMAN GAIT: the sagittal hip, knee,
// ankle and toe angles of an adult walking at a natural pace through one gait cycle (Winter 2009, Perry & Burnfield 2010;
// GAIT below), the second leg half a cycle behind the first. Her trunk, head, hands and the arms' swing come from the
// side-on library's walk poses (side/walk-*: fitted to the stills). Writes the cycle's poses to poses/side/cycle/ and the
// shot to anims/<out>.json: a loop that walks in place (spec.walk, engine/anim.js: the lowest sole points stay planted, a
// rolling heel → ball → toe contact, the camera travels with her), every pose passed through on one smooth periodic curve
// (spec.cyclic), with her breath, blinks and the spine's drift.
//   node tools/side_walk.mjs <char> [--step 0.6] [--loops 4] [--samples 12] [--stride 0.9] [--tilt 10] [--even 0.85] [--clear 0.05] [--lag 0.06] [--out side-walk]
// --lag      how far behind its forearm's swing each hand turns (cycles; 0 = rigid with it)
// --step     seconds a step (0.6: 100 steps a minute, an easy pregnant pace)
// --samples  poses a step (12: one every 0.05 s at --step 0.6; the curve between them is smooth)
// --stride   the hip's swing about its mean (1 = the measured adult's; pregnant women walk with a shorter stride)
// --tilt     the pelvis's forward tilt the hip angles are measured from (deg; the rig's rest pelvis is upright)
// Why measured gait and not the stills as keys (the first version): each still draws its own stride and its own leg
// lengths, so keyed in sequence the back toe slid 0.5 H along the floor between contact and down, the swinging leg had no
// pose between its push-off and the next heel strike, and the stills' 'passing' prompts came back as contacts three times.
// The stills still set her posture and arm swing. PIPELINE lesson 63.
// Why: Harry 2026-10-14: "presumably you will also add motion to that library, i.e. walking, breathing, bending over".
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
import { makeAnim } from '../engine/anim.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [char] = argv, D = `characters/${char}/`;
if (!char) { console.error('usage: node tools/side_walk.mjs <char> [--step 0.6] [--loops 4] [--samples 12] [--stride 0.9] [--tilt 10] [--even 0.85] [--clear 0.05] [--out side-walk]'); process.exit(1); }
const C = (await import(`../${D}character.js`)).default, rig = createRig(C), J = C.joints, BONE = rig.BONE, L = C.roles.legs;
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const read = (p) => JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), solve = (raw) => rig.solve(expandHands(structuredClone(raw), handLib, C.handSides));
const Ts = +arg('step', 0.6), loops = +arg('loops', 4), N = +arg('samples', 12), stride = +arg('stride', 0.9), tilt = +arg('tilt', 10), out = arg('out', 'side-walk');

// MEASURED GAIT, every 5% of the cycle from heel strike (deg): hip flexion (+ forward, from the pelvis), knee flexion;
// the SOLE's angle to the floor (+ the toes up), from the same measurements (ankle + shank angle): flat from 8% to 38% of the
// cycle, the heel rising from 40% to the toe-off at 60%, the foot hanging toe-down behind her through the early swing; the
// toes' bend (MTP extension, + up) where they are off the floor. The ankle is what keeps the sole at its angle: taken from
// the tables it rocked the flat foot ±4° (their rounding, and the hip's swing scaled for her), and the planted point
// jumped between heel and ball, her pace 1.1–6.9 H/s within a step. Through push-off the toes stay flat on the floor.
// The rig's bones take them as: thigh = hip − tilt, shin = −knee, foot = sole − (pelvis + thigh + shin), toe = the bend.
const GAIT = {
  // (the hip's flexion peaks at 85–90% and eases back before heel strike, as measured: the swinging foot already drawing
  // back under her as it lands; at the tables' first rounding it was still reaching forward at contact, the heel landed
  // moving with her, and her travel stalled for a frame each step)
  hip:  [26, 25.5, 24.5, 22.5, 19, 14, 10, 5, 0, -5, -8, -7, -2, 6, 14, 21, 28, 31, 30.5, 28.5, 26],
  knee: [5, 12, 17, 19, 17, 13, 9, 6, 6, 9, 15, 25, 37, 50, 59, 60, 53, 40, 23, 9, 5],
  // (her shoe is long for her legs and her ankle high in it, so a few degrees off the tables: the swing less toe-down at
  // 75–85% (its toe skimmed the floor by 0.016 H passing the standing foot), the heel rise lower (rolling up a long foot
  // lifted her so far the landing foot met the floor flat, still swinging forward), the toes up for the heel strike from
  // 90%, the knee straightening a little later)
  sole: [20, 7, 1, 0, 0, 0, 0, 0, -3, -12, -27, -46, -62, -68, -60, -44, -28, -10, 6, 15, 20],
  toe:  [10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 8, 3, 0, 3, 5, 8, 10],
};
// (the toes flat on the floor from heel rise to toe-off: their bend undoes the sole's angle there)
const onFloor = (c) => { const u = ((c % 1) + 1) % 1, r = (a, b, x) => Math.max(0, Math.min(1, (x - a) / (b - a))); return r(0.37, 0.41, u) * (1 - r(0.58, 0.62, u)); };
// a periodic smooth curve through a table (Catmull-Rom), c in cycles
const at = (tab, c) => { const n = tab.length - 1, u = (((c % 1) + 1) % 1) * n, i = Math.floor(u), f = u - i, g = (k) => tab[((i + k) % n + n) % n];
  const p0 = g(-1), p1 = g(0), p2 = g(1), p3 = g(2);
  return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f); };
const hipMean = GAIT.hip.slice(0, -1).reduce((a, b) => a + b, 0) / (GAIT.hip.length - 1);

// the drawn direction of a bone on screen (deg: 0 forward, 90 down)
const dirOf = (st, id) => { const B = BONE[id], p = st[id].pos, M = st[id].M, a = J[B.aim], j = J[B.joint];
  const q = st[B.aim]?.pos ?? [M[0] * (a[0] - j[0]) + M[2] * (a[1] - j[1]) + M[4], M[1] * (a[0] - j[0]) + M[3] * (a[1] - j[1]) + M[5]];
  return Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI; };
const dA = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
// set bones (parents first) so each is DRAWN in the wanted direction (tools/pose_dirs.mjs's search)
const setDirs = (raw, want) => {
  const p = structuredClone(raw);
  for (const id of C.bones.map((b) => b.id).filter((id) => id in want)) {
    const B = BONE[id], lo = B.min ?? -180, hi = B.max ?? 180, at_ = (v) => dirOf(solve({ ...p, bones: { ...p.bones, [id]: v } }), id);
    let best = p.bones[id] ?? 0, be = dA(at_(best), want[id]);
    for (let v = lo; v <= hi; v += 1) { const e = dA(at_(v), want[id]); if (e < be) { be = e; best = v; } }
    for (let s = 0.5; s > 0.01; s /= 2) for (const v of [best - s, best + s]) { if (v < lo || v > hi) continue; const e = dA(at_(v), want[id]); if (e < be) { be = e; best = v; } }
    p.bones[id] = Math.round(best * 10) / 10;
  }
  return p;
};
const sole = (st, sd) => { const on = (b, p) => { const j = J[BONE[b].joint], M = st[b].M; return [M[0] * (p[0] - j[0]) + M[2] * (p[1] - j[1]) + M[4], M[1] * (p[0] - j[0]) + M[3] * (p[1] - j[1]) + M[5]]; };
  return [...L[sd].sole.foot.map((p) => on(L[sd].foot, p)), ...L[sd].sole.toe.map((p) => on(L[sd].toe, p))]; };

// the FAR LEG at the near one's length: the master draws it 0.16 H short (thigh, shin and the shoe's height on its ankle:
// her far side seen a little from above, its floor line higher). Seen from the side both legs are one length, and stepping
// alternately on a short leg she limped: each step 0.1 H lower than the last. The cycle draws it stretched (pose.scale).
const footH = (sd) => J[L[sd].ankle][1] - L[sd].sole.toe[0][1];
const len0 = (p, q) => Math.hypot(J[q][0] - J[p][0], J[q][1] - J[p][1]);
const FAR_SCALE = { [L.far.thigh]: [+(len0(L.near.hip, L.near.knee) / len0(L.far.hip, L.far.knee)).toFixed(4), 1],
  [L.far.shin]: [+((len0(L.near.knee, L.near.ankle) - footH('near') + footH('far')) / len0(L.far.knee, L.far.ankle)).toFixed(4), 1] };

// the STYLE: the library's walk poses. The trunk and head one posture all cycle (their mean: fitted one by one, the stills'
// trunks differ by a few degrees, and blended that rocks her like a boat; the walk's bob comes from the legs). The arms
// swing between contact's and its mirror's (each segment drawn where the other arm's was), against the legs.
const names = ['walk-contact', 'walk-down', 'walk-pass', 'walk-up'].filter((n) => fs.existsSync(`${D}poses/side/${n}.json`));
if (!names.includes('walk-contact')) { console.error('side_walk: needs side/walk-contact'); process.exit(1); }
const raws = Object.fromEntries(names.map((n) => [n, read(`side/${n}`)])), base = raws['walk-contact'];
const TRUNK = (C.roles.spine || []).filter((b) => BONE[b]);
const trunk = Object.fromEntries(TRUNK.map((b) => [b, +(names.reduce((a, n) => a + (raws[n].bones[b] ?? 0), 0) / names.length).toFixed(2)]));
const ARM = ['clavicle', 'shoulderAbd', 'upperArm', 'armAbd', 'armRot', 'forearm', 'foreRot', 'hand'];
const sb = solve(base), wantM = {};
for (const b of ['upperArm', 'forearm', 'hand']) for (const [a, o] of [['near', 'far'], ['far', 'near']]) wantM[`${b}.${a}`] = dirOf(sb, `${b}.${o}`);
const mirrored = setDirs(base, wantM);
// which leg strikes first: contact's front foot; its arm is the one swung back there
const front = ['near', 'far'].reduce((a, b) => (Math.max(...sole(sb, a).map((q) => q[0])) > Math.max(...sole(sb, b).map((q) => q[0])) ? a : b));
const back = front === 'near' ? 'far' : 'near';

// the pose at c (cycles from the front leg's heel strike)
// (the hip's angle is the thigh's from PLUMB: her rest pose draws the thighs 4–5° back of plumb, her pelvis ahead of her
// feet, so a thigh's bone value 0 is not plumb; uncorrected, every walking leg leaned back 4.6°, the hip sat over the front
// foot, and the swinging heel met the floor before the standing leg had carried her to it)
const s0 = solve({}), plumb = Object.fromEntries(['near', 'far'].map((sd) => [sd, dirOf(s0, `thigh.${sd}`) - 90]));
const legBones = (sd, c, pelvis, bend = 0) => {
  const th = hipMean + stride * (at(GAIT.hip, c) - hipMean) - tilt + plumb[sd], sh = -at(GAIT.knee, c) - bend, so = at(GAIT.sole, c), w = onFloor(c);
  return { [`thigh.${sd}`]: th, [`shin.${sd}`]: sh, [`foot.${sd}`]: so - pelvis - th - sh, [`toe.${sd}`]: Math.min(60, w * Math.max(0, -so) + (1 - w) * at(GAIT.toe, c)), [`hipAbd.${sd}`]: 0 };
};
// the SWINGING FOOT CLEARS THE FLOOR: from toe-off (60%) to heel strike it stays above the standing foot's lowest point by
// a little arc (up to --clear H, nothing at either end), its knee bending further where the tables would let it touch. The
// tables are for the measured adult's proportions; on hers the swinging foot met the floor at 87% of the cycle, still
// swinging forward, and skidded 0.3 H to its heel strike. Her shoe's heel sits above its sole line (a flat's rounded
// heel): the heel lands first only with the toes up ~15° or more, so they are at 20° (critic R5: "toe up 15–20°")
const gClear = +arg('clear', 0.05), lowY = (st, sd) => Math.max(...sole(st, sd).map((q) => q[1]));
// (the gap: rising from toe-off, held through mid-swing, easing to nothing for the heel strike from 85%: near landing the
// leg is nearly straight and a knee bend barely lifts the foot, so a gap there bent it 34° and kicked it out to land)
const gap = (c) => { const u = ((c % 1) + 1) % 1, r = (a, b) => Math.max(0, Math.min(1, (u - a) / (b - a))), e = (x) => x * x * (3 - 2 * x);
  return u > 0.6 ? gClear * e(r(0.6, 0.68)) * (1 - e(r(0.82, 0.97))) : 0; };
// the arms swing against the legs, at their widest a little after each heel strike
const armW = (c) => (1 - Math.cos(2 * Math.PI * (c - 0.05))) / 2;
// the HANDS TRAIL THE SWING (overlapping action): a loose hand doesn't turn with its forearm, it follows it --lag cycles
// later (0.06: ~2 frames at --step 0.6), so it drags behind as the arm swings forward, flops past as it turns back. Rigid
// with the forearm, the hands read stiff, "when a person is walking they don't have stiffness in their arms" (Harry, round 8)
const lag = +arg('lag', 0.06);
const armBones = (c) => { const w = armW(c), bones = { ...base.bones, ...trunk };
  for (const sd of ['near', 'far']) for (const b of ARM) { const k = `${b}.${sd}`; if (k in base.bones || k in mirrored.bones) bones[k] = +((1 - w) * (base.bones[k] ?? 0) + w * (mirrored.bones[k] ?? 0)).toFixed(2); }
  return bones; };
const handGain = Object.fromEntries(['near', 'far'].map((sd) => { const k = `hand.${sd}`, b0 = base.bones[k] ?? 0, d = (v) => dirOf(solve({ ...base, bones: { ...base.bones, [k]: v } }), k);
  return [sd, 1 / (((d(b0 + 1) - d(b0 - 1) + 540) % 360 - 180) / 2 || 1)]; }));   // bone degrees per drawn degree (signs differ per side)
const trail = (c) => { if (!lag) return {}; const now = solve({ ...base, bones: armBones(c) }), then = solve({ ...base, bones: armBones(c - lag) });
  return Object.fromEntries(['near', 'far'].map((sd) => [`hand.${sd}`, handGain[sd] * (((dirOf(then, `forearm.${sd}`) - dirOf(now, `forearm.${sd}`) + 540) % 360) - 180)])); };
const poseAtC = (c) => {
  const bones = armBones(c), tr = trail(c);
  for (const [k, v] of Object.entries(tr)) bones[k] = +((bones[k] ?? 0) + v).toFixed(2);
  const pv = bones.pelvis ?? 0, ph = { [front]: c, [back]: c + 0.5 };
  const make = (bend) => { const b = { ...bones }; for (const sd of ['near', 'far']) Object.assign(b, legBones(sd, ph[sd], pv, bend[sd] || 0));
    for (const k of Object.keys(b)) if (/^(thigh|shin|foot|toe)\./.test(k)) b[k] = +b[k].toFixed(2);
    return { ...base, bones: b, scale: { ...(base.scale || {}), ...FAR_SCALE }, fx: { ...(base.fx || {}), skirtSwing: 0.15 } }; };
  let p = make({});
  // (the swinging leg: the one past toe-off; its knee bent by the least that keeps its gap, a bisection)
  const sw = ['near', 'far'].find((sd) => (((ph[sd] % 1) + 1) % 1) > 0.6);
  if (sw) { const st = sw === 'near' ? 'far' : 'near', ok = (q) => { const s_ = solve(q); return lowY(s_, st) - lowY(s_, sw) >= gap(ph[sw]) - 1e-4; };
    if (!ok(p)) { let lo = 0, hi = 45; for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (ok(make({ [sw]: m }))) hi = m; else lo = m; } p = make({ [sw]: hi }); p.note_ = `the ${sw} knee bent ${hi.toFixed(1)}° more to clear the floor`; } }
  return p;
};

// TIMED BY TRAVEL: the gait tables are timed for the measured adult's body; on hers (a long shoe, a high ankle, the hip's
// swing scaled) the same angles carried her at 1.5 H/s through mid-stance and 7 H/s rolling over the ball, a lurch each
// step. So the cycle's phase is re-timed so her planted travel runs nearly evenly (--even: 1 = exactly; the rest keeps a
// little of a walker's natural surge): the travel measured on a fine sampling (the engine's own planting rule), inverted.
const BREATH = { phase0: 0.15, amp: 0.7, shape: { inhale: 0.5, exhale: 0.4, pause: 0.1, inEase: [0.42, 0, 0.9, 1], outEase: [0.15, 0, 0.65, 1] },
  delays: { belly: 0, chest: 3, shoulders: 5, head: 7 }, gain: { chestAlong: 0.025, chestAcross: 0.02, chestDeg: -0.8, shoulderDeg: 1.5, headDeg: -0.8, belly: 0.01 } };
const even = +arg('even', 0.85), pre = (c) => expandHands(structuredClone(poseAtC(c)), handLib, C.handSides);
const travelOf = () => { const F = 96, lf = {}, ks = [];
  for (let k = 0; k <= F; k++) { lf[`f${k}`] = pre(k / F); ks.push({ t: +((k / F) * 2 * Ts).toFixed(5), pose: `f${k}` }); }
  ks.pop();   // (the loop closes on the first)
  const a = makeAnim({ name: 'walk-travel', fps: 30, duration: 2 * Ts, loop: true, cyclic: true, walk: {}, keys: ks, breath: { ...BREATH, period: 2 * Ts, amp: 0 } }, { ...lf, ...lf }, { rig, C, quiet: true });
  const S_ = a.walk.S(); return Array.from({ length: 201 }, (_, i) => (i === 200 ? 1 : a.walk.X((i / 200) * 2 * Ts) / S_)); };
const U = travelOf(), cOf = (u) => { let i = 0; while (i < 199 && U[i + 1] < u) i++; const f = (u - U[i]) / ((U[i + 1] - U[i]) || 1); return (i + Math.max(0, Math.min(1, f))) / 200; };
fs.rmSync(`${D}poses/side/cycle`, { recursive: true, force: true });
fs.mkdirSync(`${D}poses/side/cycle`, { recursive: true });
const per = 2 * N, made = [];
for (let k = 0; k < per; k++) {
  const nm = `side/cycle/walk-${String(k).padStart(2, '0')}`, u = k / per, c = (1 - even) * u + even * cOf(u);
  const { note_, ...p } = poseAtC(c);
  fs.writeFileSync(`${D}poses/${nm}.json`, JSON.stringify({ ...p, name: `walk-${String(k).padStart(2, '0')}`,
    note: `tools/side_walk.mjs: ${(c * 100).toFixed(1)}% of the gait cycle from the ${front} heel strike, at ${(u * 100).toFixed(1)}% of the loop's time (measured gait angles, the hip's swing ×${stride}, pelvis tilt ${tilt}°, timed by travel ×${even}); trunk, head and hands from side/${names.join(', side/')}; the far leg at the near one's length${note_ ? `; ${note_}` : ''}` }, null, 1) + '\n');
  made.push(nm);
}
const Dur = +(2 * Ts * loops).toFixed(4), period = +(Dur / Math.max(1, Math.round(Dur / 2.4))).toFixed(4);   // (a whole number of breaths in the loop, ~2.4 s each: walking, she breathes a little faster)
const keys = []; for (let c = 0; c < loops; c++) for (let k = 0; k < per; k++) keys.push({ t: +((c + k / per) * 2 * Ts).toFixed(4), pose: made[k] });
// framing: the contact pose's bounds, wide enough for the stride, fitted in the frame
const bb = rig.bounds(expandHands(structuredClone(base), handLib, C.handSides)), m = 0.5;
const spec = {
  name: out, fps: 30, duration: Dur, loop: true, cyclic: true,
  view: { bbox: [[+(bb[0][0] - m).toFixed(2), +(bb[0][1] - m).toFixed(2)], [+(bb[1][0] + m).toFixed(2), m]], note: 'the walk-contact pose\'s bounds + 0.5 H (tools/side_walk.mjs)' },
  story: `She walks along in profile, at an easy pregnant pace (${Math.round(60 / Ts)} steps a minute): heel, roll, push off, her arms swinging gently against her legs, the skirt swinging; calm, a soft smile. Made by tools/side_walk.mjs.`,
  intensity: 'gentle: an easy, unhurried walk',
  walk: { note: 'engine/anim.js walkRoot: the lowest sole points stay planted (a rolling contact), the camera travels with her at her mean speed' },
  keys,
  tracks: { face: { channels: ['face.gaze', 'face.lid', 'face.mouth', 'face.brow'], keys: [{ t: 0, pose: 'face-calm', ease: 'inOut' }] } },
  breath: { ...BREATH, period },
  blink: { close: 3, hold: 1, open: 5 },
  events: [{ type: 'blink', t: +(0.35 * Dur).toFixed(2) }, { type: 'blink', t: +(0.82 * Dur).toFixed(2) }],
  drift: { amp: 0.6, seed: 11, harmonics: [1, 2, 3], chain: { bones: ['spineLower', 'spineUpper', 'chest', 'neck', 'head'], lagFrames: 3, deg: [0.1, 0.15, 0.2, 0.25, 0.35] }, bones: { head: 0.3 } },
  // (both swinging hands keep their curl in the picture through the swing: qa_checks 'curl'; straight they read "stiff",
  // Harry, side-on round 8, lesson 69)
  qa: { curl: { sides: ['near', 'far'], min: 8 } },
};
// the walk's numbers: her step and pace, how even it is, the hips' bob, and the swinging foot's clearance as it passes the
// standing one (a toe scuffing the floor reads at once)
const lib = {}, walkLib = (dir, pre) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
  if (f.isDirectory()) walkLib(`${dir}${f.name}/`, `${pre}${f.name}/`); else if (f.name.endsWith('.json')) lib[pre + f.name.slice(0, -5)] = expandHands(JSON.parse(fs.readFileSync(dir + f.name)), handLib, C.handSides); } };
walkLib(`${D}poses/`, '');
const an = makeAnim(spec, lib, { rig, C, quiet: true }), sp = an.walk.S() / Dur;
let surge = 0, clear = Infinity, bob = [Infinity, -Infinity];
for (let i = 0; i < an.frames; i++) {
  const t = i / spec.fps, st = rig.solve(an.poseAt(t));
  surge = Math.max(surge, Math.abs(an.walk.X(t) - sp * t));
  const lo = Object.fromEntries(['near', 'far'].map((sd) => [sd, Math.max(...sole(st, sd).map((q) => q[1]))]));
  const sw = lo.near < lo.far ? 'near' : 'far', sn = sw === 'near' ? 'far' : 'near', ax = (sd) => rig.carry(st, L[sd].shin, L[sd].ankle)[0];
  if (Math.abs(ax(sw) - ax(sn)) < 0.4) clear = Math.min(clear, lo[sn] - lo[sw]);
  bob = [Math.min(bob[0], st.pelvis.pos[1]), Math.max(bob[1], st.pelvis.pos[1])];
}
spec.walk.note += `; measured gait (tools/side_walk.mjs): ${(sp * Ts).toFixed(2)} H a step, ${sp.toFixed(2)} H/s, her pace within ${surge.toFixed(3)} H of even, the hips bob ${(bob[1] - bob[0]).toFixed(3)} H`;
fs.writeFileSync(`${D}anims/${out}.json`, JSON.stringify(spec, null, 1) + '\n');
console.log(`${D}anims/${out}.json: ${Dur} s, step ${Ts} s, ${keys.length} keys (${per} poses a cycle), first heel strike ${front}`);
console.log(`  ${(sp * Ts).toFixed(2)} H a step, ${sp.toFixed(2)} H/s; pace within ${surge.toFixed(3)} H of even; hips bob ${(bob[1] - bob[0]).toFixed(3)} H; the swinging foot clears the floor by ${clear.toFixed(3)} H passing the standing one`);
