// tip_check.mjs — do the fingertips of a hand lying ON her end inside her silhouette? (every critic round on mum3 named
// "tips past the bump's outline", "a hand hooked over the edge"). For each sampled frame the figure is drawn WITHOUT that
// arm and hand, and each fingertip is walked along its own finger with the browser's hit test: + px = the tip is inside the
// silhouette by that much (the room left before the edge), − px = the tip is past the outline by that much.
//   node tools/tip_check.mjs --char mum3 --anim breathe-stroke [--side near] [--t 2.2,3,8.8 | --from 2 --to 10 --every 0.2]
//   [--min 4]   exit 1 if any frame's worst tip is under --min px inside (only frames where the hand is on her: a tip whose
//               whole finger is in the air — the hand hanging at her side — is reported as "off" and not judged)
//   [--clear 9] exit 1 if a tip's CENTRE comes within --clear px of the outline in any direction ("clear" column): the
//               finger's own half-width is ~5 px, so under ~9 its side touches the edge — a tangent reviewers see
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { createRig } from '../engine/rig.js';
import { makeAnim } from '../engine/anim.js';
import { expandHands } from '../engine/handlib.js';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const char = arg('char', 'mum3'), name = arg('anim', 'breathe-stroke'), side = arg('side', 'near'), D = `characters/${char}/`, MIN = +arg('min', 4), CLEAR = +arg('clear', 9);
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const spec = JSON.parse(fs.readFileSync(`${D}anims/${name}.json`));
const names = new Set(); JSON.stringify(spec, (k, v) => { if ((k === 'pose' || k === 'plant') && typeof v === 'string') names.add(v); return v; });
const lib = Object.fromEntries([...names].filter((p) => fs.existsSync(`${D}poses/${p}.json`)).map((p) => [p, expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), handLib, C.handSides)]));
const A = makeAnim(spec, lib, { rig, C });
const ts = arg('t') ? arg('t').split(',').map(Number) : (() => { const a = []; for (let t = +arg('from', 0); t <= +arg('to', spec.duration) + 1e-9; t += +arg('every', 0.2)) a.push(+t.toFixed(3)); return a; })();
const { srv, base } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`${base}/engine/view.html?char=${char}&frame=still`); await page.waitForFunction(() => window.__ready === true);
const sc = (p) => rig.toScreen(p, { frame: 'still' }), pre = `hand.${side}`;
let worst = Infinity, worstC = Infinity;
for (const t of ts) {
  const pose = A.poseAt(t), st = rig.solve(pose);
  const fingers = [1, 2, 3, 4].map((i) => { const tip = sc(rig.carry(st, `${pre}.f${i}c`, `${pre}.f${i}t`)), dip = sc(st[`${pre}.f${i}c`].pos), mcp = sc(st[`${pre}.f${i}a`].pos);
    const L = Math.hypot(tip[0] - dip[0], tip[1] - dip[1]) || 1; return { tip, mcp, d: [(tip[0] - dip[0]) / L, (tip[1] - dip[1]) / L] }; });
  await page.evaluate((p) => window.renderPose(p), pose);
  const res = await page.evaluate(({ fingers, re }) => {
    const svg = document.querySelector('#stage svg'), R = svg.getBoundingClientRect(), rx = new RegExp(re);
    svg.querySelectorAll('[id]').forEach((el) => { if (rx.test(el.id)) el.style.display = 'none'; });
    const on = (x, y) => { const el = document.elementFromPoint(R.left + x, R.top + y); return !!el && el !== svg && svg.contains(el) && el.tagName !== 'svg' && !(el.tagName === 'rect' && !el.id) && !/^(bg|ground|backdrop)/.test(el.id || ''); };   // the backdrop is an id-less rect
    // CLEARANCE: the tip's distance to the outline in ANY direction (24 rays). Along the finger a tip can be 6 px inside
    // while the finger runs ALONG the outline, its side touching it: a tangent (mum3 v4 A/B, "tips clipped against the edge")
    const clear = (tip) => { let m = 80; for (let j = 0; j < 24; j++) { const a = j * Math.PI / 12, c = Math.cos(a), s = Math.sin(a); let k = 0; while (k < m && on(tip[0] + c * (k + 1), tip[1] + s * (k + 1))) k++; m = Math.min(m, k); } return m; };
    return fingers.map(({ tip, mcp, d }) => {
      if (!on(mcp[0], mcp[1]) && !on(tip[0], tip[1])) return null;                          // the finger is in the air
      if (on(tip[0], tip[1])) { let k = 0; while (k < 80 && on(tip[0] + d[0] * (k + 1), tip[1] + d[1] * (k + 1))) k++; return [k, clear(tip)]; }
      let k = 0; while (k < 80 && !on(tip[0] - d[0] * (k + 1), tip[1] - d[1] * (k + 1))) k++; return [-(k + 1), -(k + 1)];
    });
  }, { fingers, re: `^(${pre.replace('.', '\\.')}|arm\\.${side}|contact|shadow|outline)` });
  const judged = res.filter((v) => v !== null), w = judged.length ? Math.min(...judged.map((v) => v[0])) : null, cl = judged.length ? Math.min(...judged.map((v) => v[1])) : null;
  if (w !== null) worst = Math.min(worst, w);
  if (cl !== null) worstC = Math.min(worstC, cl);
  console.log(`${t.toFixed(2).padStart(6)}s  tips ${res.map((v) => (v === null ? ' off' : String(v[0]).padStart(4))).join(' ')}  clear ${res.map((v) => (v === null ? ' off' : String(v[1]).padStart(3))).join(' ')}  ${w === null ? '' : w < 0 ? `PAST the outline by ${-w}px` : w < MIN ? 'on the edge' : cl < CLEAR ? 'touching the outline (tangent)' : ''}`);
}
await browser.close(); srv.close();
if (worst < MIN && worst !== Infinity) { console.log(`FAIL: a fingertip ends ${worst < 0 ? `${-worst}px past` : `${worst}px inside`} her outline (want ≥ ${MIN}px inside)`); process.exit(1); }
if (worstC < CLEAR && worstC !== Infinity) { console.log(`FAIL: a fingertip comes within ${worstC}px of her outline sideways (want ≥ ${CLEAR}px clearance: a finger running along the edge reads as a tangent)`); process.exit(1); }
console.log('PASS');
