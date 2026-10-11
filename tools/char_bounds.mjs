// Posed bounds of a character in H, plus a margin: node tools/char_bounds.mjs <char> [pose] [margin=0.12] → "x0,y0,x1,y1"
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
const [char, poseName, m = '0.12'] = process.argv.slice(2);
const C = (await import(`../characters/${char}/character.js`)).default;
const lib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`characters/${char}/poses/hands/${h}.json`))]));
const pose = expandHands(poseName ? JSON.parse(fs.readFileSync(`characters/${char}/poses/${poseName}.json`)) : {}, lib, C.handSides);
const [[x0, y0], [x1, y1]] = createRig(C).bounds(pose), M = +m;
console.log([x0 - M, y0 - M, x1 + M, Math.max(y1 + M, 0.05)].map((v) => v.toFixed(3)).join(','));
