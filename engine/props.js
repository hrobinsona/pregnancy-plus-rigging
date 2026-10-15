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
 *  front edge), backTop (top of the backrest), depth: [dx, dy] where the far legs show (a ¾ hint, default [0.06, -0.06])}
 *  Drawn as the stills draw a kitchen chair (critic R3: "the crest a block on one post", "thin dead-vertical rods", "the
 *  seat too deep"): stout posts, the legs splaying a little to the floor, the backrest leaning back, its CREST RAIL a band
 *  across from the near stile to the far one, the seat's top a thin lit strip. */
export function chair(o, z = 4) {
  // (the far legs only just showing: offset 0.16 H, the far front leg stood clear of the seat's end with the seat's top
  // skewed out to it, round 4 "the chair's far front leg stands off the seat's end")
  const { seatY, x0, x1, backTop } = o, [dx, dy] = o.depth || [0.06, -0.06], th = 0.1, lw = 0.12, sp = 0.07, parts = [];
  const bx = x0 + lw / 2, lean = -0.17, crest = 0.4;
  // far legs and far backrest stile (behind, darker)
  parts.push({ id: 'prop.chair.farleg0', z: z - 0.4, fill: WOOD.far, geom: post([bx + dx, seatY + th + dy], [bx - sp + dx, dy * 0.4], lw * 0.9, lw * 0.8) });
  parts.push({ id: 'prop.chair.farleg1', z: z - 0.4, fill: WOOD.far, geom: post([x1 - lw / 2 + dx, seatY + th + dy], [x1 - lw / 2 + sp + dx, dy * 0.4], lw * 0.9, lw * 0.8) });
  parts.push({ id: 'prop.chair.farback', z: z - 0.4, fill: WOOD.far, geom: post([bx + lean + dx, backTop + dy], [bx + dx, seatY + dy], lw * 0.9, lw * 0.9) });
  // the stretcher between the legs, the seat (its top a thin strip seen a little from above, then its edge), near legs
  parts.push({ id: 'prop.chair.rail', z: z - 0.2, fill: WOOD.side, geom: rect(bx - sp * 0.55, seatY * 0.42 - 0.035, x1 - lw / 2 + sp * 0.55, seatY * 0.42 + 0.035, 0.01) });
  parts.push({ id: 'prop.chair.seattop', z: z - 0.1, fill: WOOD.face, geom: ensureCW(loop([[x0 - 0.02, seatY + 0.03, { c: true }], [x0 - 0.02 + dx, seatY + dy, { c: true }],
    [x1 + 0.02 + dx, seatY + dy, { c: true }], [x1 + 0.02, seatY + 0.03, { c: true }]], 0.9)) });
  parts.push({ id: 'prop.chair.seat', z, fill: WOOD.side, geom: rect(x0 - 0.02, seatY, x1 + 0.02, seatY + th, 0.02) });
  parts.push({ id: 'prop.chair.leg0', z: z + 0.1, fill: WOOD.face, geom: post([bx, seatY + th], [bx - sp, 0], lw, lw * 0.85) });
  parts.push({ id: 'prop.chair.leg1', z: z + 0.1, fill: WOOD.face, geom: post([x1 - lw / 2, seatY + th], [x1 - lw / 2 + sp, 0], lw, lw * 0.85) });
  parts.push({ id: 'prop.chair.back', z: z + 0.1, fill: WOOD.face, geom: post([bx + lean, backTop], [bx, seatY], lw, lw) });
  // the crest rail: a band across the top of the backrest from the near stile to the far one (seen end on, the rail alone
  // read as a knob on one post), leaning with the stiles
  const t0 = [bx + lean - lw / 2, backTop], t1 = [bx + lean + dx + lw / 2, backTop + dy], dl = lean * crest / (seatY - backTop);
  parts.push({ id: 'prop.chair.slat', z: z + 0.15, fill: WOOD.face, geom: ensureCW(loop([[...t0, { c: true }], [...t1, { c: true }], [t1[0] - dl, t1[1] + crest, { c: true }], [t0[0] - dl, t0[1] + crest, { c: true }]], 0.9)) });
  parts.push({ id: 'prop.chair.slatedge', z: z + 0.16, fill: WOOD.side, geom: ensureCW(loop([[t0[0] - dl, t0[1] + crest - 0.06, { c: true }], [t1[0] - dl, t1[1] + crest - 0.06, { c: true }], [t1[0] - dl, t1[1] + crest, { c: true }], [t0[0] - dl, t0[1] + crest, { c: true }]], 0.9)) });
  return { parts, floors: [[x0 - 0.05, x1 + 0.05, seatY]], cloth: [] };
}

/** A birth ball resting on the floor, its top at topY, centred at x. Flat, like the stills' balls. She sits on her skirt
 *  on it: the cloth stops where it meets the ball's top (a short floor there), it doesn't slide down its side. Her weight
 *  squashes it a touch (o.squash, default 0.04: as tall as her seat, 4% wider; at 0.12 it read as an egg, critic R3) */
// (the floor under her is the ball's CROWN, not a line: 13 short floors on its arc, sunk o.sink of r into it, so her seat
// and her skirt settle into its round (the still: the seat sunk in, the skirt's edge following the ball down at the back
// and the front); on one level line the seat sat flat on a shelf, "a balloon on a ball", round 6)
export function ball(o, z = 4) {
  const r = -o.topY / 2, c = [o.x, -r], sq = o.squash ?? 0.04, rr = r * (1 - (o.sink ?? 0.12)), n = 13, w = 0.8 * r;
  const floors = Array.from({ length: n }, (_, i) => { const x0 = c[0] - w + (2 * w * i) / n, x1 = x0 + (2 * w) / n, xm = (x0 + x1) / 2 - c[0];
    return [x0, x1, c[1] - Math.sqrt(Math.max(0, rr * rr - xm * xm))]; });
  return { parts: [{ id: 'prop.ball', z, fill: o.fill || '#a9cdec', geom: ensureCW(ellipse(c, r * (1 + sq), r)) }], floors, cloth: [] };
}

/** A kitchen counter: its front face at x0, its worktop at topY, one unit deep (o.w, default 1.95 H: a counter run seen
 *  end on; at 4 H it read as a wall, critic R1 "twice the still's width"; 2.2 still 0.3 H wider than the still's), the
 *  worktop slab overhanging both faces (0.19 H thick as the still draws it; 0.13 read as a thin board, critic R3). */
export function counter(o, z = 4) {
  const { x0, topY } = o, x1 = x0 + (o.w ?? 1.95), slab = 0.19;
  return { parts: [
    { id: 'prop.counter', z, fill: o.fill || '#ebe4da', geom: rect(x0, topY + slab, x1, 0, 0.01) },
    { id: 'prop.counter.plinth', z: z + 0.05, fill: o.plinth || '#d9d0c4', geom: rect(x0 + 0.1, -0.22, x1, 0, 0.005) },
    { id: 'prop.counter.top', z: z + 0.1, fill: o.top || '#cdbfae', geom: rect(x0 - 0.09, topY, x1 + 0.09, topY + slab, 0.03) },
  ], floors: [[x0 - 0.09, x1 + 0.09, topY]], cloth: [] };
}

/** A small toy ball on the floor at x (something to pick up), or at y in her hand (held). */
export function toy(o, z = 4) {
  // (held: under her whole hand, the palm on its crown, the fingers curling over it; o.near: on the floor on her near side,
  // beside her near foot where her near hand picks it up: in front of her near leg, behind her near arm)
  const r = o.r ?? 0.2, y = o.y ?? (o.near ? 0.05 - r : -r), zz = o.held ? 55.45 : o.near ? 30.8 : z;   // (near: a step nearer us, so a little lower)
  return { parts: [
    { id: 'prop.toy', z: zz, fill: o.fill || '#f2b134', geom: ensureCW(ellipse([o.x, y], r, r)) },
    { id: 'prop.toy.band', z: zz + 0.05, fill: o.band || '#e8873a', geom: ensureCW(loop([[o.x - r * 0.96, y - r * 0.25, { a: 70 }], [o.x - r * 0.3, y + r * 0.95, { a: 0 }], [o.x + r * 0.5, y + r * 0.8, { a: -40 }], [o.x - r * 0.1, y, { a: 200 }]])) },
  ], floors: [], cloth: [] };
}

export const PROPS = { chair, ball, counter, toy };
