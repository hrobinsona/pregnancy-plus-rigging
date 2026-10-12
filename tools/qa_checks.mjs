// QA gate for a rendered shot (ported from reels tools/rig/checks.py + engine/qa/motion.py, plus the hands check reels
// specified but never built). Run after char_anim.mjs; exit 1 if a gate fails.
//   node tools/qa_checks.mjs --char mum2 --anim nausea-to-belly [--box x0,y0,x1,y1] [--skip order,leak,frames,hands]
//     order   frames rendered OUT OF ORDER, by a fresh anim in a fresh page, match the rendered frames byte for byte
//     leak    no hidden state: poseAt(t) from a fresh anim == poseAt(t) after every frame before it, and the page's SVG
//             markup for a pose alone == after rendering every frame before it
//     frames  pixel jumps (a frame changing > 1.8× its neighbours, inside --box) and still stretches > 1 s
//             (tools/qa_frames.py; the film should always be alive)
//     hands   per hand: palm-area pops (a swap or scale jump between frames), near/far size ratio, the closest the two
//             hands come (< 15 px reads as merged unless they deliberately touch), and the wrist angle running ONE way
//             through each move (a reversal > 4° reads as springy overshoot)
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
      S[side].push({ palm: palm ? area(palm.geom.P.map((v) => sc(ap(palm.M, v)))) : 0, ang: Math.atan2(tip[1] - w[1], tip[0] - w[0]) * 180 / Math.PI, w });
    }
    gap.push(gapOf(H.near, H.far));
  }
  const tt = (i) => (i / spec.fps).toFixed(2), runs = (flags) => { const r = []; let s = null; flags.forEach((f, i) => { if (f && s === null) s = i; if (!f && s !== null) { r.push([s, i - 1]); s = null; } }); if (s !== null) r.push([s, flags.length - 1]); return r; };
  for (const side of ['near', 'far']) {
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
  const med = (v) => [...v].sort((a, b) => a - b)[v.length >> 1], ratio = med(S.far.map((s) => s.palm)) / med(S.near.map((s) => s.palm));
  console.log(`  · far/near palm area (median) ${ratio.toFixed(2)} — one drawing for both hands; the far one smaller only by perspective`);
  const close = runs(gap.map((g) => g < 15)).map(([a, b]) => `${tt(a)}–${tt(b)} s (min ${Math.min(...gap.slice(a, b + 1)).toFixed(0)} px)`);
  console.log(`  · hands closer than 15 px: ${close.length ? close.join(', ') + ' — fine where they deliberately touch, else they read as one blob' : 'never'}`);
}
console.log(ok ? 'PASS' : 'FAIL'); process.exit(ok ? 0 : 1);
