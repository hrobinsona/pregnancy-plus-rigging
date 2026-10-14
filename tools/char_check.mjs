// Fast pre-render gate: node tools/char_check.mjs <char> [--fix-anchors]
// 1) loads the character (syntax/import errors surface here in <1 s instead of as a 30 s browser timeout)
// 2) builds EVERY pose in characters/<char>/poses/*.json (+ rest) through the rig
// 3) checks the anchor-count contract (each part's documented anchor count = built count, identical in every pose —
//    fixed topology is what lets parts animate/morph); --fix-anchors prints the corrected ANCHORS entries
// 4) every hand drawn the right way round (handedness, tools/handed.mjs); 5) lint
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { expandHands } from '../engine/handlib.js';
const char = process.argv[2], fix = process.argv.includes('--fix-anchors');
const C = (await import(`../characters/${char}/character.js`)).default;
const rig = createRig(C);
const lib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`characters/${char}/poses/hands/${h}.json`))]));
const poses = fs.readdirSync(`characters/${char}/poses`).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
const doc = Object.assign({}, ...Object.values(C.modules).map((m) => m.ANCHORS || {}));
const counts = {}, problems = [];
for (const name of ['(rest)', ...poses]) {
  const pose = name === '(rest)' ? {} : expandHands(JSON.parse(fs.readFileSync(`characters/${char}/poses/${name}.json`)), lib, C.handSides);
  const saved = Object.values(C.modules).map((m) => m.ANCHORS); Object.values(C.modules).forEach((m) => { m.ANCHORS = {}; });   // build without the contract, then compare
  let parts; try { parts = rig.build(pose); } catch (e) { problems.push(`${name}: build failed — ${e.message}`); continue; } finally { Object.values(C.modules).forEach((m, i) => { m.ANCHORS = saved[i]; }); }
  for (const p of parts) {
    const n = p.anchors ?? p.geom.P.length;
    if (counts[p.id] !== undefined && counts[p.id] !== n) problems.push(`${p.id}: ${counts[p.id]} anchors in one pose, ${n} in ${name} — topology must not change between poses`);
    counts[p.id] = n;
    if (doc[p.id] !== undefined && doc[p.id] !== n) problems.push(`${p.id}: built ${n}, documented ${doc[p.id]}`);
  }
}
// 4) HANDEDNESS (tools/handed.mjs, lesson 53): in every pose each hand's thumb is drawn on the side its 3D arm puts it — a
//    spec copied from the other hand draws its mirror image (mum3q v1–v7: a right hand on her left arm, on the bump)
{
  const { handednessOfPoses, explain } = await import('./handed.mjs');
  const all = [['(rest)', {}], ...poses.map((n) => [n, JSON.parse(fs.readFileSync(`characters/${char}/poses/${n}.json`))])];
  const bad = handednessOfPoses(C, rig, all, lib), exc = bad.filter((b) => b.excused);
  for (const b of bad.filter((x) => !x.excused)) problems.push(`${b.name}: ${explain(b)}`);
  if (exc.length) console.log(`handedness: ${exc.length} pose(s) excused by C.qa.handed (${[...new Set(exc.map((b) => `${b.side}: ${b.excused.why}`))].join('; ')}): ${exc.map((b) => b.name).slice(0, 6).join(', ')}${exc.length > 6 ? ' …' : ''}`);
}
// 5) LINT: a '//' comment followed on the same line by more `key: value,` code means an edit dropped a comment MID-LINE and
//    silently commented out the rest of an object literal (it builds fine — the keys just fall back to defaults). Bit us 5×.
for (const f of [`characters/${char}/params.js`, ...fs.readdirSync(`characters/${char}/parts`).map((x) => `characters/${char}/parts/${x}`), ...fs.readdirSync('engine').filter((x) => x.endsWith('.js')).map((x) => `engine/${x}`)]) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((ln, i) => {
    const c = ln.indexOf('//'); if (c < 0 || /https?:\/\//.test(ln)) return;
    const after = ln.slice(c + 2);
    if (/[,{(]\s*[A-Za-z_$][\w$]*\s*:\s*[-\[{('"0-9A-Za-z_$]/.test(after) && /[,;{(]\s*$/.test(after.trim()) && /\b[A-Za-z_$][\w$]*\s*:\s*[-\[{0-9]/.test(after.split('  ').pop()))
      problems.push(`${f}:${i + 1}: code after a '//' comment on the same line (mid-line comment?) — …${after.slice(-70)}`);
  });
}
const uniq = [...new Set(problems)];
if (fix) for (const [id, n] of Object.entries(counts)) if (doc[id] !== undefined && doc[id] !== n) console.log(`  '${id}': ${n},`);
console.log(uniq.length ? uniq.join('\n') : `ok — ${char}: ${Object.keys(counts).length} parts, ${poses.length + 1} poses, anchor contract holds`);
process.exit(uniq.length ? 1 : 0);
