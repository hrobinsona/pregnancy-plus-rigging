// parts_dump.mjs — the drawn parts of one frame of a shot: id, z (draw order), fill, stroke, clip — filtered by a regex on
// id or fill. For draw-order and bleed questions ("what is that pink tab?", "is the sleeve in front of the panel?").
//   node tools/parts_dump.mjs <char> <anim> <t seconds> [regex]      e.g.  … mum2 nausea-to-belly 10.0 "far|wrap|belly"
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { makeAnim } from '../engine/anim.js';
import { expandHands } from '../engine/handlib.js';
const [char, name, t, re = '.'] = process.argv.slice(2), D = `characters/${char}/`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const spec = JSON.parse(fs.readFileSync(`${D}anims/${name}.json`));
const names = new Set(); JSON.stringify(spec, (k, v) => { if ((k === 'pose' || k === 'plant') && typeof v === 'string') names.add(v); return v; });
const lib = Object.fromEntries([...names].filter((p) => fs.existsSync(`${D}poses/${p}.json`)).map((p) => [p, expandHands(JSON.parse(fs.readFileSync(`${D}poses/${p}.json`)), handLib, C.handSides)]));
const A = makeAnim(spec, lib, { rig, C }); const pose = A.poseAt(+t);
const parts = rig.build(pose);
for (const p of parts) if (new RegExp(re).test(p.id) || new RegExp(re).test(String(p.fill))) console.log(p.id, p.z, p.fill, p.stroke || '', p.clip ? 'clip:' + JSON.stringify(p.clip).slice(0, 60) : '');
