// handlib.js — expand named hand-library poses into finger bone angles (the library is the animator's interface;
// bones are the implementation). pose.hands = { near: 'relaxed' | {pose:'cup', mix:{fist:0.3}}, far: ... }
// Library entry: { f1..f4: [MCP, PIP, DIP?], s: [spread x4, + = away from the thumb], t: [thumb MCP, IP], to: thumb opposition
// (CMC flex, moves the thenar pad), ts: thumb spread }. DIP defaults to 2/3 of PIP (the two are coupled in a real finger).
export function handBones(prefix, entry, lib, spreadSign = 1) {
  const blendOf = (e) => (typeof e === 'string' ? { [e]: 1 } : { [e.pose]: 1 - Object.values(e.mix || {}).reduce((a, b) => a + b, 0), ...(e.mix || {}) });
  const w = blendOf(entry), out = {};
  const acc = (k, v) => { out[k] = (out[k] || 0) + v; };
  for (const [name, k] of Object.entries(w)) {
    const L = lib[name];
    if (!L) throw new Error(`hand library: no pose "${name}"`);
    for (let i = 1; i <= 4; i++) {
      const fv = L['f' + i];
      acc(`${prefix}.f${i}a`, k * fv[0]); acc(`${prefix}.f${i}b`, k * fv[1]); acc(`${prefix}.f${i}c`, k * (fv[2] ?? Math.round(fv[1] * 0.67)));
      acc(`${prefix}.f${i}s`, k * spreadSign * (L.s?.[i - 1] || 0));
    }
    acc(`${prefix}.t1`, k * L.t[0]); acc(`${prefix}.t2`, k * L.t[1]); acc(`${prefix}.t0`, k * (L.to || 0)); acc(`${prefix}.ts`, k * spreadSign * -(L.ts || 0));
  }
  return out;
}
/** copy of pose with pose.hands expanded into pose.bones (explicit bone values win).
 *  sides: { near: {prefix:'hand.near', spreadSign}, far: {...} } — from the character (C.handSides) */
export function expandHands(pose, lib, sides) {
  if (!pose.hands || !lib) return pose;
  const bones = {};
  for (const [side, sd0] of Object.entries(sides || {})) {
    // a view SWAP shows one of two drawings of the same hand: expand the shape into BOTH, so a swap timed independently
    // of the keys (anim spec.swaps) never shows a drawing whose fingers were left at zero
    if (pose.hands[side]) for (const sd of [sd0, sd0.back].filter(Boolean)) Object.assign(bones, handBones(sd.prefix, pose.hands[side], lib, sd.spreadSign));
  }
  return { ...pose, bones: { ...bones, ...(pose.bones || {}) } };
}
