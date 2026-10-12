// part_tint.mjs — one frame of a shot with chosen parts TINTED (60 % opacity), to see which part makes an edge, a notch or
// a sliver (mum3's nape kink: the chest skin's back edge jutting past the bent neck). Ids as tools/parts_dump.mjs lists them.
//   node tools/part_tint.mjs <char> <anim> <t seconds> <out.png> [id=#colour …]     e.g.  … mum3 breathe-stroke 9.5 out/x.png neck=#00f chest.skin=#f00
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { createRig } from '../engine/rig.js';
import { makeAnim } from '../engine/anim.js';
import { expandHands } from '../engine/handlib.js';
const [char, name, t, out, ...colors] = process.argv.slice(2), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const spec = JSON.parse(fs.readFileSync(`${D}anims/${name}.json`));
const names = new Set(); JSON.stringify(spec, (k, v) => { if (k === 'pose' && typeof v === 'string') names.add(v); return v; });
const lib = Object.fromEntries([...names].filter((p) => fs.existsSync(`${D}poses/${p}.json`)).map((p) => [p, expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), handLib, C.handSides)]));
const A = makeAnim(spec, lib, { rig, C });
const { srv, base } = await serve(); const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`${base}/engine/view.html?char=${char}&frame=still`); await page.waitForFunction(() => window.__ready === true);
await page.evaluate((p) => window.renderPose(p), A.poseAt(+t));
await page.evaluate((cs) => { for (const c of cs) { const [id, col] = c.split('='); const el = document.getElementById(id); if (el) { el.setAttribute('fill', col); el.setAttribute('fill-opacity', '0.6'); } } }, colors);
await page.locator('#stage svg').screenshot({ path: out });
await b.close(); srv.close();
