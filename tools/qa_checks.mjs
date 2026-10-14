// QA gate for a rendered shot (ported from reels tools/rig/checks.py + engine/qa/motion.py, plus the hands check reels
// specified but never built). Run after char_anim.mjs; exit 1 if a gate fails.
//   node tools/qa_checks.mjs --char mum2 --anim nausea-to-belly [--box x0,y0,x1,y1] [--skip order,leak,channels,handed,frames,hands,alive,limbs,fingers] [--alive-win 2 --alive-min 5] [--limb-min 0.85]
//     order   frames rendered OUT OF ORDER, by a fresh anim in a fresh page, match the rendered frames byte for byte
//     leak    no hidden state: poseAt(t) from a fresh anim == poseAt(t) after every frame before it, and the page's SVG
//             markup for a pose alone == after rendering every frame before it
//     channels every channel a track keys reaches the pose under its whole name, and a contact shadow gated on a keyed
//             channel draws while it is on (a keyed fx.contact.near was silently dropped: no shadow ever drew, lesson 52)
//     handed  each hand the right way round in every frame: its thumb drawn on the side its 3D arm puts it (tools/handed.mjs;
//             a spec copied from the other hand drew a right hand on mum3q's left arm for seven versions, lesson 53)
//     frames  pixel jumps (a frame changing > 1.8× its neighbours, inside --box) and still stretches > 1 s
//             (tools/qa_frames.py; the film should always be alive)
//     hands   per hand: palm-area pops (a swap or scale jump between frames), near/far size ratio, the closest the two
//             hands come (< 15 px reads as merged unless they deliberately touch), and the wrist angle running ONE way
//             through each move (a reversal > 4° reads as springy overshoot)
//     alive   no hand freezes ON HER: within every --alive-win s (2) each visible hand's wrist, fingertip or outline
//             moves ≥ --alive-min px (5, at 1080 wide) relative to her belly (Harry on mum3q v5: "creepy and lifeless" — a hand
//             pixel-identical at 1, 4 and 7 s while her head and breath moved; the whole-frame still check can't see it). 5 px,
//             not 1.5: mum3q v6's hands passed at 1.5 with 2–4 px finger settles and both fresh reviewers still saw "the hands
//             look identical in every frame" at phone size (lesson 51). A hand resting on her caresses, presses or strokes in
//             moves of 10–20 px; a deliberate hold: spec.qa.still {near|far: [[t0, t1, why]]}
//     limbs   each 3D arm segment's drawn length stays ≥ --limb-min of its length (exceptions: spec.qa.limbs) (a forearm pointing at the camera reads
//             as an arm that shrinks); and no elbow jumps > 6 px in a frame while its wrist stays (the arm solve changing branch)
//     fingers each spec.qa.fingers entry {side, t: [s…], want: [index…little °], tol}: the FILM's finger angles at those
//             times within tol of the still's (tools/finger_angles.mjs). A key fitted to the still can leave it on the film:
//             the derived trunk turned mum3q's pinned cradling hand 6° steeper, "a comb" (natural lens v17; lesson 58).
//             With every: {step: 0.5, tol: 5} the angles all shot (a looser tol for designed whole-hand turns); with
//             fan: {every: 0.5, tol: 3} also the fan's SHAPE all shot (finger_angles --fan: a whole-hand turn passes,
//             a change of shape doesn't): a fidget between the key frames bent the cradling fingers at the knuckles into "a
//             rake", and the top hand's spreads, still the right hand's, closed its fan into "a paw" (lesson 59)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { createRig } from '../engine/rig.js';
import { makeAnim } from '../engine/anim.js';
import { expandHands } from '../engine/handlib.js';
import { ap } from '../engine/geom.js';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const char = arg('char', 'mum2'), name = arg('anim', 'nausea-to-belly'), D = `characters/${char}/`, skip = new Set((arg('skip', '')).split(','));
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const spec = JSON.parse(fs.readFileSync(`${D}anims/${name}.json`));
const names = new Set(); JSON.stringify(spec, (k, v) => { if ((k === 'pose' || k === 'plant') && typeof v === 'string') names.add(v); return v; });
const lib = Object.fromEntries([...names].filter((p) => fs.existsSync(`${D}poses/${p}.json`)).map((p) => [p, expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), handLib, C.handSides)]));
const fresh = () => makeAnim(spec, lib, { rig, C });
const N = Math.round(spec.duration * spec.fps), ALL = spec.loop ? N - 1 : N, dir = `out/frames/${char}_${name}`;
const picks = [0.7, 0.25, 0.5, 0.9, 0.1].map((k) => Math.round(ALL * k));   // out of order on purpose
const fpng = (i) => `${dir}/f${String(i).padStart(4, '0')}.png`, sha = (b) => crypto.createHash('sha1').update(b).digest('hex');
let ok = true; const gate = (pass, line) => { console.log(`  ${pass ? '✓' : '✗'} ${line}`); ok &&= pass; };

if (!skip.has('order') || !skip.has('leak')) {
  const { srv, base } = await serve(), browser = await chromium.launch();
  const open = async () => { const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } }); await pg.goto(`${base}/engine/view.html?char=${char}&frame=still`); await pg.waitForFunction(() => window.__ready === true); return pg; };
  const markup = (pg, pose) => pg.evaluate((p) => { window.renderPose(p); return document.querySelector('#stage svg').outerHTML; }, pose);
  if (!skip.has('order')) {
    console.log('order: frames rendered out of order match the render');
    if (!fs.existsSync(fpng(picks[0]))) gate(false, `no frames in ${dir}: run char_anim.mjs first (or --skip order,frames)`);
    else {
      const A = fresh(), pg = await open();
      for (const i of picks) {
        await pg.evaluate((p) => window.renderPose(p), A.poseAt(i / spec.fps));
        const same = sha(await pg.locator('#stage svg').screenshot()) === sha(fs.readFileSync(fpng(i)));
        gate(same, `frame ${i} (${(i / spec.fps).toFixed(2)} s) ${same ? 'identical' : 'DIFFERS from the rendered frame (stale frame, or state)'}`);
      }
    }
  }
  if (!skip.has('leak')) {
    console.log('leak: a frame alone == the same frame after every frame before it');
    const seq = fresh(), pg1 = await open(), pg2 = await open();
    const want = Object.fromEntries(picks.map((i) => [i, fresh().poseAt(i / spec.fps)]));
    const upto = Math.max(...picks), seen = {};
    for (let i = 0; i <= upto; i++) { const p = seq.poseAt(i / spec.fps); if (i in want) seen[i] = p; }
    for (const i of picks) {
      const a = JSON.stringify(want[i]), b = JSON.stringify(seen[i]);
      let d = ''; if (a !== b) { let k = 0; while (a[k] === b[k]) k++; d = a.slice(Math.max(0, k - 80), k + 40); }
      gate(!d, `pose at frame ${i}: ${d ? `DIFFERS after the frames before it, near …${d}…` : 'same'}`);
    }
    const alone = {}; for (const i of picks) alone[i] = await markup(pg1, want[i]);
    const seq2 = fresh();
    for (let i = 0; i <= upto; i++) { const m = await markup(pg2, seq2.poseAt(i / spec.fps)); if (i in want) gate(m === alone[i], `markup at frame ${i}: ${m === alone[i] ? 'same' : 'DIFFERS after rendering the frames before it'}`); }
  }
  await browser.close(); srv.close();
}

if (!skip.has('channels')) {
  // every channel a track keys must reach the pose under its whole name (fx.contact.near was stored as fx.contact, so
  // mum3's and mum3q's contact shadows never drew, through six versions and every review: lesson 52)
  console.log('channels: every keyed track channel reaches the pose');
  const chans = [...new Set(Object.values(spec.tracks || {}).flatMap((t) => (Array.isArray(t) ? [] : t.channels || [])))];
  const A = fresh(), lost = new Set();
  for (const t of [0, 0.25, 0.5, 0.75].map((k) => k * spec.duration)) {
    const p = A.poseAt(t), paths = new Set([...Object.keys(p.fx || {}).map((k) => 'fx.' + k), ...Object.keys(p.bones || {}).map((k) => 'bone.' + k),
      ...Object.entries(p.face || {}).flatMap(([a, o]) => (o && typeof o === 'object' ? Object.keys(o).map((b) => `face.${a}.${b}`) : [`face.${a}`])),
      ...Object.entries(p.scale || {}).flatMap(([id, v]) => [0, 1].map((ix) => `scale.${id}.${ix}`))]);
    for (const ch of chans) if (/^(fx|bone|face|scale)\./.test(ch) && ![...paths].some((q) => q === ch || q.startsWith(ch + '.'))) lost.add(ch);   // a track channel is a prefix (face.gaze owns face.gaze.0/1)
  }
  gate(!lost.size, lost.size ? `keyed but never in the pose: ${[...lost].join(', ')}` : `${chans.length} keyed channels all reach the pose`);
  // a contact shadow gated on a channel the shot keys must actually draw while the gate is on
  for (const g of C.contactShadow?.groups || []) if (g.gate && chans.includes('fx.' + g.gate)) {
    const ts = [...Array(9).keys()].map((k) => (k / 8) * spec.duration * 0.999), on = ts.filter((t) => (A.poseAt(t).fx?.[g.gate] ?? 0) > 0.5);
    if (on.length) { const svg = rig.toSVG(A.poseAt(on[0]), { frame: 'still' }), id = `shadow-${g.match.replace(/[^\w]/g, '')}`;
      gate(svg.includes(id), `contact shadow ${g.gate} drawn while keyed on (${on[0].toFixed(2)} s)`); }
  }
}

if (!skip.has('handed')) {
  // HANDEDNESS (tools/handed.mjs, lesson 53): every frame, each hand's thumb on the side its 3D arm puts it. mum3q v1–v7 lay
  // a RIGHT hand on her left arm on the bump (its spec copied from the near hand); every gate passed and four critic rounds
  // tuned its curl, wrist and lines before Harry saw "it looks like it's the wrong way round"
  console.log('handed: each hand the right way round (thumb where its 3D arm puts it)');
  const { handedness, excuse, explain } = await import('./handed.mjs');
  const A = fresh(), bad = {}, exc = {};
  for (let i = 0; i <= ALL; i++) {
    const pose = A.poseAt(i / spec.fps);
    for (const r of handedness(C, rig.solve(pose), expandHands(pose, lib, C.handSides))) if (!r.ok) ((excuse(C, r) ? exc : bad)[r.side] ??= []).push([i, r]);
  }
  for (const side of ['near', 'far']) {
    const b = bad[side] || [], e = exc[side] || [];
    if (e.length) console.log(`  · ${side}: ${e.length} frames excused by C.qa.handed (${excuse(C, e[0][1]).why})`);
    gate(!b.length, `${side} hand the right way round${b.length ? `: wrong in ${b.length} frames from ${(b[0][0] / spec.fps).toFixed(2)} s — ${explain(b[0][1])}` : ''}`);
  }
}

if (!skip.has('frames')) {
  console.log('frames: pixel jumps and still stretches');
  if (!fs.existsSync(fpng(0))) gate(false, `no frames in ${dir}`);
  else try { console.log(execFileSync('python3', ['tools/qa_frames.py', dir, '--fps', String(spec.fps), ...(arg('box') ? ['--box', arg('box')] : [])], { encoding: 'utf8' }).trimEnd()); gate(true, 'no jumps, no still stretch'); }
  catch (e) { console.log((e.stdout || '').trimEnd()); gate(false, 'see above'); }
}

if (!skip.has('hands')) {
  console.log('hands: size, gap, one-way wrist turn');
  const A = fresh(), sc = (p) => rig.toScreen(p, { frame: 'still' });
  const area = (P) => Math.abs(P.reduce((a, v, i) => { const w = P[(i + 1) % P.length]; return a + v[0] * w[1] - w[0] * v[1]; }, 0)) / 2;
  const hull = (pts) => { const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
    for (const p of s) { while (lo.length > 1 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
    for (const p of s.reverse()) { while (up.length > 1 && cr(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); } return [...lo.slice(0, -1), ...up.slice(0, -1)]; };
  const inside = (P, q) => P.every((v, i) => { const w = P[(i + 1) % P.length]; return (w[0] - v[0]) * (q[1] - v[1]) - (w[1] - v[1]) * (q[0] - v[0]) >= 0; });
  const segD = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy); };
  const gapOf = (P, Q) => { if (P.some((q) => inside(Q, q)) || Q.some((q) => inside(P, q))) return 0; let m = Infinity;
    for (const [X, Y] of [[P, Q], [Q, P]]) for (const q of X) for (let i = 0; i < Y.length; i++) m = Math.min(m, segD(q, Y[i], Y[(i + 1) % Y.length])); return m; };
  const S = { near: [], far: [] }, gap = [];
  for (let i = 0; i <= ALL; i++) {
    const t = i / spec.fps, pose = A.poseAt(t), st = rig.solve(pose), parts = rig.build(expandHands(pose, lib, C.handSides));
    const H = {};
    for (const side of ['near', 'far']) {
      const re = new RegExp(`^hand\\.${side}B?\\.`), ps = parts.filter((p) => re.test(p.id) && !p.id.endsWith('.ol') && p.geom?.P && !(p.opacity <= 0.002));
      const palm = ps.find((p) => /\.palm$/.test(p.id)); H[side] = hull(ps.flatMap((p) => p.geom.P.map((v) => sc(ap(p.M, v)))));
      const fv = side === 'far' && pose.handView?.far === 'back' ? 'hand.farB' : `hand.${side}`;
      const w = sc(st[`hand.${side}`].pos), tip = sc(rig.carry(st, `${fv}.f2c`, `${fv}.f2t`));
      const xs = H[side].map((v) => v[0]), ys = H[side].map((v) => v[1]), box = xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : [0, 0, 0, 0];
      S[side].push({ palm: palm ? area(palm.geom.P.map((v) => sc(ap(palm.M, v)))) : 0, ang: Math.atan2(tip[1] - w[1], tip[0] - w[0]) * 180 / Math.PI, w, tip, box, seen: ps.length > 0, body: sc(st[C.qa?.aliveAnchor || (st.belly ? 'belly' : 'chest')].pos) });
    }
    gap.push(gapOf(H.near, H.far));
  }
  const tt = (i) => (i / spec.fps).toFixed(2), runs = (flags) => { const r = []; let s = null; flags.forEach((f, i) => { if (f && s === null) s = i; if (!f && s !== null) { r.push([s, i - 1]); s = null; } }); if (s !== null) r.push([s, flags.length - 1]); return r; };
  // a hand the character hides by design (C.fit.hidden 'far.arm': behind her body all shot) has nothing to check
  const sides = ['near', 'far'].filter((s) => !(C.fit?.hidden || []).includes(`${s}.arm`));
  for (const side of sides) {
    // a pop = a one-frame area change > 8% AND > 2× its neighbours' (a palm foreshortening smoothly through a turn is fine);
    // a palm that appears or vanishes is a hand-view swap, listed for a look rather than gated
    const a = S[side].map((s) => s.palm), r = a.map((v, i) => (i && a[i - 1] > 0 && v > 0 ? Math.abs(v / a[i - 1] - 1) : 0)), pops = [], swaps = [];
    for (let i = 1; i < a.length; i++) {
      if ((a[i - 1] > 0) !== (a[i] > 0)) { swaps.push(tt(i)); continue; }
      const nb = [-3, -2, -1, 1, 2, 3].map((k) => r[i + k]).filter((v) => v !== undefined), m = nb.reduce((s, v) => s + v, 0) / nb.length;
      if (r[i] > 0.08 && r[i] > 2 * m) pops.push(`${tt(i)} s (${Math.round((a[i] / a[i - 1] - 1) * 100)}%)`);
    }
    gate(!pops.length, `${side} palm area: ${pops.length ? 'pops at ' + pops.slice(0, 8).join(', ') : 'no pops'}${swaps.length ? `; palm appears/vanishes (view swap) at ${swaps.join(', ')} s` : ''}`);
    // wrist angle one way per move: a move = a run of frames where the wrist travels > 2 px/f
    const sp = S[side].map((s, i) => (i ? Math.hypot(s.w[0] - S[side][i - 1].w[0], s.w[1] - S[side][i - 1].w[1]) : 0)), bad = [];
    for (const [i0, i1] of runs(sp.map((v) => v > 2)).filter(([a0, a1]) => a1 - a0 >= 5)) {
      const ang = S[side].slice(i0 - 1, i1 + 1).map((s) => s.ang); for (let k = 1; k < ang.length; k++) ang[k] = ang[k - 1] + ((ang[k] - ang[k - 1] + 540) % 360 - 180);
      const net = Math.sign(ang.at(-1) - ang[0]); let ext = ang[0], worst = 0, at = i0;
      ang.forEach((v, k) => { if (net * (v - ext) > 0) ext = v; else if (net * (ext - v) > worst) { worst = net * (ext - v); at = i0 - 1 + k; } });
      if (worst > 4) bad.push(`${tt(i0)}–${tt(i1)} s turns back ${worst.toFixed(0)}° at ${tt(at)} s`);
    }
    gate(!bad.length, `${side} wrist angle one way through each move: ${bad.length ? bad.join('; ') : 'yes'}`);
  }
  if (!skip.has('alive')) {
    // a frozen hand: every point we track (wrist, middle fingertip, the hand's outline box) moves < min px in a window
    const win = Math.round(+arg('alive-win', 2) * spec.fps), min = +arg('alive-min', 5), EXS = spec.qa?.still || {};
    for (const side of sides) {
      // measured relative to her body (the belly), so a hand pinned to her and carried by her breath still counts as
      // frozen if it never moves ON her: that is what reads as a stuck-on, lifeless hand
      const rel = (q, s) => [q[0] - s.body[0], q[1] - s.body[1]];
      const pts = (s) => [rel(s.w, s), rel(s.tip, s), rel([s.box[0], s.box[1]], s), rel([s.box[2], s.box[3]], s)], frozen = new Array(S[side].length).fill(false);
      const held = (i) => (EXS[side] || []).some(([t0, t1]) => i / spec.fps >= t0 && i / spec.fps <= t1);
      for (let i0 = 0; i0 + win < S[side].length; i0 += 3) {
        if (!S[side][i0].seen) continue;
        const P0 = pts(S[side][i0]); let mv = 0;
        for (let i = i0 + 1; i <= i0 + win; i++) pts(S[side][i]).forEach((q, k) => { mv = Math.max(mv, Math.hypot(q[0] - P0[k][0], q[1] - P0[k][1])); });
        if (mv < min) for (let i = i0; i <= i0 + win; i++) if (!held(i)) frozen[i] = true;
      }
      const fr = runs(frozen).map(([a, b]) => `${tt(a)}–${tt(b)} s`);
      gate(!fr.length, `${side} hand alive (moves ≥ ${min} px on her in every ${(win / spec.fps).toFixed(1)} s): ${fr.length ? 'FROZEN ' + fr.join(', ') + ' — a hand only carried by her body reads stuck on: add a finger settle (fidget) or a small press; a deliberate hold goes in spec.qa.still' : 'yes'}`);
    }
  }
  if (sides.length < 2) console.log(`  · ${['near', 'far'].filter((s) => !sides.includes(s)).join(', ')} hand hidden by design (C.fit.hidden): size and gap not checked`);
  else {
    const med = (v) => [...v].sort((a, b) => a - b)[v.length >> 1], ratio = med(S.far.map((s) => s.palm)) / med(S.near.map((s) => s.palm));
    console.log(`  · far/near palm area (median) ${ratio.toFixed(2)} — one drawing for both hands; the far one smaller only by perspective`);
    const close = runs(gap.map((g) => g < 15)).map(([a, b]) => `${tt(a)}–${tt(b)} s (min ${Math.min(...gap.slice(a, b + 1)).toFixed(0)} px)`);
    console.log(`  · hands closer than 15 px: ${close.length ? close.join(', ') + ' — fine where they deliberately touch, else they read as one blob' : 'never'}`);
  }
}
if (!skip.has('limbs')) {
  // a 3D arm segment pointing at the camera is drawn short (a3.len = its projected length / its length). In a flat-shaded
  // style nothing says "foreshortened", so a forearm at 60% reads as an arm that SHRINKS as it moves (Harry on mum3 v3:
  // "the arm sort of shrinks… it makes her arm look deformed"; v4's forearm was 57–65% on the bump). Gate the shortest.
  const lim = +arg('limb-min', C.qa?.limbMin ?? 0.85), segs = Object.keys(rig.BONE).filter((b) => /^(upperArm|forearm|hand)\.(near|far)$/.test(b) && rig.BONE[b].plane === 'arm3' && !(C.fit?.hidden || []).includes(`${b.split('.')[1]}.arm`));
  if (segs.length) {
    console.log(`limbs: drawn length of each 3D arm segment (want ≥ ${lim} of its length all shot)`);
    const A = fresh(), lo = Object.fromEntries(segs.map((b) => [b, [Infinity, 0]])), hi = Object.fromEntries(segs.map((b) => [b, 0]));
    const sc = (p) => rig.toScreen(p, { frame: 'still' }), sides = [...new Set(segs.map((b) => b.split('.')[1]))], EW = Object.fromEntries(sides.map((s_) => [s_, []]));
    for (let i = 0; i <= ALL; i++) { const st = rig.solve(A.poseAt(i / spec.fps)); for (const b of segs) { if (st[b].a3.len < lo[b][0]) lo[b] = [st[b].a3.len, i / spec.fps]; hi[b] = Math.max(hi[b], st[b].a3.len); }
      for (const s_ of sides) EW[s_].push([sc(st[`forearm.${s_}`].pos), sc(st[`hand.${s_}`].pos)]); }
    // ELBOW POPS: the elbow jumps while its wrist stays put — the arm solve hopped to another arm that puts the hand in the
    // same place (mum3q look-up v6 draft: the far elbow 40–70 px between frames under a hand pinned to the bump; the frame
    // check missed it, the arm being half behind her bust). A real arm moves its elbow with its hand.
    for (const s_ of sides) {
      const pops = []; const E = EW[s_], n_ = E.length;
      for (let i = 0; i < n_ - (spec.loop ? 0 : 1); i++) { const [e0, w0] = E[i], [e1, w1] = E[(i + 1) % n_], de = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]), dw = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]);
        if (de > 6 && de > 3 * dw + 2) pops.push(`${(i / spec.fps).toFixed(2)} s (elbow ${de.toFixed(0)} px, wrist ${dw.toFixed(1)})`); }
      gate(!pops.length, `${s_} elbow moves with its hand (no jump > 6 px in a frame while the wrist stays): ${pops.length ? 'POPS at ' + pops.slice(0, 6).join(', ') + (pops.length > 6 ? ` … ${pops.length} in all` : '') + ' — the arm solve changed branch: keep the keyed arm (reach stop keyedArm: true)' : 'yes'}`);
    }
    // spec.qa.limbs[segment]: a shot's stated exception — {hidden: why} (drawn behind her body, inside her outline: its
    // length can't be seen) or {min, note} (foreshortened BY DESIGN, as in the stills: the far hand lying over the top of
    // the bump, edge-on). A designed foreshortening must still HOLD its size: the gate then wants max/min ≤ 1.1 (an arm
    // that grows and shrinks is what reads as deformed)
    const EX = spec.qa?.limbs || {};
    for (const b of segs) {
      const ex = EX[b];
      if (ex?.hidden) { console.log(`  · ${b}: not gated, hidden (${ex.hidden}); shortest ${(lo[b][0] * 100).toFixed(0)}%`); continue; }
      const m = ex?.min ?? lim;
      gate(lo[b][0] >= m, `${b}: shortest ${(lo[b][0] * 100).toFixed(0)}% at ${lo[b][1].toFixed(2)} s${ex ? ` (designed ≥ ${m * 100}%: ${ex.note})` : ''}${lo[b][0] < m ? ' — it points at the camera: put the wrist on the surface it touches (reach surface:) and turn the elbow (dphi) until the arm lies across the picture' : ''}`);
      if (ex) gate(hi[b] / lo[b][0] <= 1.1, `${b}: holds its size, longest/shortest ${(hi[b] / lo[b][0]).toFixed(2)} (want ≤ 1.1; reach stop keepSize: true)`);
    }
  }
}
if (!skip.has('fingers') && spec.qa?.fingers?.length) {
  console.log("fingers: each hand's fingers at the still's angles on the film (tools/finger_angles.mjs)");
  for (const f of spec.qa.fingers) {
    const tol = f.tol ?? 4; let out, pass = true;
    try { out = execFileSync('node', ['tools/finger_angles.mjs', '--char', char, '--side', f.side, '--anim', name, '--t', f.t.join(','), '--want', f.want.join(','), '--tol', String(tol)], { encoding: 'utf8' }); }
    catch (e) { out = String(e.stdout || e.message); pass = false; }
    gate(pass, `${f.side} fingers at ${f.t.join(', ')} s within ${tol}° of the still's ${f.want.join('/')}°: ${out.trim().split('\n').pop()}${pass ? '' : " — the film turned the hand off its fitted key: set the hand bone of the reach stop's pose (refs/derive_*.sh) until finger_angles matches"}`);
    if (f.every) {   // the angles all shot, a looser tol for the designed whole-hand turns (a thumb stroke turns the hand ~4°)
      const et = f.every.tol ?? tol + 2; let o3, p3 = true;
      try { o3 = execFileSync('node', ['tools/finger_angles.mjs', '--char', char, '--side', f.side, '--anim', name, '--every', String(f.every.step ?? 0.5), '--want', f.want.join(','), '--tol', String(et)], { encoding: 'utf8' }); }
      catch (e) { o3 = String(e.stdout || e.message); p3 = false; }
      const bad = o3.split('\n').filter((l) => /off (\d+)°/.test(l) && +l.match(/off (\d+)°/)[1] > et).map((l) => l.trim().split(' ')[0]);
      gate(p3, `${f.side} fingers every ${f.every.step ?? 0.5} s within ${et}° of the still's: ${o3.trim().split('\n').pop()}${p3 ? '' : ` at ${bad.join(', ')} s — a fidget bends the fingers off the still's angle there (a knuckle bend on a hand seen palm-on flattens and lengthens them: "a rake")`}`);
    }
    if (f.fan) {
      const ft = f.fan.tol ?? 3; let o2, p2 = true;
      try { o2 = execFileSync('node', ['tools/finger_angles.mjs', '--char', char, '--side', f.side, '--anim', name, '--every', String(f.fan.every ?? 0.5), '--want', f.want.join(','), '--tol', String(ft), '--fan'], { encoding: 'utf8' }); }
      catch (e) { o2 = String(e.stdout || e.message); p2 = false; }
      const bad = o2.split('\n').filter((l) => /off (\d+)°/.test(l) && +l.match(/off (\d+)°/)[1] > ft).map((l) => l.trim().split(' ')[0]);
      gate(p2, `${f.side} fingers' fan every ${f.fan.every ?? 0.5} s within ${ft}° of the still's: ${o2.trim().split('\n').pop()}${p2 ? '' : ` at ${bad.join(', ')} s — a fidget or a spread changes the hand's shape there: move the fingers together (the fan kept), check spread signs on a mirrored hand`}`);
    }
  }
}
console.log(ok ? 'PASS' : 'FAIL'); process.exit(ok ? 0 : 1);
