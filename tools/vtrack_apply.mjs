// vtrack_apply.mjs — turn fitted reference-video tracks into animation data, in place in the timeline file.
//   node tools/vtrack_apply.mjs <char> <anim> [--only seg]
// Reads spec.video = [ … ] (the recipe) and characters/<char>/refs/tracks/vtrack_<seg>.json + poses/v/<seg>_f####.json (tools/fit_video.py), and
// writes the generated data back into the spec (re-runnable: it replaces what it wrote before):
//   {seg, kind: "path", side, stop, on, src: [a, b], smooth}   → spec.reach[side][the stop at time `stop`].path
//       the far wrist's path measured frame by frame in the frame of bone `on` (position, depth, swivel, hand angle),
//       smoothed (robust local-quadratic regression, σ = smooth s of video time), video time src mapped onto the move
//       [previous stop, this stop]. engine/anim.js follows it and warps its ends onto the two contacts.
//   {seg, kind: "layer", src: [a, b], dst: [t0, t1], channels: [bones], amp, smooth, taper}   → spec.layers[]
//       each channel's DEVIATION from its own start→end chord (smootherstep), tapered at the ends, added on the keys.
// The video is measurement only: nothing from it is drawn; the rig is driven by numbers measured from it.
import fs from 'node:fs';
import { createRig } from '../engine/rig.js';
import { armFrame, armPoints, swivelOf } from '../engine/depth.js';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [char, anim] = argv, D = `characters/${char}/`, file = `${D}anims/${anim}.json`;
const C = (await import(`../${D}character.js`)).default, rig = createRig(C);
const spec = JSON.parse(fs.readFileSync(file));
const inv = (m) => { const d = m[0] * m[3] - m[1] * m[2]; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
const apM = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
const r4 = (x) => Math.round(x * 1e4) / 1e4, smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const unwrap = (a, per) => { const o = [a[0]]; for (let i = 1; i < a.length; i++) { let d = a[i] - a[i - 1]; d -= per * Math.round(d / per); o.push(o[i - 1] + d); } return o; };

/** robust LOWESS (Cleveland 1979): Gaussian-weighted local quadratic fit at every sample, then 2 passes that down-weight
 *  outliers (bisquare on the residuals) — a one-frame fit glitch does not bend the curve. */
function lowess(t, y, sigma) {
  const n = t.length; let rw = new Array(n).fill(1), out = y.slice();
  for (let pass = 0; pass < 3; pass++) {
    out = t.map((ti) => {
      let S = [0, 0, 0, 0, 0], R = [0, 0, 0];
      for (let j = 0; j < n; j++) {
        const dt = t[j] - ti; if (Math.abs(dt) > 3 * sigma) continue;
        const w = Math.exp(-dt * dt / (2 * sigma * sigma)) * rw[j];
        S[0] += w; S[1] += w * dt; S[2] += w * dt * dt; S[3] += w * dt ** 3; S[4] += w * dt ** 4;
        R[0] += w * y[j]; R[1] += w * y[j] * dt; R[2] += w * y[j] * dt * dt;
      }
      // solve the 3×3 normal equations [S0 S1 S2; S1 S2 S3; S2 S3 S4] c = R (Cramer); fall back to the weighted mean
      const M = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]];
      const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const d = det(M); if (Math.abs(d) < 1e-12 * Math.max(1, S[0] ** 3)) return R[0] / S[0];
      const M0 = M.map((row, i) => [R[i], row[1], row[2]]); return det(M0) / d;
    });
    const res = y.map((v, i) => Math.abs(v - out[i])), med = [...res].sort((a, b) => a - b)[n >> 1] || 1e-9;
    rw = res.map((r) => { const u = r / (6 * med); return Math.max(1e-3, u < 1 ? (1 - u * u) ** 2 : 0); });
  }
  return out;
}

/** monotone cubic (Fritsch–Carlson) through [[x, y], …]: a smooth, never-backwards time map (video s → shot s), so a
 *  retimed performance can land its beats on the shot's beats without speed kinks at the anchors */
function monoMap(P) {
  const n = P.length, x = P.map((p) => p[0]), y = P.map((p) => p[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  m.push(d[0]); for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2); m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b; if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  return (t) => {
    if (t <= x[0]) return y[0] + (t - x[0]) * m[0]; if (t >= x[n - 1]) return y[n - 1] + (t - x[n - 1]) * m[n - 1];
    let i = 0; while (t > x[i + 1]) i++;
    const h = x[i + 1] - x[i], u = (t - x[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * y[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}
const only = arg('only');
spec.layers = spec.layers || [];
for (const V of spec.video || []) {
  if (only && V.seg !== only) continue;
  const trP = fs.existsSync(`${D}refs/tracks/vtrack_${V.seg}.json`) ? `${D}refs/tracks/vtrack_${V.seg}.json` : `out/vtrack_${V.seg}.json`, tr = JSON.parse(fs.readFileSync(trP)), fps = tr.fps;
  const [a, b] = V.src ?? [V.map[0][0], V.map[V.map.length - 1][0]], sel = tr.t.map((t, i) => i).filter((i) => tr.t[i] >= a - 1e-6 && tr.t[i] <= b + 1e-6);
  if (sel.length < 4) throw new Error(`${V.seg}: only ${sel.length} samples in ${V.src}`);
  const tv = sel.map((i) => tr.t[i]), ta = tv[0], tb = tv[tv.length - 1], sig = V.smooth ?? 0.06;
  const poseOf = (i) => JSON.parse(fs.readFileSync(`${D}poses/v/${V.seg}_f${String(Math.round(tr.t[i] * fps)).padStart(4, '0')}.json`));
  if (V.kind === 'path') {
    const L = spec.reach[V.side], si = L.findIndex((e) => !e.via && Math.abs(e.t - V.stop) < 1e-6);
    if (si < 0) throw new Error(`${V.seg}: no reach stop at t=${V.stop}`);
    let pi = si - 1; while (pi >= 0 && L[pi].via) pi--;
    if (pi < 0) throw new Error(`${V.seg}: the path move needs a stop before it`);
    const t0 = L[pi].t, t1 = L[si].t, side = V.side, ha = 'hand.' + side, on = V.on;
    const raw = sel.map((i) => {
      const p = poseOf(i), st = rig.solve(p), fr = armFrame(rig, st, side), A = armPoints(rig, st, side);
      const dm = fr.depthOf(fr.fromScreenMid(st[on].pos));
      return { p: apM(inv(st[on].M), st[ha].pos), rot: st[ha].rot - st[on].rot, z: fr.depthOf(A.wr) - dm, phi: swivelOf(A.el, A.wr), local: p.bones[ha] ?? 0, twist: p.bones['foreRot.' + side] ?? 0 };
    });
    const S = (f, per, sg = sig) => lowess(tv, per ? unwrap(raw.map(f), per) : raw.map(f), sg);
    let px = S((r) => r.p[0]), py = S((r) => r.p[1]), z = S((r) => r.z);
    const phi = S((r) => r.phi, 2 * Math.PI), rot = S((r) => r.rot, 360), local = S((r) => r.local), twist = S((r) => r.twist);
    // progress along the path (screen + depth arc length): the offsets onto the two contacts blend by it
    const arc = (X_, Y_, Z_) => { const a = [0]; for (let k = 1; k < tv.length; k++) a.push(a[k - 1] + Math.hypot(X_[k] - X_[k - 1], Y_[k] - Y_[k - 1], Z_[k] - Z_[k - 1])); return a; };
    let s = arc(px, py, z);
    // V.shapeSmooth (s of video time): SHAPE and TIMING apart — the path's shape low-passed hard (the video's hand wobbles:
    // in to the sternum, out, in again — critic R9 "zig-zag"), walked at the video's own pace (its light-smoothed progress)
    if (V.shapeSmooth) {
      const hx = S((r) => r.p[0], 0, V.shapeSmooth), hy = S((r) => r.p[1], 0, V.shapeSmooth), hz = S((r) => r.z, 0, V.shapeSmooth), ha = arc(hx, hy, hz);
      const fr = s.map((v) => v / (s[s.length - 1] || 1)), hfr = ha.map((v) => v / (ha[ha.length - 1] || 1));
      const at = (f) => { let k = 0; while (k < hfr.length - 2 && hfr[k + 1] < f) k++; const u = (f - hfr[k]) / ((hfr[k + 1] - hfr[k]) || 1); return [hx[k] + u * (hx[k + 1] - hx[k]), hy[k] + u * (hy[k + 1] - hy[k]), hz[k] + u * (hz[k + 1] - hz[k])]; };
      const P_ = fr.map(at); px = P_.map((q) => q[0]); py = P_.map((q) => q[1]); z = P_.map((q) => q[2]); s = fr.map((f) => f);
    }
    // V.easeEnds (fraction of the move): a window cut out of a video starts and ends mid-motion — blend its progress into
    // a minimum-jerk curve near both ends so the hand leaves and lands at rest (no jump on the first frame of the move)
    if (V.easeEnds) {
      const totS = s[s.length - 1] || 1, f_ = V.easeEnds, ss = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, mjF = (u) => u * u * u * (10 + u * (-15 + 6 * u));
      s = tv.map((t, k) => { const u = (t - ta) / (tb - ta), w = ss(u / f_) * ss((1 - u) / f_); return totS * ((1 - w) * mjF(u) + w * s[k] / totS); });
    }
    // V.frame 'torso': ALSO measure the wrist and elbow straight from the video's landmarks in a TORSO frame (u across the
    // shoulders: 0 = near shoulder, 1 = far; v down the trunk: 0 = shoulders, 1 = hips) — a retarget that survives
    // different proportions (the chest-frame path put the video's hand on our chest because her bump and chest differ)
    let uv = null, euv = null;
    if (V.frame === 'torso') {
      const VJ = JSON.parse(fs.readFileSync(tr.video)), S_ = V.side === 'near' ? 'R' : 'L';
      const meas = sel.map((i) => {
        const Pm = VJ.frames[Math.round(tr.t[i] * fps)].pose, g = (n) => Pm[n];
        const sN = g('shoulderR'), sF = g('shoulderL'), ms = [(sN[0] + sF[0]) / 2, (sN[1] + sF[1]) / 2], mh = [(g('hipR')[0] + g('hipL')[0]) / 2, (g('hipR')[1] + g('hipL')[1]) / 2];
        const ex = [sF[0] - sN[0], sF[1] - sN[1]], ey = [mh[0] - ms[0], mh[1] - ms[1]], det = ex[0] * ey[1] - ex[1] * ey[0];
        const f = (p) => { const d = [p[0] - sN[0], p[1] - sN[1]]; return [(d[0] * ey[1] - d[1] * ey[0]) / det, (ex[0] * d[1] - ex[1] * d[0]) / det]; };
        return { w: f(g('wrist' + S_)), e: f(g('elbow' + S_)) };
      });
      const sm = (f) => lowess(tv, meas.map(f), sig);
      const wu = sm((m) => m.w[0]), wv = sm((m) => m.w[1]), eu = sm((m) => m.e[0]), ev = sm((m) => m.e[1]);
      uv = wu.map((x, k) => [r4(x), r4(wv[k])]); euv = eu.map((x, k) => [r4(x), r4(ev[k])]);
      const a = [0]; for (let k = 1; k < tv.length; k++) a.push(a[k - 1] + Math.hypot(wu[k] - wu[k - 1], wv[k] - wv[k - 1]));
      s = a.map((x) => x / (a[a.length - 1] || 1));
      if (V.easeEnds) { const f_ = V.easeEnds, ss = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, mjF = (u) => u * u * u * (10 + u * (-15 + 6 * u)); s = tv.map((t, k) => { const u = (t - ta) / (tb - ta), w = ss(u / f_) * ss((1 - u) / f_); return (1 - w) * mjF(u) + w * s[k]; }); }
    }
    const tot = s[s.length - 1] || 1;
    const mapT = (t) => t0 + (t - ta) / (tb - ta) * (t1 - t0);
    L[si].path = { seg: V.seg, src: [r4(ta), r4(tb)], on, m: V.m ?? 0, reg: V.reg, bend: V.bend, bias: V.bias, zBy: V.zBy, zFrom: V.zFrom, shape: V.shape, bow: V.bow, corner: V.corner, elbowLead: V.elbowLead, timing: V.timing, skew: V.skew, bendFrom: V.bendFrom, twistFrom: V.twistFrom, twistAt: V.twistAt, bendAt: V.bendAt, rollAt: V.rollAt, behindFrom: V.behindFrom, elbowPath: V.elbowPath, elbowBias: V.elbowBias, frontRamp: V.frontRamp, front: V.front, frame: V.frame, t: tv.map((t) => r4(mapT(t))), p: px.map((x, k) => [r4(x), r4(py[k])]),
      z: z.map(r4), phi: phi.map(r4), rot: rot.map((x) => Math.round(x * 100) / 100), local: local.map((x) => Math.round(x * 100) / 100), twist: twist.map((x) => Math.round(x * 100) / 100), s: s.map((x) => r4(x / tot)), ...(uv ? { uv, euv, elbowW: V.elbowW ?? 1 } : {}) };
    fs.writeFileSync(`out/vpath_${V.seg}.json`, JSON.stringify({ tv, raw, smooth: { px, py, z, phi, rot, local, twist, s: s.map((x) => x / tot) } }));   // for inspection plots
    const sp = tv.slice(1).map((t, k) => Math.hypot(px[k + 1] - px[k], py[k + 1] - py[k]) / ((mapT(t) - mapT(tv[k])) * spec.fps));
    console.log(`${V.seg}: path on ${on}, ${tv.length} samples, video ${ta.toFixed(2)}–${tb.toFixed(2)} s → shot ${t0}–${t1} s (×${((tb - ta) / (t1 - t0)).toFixed(2)} speed); peak wrist speed ${Math.max(...sp).toFixed(3)} H/frame`);
  } else if (V.kind === 'layer') {
    // V.map = [[video s, shot s], …] (anchors: the video's beats onto the shot's) or V.dst = [t0, t1] (uniform)
    const [t0, t1] = V.map ? [V.map[0][1], V.map[V.map.length - 1][1]] : V.dst;
    const mapT = V.map ? monoMap(V.map) : (t) => t0 + (t - ta) / (tb - ta) * (t1 - t0), tp = V.taper ?? 0.08, ch = {};
    // V.from = {bone: {src, k}}: that channel's curve is k × another channel's (a joint the fit measures badly, e.g. the
    // thigh of a 3/4 figure, follows one it measures well — the knee bend — in a fixed ratio, so the legs stay one crouch)
    for (const bn of [...V.channels, ...Object.keys(V.from || {})]) {
      const sb = V.from?.[bn]?.src ?? bn, kk = V.from?.[bn]?.k ?? 1;
      if (!tr.bones[sb]) { console.warn(`${V.seg}: no track for ${sb}`); continue; }
      const y = lowess(tv, unwrap(sel.map((i) => kk * tr.bones[sb][i]), 360), sig), n = y.length;
      const g = V.gain?.[bn] ?? 1, dev = tv.map((t, k) => {
        const u = (mapT(t) - mapT(ta)) / (mapT(tb) - mapT(ta)), e = smoother(u), w = smoother(Math.min(1, u / tp, (1 - u) / tp));
        return g * w * (y[k] - (y[0] + (y[n - 1] - y[0]) * e));
      });
      // V.to = {bone: {channel: k}}: route a measured rotation to other channels — e.g. the head's measured bow mostly to
      // fx.headPitch (a nod, engine/warp.js) and only partly to the head bone (a flat rotation reads as a roll)
      for (const [tc, k] of Object.entries(V.to?.[bn] ?? { [bn]: 1 })) ch[tc] = dev.map((d, i) => Math.round(((ch[tc]?.[i] ?? 0) + k * d) * 100) / 100);
    }
    // V.floor = {channel: min}: a deviation never dips below it — e.g. between the hits she stays hunched (the video
    // stood back up past its own chord: "snaps upright, taller than before, a long neck", critic R9)
    for (const [tc, lo] of Object.entries(V.floor || {})) if (ch[tc]) ch[tc] = ch[tc].map((v) => Math.max(lo, v));
    {
    }
    spec.layers = spec.layers.filter((l) => l.seg !== V.seg);
    spec.layers.push({ seg: V.seg, src: [r4(ta), r4(tb)], amp: V.amp ?? 1, t: tv.map((t) => r4(mapT(t))), ch });
    const pk = Object.entries(ch).map(([k, v]) => `${k} ${Math.min(...v).toFixed(0)}…${Math.max(...v).toFixed(0)}`).join(', ');
    console.log(`${V.seg}: layer ${tv.length} samples, video ${ta.toFixed(2)}–${tb.toFixed(2)} s → shot ${t0}–${t1} s (×${((tb - ta) / (t1 - t0)).toFixed(2)}), amp ${V.amp ?? 1}; deviation ${pk}`);
  } else throw new Error(`unknown video kind ${V.kind}`);
}
fs.writeFileSync(file, JSON.stringify(spec, null, 1));
console.log('wrote', file);
