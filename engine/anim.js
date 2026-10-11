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
export function makeAnim(spec, lib, { rig, C } = {}) {
  if (!rig || !C) throw new Error('makeAnim(spec, lib, { rig, C }): the rig and character are required');
  const solve = rig.solve, J = C.joints, BONE = rig.BONE;
  const fps = spec.fps, D = spec.duration, loop = !!spec.loop;
  const wrapT = (t) => (loop ? ((t % D) + D) % D : t);
  // key lists: the main pose track (spec.keys) plus optional channel-group tracks (spec.tracks, e.g. {"face": [...]})
  // that own every channel under their prefix — so the eyes can be keyed on their own timing.
  // key.kind "breakdown": the curve passes THROUGH it (Catmull-Rom tangent, cubic Hermite in angle space) instead of
  // stopping on it, so a move can travel a different path out and back without a hitch.
  const buildKeys = (arr, raw) => {
    for (const k of arr) if (!lib[k.pose]) throw new Error(`missing pose ${k.pose}`);
    const ks = arr.map((k) => ({ ...k, ch: raw ? flattenRaw(lib[k.pose]) : flatten(lib[k.pose]), ease: easeFn(k.ease) }));
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
    ks = ks.filter((k) => !k.only || k.only.some((p) => ch === p || ch.startsWith(p + '.')));
    keyCache.set(ch, ks);
    return ks;
  };
  const allCh = [...new Set([...keys.flatMap((k) => Object.keys(k.ch)),
    ...groups.flatMap((g) => g.keys.flatMap((k) => Object.keys(k.ch)).filter((ch) => owns(g, ch)))])];
  const lagOf = (ch) => {
    const m = ch.match(/^(?:bone|scale)\.(.+?)(?:\.[01])?$/);
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
    for (const ch of allCh) {
      const val = sample(ch, tt - lagOf(ch), keysFor(ch));
      const [kind, a, b] = ch.split('.');
      if (kind === 'bone') pose.bones[ch.slice(5)] = val;
      else if (kind === 'scale') { const id = ch.slice(6, -2), ix = +ch.slice(-1); (pose.scale[id] ||= [1, 1])[ix] = val; }
      else if (kind === 'face') (pose.face[a] ||= {})[b] = val;
      else if (kind === 'fx') pose.fx[a] = val;
      else if (kind === 'root') (pose.root ||= [0, 0])[+a] = val;
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
  function contact(st, side, e) {
    const ref = reachRef(e.pose), ha = 'hand.' + side, on = e.on;
    return { p: apM(st[on].M, apM(inv(ref[on].M), ref[ha].pos)), rot: st[on].rot + (ref[ha].rot - ref[on].rot) };
  }
  function reachTarget(side, tt, st) {
    const L = RC[side];
    let i = -1; for (let k = 0; k < L.length; k++) if (L[k].t <= tt + 1e-9) i = k;
    let a, b, ta, tb;
    if (i >= 0 && i < L.length - 1) { a = L[i]; b = L[i + 1]; ta = a.t; tb = b.t; }
    else if (loop) { a = L[(i + L.length) % L.length]; b = L[(i + 1) % L.length]; ta = i < 0 ? a.t - D : a.t; tb = i < 0 ? b.t : b.t + D; }
    else { const e = L[Math.max(0, i)]; const c = contact(st, side, e); return c; }
    const A = contact(st, side, a);
    if (a.pose === b.pose && a.on === b.on) return A;                     // a hold: the hand stays where it was put
    const B = contact(st, side, b), u = (tt - ta) / (tb - ta), sP = mj(u);
    const d = [B.p[0] - A.p[0], B.p[1] - A.p[1]], Ld = Math.hypot(d[0], d[1]) || 1, n = [d[1] / Ld, -d[0] / Ld];
    const bow = (b.curve ?? 0.08) * Ld * 4 * sP * (1 - sP);
    const p = [A.p[0] + sP * d[0] + n[0] * bow, A.p[1] + sP * d[1] + n[1] * bow];
    const sH = mj(u - (b.handLag ?? 2) / fps / (tb - ta));
    return { p, rot: A.rot + sH * (((B.rot - A.rot + 540) % 360) - 180) };
  }
  function reachArm(pose, tt, side) {
    const ua = 'upperArm.' + side, fa = 'forearm.' + side, ha = 'hand.' + side;
    const T = reachTarget(side, tt, solve(pose)), h = 0.5;
    const at = (b, d) => { const p = { ...pose, bones: { ...pose.bones, [b]: (pose.bones[b] || 0) + d } }; return solve(p)[ha].pos; };
    for (let it = 0; it < 6; it++) {                                        // fixed Newton budget: no state, no iteration-to-tolerance drift
      const W0 = solve(pose)[ha].pos, ex = T.p[0] - W0[0], ey = T.p[1] - W0[1];
      if (Math.hypot(ex, ey) < 1e-6) break;
      const Wu = at(ua, h), Wf = at(fa, h);
      const Jm = [(Wu[0] - W0[0]) / h, (Wu[1] - W0[1]) / h, (Wf[0] - W0[0]) / h, (Wf[1] - W0[1]) / h], det = Jm[0] * Jm[3] - Jm[2] * Jm[1];
      if (Math.abs(det) < 1e-9) break;
      let du = (Jm[3] * ex - Jm[2] * ey) / det, df = (-Jm[1] * ex + Jm[0] * ey) / det;
      const m = Math.hypot(du, df); if (m > 30) { du *= 30 / m; df *= 30 / m; }
      pose.bones[ua] = (pose.bones[ua] || 0) + du; pose.bones[fa] = (pose.bones[fa] || 0) + df;
    }
    for (let it = 0; it < 2; it++) {                                        // hand angle (the rig clamps it to the wrist's real range)
      const c2 = solve(pose), e0 = ((T.rot - c2[ha].rot + 540) % 360) - 180;
      const hp = { ...pose, bones: { ...pose.bones, [ha]: (pose.bones[ha] || 0) + h } }, slope = (((solve(hp)[ha].rot - c2[ha].rot) + 540) % 360 - 180) / h;
      if (Math.abs(slope) > 1e-6) pose.bones[ha] = (pose.bones[ha] || 0) + Math.max(-40, Math.min(40, e0 / slope));
    }
  }

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
    // the contact comes from the PLANT pose when the pin names one (P.plant): the hand stays where it was put on the surface
    // while the torso keys change under it (gag, hunch, breaths); otherwise from the reference (keyed) pose itself.
    const kst = solve({ ...pose, bones: { ...pose.bones, ...keyed.bones }, scale: keyed.scale }), ref = plantRef(P) || kst, cur = solve(pose);
    if (ref !== kst && P.release) {   // optional: a plant holds only while the KEYED hand is at it (lets go as the keys lift it off)
      const a = apM(inv(kst[on].M), kst[ha].pos), b = apM(inv(ref[on].M), ref[ha].pos), [d0, d1] = P.release;
      w *= 1 - smooth01((Math.hypot(a[0] - b[0], a[1] - b[1]) - d0) / (d1 - d0));
      if (w <= 0) return;
    }
    const T = apM(cur[on].M, apM(inv(ref[on].M), ref[ha].pos));          // planted wrist, carried with the surface
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
    const c2 = solve(pose), want = ref[ha].rot + (cur[on].rot - ref[on].rot), e0 = ((want - c2[ha].rot + 540) % 360) - 180;
    const hp = { ...pose, bones: { ...pose.bones, [ha]: (pose.bones[ha] || 0) + h } }, slope = (((solve(hp)[ha].rot - c2[ha].rot) + 540) % 360 - 180) / h;
    if (Math.abs(slope) > 1e-6) pose.bones[ha] = (pose.bones[ha] || 0) + w * Math.max(-20, Math.min(20, e0 / slope));
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
