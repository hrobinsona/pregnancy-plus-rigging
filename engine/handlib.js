// handlib.js — expand named hand-library poses into finger bone angles (the library is the animator's interface;
// bones are the implementation). pose.hands = { near: 'relaxed' | {pose:'cup', mix:{fist:0.3}}, far: ... }
export function handBones(prefix, entry, lib) {
  const blendOf = (e) => (typeof e === 'string' ? { [e]: 1 } : { [e.pose]: 1 - Object.values(e.mix || {}).reduce((a, b) => a + b, 0), ...(e.mix || {}) });
  const w = blendOf(entry), out = {};
  for (const [name, k] of Object.entries(w)) {
    const L = lib[name];
    if (!L) throw new Error(`hand library: no pose "${name}"`);
    for (let i = 1; i <= 4; i++) { out[`${prefix}.f${i}a`] = (out[`${prefix}.f${i}a`] || 0) + k * L['f' + i][0]; out[`${prefix}.f${i}b`] = (out[`${prefix}.f${i}b`] || 0) + k * L['f' + i][1]; }
    out[`${prefix}.t1`] = (out[`${prefix}.t1`] || 0) + k * L.t[0]; out[`${prefix}.t2`] = (out[`${prefix}.t2`] || 0) + k * L.t[1];
  }
  return out;
}
/** returns a copy of pose with pose.hands expanded into pose.bones (explicit bone values win) */
export function expandHands(pose, lib, sides = { near: 'hand.near', far: 'hand.far' }) {
  if (!pose.hands) return pose;
  const bones = {};
  for (const [side, prefix] of Object.entries(sides)) if (pose.hands[side] && lib) Object.assign(bones, handBones(prefix, pose.hands[side], lib));
  return { ...pose, bones: { ...bones, ...(pose.bones || {}) } };
}
