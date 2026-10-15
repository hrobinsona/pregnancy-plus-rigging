// props.js — mum3's props, placed from her POSED body (engine/props.js draws them): a pose names them in pose.props.items
// (chair, ball, counter, toy; a chair with back: 1 is in front of her and she holds its back; a toy with held: 1 is in
// her near hand) and may pin any number (seatY, x0, x1, topY, x, ...); the rest follows her: the seat under her buttocks, the ball's top at
// her seat, the worktop under her forearms, the chair's back under her hand. Built in postBuild before the skirt, which
// rests on them.
import { PROPS } from '../../../engine/props.js';
import { seatPts } from './skirt.js';
import { ap } from '../../../engine/geom.js';

export function propsFor(parts, ctx) {
  const items = ctx.pose?.props?.items || [], out = { parts: [], floors: [], cloth: [] };
  if (!items.length) return out;
  const { st, C: char } = ctx, M = parts.find((p) => p.id === 'dress').M, seat = seatPts(ctx), J = char.joints;
  const seatBot = Math.max(...seat.map((q) => q[1])) + 0.02, seatBack = Math.min(...seat.map((q) => q[0])), seatMid = seat.reduce((a, q) => a + q[0], 0) / seat.length;
  const wrist = st['hand.near'].pos, elbow = st['forearm.near'].pos;
  for (const it of items) {
    let o;
    if (it.type === 'chair' && (it.back ?? -1) < 0) o = { seatY: seatBot, x0: seatBack - 0.1, back: -1, ...it };
    else if (it.type === 'chair') {   // in front of her: she holds its back, the top rail under her palm (not at her wrist: the hands hung past it)
      const pts = parts.filter((p) => /^hand\.near\.(palm|hypo|thenar)$/.test(p.id)).flatMap((p) => p.geom.P.map((q) => ap(p.M, q)));
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, lo = Math.max(...pts.map((q) => q[1]));
      // the stile's top (x0 − 0.11: it leans back toward her) just behind the KNUCKLES, so the palm sits on the top and the
      // fingers wrap over its front: under the palm's centroid (its thenar near the wrist) the post stood under her wrist
      // and the fingers hung past it in the air, "paws on a stick" (side-on round 8, every lens)
      const kn = [1, 2, 3, 4].map((i) => st[`hand.near.f${i}a`]?.pos).filter(Boolean), kx = kn.length ? kn.reduce((a, q) => a + q[0], 0) / kn.length : cx + 0.11;
      // The rail's far edge just past the knuckles (x0 + 0.01: the fingers go over it and down its far face; at + 0.06 they
      // hung down its near face), its top at the PALM'S UNDERSIDE over the rail (the palm's lowest point is its heel by the
      // wrist, and the rail stood 0.03 H under the hand, round 9)
      const rx0 = kx + 0.01 - 0.11, over = pts.filter((q) => Math.abs(q[0] - (rx0 + 0.04)) < 0.035);
      const top = over.length ? Math.max(...over.map((q) => q[1])) - 0.012 : lo - 0.02;
      o = { seatY: -1.85, x0: kx + 0.01, back: 1, backTop: top, ...it };   // (the stile's top, leaning 0.1 back toward her, under the palm's centre; the seat a kitchen chair's ≈ 45 cm: at 2.05 H it read as a bar stool, round 4)
    }
    else if (it.type === 'ball') {   // a birth ball as big as a real one (≈ 65 cm: r ≈ 1.35 H), she sits ON its crown (the
      // still; 0.35 r in front of it she perched on its front edge, critic R1 "the ball is behind her"): the centre 0.1 r
      // behind her seat, the surface under her seat at her seat's height
      // (her seat SINKS into it, sink H: the still's ball top stands 0.24 H above her seat's bottom; resting on its top the
      // ball drew ~15 % small and her seat sat on it like a shelf, round 6)
      const sink = it.sink ?? 0.2, r = (-seatBot + sink) / (1 + Math.sqrt(1 - 0.1 ** 2));
      o = { x: seatMid - 0.1 * r, topY: -2 * r, ...it, sink: sink / r };
    }
    else if (it.type === 'counter') {   // under her forearms, its front face clear of her bump (not through it)
      // (the worktop at the forearm's drawn UNDERSIDE, from the elbow on, and the palm's: 0.08 H under the joints the
      // forearm sank 15 px into the slab, round 4; the front face 0.16 H ahead of the bump: at 0.06 it nearly touched,
      // the still leaves 30–40 px, a hand's breadth)
      const under = parts.filter((p) => p.id === 'arm.near' || p.id === 'hand.near.palm').flatMap((p) => p.geom.P.map((q) => ap(p.M, q))).filter((q) => q[0] >= elbow[0] - 0.02);
      const topY = under.length ? Math.max(...under.map((q) => q[1])) + 0.005 : Math.max(elbow[1], wrist[1]) + 0.08;
      const body = parts.filter((p) => p.id === 'dress' || p.id === 'dress.skirt').flatMap((p) => p.geom.P.map((q) => ap(p.M, q))).filter((q) => q[1] > topY);
      o = { x0: Math.max(elbow[0] - 0.12, Math.max(...body.map((q) => q[0])) + 0.16), topY, ...it };
    }
    else if (it.type === 'toy' && it.held) {   // in her hand: UNDER it, the palm on its crown and the fingers curling over its
      // front, as the still picks it up (in the palm's hollow under the fingers, the ball hid the palm and the fingertips
      // sat on it as blobs, side-on round 5)
      const palm = parts.filter((p) => p.id === 'hand.near.palm').flatMap((p) => p.geom.P.map((q) => ap(p.M, q)));
      const r = it.r ?? 0.2, cx = palm.reduce((a, q) => a + q[0], 0) / palm.length, lo = Math.max(...palm.map((q) => q[1]));
      o = { x: cx + r * 0.15, y: lo + r * 0.85, r, ...it };
    } else if (it.type === 'toy') {   // on the floor: under her hand when it reaches down to it (a big ball under her palm's
      // centre, its crown at the palm: she rests her hand on it), else just ahead of her wrist
      const pts = parts.filter((p) => /^hand\.near\.(palm|f[1-4])$/.test(p.id)).flatMap((p) => p.geom.P.map((q) => ap(p.M, q)));
      const palm = parts.filter((p) => p.id === 'hand.near.palm').flatMap((p) => p.geom.P.map((q) => ap(p.M, q)));
      // (it.reach: a big ball at least it.r, grown till its crown meets the palm's lowest point, so the hand rests ON it
      // whatever the pose's reach; at a fixed r an upright kneel left the fingers 0.25 H above the crown, round 11)
      const pLo = Math.max(...palm.map((q) => q[1])), fit = (it.near ? 0.05 : 0) - pLo + 0.02;
      const lo = pts.reduce((a, q) => (q[1] > a[1] ? q : a), [0, -1e9]), r = it.reach ? Math.max(it.r ?? 0.2, fit / 2) : (it.r ?? 0.2), big = r > 0.25;
      const px = palm.reduce((a, q) => a + q[0], 0) / Math.max(1, palm.length);
      o = { ...it, r, x: it.x ?? (lo[1] > -(2 * r + 0.3) ? (big ? px : lo[0]) : wrist[0] + 0.25) + (it.dx ?? 0) };   // (dx: nudged back or forward from under the hand)
    }
    else throw new Error('unknown prop ' + it.type);
    if (it.type === 'chair') { if (o.x1 === undefined) o.x1 = o.x0 + 1.35; if (o.x0 === undefined) o.x0 = o.x1 - 1.35;   // (a kitchen chair's seat ≈ 40 cm: 1.85 H read 30–80% too deep, critic R3)
      if (o.backTop === undefined) o.backTop = o.seatY - 2.0; }
    const r = PROPS[it.type](o);
    // (each part carries where it was placed: a shot holds its props there, engine/anim.js propsAt)
    for (const p of r.parts) out.parts.push({ ...p, bone: 'pelvis', world: true, M, module: 'props', anchors: p.geom.P.length, place: o });
    out.floors.push(...r.floors); out.cloth.push(...r.cloth);
  }
  return out;
}
