// Print joint world positions of a pose in reference-image px (for review crops).  node tools/char_joints.mjs <char> <pose>
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
const [char, poseName] = process.argv.slice(2);
const C = (await import(`../characters/${char}/character.js`)).default;
const rig = createRig(C);
const lib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`characters/${char}/poses/hands/${h}.json`))]));
let pose = poseName ? JSON.parse(fs.readFileSync(`characters/${char}/poses/${poseName}.json`)) : {};
pose = expandHands(pose, lib, C.handSides);
const st = rig.solve(pose), out = {};
for (const b of rig.BONES) out[b.id] = [st[b.id].pos[0] * C.ref.Hpx + C.ref.groundPx[0], st[b.id].pos[1] * C.ref.Hpx + C.ref.groundPx[1]];
console.log(JSON.stringify(out));
