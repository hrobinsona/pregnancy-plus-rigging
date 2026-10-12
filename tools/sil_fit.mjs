// sil_fit.mjs — refine a landmark-fitted pose against the reference's MATERIAL SILHOUETTE (measurement only).
//   node tools/sil_fit.mjs <char> <inPose> <refClasses.json> <outPose> [--vars a,b,c] [--lam 0.2] [--roi x0,y0,x1,y1]
//        [--prior var=centre:weight,...] [--steps 8,4,2,1,0.5]
// The landmark fit (tools/fit_pose.mjs) puts joints where a pose estimator GUESSED them; this step moves the chosen DOFs
// so our parts cover the same pixels as the reference's materials (a sleeve's outline, the top showing between arm and
// body, the hand against the background), keeping the landmark term (out/fit_<inPose>_targets.json) as an anchor.
// The renderer is the browser's canvas with the rig's own geometry and clips (engine/raster.js), so it matches the SVG.
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { expandHands } from '../engine/handlib.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [char, inPose, refJson, outName] = argv;
const D = `characters/${char}/`;
const C = (await import(`../characters/${char}/character.js`)).default;
const handLib = Object.fromEntries((C.handLibrary || []).map((h) => [h, JSON.parse(fs.readFileSync(`${D}poses/hands/${h}.json`))]));
const src = JSON.parse(fs.readFileSync(`${D}poses/${inPose}.json`)), pose0 = expandHands(structuredClone(src), handLib, C.handSides);
pose0.bones ||= {};
const ref = JSON.parse(fs.readFileSync(refJson));
const tj = `out/fit_${src._fit?.from || inPose}_targets.json`, targets = fs.existsSync(tj) ? JSON.parse(fs.readFileSync(tj)).targets.filter((t) => t.bone) : [];
const side = arg('side', 'far');
const vars = (arg('vars') || [`clavicle.${side}`, `upperArm.${side}`, `armAbd.${side}`, `armRot.${side}`, `forearm.${side}`, `foreRot.${side}`, `hand.${side}`].join(',')).split(',');
const BONE = Object.fromEntries(C.bones.map((b) => [b.id, b]));
const lims = Object.fromEntries(vars.map((v) => [v, v.startsWith('root.') ? [-0.6, 0.6] : [BONE[v]?.min ?? -180, BONE[v]?.max ?? 180]]));
const priorW = Object.fromEntries((arg('prior', '') || '').split(',').filter(Boolean).map((kv) => { const [v, cw] = kv.split('='); const [c, w] = cw.split(':').map(Number); return [v, [c, w]]; }));
const cfg = { box: ref.box, res: ref.res, ref: ref.classes, pose0, vars, lims, targets, lam: +arg('lam', 0.2), priorW,
  roi: arg('roi') ? arg('roi').split(',').map(Number) : undefined, steps: arg('steps') ? arg('steps').split(',').map(Number) : undefined };
const { srv, base } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/engine/view.html?char=${char}`);
await page.waitForFunction(() => window.__ready === true);
const t0 = Date.now();
const res = await page.evaluate(async (cfg) => {
  const { silFit, classMap } = await import('/engine/raster.js');
  const before = silFit(window.rig, window.rig.C, { ...cfg, steps: [] });
  const r = silFit(window.rig, window.rig.C, cfg);
  const a = classMap(window.rig, window.rig.C, cfg.pose0, cfg.box, cfg.res), b = classMap(window.rig, window.rig.C, r.pose, cfg.box, cfg.res);
  return { ...r, before: before.loss, mapBefore: a, mapAfter: b };
}, cfg);
await browser.close(); srv.close();
const out = structuredClone(src);
out.name = outName; out.bones ||= {};
vars.forEach((v, i) => { if (v.startsWith('root.')) (out.root ||= [0, 0])[+v.slice(5)] = +res.x[i].toFixed(4); else out.bones[v] = Math.round(res.x[i] * 10) / 10; });
out._sil = { ref: refJson, vars, before: res.before, after: res.loss, evals: res.evals };
fs.writeFileSync(`${D}poses/${outName}.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`out/sil/${outName}_maps.json`, JSON.stringify({ w: ref.w, h: ref.h, ref: ref.classes, before: res.mapBefore.data, after: res.mapAfter.data }));
if (fs.existsSync(tj)) fs.copyFileSync(tj, `out/fit_${outName}_targets.json`);
const f = (L) => `L ${L.L.toFixed(4)} (landmarks ${L.lm.toFixed(4)}, silhouette ${L.sil.toFixed(4)} H², prior ${L.pr.toFixed(4)})`;
console.log(`sil_fit ${outName}: ${res.evals} evals in ${((Date.now() - t0) / 1000).toFixed(1)}s\n  before ${f(res.before)}\n  after  ${f(res.loss)}`);
console.log('  ' + vars.map((v, i) => `${v} ${res.x[i].toFixed(1)}`).join(', '));
