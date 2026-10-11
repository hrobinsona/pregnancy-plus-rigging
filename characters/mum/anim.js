// anim.js — timeline file → pose(t) → frame(t). Every frame is a PURE function of t:
//   no state between frames, no step-by-step simulation. Every layer is closed-form in t, or a table computed once
//   from the timeline before frame 0 (Fourier coefficients) and then evaluated in closed form.
//
// Layers (all timings live in the timeline JSON):
//   1. keys      — JSON poses blended in JOINT-ANGLE space (never point positions), cubic-bezier eases (linear rejected),
//                  per-bone lags in frames for overlap (each chain link trails its parent).
//   2. breath    — asymmetric wave (inhale / exhale / pause), phase is an analytic integral of the rate track,
//                  wave runs belly → chest (+3f) → shoulders (+5f) → head (+7f); pregnant: more ribcage, less belly.
//   3. drift     — seeded sum of sines (2–3 octaves). Chain drift travels up the spine with per-link lag (overlap).
//                  For a loop every frequency is a whole multiple of 1/duration, so the seam matches exactly.
//   4. springs   — second-order (f, ζ) responses in closed form. Loop: each Fourier harmonic of the drive goes through
//                  the spring's transfer function H(jω) (exact periodic steady state, no start-up transient).
//                  Events (hand presses): closed-form damped impulse responses summed over prior events.
//   5. events    — blinks (closed-form envelope), presses.
//   6. contact   — a planted hand (pose.fx.pinNear / pinFar, keyed like any channel) keeps the wrist where the KEYED pose
//                  puts it while breath and drift move the shoulder: closed-form two-bone IK, an additive correction
//                  on top of the angle-blended keys (keys are still blended as angles, never as points).
import { solve } from './rig.js';
import { joints as J } from './proportions.js';
import { BONE } from './skeleton.js';

// ---------------------------------------------------------------- easing
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-9 || Math.abs(d) < 1e-9) break; t -= e / d; }
    let lo = 0, hi = 1;
    for (let i = 0; i < 40 && Math.abs(X(t) - x) > 1e-9; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
export const EASES = {
  inOut: [0.45, 0, 0.25, 1],          // smootherstep-like
  slowIn: [0.55, 0, 0.6, 1],
  reaction: [0.2, 0.0, 0.1, 1.0],     // fast-out, long settle
  settle: [0.3, 0.0, 0.2, 1.08],      // slight overshoot then settle
  breath: [0.42, 0, 0.36, 1],
};
function easeFn(e) {
  const c = Array.isArray(e) ? e : EASES[e || 'inOut'];
  if (!c) throw new Error(`unknown ease ${e}`);
  if (Math.abs(c[0] - c[1]) < 1e-6 && Math.abs(c[2] - c[3]) < 1e-6) throw new Error(`linear ease ${JSON.stringify(c)} is not allowed`);
  return cubicBezier(...c);
}
export const smoothstep = (x) => x * x * (3 - 2 * x);
export const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const TAU = 2 * Math.PI;

// ---------------------------------------------------------------- seeded hashing (deterministic phases)
export function hash01(str, seed = 0) {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 13; h = Math.imul(h, 1274126177) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- channels
const FACE_DEFAULT = { lid: { open: 1 }, brow: { neutral: 1 }, mouth: { smile: 1 }, cheek: { blush: 1 } };
function flatten(pose) {
  const c = {};
  for (const [b, v] of Object.entries(pose.bones || {})) c['bone.' + b] = v;
  for (const [b, v] of Object.entries(pose.scale || {})) { c['scale.' + b + '.0'] = v[0]; c['scale.' + b + '.1'] = v[1]; }
  const face = { ...FACE_DEFAULT, ...(pose.face || {}) };
  for (const [ch, w] of Object.entries(face)) for (const [k, v] of Object.entries(w)) c[`face.${ch}.${k}`] = v;
  for (const [k, v] of Object.entries(pose.fx || {})) if (typeof v === 'number') c['fx.' + k] = v;
  return c;
}
const DEFAULTS = (key) => (key.startsWith('scale.') ? 1 : 0);

// ---------------------------------------------------------------- closed-form second-order spring
/** Complex transfer function of x'' + 2ζω0 x' + ω0² x = (a·ω0² + b·d²/dt²) u, at angular frequency w. Returns [re, im]. */
function springH(f, zeta, w, a, b) {
  const w0 = TAU * f, num = a * w0 * w0 - b * w * w;
  const dr = w0 * w0 - w * w, di = 2 * zeta * w0 * w, d2 = dr * dr + di * di;
  return [num * dr / d2, -num * di / d2];
}
/** Fourier coefficients (k = 0..K) of a T-periodic signal from M uniform samples (computed once, before frame 0). */
function fourier(samples, K) {
  const M = samples.length, out = [];
  for (let k = 0; k <= K; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < M; n++) { const a = TAU * k * n / M; re += samples[n] * Math.cos(a); im -= samples[n] * Math.sin(a); }
    const s = (k === 0 ? 1 : 2) / M;
    out.push([re * s, im * s]);
  }
  return out;
}
/** Evaluate Σ Re(C_k e^{i k Ω t}) — closed form in t. */
const synth = (C, T, t) => {
  let v = 0;
  for (let k = 0; k < C.length; k++) { const a = TAU * k * t / T; v += C[k][0] * Math.cos(a) - C[k][1] * Math.sin(a); }
  return v;
};

// ---------------------------------------------------------------- the animation
export function makeAnim(spec, lib) {
  const fps = spec.fps, D = spec.duration, loop = !!spec.loop;
  const wrapT = (t) => (loop ? ((t % D) + D) % D : t);
  for (const k of spec.keys) if (!lib[k.pose]) throw new Error(`missing pose ${k.pose}`);
  const keys = spec.keys.map((k) => ({ ...k, ch: flatten(lib[k.pose]), ease: easeFn(k.ease) }));
  if (loop) {
    // a loop closes back onto its first key (closing segment ease: spec.wrapEase, default inOut)
    keys.push({ ...keys[0], t: keys[0].t + D, ease: easeFn(spec.wrapEase || 'inOut') });
  }
  const allCh = [...new Set(keys.flatMap((k) => Object.keys(k.ch)))];
  const lagOf = (ch) => {
    const m = ch.match(/^(?:bone|scale)\.(.+?)(?:\.[01])?$/);
    return ((m ? spec.lags?.[m[1]] : spec.lags?.[ch.split('.')[0]]) ?? 0) / fps;
  };
  const sample = (ch, t) => {
    const v = (k) => (k.ch[ch] ?? DEFAULTS(ch));
    if (loop) { t = ((t - keys[0].t) % D + D) % D + keys[0].t; }
    if (t <= keys[0].t) return v(keys[0]);
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t < b.t) return v(a) + (v(b) - v(a)) * b.ease((t - a.t) / (b.t - a.t));   // angle-space blend
    }
    return v(keys[keys.length - 1]);
  };

  // ---- parameter tracks: {t, value} pairs, smoothstep between (never linear)
  const track = (arr, t, key) => {
    if (typeof arr === 'number') return arr;
    if (t <= arr[0].t) return arr[0][key];
    for (let i = 0; i < arr.length - 1; i++) if (t < arr[i + 1].t) {
      const u = smoothstep((t - arr[i].t) / (arr[i + 1].t - arr[i].t)); return arr[i][key] + (arr[i + 1][key] - arr[i][key]) * u;
    }
    return arr[arr.length - 1][key];
  };

  // ---- breath: phase = ∫ rate dt in closed form. Rate (1/period) moves between track points by smoothstep,
  //      and ∫_0^u smoothstep = u³ − u⁴/2, so phase(t) is an exact polynomial sum.
  const BR = spec.breath;
  const shape = BR.shape || { inhale: 0.55, exhale: 0.35, pause: 0.10 };
  const delays = BR.delays || { belly: 0, chest: 3, shoulders: 5, head: 7 };
  const rateTrack = (Array.isArray(BR.period) ? BR.period : [{ t: 0, period: BR.period }]).map((p) => ({ t: p.t, r: 1 / p.period }));
  if (loop) {
    const cycles = D * rateTrack[0].r;
    if (rateTrack.length > 1 || Math.abs(cycles - Math.round(cycles)) > 1e-9) throw new Error(`loop: duration must hold a whole number of breaths (got ${cycles})`);
  }
  const phaseAt = (t) => {
    let ph = BR.phase0 || 0;
    const R = rateTrack;
    if (t <= R[0].t) return ph + (t - R[0].t) * R[0].r;
    for (let i = 0; i < R.length; i++) {
      const a = R[i], b = R[i + 1];
      if (!b || t < b.t) {
        if (!b) return ph + (t - a.t) * a.r;
        const L = b.t - a.t, u = (t - a.t) / L;
        return ph + L * (a.r * u + (b.r - a.r) * (u ** 3 - u ** 4 / 2));
      }
      ph += (b.t - a.t) * (a.r + (b.r - a.r) * 0.5);
    }
    return ph;
  };
  const wave = (p) => {
    const f = p - Math.floor(p), i = shape.inhale, e = shape.exhale;
    return f < i ? smoother(f / i) : f < i + e ? 1 - smoother((f - i) / e) : 0;   // pause at the bottom
  };
  const breathAt = (t) => { const tt = wrapT(t); return wave(phaseAt(tt)) * track(BR.amp ?? 1, tt, 'amp'); };

  // ---- drift: seeded sum of sines. Loop → harmonics of 1/D (exact seam); otherwise spec.drift.freqs (Hz).
  const DR = spec.drift || { bones: {} };
  const harm = DR.harmonics || [1, 2, 3];
  const freqs = loop ? harm.map((k) => k / D) : (DR.freqs || [0.21, 0.47, 0.83]);
  const octaveAmp = freqs.map((_, i) => 1 / (i + 1));
  const ampNorm = octaveAmp.reduce((a, b) => a + b, 0) * 0.7;          // ~unit peak
  const driftSig = (name, t) => {
    let v = 0;
    freqs.forEach((f, i) => { v += octaveAmp[i] * Math.sin(TAU * f * t + TAU * hash01(name + ':' + i, DR.seed || 0)); });
    return v / ampNorm;
  };

  // ---- base pose: keys + breath + drift (no springs). Pure in t.
  function basePose(t) {
    const tt = wrapT(t);
    const pose = { name: spec.name, bones: {}, scale: {}, face: {}, fx: {}, lattice: { belly: null },
                   hands: { near: 'cupping-belly', far: 'cupping-belly' }, facing: 'right' };
    for (const ch of allCh) {
      const val = sample(ch, tt - lagOf(ch));
      const [kind, a, b] = ch.split('.');
      if (kind === 'bone') pose.bones[ch.slice(5)] = val;
      else if (kind === 'scale') { const id = ch.slice(6, -2), ix = +ch.slice(-1); (pose.scale[id] ||= [1, 1])[ix] = val; }
      else if (kind === 'face') (pose.face[a] ||= {})[b] = val;
      else if (kind === 'fx') pose.fx[a] = val;
    }
    const keyed = { bones: { ...pose.bones }, scale: Object.fromEntries(Object.entries(pose.scale).map(([k, v]) => [k, [...v]])) };
    const add = (b, v) => { pose.bones[b] = (pose.bones[b] || 0) + v; };
    // breathing wave
    const G = BR.gain, f = (n) => breathAt(tt - (delays[n] ?? 0) / fps);
    const bc = f('chest'), bs = f('shoulders'), bh = f('head');
    const sc = (pose.scale.spineUpper ||= [1, 1]);
    sc[0] *= 1 + (G.chestAlong || 0) * bc; sc[1] *= 1 + (G.chestAcross || 0) * bc;
    add('chest', (G.chestDeg || 0) * bc);                 // ribcage lifts and opens back on the inhale (pregnant: ribcage-led)
    add('clavicle.near', (G.shoulderDeg || 0) * bs);       // shoulders rise (near clavicle points left: + is up)
    add('clavicle.far', -(G.shoulderDeg || 0) * bs);
    add('head', (G.headDeg || 0) * bh);
    pose._breathBelly = f('belly');
    // drift: chain wave (one signal, each link lagged) + independent per-bone sway
    const amp = track(DR.amp ?? 1, tt, 'amp');
    if (DR.chain) {
      const { bones, lagFrames, deg } = DR.chain;
      bones.forEach((b, i) => add(b, amp * deg[i] * driftSig('chain', tt - (i * lagFrames) / fps)));
    }
    for (const [b, a] of Object.entries(DR.bones || {})) if (!b.startsWith('hand.')) add(b, amp * a * driftSig(b, tt));
    // contact: re-plant pinned hands against the additive layers, then let the hands themselves drift
    for (const side of ['near', 'far']) {
      const w = clamp01(pose.fx['pin' + side[0].toUpperCase() + side.slice(1)] ?? 0);
      if (w > 0) pinArm(pose, keyed, side, w);
    }
    for (const [b, a] of Object.entries(DR.bones || {})) if (b.startsWith('hand.')) add(b, amp * a * driftSig(b, tt));
    return pose;
  }

  // closed-form two-bone IK: wrist back to its keyed position, hand keeps its keyed world angle
  const wrapDeg = (a) => ((a + 540) % 360) - 180;
  const angOf = (v) => Math.atan2(v[1], v[0]) * 180 / Math.PI;
  function pinArm(pose, keyed, side, w) {
    const S = side === 'near' ? 'Near' : 'Far', ua = 'upperArm.' + side, fa = 'forearm.' + side, ha = 'hand.' + side;
    const ref = solve(keyed), cur = solve(pose);
    const W = ref[ha].pos, Eref = cur[fa].pos, Sh = cur[ua].pos, pr = cur['clavicle.' + side].rot;
    const u0 = [J['elbow' + S][0] - J['shoulder' + S][0], J['elbow' + S][1] - J['shoulder' + S][1]];
    const f0 = [J['wrist' + S][0] - J['elbow' + S][0], J['wrist' + S][1] - J['elbow' + S][1]];
    const lu = Math.hypot(...u0) * (pose.scale[ua]?.[0] ?? 1), lf = Math.hypot(...f0) * (pose.scale[fa]?.[0] ?? 1);
    const bl = (b, v) => { const c = pose.bones[b] || 0; pose.bones[b] = c + wrapDeg(v - c) * w; };
    if ((spec.pins?.[side] || 'twoBone') === 'reach') {
      // foreshortened arm: forearm keeps its keyed angle; the upper arm re-aims and stretches along itself (closed form)
      const df = pose.bones[fa] || 0, V = [W[0] - Sh[0], W[1] - Sh[1]];
      const r = df * Math.PI / 180, c = [Math.cos(r) * f0[0] - Math.sin(r) * f0[1], Math.sin(r) * f0[0] + Math.cos(r) * f0[1]];
      const fs = pose.scale[fa]?.[0] ?? 1; c[0] *= fs; c[1] *= fs;
      const A = u0[0] ** 2 + u0[1] ** 2, B = 2 * (u0[0] * c[0] + u0[1] * c[1]), C = c[0] ** 2 + c[1] ** 2 - (V[0] ** 2 + V[1] ** 2);
      const sAlong = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
      const du = wrapDeg(angOf(V) - angOf([sAlong * u0[0] + c[0], sAlong * u0[1] + c[1]]) - pr);
      const dh = wrapDeg(ref[ha].rot - (pr + du + df));
      const s0 = pose.scale[ua]?.[0] ?? 1;
      pose.scale[ua] = [s0 + (sAlong - s0) * w, pose.scale[ua]?.[1] ?? 1];
      bl(ua, du); bl(ha, dh);
      return;
    }
    let dx = W[0] - Sh[0], dy = W[1] - Sh[1], d = Math.hypot(dx, dy);
    const dc = Math.min(lu + lf - 1e-6, Math.max(Math.abs(lu - lf) + 1e-6, d));
    const ex = [dx / d, dy / d], a = (lu * lu - lf * lf + dc * dc) / (2 * dc), h = Math.sqrt(Math.max(0, lu * lu - a * a));
    const m = [Sh[0] + ex[0] * a, Sh[1] + ex[1] * a];
    const E1 = [m[0] - ex[1] * h, m[1] + ex[0] * h], E2 = [m[0] + ex[1] * h, m[1] - ex[0] * h];
    const dist = (P) => Math.hypot(P[0] - Eref[0], P[1] - Eref[1]);
    const E = dist(E1) <= dist(E2) ? E1 : E2;                     // continuity: the branch nearest the current elbow
    const Wc = [Sh[0] + ex[0] * dc, Sh[1] + ex[1] * dc];
    const du = wrapDeg(angOf([E[0] - Sh[0], E[1] - Sh[1]]) - angOf(u0) - pr);
    const df = wrapDeg(angOf([Wc[0] - E[0], Wc[1] - E[1]]) - angOf(f0) - (pr + du));
    const dh = wrapDeg(ref[ha].rot - (pr + du + df));
    bl(ua, du); bl(fa, df); bl(ha, dh);
  }

  // ---- springs (closed form)
  const SP = spec.springs || {};
  const K = SP.harmonics || 24, M = SP.samples || 512;
  const headWorld = (t) => solve(basePose(t)).head.rot;
  const hairC = {}, bellyC = { amp: null };
  if (loop) {
    // drive signals sampled once over one period → Fourier coefficients → through each spring's H(jω)
    const th = [], bb = [];
    for (let n = 0; n < M; n++) { const t = n * D / M; th.push(headWorld(t)); bb.push(basePose(t)._breathBelly); }
    const Th = fourier(th, K), Bb = fourier(bb, K);
    for (const [name, s] of Object.entries(SP.hair || {})) {
      hairC[name] = Th.map(([re, im], k) => {
        // hanging strand: gravity holds it part-way to vertical (−kGrav·θ), inertia resists head angular accel (−kRot·θ'')
        const [hr, hi] = springH(s.f, s.zeta, TAU * k / D, -s.kGrav, s.kRot === undefined ? 0 : -s.kRot);
        return [re * hr - im * hi, re * hi + im * hr];
      });
    }
    if (SP.belly) bellyC.amp = Bb.map(([re, im], k) => {
      const [hr, hi] = springH(SP.belly.f, SP.belly.zeta, TAU * k / D, 1, 0);   // unit DC gain: firm, slight lag
      return [re * hr - im * hi, re * hi + im * hr];
    });
  } else if (SP.hair && Object.keys(SP.hair).length) {
    throw new Error('non-loop springs: closed-form keyed-motion response not wired yet (loop shots only for now)');
  }
  const hairAt = (name, t) => (hairC[name] ? synth(hairC[name], D, wrapT(t)) : 0);
  const bellyBreathAt = (t, raw) => (bellyC.amp ? synth(bellyC.amp, D, wrapT(t)) : raw);

  // ---- events: hand presses on the belly (closed-form damped response), blinks (closed-form envelope)
  const EV = spec.events || [];
  const pressAt = (t) => {
    const out = [0, 0];
    for (const ev of EV) {
      if (ev.type !== 'press' || t < ev.t) continue;
      const tau = t - ev.t, w = TAU * SP.belly.f, z = SP.belly.zeta, wd = w * Math.sqrt(1 - z * z);
      const r = Math.exp(-z * w * tau) * Math.sin(wd * tau);
      out[0] += ev.dir[0] * ev.amp * r; out[1] += ev.dir[1] * ev.amp * r;
    }
    return out;
  };
  const BL = spec.blink || { close: 3, hold: 1, open: 5 };
  const blinkAt = (t) => {
    const tt = wrapT(t);
    let b = 0;
    for (const ev of EV) {
      if (ev.type !== 'blink') continue;
      const c = (ev.close ?? BL.close) / fps, h = (ev.hold ?? BL.hold) / fps, o = (ev.open ?? BL.open) / fps;
      for (const off of loop ? [0, -D, D] : [0]) {
        const u = tt - ev.t + off;
        if (u <= 0 || u >= c + h + o) continue;
        b = Math.max(b, u < c ? smoothstep(u / c) : u < c + h ? 1 : 1 - smoothstep((u - c - h) / o));
      }
    }
    return b;
  };

  function poseAt(t) {
    const tt = wrapT(t);
    const pose = basePose(tt);
    const bk = blinkAt(tt);
    if (bk > 0) {
      const lid = pose.face.lid || { open: 1 };
      const tot = Object.values(lid).reduce((a, v) => a + Math.max(0, v), 0) || 1;
      pose.face.lid = Object.fromEntries(Object.entries(lid).map(([k, v]) => [k, (Math.max(0, v) / tot) * (1 - bk)]));
      pose.face.lid.soft = (pose.face.lid.soft || 0) + bk;
    }
    pose.fx.hair = Object.fromEntries(Object.keys(SP.hair || {}).map((k) => [k, hairAt(k, tt)]));
    // belly lattice (4x4, parented to the pelvis via the belly bone): breathing swell through the firm belly spring,
    // plus press responses under the contact point
    const br = bellyBreathAt(tt, pose._breathBelly) * (BR.gain.belly || 0), resp = pressAt(tt), c = spec.contact || [1.5, 1.5];
    const lat = [];
    for (let j = 0; j < 4; j++) {
      const row = [];
      for (let i = 0; i < 4; i++) {
        const sx = (i - 1.5) / 1.5, sy = (j - 1.5) / 1.5;
        const g = Math.exp(-((i - c[0]) ** 2 + (j - c[1]) ** 2) / (2 * 0.8 * 0.8));
        row.push([sx * br + resp[0] * g, sy * br * 0.6 + resp[1] * g]);
      }
      lat.push(row);
    }
    pose.lattice = { belly: lat };
    delete pose._breathBelly;
    return pose;
  }
  return { fps, duration: D, loop, frames: Math.round(D * fps), poseAt, basePose, breathAt, hairAt, blinkAt, phaseAt };
}
