// hands.js — cut-out hands on the hand bones. Every hand shape variant has 18 anchors (start wrist-top, clockwise),
// so shapes can morph point-to-point. Rest pose uses 'cupping-belly'. Anchor counts:
//   hand.near 18 · hand.far 18 · forearm.*.skin 9 · hand.*.finger.1-3 10 (round, tapered) · hand.near.thumb 4
import { part, lp, st } from './_util.js';

export const ANCHORS = { 'hand.near': 18, 'hand.far': 18, 'hand.near.thumb': 4, 'forearm.far.skin': 9, 'forearm.near.skin': 9,
  'hand.near.finger.1': 10, 'hand.near.finger.2': 10, 'hand.near.finger.3': 10,
  'hand.far.finger.1': 10, 'hand.far.finger.2': 10, 'hand.far.finger.3': 10 };

export function build({ P, prop, pose }) {
  const out = [];
  for (const side of ['far', 'near']) {
    const hs = prop.hands[side];
    const shapeName = pose.hands?.[side] || 'cupping-belly';
    const z = side === 'near' ? 58.6 : 50;   // both hands sit in front of their sleeves
    if (hs.forearm) out.push(part(`forearm.${side}.skin`, 'forearm.' + side, z - 0.5, P.skin, lp(hs.forearm)));
    out.push(part('hand.' + side, 'hand.' + side, z, P.skin, lp(hs[shapeName])));
    hs.fingers.forEach((f, i) => out.push(part(`hand.${side}.finger.${i + 1}`, 'hand.' + side, z + 0.2, P.skinLine, st(f, 'round'))));
    if (hs.thumb) out.push(part(`hand.${side}.thumb`, 'hand.' + side, z + 0.2, P.skinLine, st(hs.thumb)));
  }
  return out;
}
