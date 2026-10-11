// regenerate the part table in spec.md from the rig (z, id, bone, anchors, fill token) so the spec never drifts
import fs from 'node:fs';
import { build } from '../characters/mum/rig.js';
import { P } from '../characters/mum/palette.js';
const tok = Object.fromEntries(Object.entries(P).map(([k, v]) => [v, k]));
const rest = JSON.parse(fs.readFileSync('characters/mum/poses/rest.json'));
const rows = build(rest).map((p) => `| ${p.z} | ${p.id.replace('mum.', '')} | ${p.bone} | ${p.anchors} | ${tok[p.fill]} |`);
const table = ['| z | part id (`mum.` prefix) | bone | anchors | fill |', '|---|---|---|---|---|', ...rows].join('\n');
const spec = fs.readFileSync('characters/mum/spec.md', 'utf8');
const out = spec.replace(/<!-- parts:start -->[\s\S]*<!-- parts:end -->/, `<!-- parts:start -->\n${table}\n<!-- parts:end -->`);
fs.writeFileSync('characters/mum/spec.md', out);
console.log(rows.length, 'parts written to spec.md');
