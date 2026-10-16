// Close-up crops of a posed figure, fast (one browser page per drawing style), for tools/side_zoom.py.
//   node tools/side_zoom.mjs --char mum3 --out <dir> [--px 350] [--size 0.7] [--at near,far | --at neck,chest] [--try JSON] [--marks dress,dress.skirt] <pose | anim@t>...
// <anim>@<t>: a shot's frame at t s (anims/<anim>.json) instead of a pose, so a drawing tried for the side poses is judged on
// the standing shot too (side-on round 5's hand drawing won beside the stills and lost blind on breathe-stroke, lesson 64).
// --at: what each crop is centred on: 'near' / 'far' = that hand (the centre of its wrist, middle fingertip and thumb tip,
// the default), any other name = that bone's pivot (neck, chest, thigh.near, …), name@dx,dy = offset from it (H).
// --try: a JSON list of candidates [{"label", "style": {handSpecs keys}, "bones": {...}, "fx": {...}, "hands": {near, far}, "scale": {bone: [along, across]},
//   "lib": {name: hand-library entry}}] (lib: shapes written inline, to try before saving one as poses/hands/<name>.json)
// (default: one candidate, the poses as they are). Every candidate is cropped on the FIRST candidate's figure, so the
// candidates line up. --marks: those parts' anchors drawn over the crop, numbered (which anchor makes a notch or a tab).
// Writes <dir>/<pose>_<at>_<k>.png and <dir>/centres.json ({pose: {at: [x, y]}} in H).
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const opts = new Set(['char', 'out', 'px', 'size', 'try', 'at', 'marks']);
const poses = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && opts.has(argv[i - 1].slice(2))));
const char = arg('char', 'mum3'), out = arg('out', 'out/side_zoom'), px = +arg('px', 350), size = +arg('size', 0.7);
const ats = arg('at', 'near,far').split(','), cands = JSON.parse(arg('try', '[{"label": "ours"}]')), marks = arg('marks', '').split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const { createRig } = await import('../engine/rig.js'), { expandHands } = await import('../engine/handlib.js'), { makeAnim } = await import('../engine/anim.js'), { ap } = await import('../engine/geom.js');
const C = (await import(`../characters/${char}/character.js`)).default, rig = createRig(C), D = `characters/${char}/`;
const hl = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const withCand = (p, c) => ({ ...p, bones: { ...(p.bones || {}), ...(c.bones || {}) }, fx: { ...(p.fx || {}), ...(c.fx || {}) }, hands: { ...(p.hands || {}), ...(c.hands || {}) }, scale: { ...(p.scale || {}), ...(c.scale || {}) } });
const loadPose = (p) => JSON.parse(fs.readFileSync(`${D}poses/${p}.json`));
const atT = (p) => {   // anim@t → the shot's pose at t
  const [an, t] = p.split('@'), spec = JSON.parse(fs.readFileSync(`${D}anims/${an}.json`)), names = new Set();
  JSON.stringify(spec, (k, v) => { if (k === 'pose' && typeof v === 'string') names.add(v); return v; });
  const lib = Object.fromEntries([...names].map((n) => [n, expandHands(loadPose(n), hl, C.handSides)]));
  return makeAnim(spec, lib, { rig, C, quiet: true }).poseAt(+t);
};
const raw = Object.fromEntries(poses.map((p) => [p, p.includes('@') ? atT(p) : loadPose(p)]));
const centre = {};
for (const p of poses) {
  const st = rig.solve(expandHands(withCand(raw[p], cands[0]), { ...hl, ...(cands[0].lib || {}) }, C.handSides));
  centre[p] = Object.fromEntries(ats.map((at) => {
    const [name, off] = at.split('@'), [dx, dy] = off ? off.split(':').map(Number) : [0, 0];
    if (name === 'near' || name === 'far') {
      const q = [st[`hand.${name}`].pos, rig.carry(st, `hand.${name}.f2c`, `hand.${name}.f2t`), rig.carry(st, `hand.${name}.t2`, `hand.${name}.tt`)];
      return [at, [(q[0][0] + q[1][0] + q[2][0]) / 3 + dx, (q[0][1] + q[1][1] + q[2][1]) / 3 + dy]];
    }
    if (!st[name]) throw new Error(`--at ${name}: no such bone`);
    return [at, [st[name].pos[0] + dx, st[name].pos[1] + dy]];
  }));
}
fs.writeFileSync(`${out}/centres.json`, JSON.stringify(centre));
const { srv, base } = await serve();
const browser = await chromium.launch();
const fname = (p, at, k) => `${out}/${p.replace(/\//g, '_')}_${at.replace(/[^\w.-]/g, '_')}_${k}.png`;
for (const [k, c] of cands.entries()) {
  const page = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
  const q = new URLSearchParams({ char, frame: 'box', box: JSON.stringify([[0, -1], [1, 0]]), width: String(px), ...(c.style ? { handStyle: JSON.stringify(c.style) } : {}) });
  await page.goto(`${base}/engine/view.html?${q}`);
  await page.waitForFunction(() => window.__ready === true);
  if (c.lib) await page.evaluate((L) => Object.assign(window.handLib, L), c.lib);
  for (const p of poses) for (const at of ats) {
    const [x, y] = centre[p][at], box = [[x - size / 2, y - size / 2], [x + size / 2, y + size / 2]];
    await page.evaluate(([pp, o]) => window.renderPose(pp, o), [withCand(raw[p], c), { box, width: px }]);
    if (marks.length) {   // (in model px: the viewBox is H·Hpx)
      const Hpx = C.ref?.Hpx ?? 210, r = size * Hpx / 160, parts = rig.build(expandHands(withCand(raw[p], c), { ...hl, ...(c.lib || {}) }, C.handSides));
      const svg = marks.flatMap((id, m) => { const q = parts.find((t) => t.id === id); if (!q) return [];
        const col = ['#0060ff', '#00a040', '#d000c0', '#ff8000'][m % 4];
        return q.geom.P.map((v, i) => { const [x, y] = ap(q.M, v).map((u) => u * Hpx);
          return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><text x="${x + 1.5 * r}" y="${y - r}" font-size="${4 * r}" fill="${col}">${i}</text>`; }); }).join('');
      await page.evaluate((h) => document.querySelector('#stage svg').insertAdjacentHTML('beforeend', h), svg);
    }
    await page.locator('#stage svg').screenshot({ path: fname(p, at, k) });
  }
  await page.close();
}
await browser.close(); srv.close();
console.log(`${poses.length * ats.length * cands.length} crops in ${out}`);
