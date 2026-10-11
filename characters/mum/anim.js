// anim.js — timeline → pose(t). renderAt(t) stays a pure function of t:
//   keyed poses (angle-space interpolation, cubic-bezier eases, per-bone overlap lags)
//   + additive layers: breathing wave (belly → chest +3f → shoulders +5f → head +7f), seeded noise drift (no dead holds)
//   + secondary motion: hair springs baked at 120 Hz from t=0 (deterministic), closed-form belly response to hand contacts.
import { solve } from './rig.js';

// ---------------------------------------------------------------- easing
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-7 || Math.abs(d) < 1e-7) break; t -= e / d; }
    let lo = 0, hi = 1;
    for (let i = 0; i < 30 && Math.abs(X(t) - x) > 1e-7; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
export const EASES = {
  inOut: [0.45, 0, 0.25, 1],          // smootherstep-like settle
  slowIn: [0.55, 0, 0.6, 1],
  reaction: [0.2, 0.0, 0.1, 1.0],     // fast-out, long settle
  settle: [0.3, 0.0, 0.2, 1.08],      // slight overshoot then settle
  breath: [0.42, 0, 0.36, 1],
};
const easeFn = (e) => cubicBezier(...(Array.isArray(e) ? e : EASES[e || 'inOut']));
const smoothstep = (x) => x * x * (3 - 2 * x);
const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---------------------------------------------------------------- seeded value noise (deterministic)
function hash(i, seed) {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise1(x, seed) {
  const i = Math.floor(x), f = x - i, u = smoother(f);
  return (hash(i, seed) * (1 - u) + hash(i + 1, seed) * u) * 2 - 1;
}
const fbm = (x, seed) => 0.67 * noise1(x, seed) + 0.33 * noise1(x * 2.13 + 7.1, seed + 101);

// ---------------------------------------------------------------- channels
const FACE_DEFAULT = { lid: { open: 1 }, brow: { neutral: 1 }, mouth: { smile: 1 }, cheek: { blush: 1 } };
function flatten(pose) {
  const c = {};
  for (const [b, v] of Object.entries(pose.bones || {})) c['bone.' + b] = v;
  for (const [b, v] of Object.entries(pose.scale || {})) { c['scale.' + b + '.0'] = v[0]; c['scale.' + b + '.1'] = v[1]; }
  const face = { ...FACE_DEFAULT, ...(pose.face || {}) };
  for (const [ch, w] of Object.entries(face)) for (const [k, v] of Object.entries(w)) c[`face.${ch}.${k}`] = v;
  for (const [k, v] of Object.entries(pose.fx || {})) c['fx.' + k] = v;
  return c;
}
const DEFAULTS = (key) => (key.startsWith('scale.') ? 1 : 0);

export function makeAnim(spec, lib) {
  const fps = spec.fps, keys = spec.keys.map((k) => ({ ...k, ch: flatten(lib[k.pose]), ease: easeFn(k.ease) }));
  const allCh = [...new Set(keys.flatMap((k) => Object.keys(k.ch)))];
  const lag = (ch) => {
    const m = ch.match(/^(?:bone|scale)\.(.+?)(?:\.[01])?$/);
    return m ? (spec.lags?.[m[1]] ?? 0) / fps : (spec.lags?.[ch.split('.')[0]] ?? 0) / fps;
  };
  const sample = (ch, t) => {
    const v = (k) => (k.ch[ch] ?? DEFAULTS(ch));
    if (t <= keys[0].t) return v(keys[0]);
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t < b.t) { const u = (t - a.t) / (b.t - a.t); return v(a) + (v(b) - v(a)) * b.ease(u); }
    }
    return v(keys[keys.length - 1]);
  };
  // piecewise-linear parameter tracks (rates/amplitudes — not motion), e.g. breath period
  const track = (arr, t, key) => {
    if (t <= arr[0].t) return arr[0][key];
    for (let i = 0; i < arr.length - 1; i++) if (t < arr[i + 1].t) {
      const u = smoothstep((t - arr[i].t) / (arr[i + 1].t - arr[i].t)); return arr[i][key] + (arr[i + 1][key] - arr[i][key]) * u;
    }
    return arr[arr.length - 1][key];
  };
  // breath phase: integrate 1/period on a fixed 1/240 s grid from t=0 (deterministic)
  const DT = 1 / 240, N = Math.ceil((spec.duration + 1) / DT) + 2;
  const phase = new Float64Array(N);
  for (let i = 1; i < N; i++) phase[i] = phase[i - 1] + DT / track(spec.breath, (i - 0.5) * DT, 'period');
  const phaseAt = (t) => { const x = Math.max(0, t) / DT, i = Math.min(N - 2, Math.floor(x)), f = x - i; return phase[i] * (1 - f) + phase[i + 1] * f; };
  const wave = (p) => { const f = p - Math.floor(p); return f < 0.55 ? smoother(f / 0.55) : f < 0.9 ? 1 - smoother((f - 0.55) / 0.35) : 0; };
  const breathAt = (t) => wave(phaseAt(t)) * track(spec.breath, t, 'amp');

  function basePose(t) {
    const pose = { name: spec.name, bones: {}, scale: {}, face: {}, fx: {}, lattice: { belly: null }, hands: { near: 'cupping-belly', far: 'cupping-belly' }, facing: 'right' };
    for (const ch of allCh) {
      const val = sample(ch, t - lag(ch));
      const [kind, a, b] = ch.split('.');
      if (kind === 'bone') pose.bones[ch.slice(5)] = val;
      else if (kind === 'scale') { const id = ch.slice(6, -2), ix = +ch.slice(-1); (pose.scale[id] ||= [1, 1])[ix] = val; }
      else if (kind === 'face') (pose.face[a] ||= {})[b] = val;
      else if (kind === 'fx') pose.fx[a] = val;
    }
    // breathing wave: belly → chest (+3f) → shoulders (+5f) → head (+7f)
    const B = spec.breathGain;
    const bc = breathAt(t - 3 / fps), bs = breathAt(t - 5 / fps), bh = breathAt(t - 7 / fps);
    const sc = (pose.scale.spineUpper ||= [1, 1]);
    sc[0] *= 1 + B.chestAlong * bc; sc[1] *= 1 + B.chestAcross * bc;
    pose.bones['clavicle.near'] = (pose.bones['clavicle.near'] || 0) + B.shoulderDeg * bs;
    pose.bones['clavicle.far'] = (pose.bones['clavicle.far'] || 0) - B.shoulderDeg * bs;
    pose.bones.head = (pose.bones.head || 0) - B.headDeg * bh;
    pose._breathBelly = breathAt(t);
    // drift (seeded noise): keeps every hold alive
    const D = track(spec.drift, t, 'amp');
    for (const [bone, amp] of Object.entries(spec.driftBones)) {
      const seed = [...bone].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) & 0xffff;
      pose.bones[bone] = (pose.bones[bone] || 0) + D * amp * fbm(t * spec.driftHz + seed * 0.013, seed);
    }
    return pose;
  }

  // ---------------- secondary motion: hair springs, baked at 120 Hz from t=0 (time-pure lookup)
  const SDT = 1 / 120, SN = Math.ceil((spec.duration + 0.5) / SDT) + 2;
  const headRot = new Float64Array(SN), headY = new Float64Array(SN);
  for (let i = 0; i < SN; i++) { const st = solve(basePose(i * SDT)); headRot[i] = st.head.rot; headY[i] = st.head.pos[1]; }
  const springs = {};
  for (const [name, sp] of Object.entries(spec.springs.hair)) {
    const w = 2 * Math.PI * sp.f, z = sp.zeta, x = new Float64Array(SN);
    // relative strand angle x: inertia resists head angular accel (kRot); gravity pulls the hanging strand part-way
    // back toward vertical (kGrav), so equilibrium is x = -kGrav·headRot. Start at equilibrium (no pop at t=0).
    let xv = 0, xp = -(sp.kGrav || 0) * headRot[0];
    x[0] = xp;
    for (let i = 1; i < SN - 1; i++) {
      const acc = (headRot[i + 1] - 2 * headRot[i] + headRot[i - 1]) / (SDT * SDT);
      const accY = (headY[i + 1] - 2 * headY[i] + headY[i - 1]) / (SDT * SDT);
      const drive = -sp.kRot * acc - (sp.kY || 0) * accY;
      const target = -(sp.kGrav || 0) * headRot[i];
      const a = drive - w * w * (xp - target) - 2 * z * w * xv;     // semi-implicit Euler, fixed step
      xv += a * SDT; xp += xv * SDT; x[i] = xp;
    }
    springs[name] = x;
  }
  const springAt = (name, t) => { const xx = Math.max(0, t) / SDT, i = Math.min(SN - 2, Math.floor(xx)), f = xx - i; return springs[name][i] * (1 - f) + springs[name][i + 1] * f; };

  // ---------------- belly: closed-form damped response to hand contacts (firm: f 4 Hz, ζ 0.7, ≤ 2%)
  const bellyResp = (t) => {
    let sum = [0, 0];
    for (const ev of spec.events || []) {
      if (ev.type !== 'press' || t < ev.t) continue;
      const tau = t - ev.t, w = 2 * Math.PI * spec.springs.belly.f, z = spec.springs.belly.zeta, wd = w * Math.sqrt(1 - z * z);
      const r = Math.exp(-z * w * tau) * Math.sin(wd * tau);
      sum = [sum[0] + ev.dir[0] * ev.amp * r, sum[1] + ev.dir[1] * ev.amp * r];
    }
    return sum;
  };

  // blinks: lids close fast (3f), touch (1f), reopen slower (5f). Closed = 'soft' lid shape with the iris squashed.
  const blinkAt = (t) => {
    let b = 0;
    for (const ev of spec.events || []) {
      if (ev.type !== 'blink') continue;
      const c = 3 / fps, h = 1 / fps, o = 5 / fps, u = t - ev.t;
      if (u <= 0 || u >= c + h + o) continue;
      b = Math.max(b, u < c ? smoothstep(u / c) : u < c + h ? 1 : 1 - smoothstep((u - c - h) / o));
    }
    return b;
  };

  function poseAt(t) {
    const pose = basePose(t);
    const bk = blinkAt(t);
    if (bk > 0) {
      const lid = pose.face.lid || { open: 1 };
      const tot = Object.values(lid).reduce((a, v) => a + Math.max(0, v), 0) || 1;
      pose.face.lid = Object.fromEntries(Object.entries(lid).map(([k, v]) => [k, (Math.max(0, v) / tot) * (1 - bk)]));
      pose.face.lid.soft = (pose.face.lid.soft || 0) + bk;
    }
    pose.fx.hair = Object.fromEntries(Object.keys(spec.springs.hair).map((k) => [k, springAt(k, t)]));
    // belly lattice: breathing swell (pregnant: small) + contact response under the near hand (Gaussian over lattice points)
    const br = pose._breathBelly * spec.breathGain.belly, resp = bellyResp(t);
    const lat = [];
    for (let j = 0; j < 4; j++) {
      const row = [];
      for (let i = 0; i < 4; i++) {
        const sx = (i - 1.5) / 1.5, sy = (j - 1.5) / 1.5;            // -1..1 across the lattice
        const g = Math.exp(-((i - spec.contact[0]) ** 2 + (j - spec.contact[1]) ** 2) / (2 * 0.8 * 0.8));
        row.push([sx * br + resp[0] * g, sy * br * 0.6 + resp[1] * g]);
      }
      lat.push(row);
    }
    pose.lattice = { belly: lat };
    delete pose._breathBelly;
    return pose;
  }
  return { fps, duration: spec.duration, poseAt, breathAt, springAt, blinkAt, basePose };
}
