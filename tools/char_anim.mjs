// Render an animation of any engine character: node tools/char_anim.mjs --char mum2 --anim idle-stand [--every 1] [--no-mp4]
//   frames: out/frames/<char>_<anim>/f0000.png … (1080×1920, the character's still frame), MP4 via ffmpeg at spec.fps,
//   plus out/<char>_<anim>_sheet.png (every 6th frame) and a determinism check (--verify k: re-render every k-th frame in a
//   fresh page and compare hashes). Poses come from engine/anim.js — every frame is a pure function of t.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { createRig } from '../engine/rig.js';
import { makeAnim } from '../engine/anim.js';
import { expandHands } from '../engine/handlib.js';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);
const char = arg('char', 'mum2'), name = arg('anim', 'idle-stand'), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const spec = JSON.parse(fs.readFileSync(`${D}anims/${name}.json`));
const poseNames = [...new Set([...[...spec.keys, ...Object.values(spec.tracks || {}).flatMap((t) => (Array.isArray(t) ? t : t.keys))].map((k) => k.pose), ...Object.values(spec.pins?.plant || {}), ...Object.values(spec.pins?.channels || {}).map((c) => c.plant).filter(Boolean), ...Object.values(spec.reach || {}).flat().map((e) => e.pose)])];
const lib = Object.fromEntries(poseNames.map((p) => [p, expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), handLib, C.handSides)]));
const A = makeAnim(spec, lib, { rig, C });
const N = Math.round(spec.duration * spec.fps), every = +arg('every', 1), FROM = +arg('from', 0), LAST = arg('to') !== undefined ? +arg('to') : spec.loop ? N - 1 : N;   // --from/--to: re-render just one move (keeps the other frames)
const dir = `out/frames/${char}_${name}`, fast = flag('tracks-only');   // --tracks-only: joint tracks + speed report, no frames (timing passes)
let hashes = {};
if (!fast) {
if (arg('from') === undefined && arg('to') === undefined) fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const { srv, base } = await serve();
const browser = await chromium.launch();
const open = async () => { const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 } }); await pg.goto(`${base}/engine/view.html?char=${char}&frame=still`); await pg.waitForFunction(() => window.__ready === true); return pg; };
const page = await open();
const shot = async (pg, i, file) => { await pg.evaluate((p) => window.renderPose(p), A.poseAt(i / spec.fps)); const b = await pg.locator('#stage svg').screenshot({ path: file }); return crypto.createHash('sha1').update(b).digest('hex'); };
for (let i = FROM; i <= LAST; i += every) hashes[i] = await shot(page, i, `${dir}/f${String(i).padStart(4, '0')}.png`);
const vk = +arg('verify', 0);
if (vk) { const pg2 = await open(); let bad = 0; for (let i = FROM; i <= LAST; i += vk) if (await shot(pg2, i, `/tmp/_v.png`) !== hashes[i]) bad++; console.log(`determinism: ${bad} mismatches`); }
await browser.close(); srv.close();
}
// joint tracks in output px (for arcs / spacing / metrics in the review pack)
const sc = (p) => rig.toScreen(p, { frame: 'still' }), tracks = [];
const ALL = spec.loop ? N - 1 : N, partial = FROM !== 0 || LAST !== ALL;
for (let i = 0; i <= ALL; i++) {
  const t = i / spec.fps, pose = A.poseAt(t), st = rig.solve(pose), farP = pose.handView?.far === 'back' ? 'hand.farB' : 'hand.far';
  const pt = (b) => sc(st[b].pos), car = (b, j) => sc(rig.carry(st, b, j));
  tracks.push({ head: pt('head'), headTip: car('head', 'headTip'), neck: pt('neck'), chest: pt('chest'), shoulderNear: pt('upperArm.near'), elbowNear: pt('forearm.near'), wristNear: pt('hand.near'),
    handNearTip: car('hand.near.f2c', 'hand.near.f2t'), handFarTip: car(`${farP}.f2c`, `${farP}.f2t`), wristFar: pt('hand.far'), pelvis: pt('pelvis'),
    ch: { breath: A.breathAt(t), chestAlong: (pose.scale?.spineUpper?.[0] ?? 1) - 1, hairNear: pose.fx?.hair?.near ?? 0, hairFar: pose.fx?.hair?.far ?? 0 } });
}
fs.writeFileSync(`out/${char}_${name}_tracks.json`, JSON.stringify({ fps: spec.fps, N, loop: !!spec.loop, tracks }));
if (fast) {           // per-frame speed (px/f) of the hand chain: the numbers critic C checks (dart peaks, dips, plants)
  for (const k of ['wristNear', 'handNearTip', 'elbowNear', 'handFarTip', 'headTip']) {
    const sp = tracks.slice(0, -1).map((p, i) => Math.hypot(tracks[i + 1][k][0] - p[k][0], tracks[i + 1][k][1] - p[k][1]));
    console.log(k.padEnd(12), 'max', Math.max(...sp).toFixed(1), '|', sp.map((v, i) => (v > 2.5 ? `${i}:${v.toFixed(0)}` : null)).filter(Boolean).join(' '));
  }
  process.exit(0);
}
if (!partial) fs.writeFileSync(`out/${char}_${name}_hashes.txt`, Object.entries(hashes).map(([k, v]) => `${k} ${v}`).join('\n'));
if (!flag('no-mp4') && every === 1 && FROM === 0 && arg('to') === undefined) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(spec.fps), '-i', `${dir}/f%04d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', `out/${char}_${name}.mp4`]);
  console.log('wrote', `out/${char}_${name}.mp4`);
}
console.log(`frames: ${Object.keys(hashes).length} in ${dir}`);
