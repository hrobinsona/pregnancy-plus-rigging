// props.js — the simple furniture a side-on pose needs (the side-on library: sitting on a chair or a birth ball, leaning
// on a kitchen counter, holding a chair's back to squat, picking a toy up): drawn flat in the style (one fill per face, the
// far legs a step darker and set back a little, as the reference stills draw them), in posed space. The character places
// each one from her POSED body (parts/props.js: the seat under her buttocks, the ball's top at her seat, the counter's top
// under her forearms), so a pose carries its props with it and a move can't leave her floating over a chair. Each prop
// also says where cloth can rest on it (engine/drape.js floors and supports): she sits on her skirt.
// Pure functions of their arguments; H units, y down, the floor at y = 0, facing right.
import { loop, ellipse } from './geom.js';
import { ensureCW } from './hand.js';

export const WOOD = { face: '#c98d5c', side: '#ad7446', far: '#9c663c' };
const rect = (x0, y0, x1, y1, r = 0.025) => ensureCW(loop([
  [x0 + r, y0, { a: 0 }], [x1 - r, y0, { a: 0 }], [x1, y0 + r, { a: 90 }], [x1, y1 - r, { a: 90 }],
  [x1 - r, y1, { a: 180 }], [x0 + r, y1, { a: 180 }], [x0, y1 - r, { a: 270 }], [x0, y0 + r, { a: 270 }]], 0.9));
// a slightly tapered post (a chair leg, a backrest stile) from a (top) to b (bottom), widths wa → wb
const post = (a, b, wa, wb) => ensureCW(loop([
  [a[0] - wa / 2, a[1], { c: true }], [a[0] + wa / 2, a[1], { c: true }], [b[0] + wb / 2, b[1], { c: true }], [b[0] - wb / 2, b[1], { c: true }]]));

/** A wooden side chair seen from the side, its backrest at x0 (sitting on it she faces away from the backrest; squatting
 *  she holds its top with the chair in front of her). o = {seatY (top of the seat), x0 (the backrest's edge), x1 (the
 *  front edge), backTop (top of the backrest), depth: [dx, dy] where the far legs show (a ¾ hint, default [0.13, -0.07])} */
export function chair(o, z = 4) {
  const { seatY, x0, x1, backTop } = o, [dx, dy] = o.depth || [0.13, -0.07], th = 0.11, lw = 0.085, parts = [];
  const bx = x0 + lw / 2, lean = -0.1;
  // far legs and far backrest stile (behind, darker)
  for (const x of [x0 + lw / 2, x1 - lw / 2]) parts.push({ id: `prop.chair.farleg${parts.length}`, z: z - 0.4, fill: WOOD.far, geom: post([x + dx, seatY + th + dy], [x + dx, dy * 0.4], lw, lw * 0.85) });
  parts.push({ id: 'prop.chair.farback', z: z - 0.4, fill: WOOD.far, geom: post([bx + lean + dx, backTop + dy], [bx + dx, seatY + dy], lw * 0.9, lw) });
  // the rail between the legs, the seat (its top seen a little from above, then its edge), near legs, near stile, top slat
  parts.push({ id: 'prop.chair.rail', z: z - 0.2, fill: WOOD.side, geom: rect(x0 + lw / 2, seatY * 0.42 - 0.03, x1 - lw / 2, seatY * 0.42 + 0.03, 0.01) });
  parts.push({ id: 'prop.chair.seattop', z: z - 0.1, fill: WOOD.face, geom: rect(x0 - 0.02 + dx * 0.3, seatY + dy, x1 + 0.02 + dx * 0.3, seatY + 0.04, 0.02) });
  parts.push({ id: 'prop.chair.seat', z, fill: WOOD.side, geom: rect(x0 - 0.02, seatY, x1 + 0.02, seatY + th, 0.02) });
  for (const [i, x] of [x0 + lw / 2, x1 - lw / 2].entries()) parts.push({ id: `prop.chair.leg${i}`, z: z + 0.1, fill: WOOD.face, geom: post([x, seatY + th], [x, 0], lw, lw * 0.85) });
  parts.push({ id: 'prop.chair.back', z: z + 0.1, fill: WOOD.face, geom: post([bx + lean, backTop], [bx, seatY], lw * 0.95, lw) });
  parts.push({ id: 'prop.chair.slat', z: z + 0.05, fill: WOOD.side, geom: rect(bx + lean - lw * 0.55, backTop + 0.06, bx + lw * 0.55, backTop + 0.42, 0.03) });
  return { parts, floors: [[x0 - 0.05, x1 + 0.05, seatY]], cloth: [] };
}

/** A birth ball resting on the floor, its top at topY, centred at x. Flat, like the stills' balls. She sits on her skirt
 *  on it: the cloth stops where it meets the ball's top (a short floor there), it doesn't slide down its side. */
export function ball(o, z = 4) {
  const r = -o.topY / 2, c = [o.x, -r];
  return { parts: [{ id: 'prop.ball', z, fill: o.fill || '#a9cdec', geom: ensureCW(ellipse(c, r, r)) }],
    floors: [[c[0] - 0.75 * r, c[0] + 0.75 * r, o.topY + 0.12 * r]], cloth: [] };
}

/** A kitchen counter: its front face at x0, its worktop at topY, running off to the right. */
export function counter(o, z = 4) {
  const { x0, topY } = o, x1 = x0 + 4, slab = 0.13;
  return { parts: [
    { id: 'prop.counter', z, fill: o.fill || '#ebe4da', geom: rect(x0, topY + slab, x1, 0, 0.01) },
    { id: 'prop.counter.plinth', z: z + 0.05, fill: o.plinth || '#d9d0c4', geom: rect(x0 + 0.1, -0.22, x1, 0, 0.005) },
    { id: 'prop.counter.top', z: z + 0.1, fill: o.top || '#cdbfae', geom: rect(x0 - 0.07, topY, x1, topY + slab, 0.03) },
  ], floors: [[x0 - 0.07, x1, topY]], cloth: [] };
}

/** A small toy ball on the floor at x (something to pick up), or at y in her hand (held). */
export function toy(o, z = 4) {
  const r = o.r ?? 0.2, y = o.y ?? -r, zz = o.held ? 55.52 : z;   // (held: over her palm, under her fingers: they close round it)
  return { parts: [
    { id: 'prop.toy', z: zz, fill: o.fill || '#f2b134', geom: ensureCW(ellipse([o.x, y], r, r)) },
    { id: 'prop.toy.band', z: zz + 0.05, fill: o.band || '#e8873a', geom: ensureCW(loop([[o.x - r * 0.96, y - r * 0.25, { a: 70 }], [o.x - r * 0.3, y + r * 0.95, { a: 0 }], [o.x + r * 0.5, y + r * 0.8, { a: -40 }], [o.x - r * 0.1, y, { a: 200 }]])) },
  ], floors: [], cloth: [] };
}

export const PROPS = { chair, ball, counter, toy };
