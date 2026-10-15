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
// GENERIC (engine): makeAnim(spec, lib, { rig, C }) — any character built on engine/rig.js. lib = the key poses, already
// expanded through the hand library (pose.hands → finger bones). Discrete per-key properties (handView swaps, zBias
// draw-order swaps) are held from the key that is active at t (a swap happens ON a key, like a drawing swap in cut-out).

// ---------------------------------------------------------------- easing
import { armFrame, armPoints, proxies, rayHits, swivelOf, ik2, armAngles } from './depth.js';
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
  dart: [0.25, 0, 0.1, 1],            // eye darts: fast start, soft landing
  snap: [0.15, 0.25, 0.3, 1],         // a jolt / startle: leaves at speed (largest spacing first), long soft landing
  heave: [0.35, 0, 0.2, 1],           // a body heave: quick build, firm landing, no overshoot (lagged links don't each re-hit)
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
const smooth01 = (x) => smoothstep(clamp01(x));
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
  if (pose.root) { c['root.0'] = pose.root[0]; c['root.1'] = pose.root[1]; }   // translation is a channel (seated drop, walk bob)
  return c;
}
const DEFAULTS = (key) => (key.startsWith('scale.') ? 1 : 0);
function flattenRaw(pose) {          // only the channels the pose actually sets (for channel-group tracks)
  const c = {};
  for (const [ch, w] of Object.entries(pose.face || {})) for (const [k, v] of Object.entries(w)) c[`face.${ch}.${k}`] = v;
  for (const [b, v] of Object.entries(pose.bones || {})) c['bone.' + b] = v;
  for (const [k, v] of Object.entries(pose.fx || {})) if (typeof v === 'number') c['fx.' + k] = v;
  return c;
}

// ---------------------------------------------------------------- dense sampled curves (video tracks)
/** Catmull-Rom through samples Y (numbers or equal-length arrays) at increasing times T, evaluated at t — Barry–Goldman
 *  pyramid with the sample TIMES as knots (the curve keeps the video's own speed); ends get mirrored phantom samples. */
export function crTime(T, Y, t) {
  const n = T.length; if (t <= T[0]) return Y[0]; if (t >= T[n - 1]) return Y[n - 1];
  let k = 0; { let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; } k = lo; }
  const vec = Array.isArray(Y[0]), V = (j) => (vec ? Y[j] : [Y[j]]);
  const P = (j) => (j < 0 ? V(0).map((x, c) => 2 * x - V(1)[c]) : j >= n ? V(n - 1).map((x, c) => 2 * x - V(n - 2)[c]) : V(j));
  const K = (j) => (j < 0 ? 2 * T[0] - T[1] : j >= n ? 2 * T[n - 1] - T[n - 2] : T[j]);
  const p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2), t0 = K(k - 1), t1 = K(k), t2 = K(k + 1), t3 = K(k + 2);
  const L = (a, b, ta, tb) => a.map((x, c) => ((tb - t) * x + (t - ta) * b[c]) / (tb - ta));
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3), r = L(B1, B2, t1, t2);
  return vec ? r : r[0];
}

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
export function makeAnim(spec, lib, { rig, C, quiet } = {}) {
  const opts = { quiet };
  if (!rig || !C) throw new Error('makeAnim(spec, lib, { rig, C }): the rig and character are required');
  const solve = rig.solve, J = C.joints, BONE = rig.BONE;
  const WORLD = { M: [1, 0, 0, 1, 0, 0], rot: 0, pos: [0, 0] };   // the frame of a contact 'on' the world (pins, reach)
  const fps = spec.fps, D = spec.duration, loop = !!spec.loop;
  const wrapT = (t) => (loop ? ((t % D) + D) % D : t);
  // PROPS stay put in the WORLD through a shot: a character places its furniture from her posed body (a chair's seat under
  // her buttocks, a worktop under her forearms), so placed per frame a counter rose and fell with her breath and a chair
  // would follow her as she sat down. They are placed ONCE, from spec.propsFrom (a pose; default the first key whose pose
  // has props), each item pinned where that pose put it (the parts carry their placement: part.place), and held all shot.
  const propsAt = (() => {
    const nm = spec.propsFrom ?? spec.keys.map((k) => k.pose).find((n) => lib[n]?.props?.items?.length);
    if (!nm || spec.propsFrom === null) return null;
    const seen = new Set(), items = [];
    for (const p of rig.build(lib[nm])) if (p.place && !seen.has(p.place)) { seen.add(p.place); items.push({ ...p.place }); }
    return items.length ? { items } : null;
  })();
  // key lists: the main pose track (spec.keys) plus optional channel-group tracks (spec.tracks, e.g. {"face": [...]})
  // that own every channel under their prefix — so the eyes can be keyed on their own timing.
  // key.kind "breakdown": the curve passes THROUGH it (Catmull-Rom tangent, cubic Hermite in angle space) instead of
  // stopping on it, so a move can travel a different path out and back without a hitch.
  const buildKeys = (arr, raw) => {
    for (const k of arr) if (!lib[k.pose]) throw new Error(`missing pose ${k.pose}`);
    // key.set = {channel: value}: sets channels on top of the key's pose (a contact pin, fx.pinNear: 1, without editing a
    // fitted pose that refs/fit_side.sh rewrites)
    const ks = arr.map((k) => ({ ...k, ch: { ...(raw ? flattenRaw(lib[k.pose]) : flatten(lib[k.pose])), ...(k.set || {}) }, ease: easeFn(k.ease) }));
    if (loop) ks.push({ ...ks[0], kind: undefined, t: ks[0].t + D, ease: easeFn(spec.wrapEase || 'inOut') });
    for (let i = 1; i < ks.length; i++) if (ks[i].t <= ks[i - 1].t) throw new Error(`keys out of order at ${ks[i].t}`);
    return ks;
  };
  const keys = buildKeys(spec.keys, false);
  // a track is either [keys] (owns channels under its name) or {channels: [prefixes], keys: [...]}
  const groups = Object.entries(spec.tracks || {}).map(([name, tr]) => Array.isArray(tr)
    ? { prefixes: [name], keys: buildKeys(tr, true) } : { prefixes: tr.channels, keys: buildKeys(tr.keys, true) });
  const owns = (g, ch) => g.prefixes.some((p) => ch === p || ch.startsWith(p + '.')) && g.keys.some((k) => ch in k.ch);
  // key.only = [channel prefixes]: a key (usually a breakdown) that shapes just those curves, e.g. an arm-only arc
  const keyCache = new Map();
  const keysFor = (ch) => {
    if (keyCache.has(ch)) return keyCache.get(ch);
    let ks = keys;
    for (const g of groups) if (owns(g, ch)) { ks = g.keys; break; }
    // key.except = [channel prefixes]: the opposite — the key shapes every curve BUT those (e.g. a retch hit that keeps its
    // shoulders and hands while a video layer owns the spine and legs over that window)
    // a prefix ending in '*' matches raw ('bone.hand.near.*' = the fingers and thumb, not the wrist 'bone.hand.near')
    const star = (p) => p.endsWith('*') && ch.startsWith(p.slice(0, -1));
    const hit = (p) => star(p) || ch === p || ch.startsWith(p + '.') || ch === 'bone.' + p || ch.startsWith('bone.' + p + '.');
    ks = ks.filter((k) => (!k.only || k.only.some((p) => star(p) || ch === p || ch.startsWith(p + '.'))) && !(k.except && k.except.some(hit)));
    keyCache.set(ch, ks);
    return ks;
  };
  // LINT: per-key shifts that differ between neighbouring keys can squeeze a channel's segment to a frame or two — a pop
  // (R7: the head went 5° → 15° in one frame between a +7 wind-up and a +1 spasm). Warn at build time.
  if (!opts.quiet) for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    for (const nm of new Set([...Object.keys(a.shift || {}), ...Object.keys(b.shift || {})])) {
      const L = (b.t - a.t) * fps + ((b.shift?.[nm] || 0) - (a.shift?.[nm] || 0));
      if (L < 3 && (b.t - a.t) * fps >= 3) console.warn(`anim ${spec.name}: channel ${nm} between ${a.pose}@f${Math.round(a.t * fps)} and ${b.pose}@f${Math.round(b.t * fps)} squeezed to ${L.toFixed(1)}f by shifts`);
    }
  }
  const allCh = [...new Set([...keys.flatMap((k) => Object.keys(k.ch)),
    ...groups.flatMap((g) => g.keys.flatMap((k) => Object.keys(k.ch)).filter((ch) => owns(g, ch)))])];
  const lagOf = (ch) => {
    if (spec.lags?.[ch] !== undefined) return spec.lags[ch] / fps;   // a full channel name (e.g. fx.headPitch: the nod trails the trunk like the head)
    const m = ch.match(/^(?:bone|scale)\.(.+?)(?:\.[01])?$/);
    if (m && spec.lags?.[m[1]] !== undefined) return spec.lags[m[1]] / fps;
    // FINGERS ripple index first (reels: fingers open to land one by one, +40 ms each): spec.fingerRipple frames per finger
    // after the index (default 1.2; 0 = in unison). Not the hand's lag on top: a reach places the hand itself, and fingers
    // 4 frames late uncovered her mouth as the hand landed on it (v15a).
    const f = m && m[1].match(/^hand\.(\w+?)B?\.f(\d)[abcs]$/);   // (not the thumb: lagging it opened a gap at the mouth)
    if (f) return ((spec.fingerRipple ?? 1.2) * (f[2] - 1)) / fps;
    return ((m ? spec.lags?.[m[1]] : spec.lags?.[ch.split('.')[0]]) ?? 0) / fps;
  };
  // key.shift = {bone or group: frames}: that key lands earlier/later for those channels only (offset keys per curve),
  // e.g. the head reaching an extreme before the hand so it can lead the way back.
  const chName = (ch) => { const m = ch.match(/^(?:bone|scale)\.(.+?)(?:\.[01])?$/); return m ? m[1] : ch.split('.')[0]; };
  const sample = (ch, t, ks) => {
    const v = (k) => (k.ch[ch] ?? DEFAULTS(ch));
    const nm = chName(ch), T = (k) => k.t + ((k.shift && k.shift[nm]) || 0) / fps;
    if (loop) { t = ((t - T(ks[0])) % D + D) % D + T(ks[0]); }
    if (t <= T(ks[0])) return v(ks[0]);
    const tan = (i) => {           // Catmull-Rom tangent (value per second) at a breakdown, 0 at a key
      if (ks[i].kind !== 'breakdown') return 0;
      const p = ks[i - 1], n = ks[i + 1];
      return (v(n) - v(p)) / (T(n) - T(p));
    };
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (t < T(b)) {
        const L = T(b) - T(a), u = (t - T(a)) / L;
        if (a.kind !== 'breakdown' && b.kind !== 'breakdown') return v(a) + (v(b) - v(a)) * b.ease(u);   // eased, angle space
        const u2 = u * u, u3 = u2 * u;
        return (2 * u3 - 3 * u2 + 1) * v(a) + (u3 - 2 * u2 + u) * tan(i) * L + (-2 * u3 + 3 * u2) * v(b) + (u3 - u2) * tan(i + 1) * L;
      }
    }
    return v(ks[ks.length - 1]);
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
  // inhale / exhale profiles: cubic-bezier eases from the timeline (default smootherstep). Both meet the top with zero
  // velocity, so the turn-over is smooth; a late-decelerating inhale + quick-recoil exhale keeps the top from parking.
  const inF = shape.inEase ? cubicBezier(...shape.inEase) : smoother, outF = shape.outEase ? cubicBezier(...shape.outEase) : smoother;
  const wave = (p) => {
    const f = p - Math.floor(p), i = shape.inhale, e = shape.exhale;
    return f < i ? inF(f / i) : f < i + e ? 1 - outF((f - i) / e) : 0;   // pause at the bottom
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

  // ---- contact pins: fx channel → {side, on (bone the hand rests on), plant?, release?, ref?}. spec.pins.channels names
  //      them; the legacy form {on, plant: {side: pose}, release} gives pinNear / pinFar on one surface.
  const PS = spec.pins || {};
  const PINS = Object.entries(PS.channels || Object.fromEntries(['near', 'far'].map((sd) => ['pin' + sd[0].toUpperCase() + sd.slice(1),
    { side: sd, on: PS.on, plant: PS.plant?.[sd], release: Array.isArray(PS.release) ? PS.release : PS.release?.[sd] }])))
    .map(([ch, P]) => [ch, { ...P, on: P.on || C.roles?.belly || 'belly' }]);
  const unlagged = (tt, pose) => {
    const b = {}, sc = {};
    for (const ch of allCh) {
      const [kind] = ch.split('.');
      if (kind === 'bone') b[ch.slice(5)] = sample(ch, tt, keysFor(ch));
      else if (kind === 'scale') { const id = ch.slice(6, -2), ix = +ch.slice(-1); (sc[id] ||= [1, 1])[ix] = sample(ch, tt, keysFor(ch)); }
    }
    return { bones: b, scale: { ...pose.scale, ...sc } };
  };

  // ---- base pose: keys + breath + drift (no springs). Pure in t.
  function basePose(t) {
    const tt = wrapT(t);
    const pose = { name: spec.name, bones: {}, scale: {}, face: {}, fx: {}, lattice: { belly: null }, facing: spec.facing || 'right' };
    // discrete properties held from the active key (swaps land ON keys)
    const act = (() => { let k = keys[0]; for (const kk of keys) if (kk.t <= tt + 1e-9) k = kk; return lib[k.pose]; })();
    for (const prop of ['handView', 'zBias']) if (act?.[prop] !== undefined) pose[prop] = act[prop];
    if (propsAt) pose.props = propsAt;
    // SWAPS (spec.swaps = [{t, handView, zBias}]): drawing swaps timed on their own — when a limb is clear of the body
    // (a far hand passing the bump's edge), not on whichever body key happens to be active. The latest one ≤ t holds.
    { let sw = null; for (const s of spec.swaps || []) if (s.t <= tt + 1e-9) sw = s; if (!sw && loop && spec.swaps?.length) sw = spec.swaps[spec.swaps.length - 1];
      if (sw) for (const prop of ['handView', 'zBias']) if (sw[prop] !== undefined) pose[prop] = sw[prop]; }
    for (const ch of allCh) {
      const val = sample(ch, tt - lagOf(ch), keysFor(ch));
      const [kind, a, b] = ch.split('.');
      if (kind === 'bone') pose.bones[ch.slice(5)] = val;
      else if (kind === 'scale') { const id = ch.slice(6, -2), ix = +ch.slice(-1); (pose.scale[id] ||= [1, 1])[ix] = val; }
      else if (kind === 'face') (pose.face[a] ||= {})[b] = val;
      else if (kind === 'fx') pose.fx[ch.slice(3)] = val;   // the whole name after 'fx.' (fx.contact.near was stored as fx.contact: no contact shadow ever drew from a keyed channel)
      else if (kind === 'root') (pose.root ||= [0, 0])[+a] = val;
    }
    const add = (b, v) => { pose.bones[b] = (pose.bones[b] || 0) + v; };
    // VIDEO LAYERS (spec.layers, written by tools/vtrack_apply.mjs): a performance measured from a reference video, added on
    // top of the keys as its DEVIATION from its own start→end chord (zero at both ends, so the keys still own where the
    // move starts and lands — motion warping, Witkin & Popović 1995). amp scales it (a generated video overacts).
    for (const Ly of spec.layers || []) {
      const T_ = Ly.t, n = T_.length; if (tt <= T_[0] || tt >= T_[n - 1]) continue;
      const amp = track(Ly.amp ?? 1, tt, 'amp');
      for (const [b, arr] of Object.entries(Ly.ch)) { const v = amp * crTime(T_, arr, tt); if (b.startsWith('fx.')) pose.fx[b.slice(3)] = (pose.fx[b.slice(3)] || 0) + v; else add(b, v); }
    }
    const keyed = { bones: { ...pose.bones }, scale: Object.fromEntries(Object.entries(pose.scale).map(([k, v]) => [k, [...v]])) };
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
    // a pinned hand can SLIDE on its surface (a stroke): fidget channels fx.slide.<side>.x / .y (H, in the frame of the
    // surface bone) shift the planted wrist — evaluated here, before the pin, since fidgets otherwise land after it
    fidgetAt(pose, tt, (b) => b.startsWith('fx.slide.'));
    for (const [ch, P] of PINS) {
      const w = clamp01(pose.fx[ch] ?? 0);
      if (w <= 0) continue;
      // reference: 'keys' = the key poses WITHOUT the per-channel lags (a hand on the face keeps the authored hand↔head
      // relation while head and arm overlap at different lags); otherwise the lagged keyed pose
      const ref = P.ref === 'keys' ? unlagged(tt, pose) : keyed;
      pinArm(pose, ref, P.side, w, P);
    }
    // HANG: a free arm hangs with gravity — when the torso tilts, the arm counter-rotates at the shoulder so it keeps
    // hanging, a few frames LATE (it drags, then catches up: follow-through for free). spec.hang[side] = {lag, k, rest}
    for (const [side, Hg] of Object.entries(spec.hang || {})) {
      const chain = ['pelvis', 'spineLower', 'spineUpper', 'chest', 'clavicle.' + side];
      const sumAt = (t) => chain.reduce((a, b) => a + (allCh.includes('bone.' + b) ? sample('bone.' + b, t - lagOf('bone.' + b), keysFor('bone.' + b)) : 0), 0);
      const restSum = chain.reduce((a, b) => a + (lib[Hg.rest]?.bones?.[b] ?? 0), 0);
      add('shoulderAbd.' + side, (Hg.k ?? 0.9) * (restSum - sumAt(tt - (Hg.lag ?? 4) / fps)));
    }
    // REACH: goal-directed hand moves planned in HAND space (spec.reach[side]) — the arm is solved to the hand
    for (const side of Object.keys(spec.reach || {})) reachArm(pose, tt, side);
    fidgetAt(pose, tt, (b) => !b.startsWith('fx.slide.'));
    landAt(pose, tt);
    for (const [b, a] of Object.entries(DR.bones || {})) if (b.startsWith('hand.')) add(b, amp * a * driftSig(b, tt));
    return pose;
  }

  // REACH (hand-space). People plan a reach with the HAND: it travels a nearly straight, slightly curved path with a
  // bell-shaped speed (minimum jerk, Flash & Hogan 1985); shoulder and elbow follow. Blending arm ANGLES instead swings
  // the hand on arcs around the shoulder (client: "a weird circular motion"). spec.reach[side] = [{t, pose, on, curve?,
  // handLag?}, …]: at time t the wrist is where it is in key pose `pose`, relative to bone `on` (contacts ride the body:
  // the bump breathes, the head bobs); between entries it follows the min-jerk path; the hand's angle relative to `on`
  // blends the same way, trailing the wrist by handLag frames. The arm is then solved to that wrist each frame, seeded
  // by the keyed angles (which pick the natural elbow), a fixed number of Newton steps — still a pure function of t.
  const RC = spec.reach || {};
  const mj = (u) => { u = clamp01(u); return u * u * u * (10 + u * (-15 + 6 * u)); };
  const reachRefCache = {};
  const reachRef = (name) => {
    if (!lib[name]) throw new Error(`reach: missing pose ${name}`);
    return (reachRefCache[name] ||= solve({ ...lib[name], bones: { ...lib[name].bones }, scale: { ...(lib[name].scale || {}) } }));
  };
  // 3D arms (rig plane 'arm3'): each contact also carries the key's wrist DEPTH (relative to the shoulder) and the elbow
  // SWIVEL, so the reach interpolates a 3D wrist and a swivel and solves the arm in 3D (no mirror-branch jumps)
  const is3 = (side) => BONE['upperArm.' + side]?.plane === 'arm3' && !!C.params?.depth;
  const info3Cache = {};
  // a nearly STRAIGHT arm (elbow bent < 15°: a hand hanging at her side) has no defined swivel — the elbow lies on the
  // shoulder→wrist line — so its phi is noise; a move from it takes the swivel of the other end (mum3: the elbow jumped
  // 11 px in one frame as the lift from her side began, the swivel sweeping from noise to the bump's)
  const info3 = (name, side) => (info3Cache[name + side] ||= (() => { const st = reachRef(name), fr = armFrame(rig, st, side), A = armPoints(rig, st, side);
    const v1 = st[`upperArm.${side}`].a3.v, v2 = st[`forearm.${side}`].a3.v, straight = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2] > Math.cos(15 * Math.PI / 180);
    return { z: fr.depthOf(A.wr), phi: swivelOf(A.el, A.wr), straight }; })());
  function contact(st, side, e, P_) {
    const ref = reachRef(e.pose), ha = 'hand.' + side, on = e.on;
    // on 'world': the hand stays where the pose put it on the floor, a worktop, a chair or a ball (props stay put: propsAt)
    const F = (S_) => (on === 'world' ? WORLD : S_[on]);
    let loc = apM(inv(F(ref).M), ref[ha].pos);
    // a contact on a WARPED bone (C.warps: the nodding head) moves with the warped drawing: carry the point by the
    // difference between the warp now and the warp in the contact's own pose
    if (C.warps?.[on] && P_) { const j = J[BONE[on].joint], v = [loc[0] + j[0], loc[1] + j[1]], a = C.warps[on](P_)(v), b = C.warps[on](lib[e.pose])(v); loc = [loc[0] + a[0] - b[0], loc[1] + a[1] - b[1]]; }
    const c = { p: apM(F(st).M, loc), rot: F(st).rot + (ref[ha].rot - F(ref).rot) };
    if (e.keyedArm) c.keyedArm = true;   // see reachArm: the arm stays the keys', only the damped solve moves the wrist
    if (is3(side)) {
      // the contact's DEPTH rides the bone it touches too: when she bows her head into her hand the face comes forward,
      // and the hand with it (otherwise the face passes in front of the hand and the hand is drawn behind it)
      const i3 = info3(e.pose, side), dMid = (S_) => { const fr_ = armFrame(rig, S_, side); return fr_.depthOf(fr_.fromScreenMid(F(S_).pos)); };
      c.z = (e.z ?? i3.z) + dMid(st) - dMid(ref); c.phi = e.phi !== undefined ? e.phi * Math.PI / 180 : i3.phi; c.straight = e.phi === undefined && i3.straight;
    }
    // an OFFSET via (e.dp screen H, e.dz depth H, e.dphi deg): a waypoint defined from a key's contact — e.g. LIFT-OFF: the
    // hand first comes away from the surface it rested on (round the bump's silhouette edge, never through the bump)
    if (e.dp) { const r = (F(st).rot - F(ref).rot) * Math.PI / 180; c.p = [c.p[0] + Math.cos(r) * e.dp[0] - Math.sin(r) * e.dp[1], c.p[1] + Math.sin(r) * e.dp[0] + Math.cos(r) * e.dp[1]]; }
    if (e.dz !== undefined && c.z !== undefined) c.z += e.dz;
    // e.surface: the hand LIES ON that body proxy's near surface at this point of the screen (sliding round the front of
    // the bump instead of passing through it): depth = where the camera ray through the point enters the proxy, + e.gap
    if (e.surface && c.z !== undefined) {
      const fr = armFrame(rig, st, side), q = proxies(rig, st, fr).find((x) => x.name === e.surface);
      const h = q && rayHits(fr.toBody(c.p, 0), fr, [q])[0];
      if (h) c.z = h.t0 - (e.gap ?? 0.06);
    }
    if (e.dphi !== undefined && c.phi !== undefined) c.phi += e.dphi * Math.PI / 180;
    if (e.lie && c.z !== undefined) { c.lie = e.lie; c.lieW = 1; }
    if (e.keepSize) c.len = ref[ha].a3?.len;   // see keepSize
    if (e.keepPalm && ref[ha].a3?.ncam) c.palm = ref[ha].a3.ncam.slice();   // see keepSize
    return c;
  }
  // A MOVE runs from one stop entry to the next; entries marked via:true in between shape the path without stopping (one
  // movement, one bell-shaped speed profile over the whole move): the wrist follows a Catmull-Rom curve through the
  // contacts, parameterised by chord length, at s = minjerk(warp(u)); skew > 0 front-loads it (fast off, cushion in).
  // The hand's wrist angle (local to the forearm) and its ROLL (across-scale: <1 = turned toward edge-on, thumb up)
  // interpolate along the same curve, trailing by handLag; at the two stops the hand matches its contact.
  // a HELD hand keeps its screen angle relative to what it touches, by a wrist bend held CLOSE to the key's own (the fitted
  // bend): without that pull the 2D secant step flipped an edge-on hand between bends 70° apart in four frames as she bowed
  // into it (the "four hand shapes" at the mouth, critic R22). spec.reach.holdReg: degrees of angle error per degree of bend
  const holdBend = (side, e) => (is3(side) ? { local: lib[e.pose].bones?.['hand.' + side] ?? 0, reg: e.reg ?? RC.holdReg ?? 0.3 } : {});
  // the wrist scan's pull toward the planned bend, CONTINUOUS across a move's ends: a hold pulls hard (holdBend), a move
  // only weakly mid-flight — switching at the stop stepped the hand 1–2° in one frame as each hold began or ended (mum3 v3)
  // stop.slide (on a move's end stop): the hand SLIDES on what it touches (a stroke on the bump): it keeps its contact angle
  // and the hold's pull all the way, no in-flight blend toward the key's bend. mum3q v5's far hand lies nearly end-on to
  // us (palm 29% of its length), so its screen angle hardly depends on the bend: the blend swung the fingertips 10 px/frame
  // as the stroke began
  const flight = (b, u) => (b.slide ? 0 : Math.min(1, 6 * u * (1 - u)));
  const moveReg = (side, a, b, u) => { if (!is3(side)) return undefined; const hr = (e) => e.reg ?? RC.holdReg ?? 0.3, h = hr(a) + u * (hr(b) - hr(a)), m = flight(b, u); return 0.02 + (h - 0.02) * (1 - m); };
  function reachTarget(side, tt, st, P_) {
    const L = RC[side], n = L.length, stops = L.map((e, k) => (e.via ? -1 : k)).filter((k) => k >= 0);
    let i = -1; for (const k of stops) if (L[k].t <= tt + 1e-9) i = k;
    let s0, s1, t0, t1;
    const si = stops.indexOf(i);
    if (i >= 0 && si < stops.length - 1) { s0 = i; s1 = stops[si + 1]; t0 = L[s0].t; t1 = L[s1].t; }
    else if (loop) { s0 = i >= 0 ? i : stops[stops.length - 1]; s1 = stops[(stops.indexOf(s0) + 1) % stops.length]; t0 = L[s0].t - (i < 0 ? D : 0); t1 = L[s1].t + (i >= 0 ? D : 0); }
    else { const e0 = L[Math.max(0, i)]; return { ...contact(st, side, e0, P_), ...holdBend(side, e0), frontW: e0.front ? 1 : 0 }; }
    const idx = []; for (let k = s0; ; k = (k + 1) % n) { idx.push(k); if (k === s1) break; }
    const E = idx.map((k) => L[k]), a = E[0], b = E[E.length - 1];
    if (b.path) return pathTarget(side, tt, st, a, b, P_);
    const A = contact(st, side, a, P_);
    const same = (x, y) => ['pose', 'on', 'dp', 'dz', 'dphi', 'surface', 'gap', 'z', 'phi'].every((k) => JSON.stringify(x[k]) === JSON.stringify(y[k]));
    if (E.length === 2 && same(a, b)) return { ...A, ...holdBend(side, a), frontW: a.front ? 1 : 0 };  // a hold: the hand stays where it was put (same pose, same offsets)
    const P = E.map((e, k) => (k === 0 ? A : contact(st, side, e, P_)));
    if (P.some((c) => c.straight) && P.some((c) => c.phi !== undefined && !c.straight)) P.forEach((c, k) => {   // see info3: a straight arm's swivel is the nearest bent contact's
      if (!c.straight) return; let best = null; P.forEach((q, j) => { if (!q.straight && q.phi !== undefined && (best === null || Math.abs(j - k) < Math.abs(best - k))) best = j; }); P[k] = { ...c, phi: P[best].phi };
    });
    const u = clamp01((tt - t0) / (t1 - t0)), warp = (x) => Math.pow(clamp01(x), 1 - (b.skew ?? 0)), sP = mj(warp(u));
    const ch = [0]; for (let k = 1; k < P.length; k++) ch.push(ch[k - 1] + Math.hypot(P[k].p[0] - P[k - 1].p[0], P[k].p[1] - P[k - 1].p[1]));
    const tot = ch[ch.length - 1] || 1, cf = ch.map((c) => c / tot);
    const seg = (x) => { let k = 0; while (k < P.length - 2 && x > cf[k + 1]) k++; return [k, (x - cf[k]) / ((cf[k + 1] - cf[k]) || 1)]; };
    let p;
    if (P.length === 2) {                                                  // a single move: straight, gently bowed (b.curve)
      const d = [P[1].p[0] - A.p[0], P[1].p[1] - A.p[1]], Ld = Math.hypot(d[0], d[1]) || 1, nn = [d[1] / Ld, -d[0] / Ld];
      const bow = (b.curve ?? 0.08) * Ld * 4 * sP * (1 - sP);
      p = [A.p[0] + sP * d[0] + nn[0] * bow, A.p[1] + sP * d[1] + nn[1] * bow];
      if (A.z !== undefined) p.push(A.z + sP * (P[1].z - A.z));
    } else {                                                               // through vias: Catmull-Rom
      // CENTRIPETAL Catmull-Rom (Barry–Goldman, knots spaced by √chord): a uniform CR overshoots into a loop where a
      // long segment meets a short one (the hand shot past the mouth and came back: a hitch on arrival). Ends get
      // mirrored phantom points so the first and last segments stay well defined.
      const [k, v] = seg(sP), pt = (e) => (e.z !== undefined ? [...e.p, e.z] : e.p), n_ = P.length;
      const q = (j) => j < 0 ? pt(P[0]).map((x, c) => 2 * x - pt(P[1])[c]) : j >= n_ ? pt(P[n_ - 1]).map((x, c) => 2 * x - pt(P[n_ - 2])[c]) : pt(P[j]);
      const p0 = q(k - 1), p1 = q(k), p2 = q(k + 1), p3 = q(k + 2);
      const dk = (a, b) => Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]))), t0_ = 0, t1_ = dk(p0, p1), t2_ = t1_ + dk(p1, p2), t3_ = t2_ + dk(p2, p3), t = t1_ + v * (t2_ - t1_);
      const L_ = (a, b, ta, tb) => a.map((x, c) => ((tb - t) * x + (t - ta) * b[c]) / (tb - ta));
      const A1 = L_(p0, p1, t0_, t1_), A2 = L_(p1, p2, t1_, t2_), A3 = L_(p2, p3, t2_, t3_), B1 = L_(A1, A2, t0_, t2_), B2 = L_(A2, A3, t1_, t3_);
      p = L_(B1, B2, t1_, t2_);
    }
    const sH = mj(warp(u - (b.handLag ?? 2) / fps / (t1 - t0)));
    const [kh, vh] = seg(sH), loc = (e) => lib[e.pose].bones?.['hand.' + side] ?? 0, rl = (e) => e.roll ?? lib[e.pose].scale?.['hand.' + side]?.[1] ?? 1;
    const ea = E[kh], eb = E[Math.min(E.length - 1, kh + 1)];
    let local = loc(ea) + vh * (loc(eb) - loc(ea)), roll = rl(ea) + vh * (rl(eb) - rl(ea));
    // mid-flight the wrist relaxes toward straight: the hand is CARRIED, not posed. Not while it stays on the same body part
    // (a hold or a stroke slides ON her: mum3 v2, the wrist dipped 8° and back while lingering at the stroke's top)
    local *= 1 - (b.neutral ?? (a.on && a.on === b.on ? 0 : 0.5)) * Math.sin(Math.PI * u);
    const B = P[P.length - 1];
    let phi;
    if (A.phi !== undefined) { const pa = P[kh].phi, pb = P[Math.min(P.length - 1, kh + 1)].phi; phi = pa + vh * (Math.atan2(Math.sin(pb - pa), Math.cos(pb - pa))); }
    // front flag along the path (vias included), interpolated like the hand's local angle
    const fA = E[kh].front ? 1 : 0, fB = E[Math.min(E.length - 1, kh + 1)].front ? 1 : 0;
    const lA = E[kh].lie ? 1 : 0, lB = E[Math.min(E.length - 1, kh + 1)].lie ? 1 : 0, lie = E.find((e) => e.lie)?.lie;
    const len = A.len !== undefined && B.len !== undefined ? A.len + sH * (B.len - A.len) : undefined;
    const palm = A.palm && B.palm ? (() => { const q = A.palm.map((x, c) => x + sH * (B.palm[c] - x)), n_ = Math.hypot(...q) || 1; return q.map((x) => x / n_); })() : undefined;
    return { len, palm, lie, lieW: lie ? lA + vh * (lB - lA) : 0, limp: b.limp ?? 0, limpBend: b.limpBend, frontW: fA + vh * (fB - fA), P: P.map((c) => c.p), u, sP, p: p.slice(0, 2), z: p[2], phi, rot: A.rot + sH * (((B.rot - A.rot + 540) % 360) - 180), local, roll, m: flight(b, u), reg: b.reg ?? a.reg ?? moveReg(side, a, b, u), keyedArm: !!(a.keyedArm && b.keyedArm) };   // stop.reg: pull the wrist scan toward the planned bend (an edge-on hand flipped 40° on the first frame of the peel)
  }
  // A VIDEO PATH move (stop.path, written by tools/vtrack_apply.mjs from a style-matched reference video fitted frame by
  // frame): the wrist follows the measured path — position in the frame of bone path.on, depth, elbow swivel, hand angle —
  // at the video's own timing (retimed to the move), instead of a planned spline. The two contacts still own the ends:
  // the path is WARPED onto them (offsets at start and end, blended by how far along the path the hand is, so a hand
  // that has not moved yet stays exactly on its contact). Hand space throughout, so it rides the body as it moves.
  const dMidOf = (S_, side, on) => { const fr_ = armFrame(rig, S_, side); return fr_.depthOf(fr_.fromScreenMid(S_[on].pos)); };
  const wrapPi = (x) => Math.atan2(Math.sin(x), Math.cos(x)), wrap180 = (x) => ((x % 360) + 540) % 360 - 180;
  const pathRows = new Map(), pathEnds = new Map(), pathUV = new Map(), pathElb = new Map();
  // the TORSO frame of a solved pose: origin the near shoulder, u across to the far shoulder, v from mid-shoulders down to
  // mid-hips (screen). The same frame measured on the reference video's landmarks makes a wrist/elbow path portable
  // between bodies of different build (tools/vtrack_apply.mjs, V.frame 'torso')
  const RO = rig.C.roles || {}, rb = (k, s, d) => RO[k]?.[s]?.[d === 'upper' ? 'upper' : 'thigh'] ?? (d === 'upper' ? `upperArm.${s}` : `thigh.${s}`);
  const torsoFrame = (S_) => {
    const o = S_[rb('arms', 'near', 'upper')].pos, f = S_[rb('arms', 'far', 'upper')].pos, hn = S_[rb('legs', 'near', 'thigh')].pos, hf = S_[rb('legs', 'far', 'thigh')].pos;
    const ex = [f[0] - o[0], f[1] - o[1]], ey = [(hn[0] + hf[0] - o[0] - f[0]) / 2, (hn[1] + hf[1] - o[1] - f[1]) / 2], det = ex[0] * ey[1] - ex[1] * ey[0];
    return { to: (q) => [o[0] + q[0] * ex[0] + q[1] * ey[0], o[1] + q[0] * ex[1] + q[1] * ey[1]],
      of: (p) => { const d = [p[0] - o[0], p[1] - o[1]]; return [(d[0] * ey[1] - d[1] * ey[0]) / det, (ex[0] * d[1] - ex[1] * d[0]) / det]; } };
  };
  // the measured (u, v) path resampled at even PROGRESS s (24 knots): looked up by s, so a designed timing still walks the
  // measured shape, and eased ends (s nearly flat) cannot make the spline's knots collide
  const uvRows = (Q) => pathUV.get(Q) || (() => {
    const S0 = Q.s, n = S0.length, m = 24, ks = [], w = [], e = [];
    const lin = (Y, s) => { let k = 0; while (k < n - 2 && S0[k + 1] < s) k++; const g = S0[k + 1] - S0[k], u = g > 1e-9 ? Math.max(0, Math.min(1, (s - S0[k]) / g)) : 0; return [Y[k][0] + u * (Y[k + 1][0] - Y[k][0]), Y[k][1] + u * (Y[k + 1][1] - Y[k][1])]; };
    for (let j = 0; j <= m; j++) { const s = j / m; ks.push(s); w.push(lin(Q.uv, s)); if (Q.euv) e.push(lin(Q.euv, s)); }
    const r = { s: ks, w, e: Q.euv ? e : null }; pathUV.set(Q, r); return r;
  })();
  function pathTarget(side, tt, st, a, b, P_) {
    const Q = b.path, on = Q.on, T_ = Q.t, n = T_.length, three = is3(side) && !!Q.z;
    if (!pathRows.has(Q)) pathRows.set(Q, T_.map((_, k) => [Q.p[k][0], Q.p[k][1], three ? Q.z[k] : 0, three ? Q.phi[k] : 0, Q.rot[k], Q.local[k], Q.s[k]]));
    const rows = pathRows.get(Q), M = st[on].M, dm = three ? dMidOf(st, side, on) : 0;
    const A = contact(st, side, a, P_), B = contact(st, side, b, P_);
    const scr = (r) => ({ p: apM(M, [r[0], r[1]]), z: r[2] + dm, phi: r[3], rot: st[on].rot + r[4] });
    const off = (C_, c) => ({ p: [C_.p[0] - c.p[0], C_.p[1] - c.p[1]], z: three ? C_.z - c.z : 0, phi: three ? wrapPi(C_.phi - c.phi) : 0, rot: wrap180(C_.rot - c.rot) });
    const d0 = off(A, scr(rows[0])), d1 = off(B, scr(rows[n - 1]));
    // path.bias = [{s0, s1, dp: [x, y] (screen H), dz (depth H, + = away)}]: a designed detour over part of the path (sin²
    // window in path progress, zero at both ends) — e.g. keep a falling hand out beside the body's far edge, and behind it,
    // where the video's (differently built) body let it cross in front of the bump
    const bias = (s) => { let x = 0, y = 0, z = 0, f = 0; for (const B_ of Q.bias || []) { const v = (s - B_.s0) / (B_.s1 - B_.s0); if (v <= 0 || v >= 1) continue; const w = Math.sin(Math.PI * v) ** 2; x += w * (B_.dp?.[0] ?? 0); y += w * (B_.dp?.[1] ?? 0); z += w * (B_.dz ?? 0); f += w * (B_.dphi ?? 0) * Math.PI / 180; } return [x, y, z, f]; };   // dphi: the elbow's swivel (deg)
    const at = (tq) => {
      const r = crTime(T_, rows, tq), c = scr(r), s = clamp01(r[6]), mx = (x0, x1) => (1 - s) * x0 + s * x1, bs = bias(s);
      return { p: [c.p[0] + mx(d0.p[0], d1.p[0]) + bs[0], c.p[1] + mx(d0.p[1], d1.p[1]) + bs[1]], z: c.z + mx(d0.z, d1.z) + bs[2], phi: c.phi + mx(d0.phi, d1.phi) + bs[3], rot: c.rot + mx(d0.rot, d1.rot), local: r[5], s };
    };
    // the hand TRAILS the wrist by handLag frames mid-move, never at the ends (lag × sin πu): a plain shift left the hand
    // short of its contact bend when the move ended and the hold took over (a 24° snap on arrival)
    const tq = Math.max(T_[0], Math.min(T_[n - 1], tt)), uq = (tq - T_[0]) / (T_[n - 1] - T_[0]);
    const tH = Math.max(T_[0], tq - Math.min((b.handLag ?? 0) / fps, 0.9 * (T_[n - 1] - T_[0]) / Math.PI) * Math.sin(Math.PI * uq)), N = at(tq), H = at(tH);
    // path.timing 'mj': a DESIGNED speed profile instead of the video's (minimum jerk, front-loaded by path.skew) — for a
    // move whose measured timing did not transfer (the return: a quick flick off the lips then a slow drift read as a
    // jump and a hang; a hand falling under its own weight is one even arc)
    if (Q.timing === 'mj') {
      const w_ = (x) => Math.pow(clamp01(x), 1 - (Q.skew ?? 0)), u_ = (tq - T_[0]) / (T_[n - 1] - T_[0]), uh = (tH - T_[0]) / (T_[n - 1] - T_[0]);
      N.s = mj(w_(u_)); H.s = mj(w_(uh));
    }
    // path.zBy (0…1): DEPTH from the two contacts instead of the video (one view measures depth worst): the hand reaches the
    // end contact's depth by that much of the way — a far hand falling back to the far side of the bump goes behind the
    // body early (as a real far arm does) instead of crossing in front of it
    if (Q.zBy !== undefined && three) { const w = smooth01((N.s - (Q.zFrom ?? 0)) / (Q.zBy - (Q.zFrom ?? 0))); N.z = (1 - w) * A.z + w * B.z + bias(N.s)[2]; }
    // path.uv (V.frame 'torso'): the WRIST follows the video's measured path in the torso frame, rebuilt on our body every
    // frame (it rides her as she bends), warped onto the two contacts; path.euv gives the ELBOW's measured path the same
    // way — reachArm turns the elbow about the shoulder→wrist line to put it there (weight path.elbowW, zero at the
    // contacts). The chest-frame path could not transfer: the video's hand rose up the middle of OUR chest (critic R22)
    let elbowP, elbowWt = 0;
    if (Q.uv) {
      const TF = torsoFrame(st), K = uvRows(Q), S = N.s, last = K.s.length - 1;
      const w0 = TF.to(K.w[0]), w1 = TF.to(K.w[last]), c = TF.to(crTime(K.s, K.w, S)), bs = bias(S);
      N.p = [c[0] + (1 - S) * (A.p[0] - w0[0]) + S * (B.p[0] - w1[0]) + bs[0], c[1] + (1 - S) * (A.p[1] - w0[1]) + S * (B.p[1] - w1[1]) + bs[1]];
      // path.elbowPath 'chord': the elbow goes STRAIGHT from where it is at one contact to where it is at the other (in the
      // torso frame) — the whole arm lowers, the upper arm swinging back as the forearm opens. Without a target the swivel
      // interpolation took the elbow out wide and round (client: "swinging at the elbow"); held at the video's elbow it
      // stayed put while the forearm swung round it like a clock hand
      if (Q.elbowPath === 'chord') {
        const E = pathElb.get(Q) || (() => { const f = (t_) => { const S_ = solve(basePose(t_)); return torsoFrame(S_).of(S_['forearm.' + side].pos); }, r = [f(T_[0] - 1e-4), f(T_[n - 1] + 1e-4)]; pathElb.set(Q, r); return r; })();
        const w = smooth01(S);
        elbowP = TF.to([E[0][0] + w * (E[1][0] - E[0][0]), E[0][1] + w * (E[1][1] - E[0][1])]);
        elbowWt = (Q.elbowW ?? 1) * Math.min(1, 10 * S * (1 - S));
      } else if (K.e) {
        // our own elbow at the two contacts (poses just outside the move, cached) in OUR torso frame: the measured elbow
        // path is warped onto them, so guidance starts and ends where the arm already is
        const E = pathElb.get(Q) || (() => { const f = (t_) => { const S_ = solve(basePose(t_)); return torsoFrame(S_).of(S_['forearm.' + side].pos); }, r = [f(T_[0] - 1e-4), f(T_[n - 1] + 1e-4)]; pathElb.set(Q, r); return r; })();
        const q = crTime(K.s, K.e, S), e0 = K.e[0], e1 = K.e[last];
        // path.elbowBias = [{s0, s1, du, dv}] (torso units, sin² window): a designed nudge of the elbow target — e.g. the
        // elbow out and low at her far side as the lift starts, so the forearm reads as a diagonal instead of end-on
        let bu = 0, bv = 0; for (const B_ of Q.elbowBias || []) { const v = (S - B_.s0) / (B_.s1 - B_.s0); if (v <= 0 || v >= 1) continue; const w = Math.sin(Math.PI * v) ** 2; bu += w * (B_.du ?? 0); bv += w * (B_.dv ?? 0); }
        elbowP = TF.to([q[0] + (1 - S) * (E[0][0] - e0[0]) + S * (E[1][0] - e1[0]) + bu, q[1] + (1 - S) * (E[0][1] - e0[1]) + S * (E[1][1] - e1[1]) + bv]);
        elbowWt = (Q.elbowW ?? 1) * Math.min(1, 6 * S * (1 - S));
      }
    }
    // path.shape = 'chord': the video gives only the TIMING (how far along the move the hand is at each instant: its speed
    // profile, the cushion, the settle); the SHAPE is one designed arc between the contacts — A→B plus path.bow (screen
    // H, a sideways bulge 4s(1−s)) plus any bias. For moves where the video's body differs too much from ours for its
    // path to transfer (critic: "climbs her outline", "out, in, out"), the hand's own path is the simplest arc
    // path.shape = 'corner': a quadratic Bézier whose control point is the CORNER of an L between the contacts — corner
    // {x: 'A'|'B', y: 'A'|'B', d: [dx, dy]} takes its x from one contact and its y from the other: the return goes OUT
    // from the lips first (x of the rim, y of the mouth) then down the far side; the lift goes UP the far side first (x of
    // the rim, y of the mouth) then in to the mouth — the forearm hinging at an elbow that stays at her side
    if (Q.shape === 'corner') {
      const K_ = Q.corner || {}, Cx = (K_.x === 'A' ? A.p[0] : B.p[0]) + (K_.d?.[0] ?? 0), Cy = (K_.y === 'B' ? B.p[1] : A.p[1]) + (K_.d?.[1] ?? 0), wq = K_.w ?? 1;
      const arc = (S_) => { const bs = bias(S_), a0 = (1 - S_) ** 2, a1 = 2 * S_ * (1 - S_) * wq, a2 = S_ * S_, den = a0 + a1 + a2; return [(a0 * A.p[0] + a1 * Cx + a2 * B.p[0]) / den + bs[0], (a0 * A.p[1] + a1 * Cy + a2 * B.p[1]) / den + bs[1]]; };
      N.p = arc(N.s);
      if (three && Q.zBy === undefined) N.z = A.z + (B.z - A.z) * N.s + bias(N.s)[2];
      // path.elbowLead (fraction of the move): the ELBOW leads — its swivel runs ahead of the hand (the elbow swings
      // forward first, the forearm follows, critic R21)
      const sE = Q.elbowLead ? (Q.timing === 'mj' ? mj(clamp01((tq - T_[0]) / (T_[n - 1] - T_[0]) + Q.elbowLead)) : clamp01(at(Math.min(T_[n - 1], tq + Q.elbowLead * (T_[n - 1] - T_[0]))).s)) : N.s;
      if (three) N.phi = A.phi + wrapPi(B.phi - A.phi) * sE + bias(N.s)[3];
      H.rot = A.rot + wrap180(B.rot - A.rot) * H.s;
    }
    if (Q.shape === 'chord') {
      const arc = (S_) => { const w = 4 * S_ * (1 - S_), bs = bias(S_); return [A.p[0] + (B.p[0] - A.p[0]) * S_ + (Q.bow?.[0] ?? 0) * w + bs[0], A.p[1] + (B.p[1] - A.p[1]) * S_ + (Q.bow?.[1] ?? 0) * w + bs[1]]; };
      N.p = arc(N.s);
      if (three && Q.zBy === undefined) N.z = A.z + (B.z - A.z) * N.s + bias(N.s)[2];
      if (three) N.phi = A.phi + wrapPi(B.phi - A.phi) * N.s + bias(N.s)[3];
      H.rot = A.rot + wrap180(B.rot - A.rot) * H.s;
    }
    // forearm TWIST (pronation) from the video too — it turns the plane the wrist bends in, so without it the measured
    // hand direction is unreachable (the hand snaps edge-on) — warped onto the keyed twist at the two ends
    let twist;
    // path.twistAt = [[s, deg | 'A' | 'B'], …]: a DESIGNED forearm twist along the move (piecewise smooth in the hand's
    // progress; 'A'/'B' = the keyed twist at the move's start/end). The lift keeps the forearm turned (≈65°) so the hand
    // rises flexed toward her chest, knuckles up, as in the video (its fit measured 66→52°), and turns to the cover's twist
    // only on the last stretch to the mouth — at the keys' 0° mid-move the flexed hand read as an open palm, fingers up (an oath)
    if (Q.twistAt) {
      const ch = 'bone.foreRot.' + side, K = (t_) => sample(ch, t_ - lagOf(ch), keysFor(ch)), val = (v) => (v === 'A' ? K(T_[0]) : v === 'B' ? K(T_[n - 1]) : v);
      const F_ = Q.twistAt, sH = H.s; let k = 0; while (k < F_.length - 2 && sH > F_[k + 1][0]) k++;
      const [s0, v0] = F_[k], [s1, v1] = F_[Math.min(k + 1, F_.length - 1)];
      twist = s1 > s0 ? val(v0) + (val(v1) - val(v0)) * smooth01((sH - s0) / (s1 - s0)) : val(v0);
    } else if (Q.twist && Q.twistFrom !== 'keys') {   // path.twistFrom 'keys': the forearm twist stays the keys' (no video)
      const ch = 'bone.foreRot.' + side, K = (t_) => sample(ch, t_ - lagOf(ch), keysFor(ch)), tw = (tq_) => crTime(T_, Q.twist, tq_);
      const sH = H.s, o0 = K(T_[0]) - Q.twist[0], o1 = K(T_[n - 1]) - Q.twist[n - 1];
      twist = tw(tH) + (1 - sH) * o0 + sH * o1;
    }
    // front flag: the start contact's fades as the hand leaves, the end contact's comes in as it arrives
    const fa = a.front ? 1 : 0, fb = b.front ? 1 : 0, fw = Q.frontRamp ?? 0.35;
    let frontW = fa * (1 - smooth01(N.s / fw)) + fb * smooth01((N.s - (1 - fw)) / fw);
    // path.front = [[s, w], …]: the stated front-of-body flag along the move (piecewise smooth) — a hand falling down the
    // FRONT of her chest onto the bump is in front of it however the 3D proxies judge the measured depth
    if (Q.front) { const F_ = Q.front; let k = 0; while (k < F_.length - 2 && N.s > F_[k + 1][0]) k++; const [s0, w0] = F_[k], [s1, w1] = F_[Math.min(k + 1, F_.length - 1)]; frontW = s1 > s0 ? w0 + (w1 - w0) * smooth01((N.s - s0) / (s1 - s0)) : w0; }
    // the WRIST BEND: a hand seen nearly edge-on has no stable screen angle (a few degrees of bend sweep it through 180°),
    // so in flight the hand takes the video's measured bend, warped onto the bends the hand actually has on its two
    // contacts (read from the poses just before and just after the move — cached, still a pure function of t)
    let local = H.local, m = 1;
    if (Q.mode === 'rot') m = (Q.m ?? 0) * Math.min(1, 6 * H.s * (1 - H.s));
    else {
      const ends = pathEnds.get(Q) || (() => { const e = [basePose(T_[0] - 1e-4)._reach?.[side]?.hand, basePose(T_[n - 1] + 1e-4)._reach?.[side]?.hand]; pathEnds.set(Q, e); return e; })();
      const l0 = Q.local[0], l1 = Q.local[n - 1];
      // path.bendAt = [[s, deg | 'A' | 'B'], …]: a DESIGNED wrist bend along the move ('A'/'B' = the bends on the two
      // contacts), piecewise smooth in the hand's progress — the lift keeps the hand curled toward the mouth (flexed) until
      // the last stretch, where it opens over the lips (a linear blend opened it halfway up: an oath palm, critic R23)
      const pw = (F_, x, val) => { let k = 0; while (k < F_.length - 2 && x > F_[k + 1][0]) k++; const [s0, v0] = F_[k], [s1, v1] = F_[Math.min(k + 1, F_.length - 1)]; return s1 > s0 ? val(v0) + (val(v1) - val(v0)) * smooth01((x - s0) / (s1 - s0)) : val(v0); };
      if (Q.bendAt) local = pw(Q.bendAt, H.s, (v) => (v === 'A' ? (ends[0] ?? l0) : v === 'B' ? (ends[1] ?? l1) : v));
      else local = Q.bendFrom === 'contacts'   // path.bendFrom 'contacts': the wrist eases from one contact's bend to the other's (no video)
        ? (1 - H.s) * (ends[0] ?? l0) + H.s * (ends[1] ?? l1) + (Q.bend ?? 0) * Math.min(1, 6 * H.s * (1 - H.s))
        : H.local + (1 - H.s) * ((ends[0] ?? l0) - l0) + H.s * ((ends[1] ?? l1) - l1) + (Q.bend ?? 0) * Math.min(1, 6 * H.s * (1 - H.s));   // path.bend: a designed wrist offset mid-flight (the video's hand is small and its bend poorly measured)
    }
    // path.behindFrom (s): from there on the arm is drawn BEHIND the body (it is going round her far side), however the
    // depth proxies judge single frames
    const behindW = Q.behindFrom !== undefined ? smooth01((N.s - Q.behindFrom) / 0.04) : undefined;
    // path.rollAt = [[s, k], …]: the hand's across-scale along the move (< 1 = turned toward edge-on, thumb side to us)
    let roll; if (Q.rollAt) { const F_ = Q.rollAt; let k = 0; while (k < F_.length - 2 && H.s > F_[k + 1][0]) k++; const [s0, v0] = F_[k], [s1, v1] = F_[Math.min(k + 1, F_.length - 1)]; roll = s1 > s0 ? v0 + (v1 - v0) * smooth01((H.s - s0) / (s1 - s0)) : v0; }
    return { limp: b.limp ?? 0, limpBend: b.limpBend, mid: Math.min(1, 7 * uq * (1 - uq)), frontW, behindW, roll,   // limp by TIME, not progress: the wrist drops first, while the (accelerating) fall has barely begun P: rows.map((r) => scr(r).p), u: (tq - T_[0]) / (T_[n - 1] - T_[0]), sP: N.s,
      p: N.p, z: three ? N.z : undefined, phi: three ? N.phi : undefined, rot: H.rot, local, m, twist, reg: Q.reg, elbowP, elbowWt };   // path.m: mid-path the wrist takes the measured BEND instead of the measured direction
  }
  // LIE (stop.lie = a depth proxy, e.g. 'bump'): the palm lies ON that surface. The wrist's screen point is cast onto the
  // proxy; the hand's 3D direction keeps its screen direction (the bend scan matched it) but takes the depth that puts it
  // in the surface's TANGENT plane there; the wrist's flexion (hand bone `flex`) and deviation are then read off that
  // direction in the forearm's frame (closed form), and the deviation is re-matched to the screen angle with the flexion
  // held. On the near face of the bump the hand lies nearly in the picture plane (full length); toward the bump's
  // outline it wraps away round the curve (foreshortens) — what a real hand does. Weighted by T.lieW (moves blend in/out).
  function lieFlat(pose, side, T, lo, hi) {
    const ha = 'hand.' + side, fl = BONE[ha].flex, st = solve(pose), fr = armFrame(rig, st, side), q = proxies(rig, st, fr).find((x) => x.name === T.lie);
    if (!q) return;
    const p0 = fr.toBody(st[ha].pos, 0), h = rayHits(p0, fr, [q])[0];
    // the outward normal at the entry point (or, if the ray misses, at the nearest point of the proxy's silhouette)
    const P = h ? p0.map((x, i) => x + h.t0 * fr.view[i]) : p0, o = P.map((x, i) => x - q.c[i]), [aF, aD, aL] = q.axes;
    let N = [o[0] / aF ** 2, q.kind === 'cylinder' ? 0 : o[1] / aD ** 2, o[2] / aL ** 2]; const nl = Math.hypot(...N) || 1; N = N.map((x) => x / nl);
    // body (upright) → camera coords of the ARM frame: x/y rotate by (chest − arm base), depth is shared
    const s_ = fr.s, SQ_ = Math.sqrt(1 - rig.fx ** 2), cb = [rig.fx * N[0] + s_ * SQ_ * N[2], N[1], -SQ_ * N[0] + s_ * rig.fx * N[2]];
    const ua = st['upperArm.' + side], kb = ((st.chest?.rot ?? 0) - ((ua.baseRot ?? 0) + rig.restAngle(BONE['upperArm.' + side]) - 90)) * Math.PI / 180;
    const Nc = [Math.cos(kb) * cb[0] - Math.sin(kb) * cb[1], Math.sin(kb) * cb[0] + Math.cos(kb) * cb[1], cb[2]];
    const cam = st[ha].a3.cam, sl = Math.hypot(cam[0], cam[1]) || 1, sx = cam[0] / sl, sy = cam[1] / sl;
    // tangent: a·(s·N_xy) + d·N_z = 0, a² + d² = 1 (|d| capped: edge-on at the silhouette would point it straight into depth)
    const r = Math.abs(Nc[2]) > 1e-6 ? -(sx * Nc[0] + sy * Nc[1]) / Nc[2] : Math.sign(sx * Nc[0] + sy * Nc[1]) * 3, rc = Math.max(-1.2, Math.min(1.2, r));
    const a = 1 / Math.hypot(1, rc), d = rc * a, u = [sx * a, sy * a, d];
    // arm camera → arm local (toCam is a rotation; its inverse is the transpose), then into the forearm's frame
    const ul = [rig.fx * u[0] - SQ_ * u[2], u[1], s_ * (SQ_ * u[0] + rig.fx * u[2])];
    const F = st['forearm.' + side].a3, vf = F.v, gf = F.g, nf = [vf[1] * gf[2] - vf[2] * gf[1], vf[2] * gf[0] - vf[0] * gf[2], vf[0] * gf[1] - vf[1] * gf[0]];
    const dt = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2], DEGr = 180 / Math.PI;
    const fW = Math.asin(Math.max(-1, Math.min(1, -dt(ul, nf)))) * DEGr, w = Math.min(1, T.lieW);
    const flex = (1 - w) * (pose.bones[fl] || 0) + w * Math.max(BONE[fl].min ?? -60, Math.min(BONE[fl].max ?? 70, fW));
    pose.bones[fl] = flex;
    // the flexion moved the hand's screen angle: re-match the deviation to the angle the reach had settled on (whatever
    // decided it: the contact scan, the planned bend mid-move, the limp wrist), starting from the closed-form bend
    const rot0 = st[ha].rot, errR = (v) => { const q = { ...pose, bones: { ...pose.bones, [ha]: v } }; return Math.abs(((rot0 - solve(q)[ha].rot + 540) % 360) - 180); };
    const cW = Math.atan2(dt(ul, gf), dt(ul, vf)) * DEGr, b0 = pose.bones[ha];
    let best = Math.max(lo, Math.min(hi, (1 - w) * b0 + w * cW)), be = errR(best) + 0.02 * Math.abs(best - b0);
    for (const dv of [6, -6, 3, -3, 1.5, -1.5, 0.75, -0.75, 0.3, -0.3]) { const v = Math.max(lo, Math.min(hi, best + dv)), e = errR(v) + 0.02 * Math.abs(v - b0); if (e < be) { be = e; best = v; } }
    pose.bones[ha] = best;
    pose._reach[side].lie = { flex, len: solve(pose)[ha].a3.len, N: Nc };
  }
  // KEEP SIZE (stop.keepSize: true): a HELD hand keeps the drawn length its contact pose gives it. Pinned to her while
  // her body moves under it (the far hand on the top of the bump as she looks up and opens her chest), the arm's 3D
  // solve turns the hand a little toward or away from the camera, and the flat-shaded hand GROWS and shrinks (mum3q v4:
  // the palm drawn at 48% → 61% → 50% of its length in a hold; Harry on mum3 v3: an arm that shrinks reads as deformed).
  // The wrist's flexion (hand bone `flex`) and deviation are searched TOGETHER for the key's length at the screen angle
  // the reach settled on, by a local pattern search from the keyed flexion (two flexions give the same length, one on
  // each side of edge-on: a global scan flipped the hand between them, 166 px in a frame).
  // KEEP PALM (stop.keepPalm: true, with keepSize): the hand also keeps the way its palm FACES (a3.ncam), the forearm's
  // pronation searched with the wrist. A hand pinned on her over a forearm seen END-ON (mum3q's top hand, the arm hanging
  // at her side): the breath lifts the shoulder ~10 px, the wrist stays on the bump, and the damped solve turns the
  // short-drawn forearm 10° in 3D; keepSize then held the hand's length and screen angle with a different palm facing, and
  // the fingers, bent over the dome toward the palm, lay 5–8° flatter than the key's (26° against the still's 35°; lesson 54)
  function keepSize(pose, side, T, lo, hi) {
    const ha = 'hand.' + side, fl = BONE[ha].flex, f0 = pose.bones[fl] || 0, d0 = pose.bones[ha] || 0, rot0 = solve(pose)[ha].rot, fmin = BONE[fl].min ?? -60, fmax = BONE[fl].max ?? 70;
    const pr = T.palm ? 'foreRot.' + side : null, r0 = pr ? pose.bones[pr] || 0 : 0, rmin = pr ? BONE[pr]?.min ?? -90 : 0, rmax = pr ? BONE[pr]?.max ?? 90 : 0;
    const E = (f, d, r) => { const h = solve({ ...pose, bones: { ...pose.bones, [fl]: f, [ha]: d, ...(pr ? { [pr]: r } : {}) } })[ha];
      return 100 * Math.abs(h.a3.len - T.len) + Math.abs(((rot0 - h.rot + 540) % 360) - 180) + 0.05 * Math.abs(f - f0) + 0.02 * Math.abs(d - d0)
        + (pr ? 60 * Math.hypot(...h.a3.ncam.map((x, c) => x - T.palm[c])) + 0.05 * Math.abs(r - r0) : 0); };
    let f = f0, d = d0, r = r0, e = E(f, d, r);
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [1, 1, 0], [-1, -1, 0], [1, -1, 0], [-1, 1, 0], ...(pr ? [[0, 0, 1], [0, 0, -1], [1, 0, 1], [-1, 0, -1], [0, 1, 1], [0, -1, -1]] : [])];
    for (const st of [4, 2, 1, 0.5, 0.25, 0.12]) for (let moved = true, k = 0; moved && k < 12; k++) {
      moved = false;
      for (const [df, dd, dr] of dirs) {
        const fn_ = Math.max(fmin, Math.min(fmax, f + st * df)), dn_ = Math.max(lo, Math.min(hi, d + st * dd)), rn_ = Math.max(rmin, Math.min(rmax, r + st * dr)), en = E(fn_, dn_, rn_);
        if (en < e - 1e-9) { e = en; f = fn_; d = dn_; r = rn_; moved = true; }
      }
    }
    pose.bones[fl] = f; pose.bones[ha] = d; if (pr) pose.bones[pr] = r;
    pose._reach[side].keepSize = { want: T.len, got: solve(pose)[ha].a3.len, flex: f, ...(pr ? { pron: r } : {}) };
  }
  function reachArm(pose, tt, side) {
    const ua = 'upperArm.' + side, fa = 'forearm.' + side, ha = 'hand.' + side;
    const st0 = solve(pose), T = reachTarget(side, tt, st0, pose), h = 0.5;
    (pose._reach ||= {})[side] = { p: T.p, z: T.z, phi: T.phi, P: T.P, u: T.u, sP: T.sP, rot: T.rot, local: T.local, m: T.m };          // diagnostics only (never drawn)
    // e.front on a contact: the hand rests on the FRONT of what it touches (seen in the reference: the hand over the
    // mouth). A contact is a few hundredths of a head deep — too fine for depth proxies to judge — so it is stated.
    pose.fx['front.' + side] = T.frontW ?? 0;
    if (T.behindW !== undefined) pose.fx['behind.' + side] = T.behindW;
    if (T.twist !== undefined) pose.bones['foreRot.' + side] = T.twist;
    const at = (b, d) => { const p = { ...pose, bones: { ...pose.bones, [b]: (pose.bones[b] || 0) + d } }; return solve(p)[ha].pos; };
    // stop.keyedArm (both ends of a move, or a hold): no 3D IK — the arm stays the keys' own (every key carries the same
    // fitted arm) and only the damped solve below carries the wrist onto the target. For a HELD hand whose drawn arm the
    // 3D model reproduces badly: mum3q's far arm coming down past her bust and round the bump (abducted 122°) — the 3D
    // pass missed its own key by 26 px, and its aim correction wandered the elbow 40 px between branches frame to frame
    if (is3(side) && T.z !== undefined && T.phi !== undefined && !T.keyedArm) {
      // 3D: the wrist target (screen + depth) in the arm's frame → 2-bone IK at the interpolated swivel → the rig's angles
      // (the representation nearest the keyed values); the 2D steps below then only correct the small rest-tilt residue
      const S_ = side === 'near' ? 'Near' : 'Far', Lb = (a, b) => Math.hypot(J[b][0] - J[a][0], J[b][1] - J[a][1]);
      const L1 = Lb('shoulder' + S_, 'elbow' + S_), L2 = Lb('elbow' + S_, 'wrist' + S_), fr = armFrame(rig, st0, side);
      const ab = 'armAbd.' + side, ar = 'armRot.' + side, keyed = { e: pose.bones[ua] || 0, al: pose.bones[ab] || 0, tau: pose.bones[ar] || 0 };
      // the drawn arm differs a little from the 3D model (each bone turns relative to its own rest angle on screen):
      // aim the 3D target, see where the drawn wrist lands, shift the aim by the miss (same depth) — 3 fixed passes
      // fx.swivelNear / fx.swivelFar (deg, keyed): turn the elbow about the shoulder→wrist line on top of the contact's own
      // swivel — the elbow stays out at her side while the torso folds under a hand held at the mouth
      const sw = (pose.fx['swivel' + S_] ?? 0) * Math.PI / 180;
      let aim = T.p.slice(), phiU = T.phi + sw;
      // ELBOW GUIDANCE (a torso-frame video path): scan the swivel for the elbow that lands nearest the measured elbow on
      // screen (36 steps round the circle + a refine), pulled weakly toward the interpolated swivel so of two mirror
      // solutions (elbow forward / back, same screen point) the one on the keyed side wins; blended in by the path's weight
      if (T.elbowP && T.elbowWt > 1e-3) {
        const W3 = fr.fromScreen(T.p, T.z), err = (ph) => { const e = fr.toScreen(ik2(W3, L1, L2, ph).el); return Math.hypot(e[0] - T.elbowP[0], e[1] - T.elbowP[1]) + 0.03 * Math.abs(wrapPi(ph - phiU)); };
        let bp = phiU, be = err(bp);
        for (let k = -17; k <= 18; k++) { const ph = phiU + k * Math.PI / 18, e = err(ph); if (e < be) { be = e; bp = ph; } }
        for (const d of [0.08, -0.08, 0.04, -0.04, 0.02, -0.02, 0.01, -0.01]) { const e = err(bp + d); if (e < be) { be = e; bp += d; } }
        phiU += T.elbowWt * wrapPi(bp - phiU);
        pose._reach[side].elbowP = T.elbowP; pose._reach[side].phiE = bp;
      }
      const keyedF = pose.bones[fa] || 0;
      for (let it = 0; it < 3; it++) {
        const sol = ik2(fr.fromScreen(aim, T.z), L1, L2, phiU), lim = (b) => [BONE[b].min ?? -180, BONE[b].max ?? 180];
        const g = armAngles(sol.el, sol.wr, L1, L2, keyed, { e: lim(ua), al: lim(ab) });
        pose.bones[ua] = g.e; pose.bones[ab] = g.al; pose.bones[ar] = g.tau; pose.bones[fa] = g.c;
        const w = solve(pose)[ha].pos; aim = [aim[0] + T.p[0] - w[0], aim[1] + T.p[1] - w[1]];
      }
      // never the MIRROR branch: where the drawn arm differs a lot from the 3D model (mum3q's far arm coming down past her
      // bust and round the bump, abducted 122°: the first pass missed by 26 px), the aim correction can carry the solve
      // across to the other elevation sign — a different drawn arm, the elbow 40 px off, flipping frame to frame (v6
      // draft: the far forearm vanished behind her at 0–2.5 s, showed at 1.6 s). Keep the keyed arm then; the damped
      // solve below finishes the wrist from it.
      if (Math.abs(keyed.e) > 20 && Math.abs(pose.bones[ua]) > 20 && Math.sign(pose.bones[ua]) !== Math.sign(keyed.e)) {
        pose.bones[ua] = keyed.e; pose.bones[ab] = keyed.al; pose.bones[ar] = keyed.tau; pose.bones[fa] = keyedF;
      }
    }
    // DAMPED least squares toward the KEYED angles: with a 3D arm a 2D wrist target has two arm solutions (elbow forward
    // or back — mirror images in depth); plain Newton can jump between them from one frame to the next (the elbow flipped
    // behind the body mid-reach). The prior keeps the solve on the keyed branch: minimise |e − JΔ|² + λ|θ + Δ − θkey|².
    const seedU = pose.bones[ua] || 0, seedF = pose.bones[fa] || 0, lam = RC.lambda ?? 4e-6;
    for (let it = 0; it < 8; it++) {                                        // fixed budget: no state, no iteration-to-tolerance drift
      const W0 = solve(pose)[ha].pos, ex = T.p[0] - W0[0], ey = T.p[1] - W0[1];
      const Wu = at(ua, h), Wf = at(fa, h);
      const a = (Wu[0] - W0[0]) / h, b = (Wu[1] - W0[1]) / h, c = (Wf[0] - W0[0]) / h, d = (Wf[1] - W0[1]) / h;   // J = [[a c],[b d]]
      const A11 = a * a + b * b + lam, A12 = a * c + b * d, A22 = c * c + d * d + lam;
      const r1 = a * ex + b * ey + lam * (seedU - (pose.bones[ua] || 0)), r2 = c * ex + d * ey + lam * (seedF - (pose.bones[fa] || 0));
      const det = A11 * A22 - A12 * A12; if (Math.abs(det) < 1e-14) break;
      let du = (A22 * r1 - A12 * r2) / det, df = (A11 * r2 - A12 * r1) / det;
      const m = Math.hypot(du, df); if (m > 20) { du *= 20 / m; df *= 20 / m; }
      pose.bones[ua] = (pose.bones[ua] || 0) + du; pose.bones[fa] = (pose.bones[fa] || 0) + df;
    }
    if (is3(side) && T.local !== undefined) {
      // 3D arm: at a contact the hand keeps its angle RELATIVE TO WHAT IT TOUCHES (the hand over the mouth turns with the
      // head as she bows into it); in flight it takes the keys' own local wrist angle. The contact angle is matched by a
      // scan over the wrist's range (the screen angle can depend weakly and non-monotonically on the wrist bend when the
      // hand turns edge-on — a secant step there flapped the hand between its limits), then one refining secant.
      const lo = BONE[ha].min ?? -50, hi = BONE[ha].max ?? 40, errAt = (v) => { const q = { ...pose, bones: { ...pose.bones, [ha]: v } }; return Math.abs(((T.rot - solve(q)[ha].rot + 540) % 360) - 180); };
      let best = T.local, be = (T.m ?? 0) >= 1 ? -1 : errAt(best);   // m = 1: the bend is given, no scan
      const rg = T.reg ?? 0.02;   // pull toward the wanted bend: where the hand is edge-on many bends give the same angle
      for (let v = lo; v <= hi + 1e-9; v += 6) { const e = errAt(v) + rg * Math.abs(v - T.local); if (e < be) { be = e; best = v; } }
      for (const dv of [3, -3, 1.5, -1.5, 0.75, -0.75, 0.35, -0.35, 0.15, -0.15]) { const v = Math.max(lo, Math.min(hi, best + dv)), e = errAt(v) + rg * Math.abs(v - T.local); if (e < be) { be = e; best = v; } }   // down to 0.15°: a 1.5° grid stepped the held hand 1–2° in one frame
      pose.bones[ha] = (1 - (T.m ?? 0)) * best + (T.m ?? 0) * T.local;
      // LIMP WRIST (move flag limp: 0…1): a hand that falls (the drop from the mouth after the nausea) hangs from the wrist —
      // fingers trailing straight down, whatever the arm does; strongest mid-move, gone at the contacts
      const mw = T.mid ?? T.m;
      if (T.limp && mw && T.limpBend !== undefined) {   // a DESIGNED limp bend (stop.limpBend): continuous by construction
        pose.bones[ha] += T.limp * mw * (T.limpBend - pose.bones[ha]);
      } else if (T.limp && mw) {
        // the fingers hang DOWN: scan the wrist bend AND the forearm's twist (the twist turns the plane the wrist bends in;
        // with the bend alone the best a back-view hand could do was point out sideways — a "wing", critic R9)
        const fr_ = 'foreRot.' + side, t0_ = pose.bones[fr_] || 0, r0 = rig.restAngle(BONE[ha]);
        const dn = (v, tw) => { const q = { ...pose, bones: { ...pose.bones, [ha]: v, [fr_]: tw } }; return Math.abs(((r0 + solve(q)[ha].rot - 90 + 540) % 360) - 180); };
        // regularised toward the path's own bend (continuous in t): where two bends hang the fingers equally well, the
        // scan must not jump between them from one frame to the next (a 118° flip in one frame, R14)
        const rgL = (v) => 0.6 * Math.abs(v - (T.local ?? v));
        let bv = pose.bones[ha], bt = t0_, bd = dn(bv, bt) + rgL(bv);
        const tl = [BONE[fr_]?.min ?? -90, BONE[fr_]?.max ?? 90];
        for (let dt = -30; dt <= 30; dt += 10) { const tw = Math.max(tl[0], Math.min(tl[1], t0_ + dt)); for (let v = lo; v <= hi + 1e-9; v += 6) { const e = dn(v, tw) + 0.4 * Math.abs(dt) + rgL(v); if (e < bd) { bd = e; bv = v; bt = tw; } } }
        pose.bones[ha] += T.limp * mw * (bv - pose.bones[ha]); pose.bones[fr_] = t0_ + T.limp * mw * (bt - t0_);
      }
      if (T.len !== undefined && BONE[ha].flex) keepSize(pose, side, T, lo, hi);
      if (T.lie && T.lieW > 1e-4 && BONE[ha].flex) lieFlat(pose, side, T, lo, hi);
      if (T.roll !== undefined && Math.abs(T.roll - 1) > 1e-4) { const sc = (pose.scale[ha] ||= [1, 1]); sc[1] *= T.roll; }
      pose._reach[side].hand = pose.bones[ha];   // the bend the solve settled on (a path move warps onto it)
      return;
    }
    for (let it = 0; it < 2; it++) {                                        // hand angle (the rig clamps it to the wrist's real range)
      const c2 = solve(pose), e0 = ((T.rot - c2[ha].rot + 540) % 360) - 180;
      const hp = { ...pose, bones: { ...pose.bones, [ha]: (pose.bones[ha] || 0) + h } }, slope = (((solve(hp)[ha].rot - c2[ha].rot) + 540) % 360 - 180) / h;
      if (Math.abs(slope) > 1e-6) pose.bones[ha] = (pose.bones[ha] || 0) + Math.max(-40, Math.min(40, e0 / slope));
    }
    if (T.m) pose.bones[ha] = (1 - T.m) * pose.bones[ha] + T.m * T.local;
    if (T.roll !== undefined && Math.abs(T.roll - 1) > 1e-4) { const sc = (pose.scale[ha] ||= [1, 1]); sc[1] *= T.roll; }
    pose._reach[side].hand = pose.bones[ha];
  }

  // FIDGET: small human life on top of the keys — a thumb stroke on the bump, fingers pressing — as smooth out-and-back
  // bumps: spec.fidget = [{t0, t1, cycles, bones: {bone: deg}}] adds deg·½(1 − cos 2π·cycles·u) over [t0, t1].
  // LANDING (spec.land = [{side, t, …}], from the reels rig, perform.js): a hand that arrives lands ONCE — it presses in
  // and the fingers spread and uncurl a little as it takes the weight (settle), then swing side to side for ~6 frames
  // (wag, 2.6 Hz decaying e^-4.5t), finger by finger from the index (stagger), and after that only breathes. Still at
  // once, a landed hand read as frozen; a press-and-release on top of the breath read as a bounce. Closed form in the time
  // since landing, so still a pure function of t. Degrees: wag (MCP flex swing), spread (fan), uncurl (PIP), press (wrist).
  // DEFAULT: every reach stop that ends a move lands (a stop with `land: false` doesn't; `land: {…}` sets its numbers);
  // spec.land entries add landings or override one at the same side and time; spec.landAuto = false turns the default off.
  const autoLand = spec.landAuto === false ? [] : Object.entries(spec.reach || {}).filter(([, a]) => Array.isArray(a))
    .flatMap(([side, a]) => a.filter((e, i) => { const prev = a.slice(0, i).filter((q) => !q.via).at(-1);   // arrives: the stop before it held another pose (a stop repeating it is a hold, then a departure)
      return prev && !e.via && e.t > 0 && e.land !== false && (prev.pose !== e.pose || prev.on !== e.on); })
      .map((e) => ({ side, t: e.t, ...(typeof e.land === 'object' ? e.land : {}) })));
  const LAND = [...autoLand.filter((A_) => !(spec.land || []).some((L) => L.side === A_.side && Math.abs(L.t - A_.t) < 0.05)), ...(spec.land || [])]
    .map((L) => ({ wag: 3, spread: 3, uncurl: 5, press: 1.5, stagger: 0.04, ...L }));
  const settleW = (l) => (l > 0 ? Math.sin(Math.min(1, l / 0.22) * Math.PI) * Math.exp(-l * 3) : 0);
  const wagW = (l) => (l > 0 ? Math.sin(2 * Math.PI * 2.6 * l) * Math.exp(-l * 4.5) : 0);
  const pressW = (l) => (l > 0 ? Math.sin(Math.min(1, l / 0.35) * Math.PI) * Math.exp(-l * 2) : 0);
  const landAt = (pose, tt) => {
    for (const L of LAND) {
      const l = tt - L.t; if (l <= 0 || l > 2.5) continue;
      const sd = C.handSides?.[L.side]; if (!sd) continue;
      for (const { prefix: p, spreadSign: ss = 1 } of [sd, sd.back].filter(Boolean)) {
        for (let i = 1; i <= 4; i++) {
          const li = l - L.stagger * (i - 1), fan = (i - 2.5) / 1.5;   // index first; the outer fingers fan the most
          pose.bones[`${p}.f${i}a`] = (pose.bones[`${p}.f${i}a`] || 0) + L.wag * wagW(li);
          pose.bones[`${p}.f${i}b`] = (pose.bones[`${p}.f${i}b`] || 0) - L.uncurl * settleW(li);
          pose.bones[`${p}.f${i}s`] = (pose.bones[`${p}.f${i}s`] || 0) + ss * fan * L.spread * settleW(li);
        }
      }
      pose.bones['hand.' + L.side] = (pose.bones['hand.' + L.side] || 0) + L.press * pressW(l);
    }
  };
  const fidgetAt = (pose, tt, sel = () => true) => {
    for (const F of spec.fidget || []) {
      let u = (tt - F.t0) / (F.t1 - F.t0); if (loop && u < 0) u = (tt + D - F.t0) / (F.t1 - F.t0);
      if (u <= 0 || u >= 1) continue;
      const w = 0.5 * (1 - Math.cos(2 * Math.PI * (F.cycles ?? 1) * u));
      for (const [b, a] of Object.entries(F.bones)) { if (!sel(b)) continue; if (b.startsWith('fx.')) pose.fx[b.slice(3)] = (pose.fx[b.slice(3)] || 0) + a * w; else pose.bones[b] = (pose.bones[b] || 0) + a * w; }   // fx.* too (a nod pulse: fx.headPitch)
    }
  };

  // CONTACT PIN (projected-plane arms): a planted hand keeps its KEYED contact on the surface it rests on while breath and
  // drift move the shoulder. The keyed wrist is carried into the frame of the bone it rests on (spec.pins.on, default the
  // belly), then ONE linear (Jacobian) step on upperArm/forearm brings the wrist there, and one more on the hand restores the
  // keyed world angle of the hand. Closed form: a fixed handful of rig evaluations per frame — no iteration, no state.
  const inv = (m) => { const d = m[0] * m[3] - m[1] * m[2]; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
  const apM = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const plantCache = {};
  const plantRef = (P) => {
    const nm = P.plant; if (!nm) return null;
    if (!lib[nm]) throw new Error(`pin plant: missing pose ${nm}`);
    return (plantCache[nm] ||= solve({ ...lib[nm], bones: { ...lib[nm].bones }, scale: { ...(lib[nm].scale || {}) } }));
  };
  function pinArm(pose, keyed, side, w, P) {
    const ua = 'upperArm.' + side, fa = 'forearm.' + side, ha = 'hand.' + side, on = P.on;
    // on 'world': the hand is planted on the floor, a worktop, a chair (the props stay put in the world: propsAt)
    const F = (S_) => (on === 'world' ? WORLD : S_[on]);
    // the contact comes from the PLANT pose when the pin names one (P.plant): the hand stays where it was put on the surface
    // while the torso keys change under it (gag, hunch, breaths); otherwise from the reference (keyed) pose itself.
    const kst = solve({ ...pose, bones: { ...pose.bones, ...keyed.bones }, scale: keyed.scale }), ref = plantRef(P) || kst, cur = solve(pose);
    if (ref !== kst && P.release) {   // optional: a plant holds only while the KEYED hand is at it (lets go as the keys lift it off)
      const a = apM(inv(F(kst).M), kst[ha].pos), b = apM(inv(F(ref).M), ref[ha].pos), [d0, d1] = P.release;
      w *= 1 - smooth01((Math.hypot(a[0] - b[0], a[1] - b[1]) - d0) / (d1 - d0));
      if (w <= 0) return;
    }
    const L0 = apM(inv(F(ref).M), ref[ha].pos), sx = pose.fx['slide.' + side + '.x'] ?? 0, sy = pose.fx['slide.' + side + '.y'] ?? 0;
    const T = apM(F(cur).M, [L0[0] + sx, L0[1] + sy]);          // planted wrist, carried with the surface (+ a stroke's slide)
    const h = 0.5, at = (b, d, P) => { const p = { ...P, bones: { ...P.bones, [b]: (P.bones[b] || 0) + d } }; return solve(p)[ha].pos; };
    const target = { ...pose, bones: { ...pose.bones } };
    for (let it = 0; it < 3; it++) {                                        // three Newton steps: a fixed cost, no state
      const W0 = solve(target)[ha].pos, ex = T[0] - W0[0], ey = T[1] - W0[1];
      if (Math.hypot(ex, ey) < 1e-5) break;
      const Wu = at(ua, h, target), Wf = at(fa, h, target);
      const J = [(Wu[0] - W0[0]) / h, (Wu[1] - W0[1]) / h, (Wf[0] - W0[0]) / h, (Wf[1] - W0[1]) / h], det = J[0] * J[3] - J[2] * J[1];
      if (Math.abs(det) < 1e-9) break;
      let du = (J[3] * ex - J[2] * ey) / det, df = (-J[1] * ex + J[0] * ey) / det;
      const m = Math.hypot(du, df); if (m > 25) { du *= 25 / m; df *= 25 / m; }
      target.bones[ua] = (target.bones[ua] || 0) + du; target.bones[fa] = (target.bones[fa] || 0) + df;
      pose.bones[ua] = (pose.bones[ua] || 0) + w * du; pose.bones[fa] = (pose.bones[fa] || 0) + w * df;
    }
    // hand: restore its keyed world angle relative to the surface (one secant step on the hand bone)
    const c2 = solve(pose), want = ref[ha].rot + (F(cur).rot - F(ref).rot), e0 = ((want - c2[ha].rot + 540) % 360) - 180;
    const hp = { ...pose, bones: { ...pose.bones, [ha]: (pose.bones[ha] || 0) + h } }, slope = (((solve(hp)[ha].rot - c2[ha].rot) + 540) % 360 - 180) / h;
    if (Math.abs(slope) > 1e-6) pose.bones[ha] = (pose.bones[ha] || 0) + w * Math.max(-20, Math.min(20, e0 / slope));
  }

  // ---- springs (closed form)
  const SP = spec.springs || {};
  const K = SP.harmonics || 24, M = SP.samples || 512;
  const headWorld = (t) => solve(basePose(t)).head.rot;
  const hairC = {}, bellyC = { amp: null }, armC = {};
  if (loop) {
    // drive signals sampled once over one period → Fourier coefficients → through each spring's H(jω)
    const th = [], bb = [], ad = Object.fromEntries(Object.keys(SP.arms || {}).map((sd) => [sd, []]));
    const armChain = (sd) => ['pelvis', 'spineLower', 'spineUpper', 'chest', 'clavicle.' + sd];
    for (let n = 0; n < M; n++) {
      const t = n * D / M, bp = basePose(t);
      th.push(solve(bp).head.rot); bb.push(bp._breathBelly);
      for (const sd of Object.keys(ad)) ad[sd].push(armChain(sd).reduce((a, b) => a + (bp.bones[b] || 0), 0));
    }
    const Th = fourier(th, K), Bb = fourier(bb, K);
    // a free arm is a PENDULUM hanging from the shoulder: gravity keeps it vertical when the torso tilts (static gain −1:
    // full counter-rotation), its inertia makes it lag and swing a little at its own frequency, damped. Same closed-form
    // spring as the hair, driven by the torso's rotation (relative to the rest pose) — no flapping on a fixed pin.
    for (const [sd, s] of Object.entries(SP.arms || {})) {
      const rest = armChain(sd).reduce((a, b) => a + (lib[s.rest]?.bones?.[b] ?? 0), 0);
      armC[sd] = fourier(ad[sd].map((v) => v - rest), K).map(([re, im], k) => {
        const [hr, hi] = springH(s.f, s.zeta, TAU * k / D, -(s.kGrav ?? 1), s.kRot === undefined ? 0 : -s.kRot);
        return [re * hr - im * hi, re * hi + im * hr];
      });
    }
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

  let footRest = null, footRef = null;
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
    for (const sd of Object.keys(armC)) pose.bones['shoulderAbd.' + sd] = (pose.bones['shoulderAbd.' + sd] || 0) + clamp01(pose.fx.armFree ?? 1) * synth(armC[sd], D, tt);   // fx.armFree: 0 while the hand holds on to something (no pendulum)
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
    // FOOT LOCK (spec.plantFeet): blending leg and pelvis angles between keys slides the feet ("skating") even when every
    // key has its feet planted. Shift the root each frame so heels and balls stay where they are at rest — one solve,
    // closed form, pure in t. (The arm contacts above ride the body, so they move with the root as they should.)
    if (spec.plantFeet && C.roles?.legs) {
      const st = solve(pose), Lg = C.roles.legs, pts = ['near', 'far'].flatMap((sd) => [[Lg[sd].foot, Lg[sd].ankle], [Lg[sd].foot, Lg[sd].ball]]);
      const now = pts.map(([b, j]) => rig.carry(st, b, j)), rest = (footRest ||= (() => { const s0 = spec.plantFeet === 'ik' ? solve(lib[spec.plantFeetRef || spec.keys[0].pose]) : solve({}); return pts.map(([b, j]) => rig.carry(s0, b, j)); })());
      const dx = rest.reduce((a, q, i) => a + q[0] - now[i][0], 0) / pts.length, dy = Math.max(...now.map((q) => q[1])) - Math.max(...rest.map((q) => q[1]));
      pose.root = [(pose.root?.[0] ?? 0) + dx, (pose.root?.[1] ?? 0) - dy];
      // plantFeet "ik": the root shift only fixes the feet on AVERAGE — when the legs bend differently (a crouch, a 3/4
      // stance) each sock still slides against the floor (critic R11: "both socks sliding inward"). Each leg then gets
      // its own two-bone solve (thigh, shin: three fixed Newton steps) bringing its ankle back to its rest spot, and the
      // foot turns back flat to its rest angle. Fixed cost, pure in t.
      if (spec.plantFeet === 'ik') {
        // the stance every foot keeps: the shot's own (spec.plantFeetRef, default its first key), not the rest drawing's
        const s0 = (footRef ||= solve(lib[spec.plantFeetRef || spec.keys[0].pose])), h = 0.5, lam = 2e-5;
        const clampB = (b, v) => Math.max(BONE[b].min ?? -180, Math.min(BONE[b].max ?? 180, v));
        for (const sd of ['near', 'far']) {
          const L_ = C.roles.legs[sd], ank = (P_) => rig.carry(solve(P_), L_.shin, L_.ankle), goal = rig.carry(s0, L_.shin, L_.ankle);
          for (let it = 0; it < 7; it++) {   // damped least squares, inside the joint limits (a knee never hyperextends to reach)
            const W0 = ank(pose), ex = goal[0] - W0[0], ey = goal[1] - W0[1]; if (Math.hypot(ex, ey) < 1e-5) break;
            // three joints for a 2D ankle: hip abduction (a sock sliding sideways), thigh and shin — Δ = Jᵀ(JJᵀ + λI)⁻¹e,
            // the abduction weighted down (w) so the knee does most of the work
            const bump = (b) => ank({ ...pose, bones: { ...pose.bones, [b]: (pose.bones[b] || 0) + h } });
            const Bs = [L_.abd, L_.thigh, L_.shin], wts = [0.35, 1, 1], Jc = Bs.map((b, k) => { const W = bump(b); return [wts[k] * (W[0] - W0[0]) / h, wts[k] * (W[1] - W0[1]) / h]; });
            const M11 = Jc.reduce((s_, j) => s_ + j[0] * j[0], 0) + lam, M12 = Jc.reduce((s_, j) => s_ + j[0] * j[1], 0), M22 = Jc.reduce((s_, j) => s_ + j[1] * j[1], 0) + lam, det = M11 * M22 - M12 * M12;
            if (Math.abs(det) < 1e-12) break;
            const y0 = (M22 * ex - M12 * ey) / det, y1 = (M11 * ey - M12 * ex) / det;
            let dl = Jc.map((j, k) => wts[k] * (j[0] * y0 + j[1] * y1)); const m = Math.hypot(...dl); if (m > 15) dl = dl.map((v) => v * 15 / m);
            Bs.forEach((b, k) => { pose.bones[b] = clampB(b, (pose.bones[b] || 0) + dl[k]); });
          }
          for (let it = 0; it < 2; it++) {   // the sole back to its angle in the stance pose
            const c0 = solve(pose)[L_.foot].rot, e0 = ((s0[L_.foot].rot - c0 + 540) % 360) - 180;
            const c1 = solve({ ...pose, bones: { ...pose.bones, [L_.foot]: (pose.bones[L_.foot] || 0) + h } })[L_.foot].rot, sl = (((c1 - c0) + 540) % 360 - 180) / h;
            if (Math.abs(sl) > 1e-6) pose.bones[L_.foot] = (pose.bones[L_.foot] || 0) + Math.max(-20, Math.min(20, e0 / sl));
          }
        }
        // spec.plantFeetSink: a weight shift tilts both legs from the ankles; a straight leg can't stretch (nor a straight
        // knee fold back), so the IK leaves both feet a few px off or into the floor (mum3 ease-sway: 3 px off at the front
        // sway, 2.5 px into it at the back one). The hips move instead, by what the foot nearest the floor still lacks, so
        // no foot goes through it (ease-sway: ankles within 0.6 px all shot). Opt-in: earlier shots keep their frames.
        if (spec.plantFeetSink) {
          const s1 = solve(pose), lift = Math.min(...['near', 'far'].map((sd) => { const L_ = C.roles.legs[sd]; return rig.carry(s0, L_.shin, L_.ankle)[1] - rig.carry(s1, L_.shin, L_.ankle)[1]; }));
          pose.root = [pose.root[0], pose.root[1] + lift];
        }
      }
    }
    return pose;
  }
  return { fps, duration: D, loop, frames: Math.round(D * fps), poseAt, basePose, breathAt, hairAt, blinkAt, phaseAt };
}
