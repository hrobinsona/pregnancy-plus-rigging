// legs.js — thigh/shin/foot chains. Far leg z 20-27, near leg z 30-37. Anchor counts (per side):
//   leg.*.thigh 12/15 · leg.*.kneeWedge 5 · leg.*.shin 12 · leg.*.cuff 7 · leg.*.cuffShade 4
//   leg.*.ankle 4 · leg.*.sock 13 · leg.*.rib.1-4 8 (round caps) · leg.near.thighEdge 10
import { part, lp, st } from './_util.js';

export const ANCHORS = { 'leg.far.thigh': 12, 'leg.near.thigh': 15, 'leg.near.thighEdge': 10 };
for (const s of ['far', 'near']) {
  Object.assign(ANCHORS, { [`leg.${s}.kneeWedge`]: 5, [`leg.${s}.shin`]: 12, [`leg.${s}.cuff`]: 7, [`leg.${s}.cuffShade`]: 4,
    [`leg.${s}.ankle`]: 4, [`leg.${s}.sock`]: 13 });
  for (let i = 1; i <= 4; i++) ANCHORS[`leg.${s}.rib.${i}`] = 8;
}

export function build({ P, prop }) {
  const out = [];
  for (const s of ['far', 'near']) {
    const L = prop.legs[s], z = s === 'far' ? 20 : 30;
    out.push(
      part(`leg.${s}.ankle`, 'foot.' + s, z, P.skin, lp(L.ankle)),
      part(`leg.${s}.sock`, 'foot.' + s, z + 1, P.accent, lp(L.sock)),
      ...L.ribs.map((r, i) => part(`leg.${s}.rib.${i + 1}`, 'foot.' + s, z + 2, P.accentShade, st(r, 'round'))),
      part(`leg.${s}.cuff`, 'shin.' + s, z + 3, P.garment, lp(L.cuff)),
      part(`leg.${s}.shin`, 'shin.' + s, z + 4, P.garment, lp(L.shin)),
      part(`leg.${s}.cuffShade`, 'shin.' + s, z + 5, P.garmentShade, st(L.cuffShade)),
      part(`leg.${s}.thigh`, 'thigh.' + s, z + 6, P.garment, lp(L.thigh)),
      part(`leg.${s}.kneeWedge`, 'thigh.' + s, z + 7, P.garmentShade, lp(L.kneeWedge)),
    );
    if (L.thighEdge) out.push(part(`leg.${s}.thighEdge`, 'thigh.' + s, z + 7, P.garmentShade, st(L.thighEdge)));
  }
  return out;
}
