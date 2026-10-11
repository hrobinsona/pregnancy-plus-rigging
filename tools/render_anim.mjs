// Render an animation: Playwright frames (1080x1920) -> ffmpeg MP4 (30 fps), frame hashes, joint tracks for arc/spacing review.
// usage: node tools/render_anim.mjs [--anim idle-seated] [--every 1] [--from 0] [--to N] [--no-mp4] [--verify 5]
//   loops render frames 0..N-1 (frame N is frame 0: the seam is checked, not duplicated)
//   --verify k : re-render every k-th frame in a FRESH browser and compare PNG hashes (determinism check)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { makeAnim } from '../characters/mum/anim.js';
import { solve, toScreen, toSVG } from '../characters/mum/rig.js';
import { BONE } from '../characters/mum/skeleton.js';
import * as prop from '../characters/mum/proportions.js';
import { ap } from '../characters/mum/geom.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);
const name = arg('anim', 'idle-seated');
const D = 'characters/mum/';
const spec = JSON.parse(fs.readFileSync(`${D}anims/${name}.json`));
const lib = {};
for (const k of spec.keys) lib[k.pose] = JSON.parse(fs.readFileSync(`${D}poses/${k.pose}.json`));
const A = makeAnim(spec, lib);
const N = Math.round(spec.duration * spec.fps);
const LAST = spec.loop ? N - 1 : N;
const every = +arg('every', 1), from = +arg('from', 0), to = +arg('to', N);
const frameDir = `out/frames/${name}`;
fs.mkdirSync(frameDir, { recursive: true });

// ---- joint tracks (pure, from the same poseAt): screen px per frame, for arc / spacing charts
const TRACK = { headTip: 'head', head: 'head', neck: 'neck', handNearTip: 'hand.near', wristNear: 'hand.near', elbowNear: 'forearm.near',
                shoulderNear: 'upperArm.near', chest: 'chest', handFarTip: 'hand.far' };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);
const tracks = [], svgHash = [];
for (let i = 0; i <= N; i++) {
  const t = i / spec.fps, pose = A.poseAt(t), st = solve(pose);
  const row = { i, t };
  for (const [jn, b] of Object.entries(TRACK)) {
    const j0 = prop.joints[BONE[b].joint], j = prop.joints[jn];
    row[jn] = toScreen(ap(st[b].M, [j[0] - j0[0], j[1] - j0[1]])).map((v) => +v.toFixed(2));
  }
  row.ch = { ...Object.fromEntries(Object.entries(pose.bones).map(([k, v]) => ['bone.' + k, +v.toFixed(3)])),
             hairNear: +pose.fx.hair.near.toFixed(3), hairFar: +pose.fx.hair.far.toFixed(3), breath: +A.breathAt(t).toFixed(4),
             chestAlong: +(pose.scale.spineUpper?.[0] ?? 1).toFixed(4), handRim: +(pose.fx.handRim ?? 0).toFixed(3),
             bellyY: +pose.lattice.belly[2][1][1].toFixed(5) };
  tracks.push(row);
  svgHash.push(sha(toSVG(pose, { frame: 'still', bg: spec.render?.bg, ground: spec.render?.ground })));
}
fs.writeFileSync(`out/${name}_tracks.json`, JSON.stringify({ fps: spec.fps, N, loop: !!spec.loop, keys: spec.keys, events: spec.events || [], breath: spec.breath, tracks }));
if (spec.loop) console.log(`loop seam: frame ${N} ${svgHash[N] === svgHash[0] ? '==' : '!='} frame 0`);
// determinism at the SVG level: a second, independent makeAnim must give byte-identical frames
const A2 = makeAnim(JSON.parse(fs.readFileSync(`${D}anims/${name}.json`)), lib);
let svgMismatch = 0;
for (let i = 0; i <= N; i++) if (sha(toSVG(A2.poseAt(i / spec.fps), { frame: 'still', bg: spec.render?.bg, ground: spec.render?.ground })) !== svgHash[i]) svgMismatch++;
console.log(`svg determinism: ${svgMismatch} mismatches over ${N + 1} frames`);

async function renderFrames(frames, dir) {
  const { srv, base } = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(`${base}/${D}anim.html?anim=${name}`);
  await page.waitForFunction(() => window.__ready === true);
  const hashes = {};
  for (const i of frames) {
    await page.evaluate((t) => window.renderAt(t), i / spec.fps);
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    hashes[i] = sha(buf);
    if (dir) fs.writeFileSync(`${dir}/f${String(i).padStart(4, '0')}.png`, buf);
  }
  await browser.close(); srv.close();
  return hashes;
}

const frames = [];
for (let i = from; i <= Math.min(to, LAST); i += every) frames.push(i);
const t0 = Date.now();
const hashes = await renderFrames(frames, frameDir);
console.log(`rendered ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${frameDir}`);
fs.writeFileSync(`out/${name}_hashes.txt`, frames.map((i) => `${i}\t${hashes[i]}`).join('\n') + '\n');

const vk = +arg('verify', 0);
if (vk) {
  const sub = frames.filter((i) => i % vk === 0);
  const h2 = await renderFrames(sub, null);
  const bad = sub.filter((i) => h2[i] !== hashes[i]);
  console.log(`png determinism: ${bad.length} mismatches over ${sub.length} re-rendered frames${bad.length ? ' ' + bad.join(',') : ''}`);
}

if (!flag('no-mp4') && every === 1 && from === 0 && to >= LAST) {
  const mp4 = `out/${name}.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(spec.fps), '-i', `${frameDir}/f%04d.png`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  console.log('wrote', mp4);
  if (spec.loop) {
    const rep = `out/${name}_x3.mp4`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-stream_loop', '2', '-i', mp4, '-c', 'copy', rep]);
    console.log('wrote', rep, '(3 loops, for judging the seam)');
  }
}
