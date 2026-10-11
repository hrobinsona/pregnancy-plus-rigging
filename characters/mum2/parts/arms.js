// arms.js — cardigan sleeves (tube along shoulder→elbow→wrist, skinned across the elbow), bunched cuffs, wrist skin,
// hands (generator). Near arm is in front of everything on the body; far arm behind the body.
import { tube, limb, taper, ellipse } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { add, sub, mulS, norm, perpL, lerp } from '../../../engine/geom.js';

export const ANCHORS = { 'cap.near': 4, 'cap.far': 4, 'cast.near': 7, 'sleeve.near': 16, 'sleeve.far': 16, 'sleeve.near.creaseA': 4, 'sleeve.near.creaseB': 4, 'cuff.near': 6, 'cuff.far': 6, 'cuff.near.rib': 4, 'cuff.far.rib': 4,
  'wrist.near': 6, 'wrist.far': 6, 'sleeve.near.fold': 6, 'sleeve.far.fold': 6 };

export function build(ctx) {
  const { P: C, C: char } = ctx, J = char.joints, X = char.params.P, out = [];
  for (const side of ['near', 'far']) {
    const S = side === 'near' ? 'Near' : 'Far', zb = (side === 'near' ? 80 : 10) + (ctx.pose?.zBias?.[`arm.${side}`] ?? 0);   // zBias: a per-pose draw-order swap (a far arm reaching onto the bump comes in front of the body)
    const sh = J['shoulder' + S], el = J['elbow' + S], wr = J['wrist' + S], w = X.sleeve[side];
    const cuffEnd = lerp(el, wr, (X.cuffEnd?.[side] ?? 0.9) - 0.06), axis = [sh, lerp(sh, el, 0.55), el, cuffEnd];
    const fill = side === 'near' ? C.cardigan : C.cardiganShade;     // far limbs one value darker (depth)
    // shoulder = a circle centred on the shoulder pivot (rotation-invariant joint) reaching the shoulder top
    out.push({ id: `cap.${side}`, bone: `upperArm.${side}`, z: zb - 0.05, fill, geom: ellipse(sh, X.shoulderCap[side], X.shoulderCap[side]) });
    if (side === 'near') {
      // cast shadow of the arm on the cardigan front: a shade band just inside the sleeve's inner edge, CLIPPED to the
      // cardigan panel — it only ever lands on the body, so it can never outline the arm against the background
      // (replaces the old opacity fade, which rendered off-palette pinks)
      out.push({ id: `cast.${side}`, bone: `forearm.${side}`, z: 70.5, fill: C.cardiganShade, clip: 'cardigan.near',
        geom: ensureCW(tube([sh, lerp(sh, el, 0.5), lerp(sh, el, 0.85)], [0, 1, 2].map((i) => ({ r: w[i] + [-0.03, 0.01, 0.06][i], l: w[i] * 0.6 })), { capA: 'none', capK: 0.8 })),   // R10: emerges from under the sleeve at zero width; ends above the armpit window   // R9: a wedge (thin at the shoulder, wider down the arm), starting inside the cap — not a constant stripe
        skin: { parent: `upperArm.${side}`, child: `forearm.${side}`, zone: 0.22 } });
    }
    // BENDY SLEEVE (built in POSED space): one continuous tube along shoulder → elbow → cuff whose elbow is a FILLET (a
    // quadratic bend whose radius grows with the bend), so the arm flows through the elbow like cloth over a real arm —
    // never two straight tubes on a hinge (client: "stiff, rigged with too few points"). The inside of the bend
    // compresses, the outside stretches over the elbow point; inner-elbow bunching creases appear as it bends.
    const st = ctx.st, BONE = ctx.rig.BONE, cr = (bone, v) => { const M = st[bone].M, j = J[BONE[bone].joint]; return [M[0] * (v[0] - j[0]) + M[2] * (v[1] - j[1]) + M[4], M[1] * (v[0] - j[0]) + M[3] * (v[1] - j[1]) + M[5]]; };
    const Sp = st[`upperArm.${side}`].pos, Ep = st[`forearm.${side}`].pos, Wp = cr(`forearm.${side}`, cuffEnd);
    const L1 = Math.hypot(Ep[0] - Sp[0], Ep[1] - Sp[1]), L2 = Math.hypot(Wp[0] - Ep[0], Wp[1] - Ep[1]);
    const u1 = norm(sub(Ep, Sp)), u2 = norm(sub(Wp, Ep)), bend = Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]) / (Math.PI / 180);
    const bk = Math.min(1, Math.abs(bend) / 110), fr = Math.min(0.45 * Math.min(L1, L2), Math.max((0.14 + 0.26 * bk) * Math.min(L1, L2), 2.2 * w[2] * bk));   // the bend radius must stay larger than the inner half-width, or the inside contour folds over itself (a notch at the inner elbow)
    const A = sub(Ep, mulS(u1, fr)), B = add(Ep, mulS(u2, fr)), q = (t) => add(add(mulS(A, (1 - t) ** 2), mulS(Ep, 2 * t * (1 - t))), mulS(B, t * t));
    const bax = [Sp, lerp(Sp, A, 0.5), A, q(0.5), B, lerp(B, Wp, 0.5), Wp];
    const ww = [w[0], w[1], (w[1] + w[2]) / 2, w[2], (w[2] + w[3]) / 2, (w[2] * 0.4 + w[3] * 0.6), w[3]];
    const fo = [X.sleeve.outer[0], X.sleeve.outer[1], (X.sleeve.outer[1] + X.sleeve.outer[2]) / 2, X.sleeve.outer[2], X.sleeve.outer[2], (X.sleeve.outer[2] + X.sleeve.outer[3]) / 2, X.sleeve.outer[3]];
    const fi = [X.sleeve.inner[0], X.sleeve.inner[1], (X.sleeve.inner[1] + X.sleeve.inner[2]) / 2, X.sleeve.inner[2], X.sleeve.inner[2], (X.sleeve.inner[2] + X.sleeve.inner[3]) / 2, X.sleeve.inner[3]];
    // which tube side is the inside of the bend at the elbow: tube's +normal is perpL(dir); the concave side is where u2 turns
    const dirE = norm(sub(B, A)), concR = (perpL(dirE)[0] * (u2[0] - u1[0]) + perpL(dirE)[1] * (u2[1] - u1[1])) > 0;
    const widths = bax.map((_, i) => {
      // 'r' = +normal side. Rest convention: near arm r = inner (body side), far arm r = outer
      let r = ww[i] * (side === 'near' ? fi[i] : fo[i]), l = ww[i] * (side === 'near' ? fo[i] : fi[i]);
      if (i === 0) { if (side === 'near') r *= 0.85; else l *= 0.85; }
      const e = [0, 0, 0.5, 1, 0.5, 0, 0][i] * bk;                         // bend influence at the fillet
      if (concR) { r *= 1 - 0.16 * e; l *= 1 + 0.07 * e; } else { l *= 1 - 0.16 * e; r *= 1 + 0.07 * e; }
      return { r, l };
    });
    const sleeveG = ensureCW(tube(bax, widths, { capK: 0.55 }));
    out.push({ id: `sleeve.${side}`, bone: `forearm.${side}`, z: zb, fill, geom: sleeveG, world: true });
    // inner-elbow bunching: two short creases on the inside of the bend, growing with it (cloth folds where it compresses)
    if (side === 'near' && bk > 0.25) {
      const nI = mulS(perpL(dirE), concR ? 1 : -1), Q = q(0.5), wI = (concR ? widths[3].r : widths[3].l), g = Math.min(1, (bk - 0.25) / 0.4);
      for (const [o, t0] of [[-0.35, 0.0], [0.35, 0.15]]) {
        const c0 = add(add(Q, mulS(dirE, o * wI)), mulS(nI, wI * 0.95)), c1 = add(add(Q, mulS(dirE, (o + 0.12) * wI)), mulS(nI, wI * (0.45 - 0.2 * g)));
        out.push({ id: `sleeve.${side}.crease${o < 0 ? 'A' : 'B'}`, bone: `forearm.${side}`, z: zb + 0.25, fill: C.cardiganShade, world: true, geom: taper([c0, lerp(c0, c1, 0.5), c1], [0.004, 0.014 * g + 0.004, 0.003]) });
      }
    }
    // FOREARM DRAW-ORDER SWAP (pose.zBias['arm.<side>.fore']): the forearm, cuff and hand come in front (a far hand resting on
    // the bump) while the upper arm stays behind the body. The sleeve is drawn again at the new depth, clipped to a KEYHOLE
    // on the forearm bone — a round cap centred on the elbow (the sleeve's own width there) widening toward the cuff — so the
    // swapped forearm begins with a round elbow, the classic cut-out joint. Nothing changes when the bias is 0.
    const zFore = zb + (ctx.pose?.zBias?.[`arm.${side}.fore`] ?? 0), zf = zb + (ctx.pose?.zBias?.[`arm.${side}.hand`] ?? ctx.pose?.zBias?.[`arm.${side}.fore`] ?? 0);   // zf: cuff, wrist and hand ('…hand' = only those come in front: the forearm runs behind the bump)
    if (zFore !== zb) {
      const rE = w[2] * 1.06, far = add(wr, mulS(norm(sub(wr, el)), 0.6));
      out.push({ id: `keyhole.${side}`, bone: `forearm.${side}`, z: 0, fill: 'none', geom: ensureCW(limb(el, far, [{ t: 0, r: rE, l: rE }, { t: 1, r: 0.55, l: 0.55 }], { capK: 1.0, capB: 'none' })) });
      out.push({ id: `sleeve.${side}.fore`, bone: `forearm.${side}`, z: zFore, fill, geom: sleeveG, world: true, clip: `keyhole.${side}` });
    }
    // inner fold line along the sleeve (reads the arm against the cardigan of the same colour)
    // inner fold line along the sleeve (reads the arm against the cardigan of the same colour): follows the bendy axis
    const inner = side === 'near' ? 1 : -1, nrmAt = (i) => perpL(norm(sub(bax[Math.min(i + 1, 6)], bax[Math.max(i - 1, 0)])));
    const fpt = (i, t, k) => { const p = lerp(bax[i], bax[i + 1], t), n_ = norm(lerp(nrmAt(i), nrmAt(i + 1), t)); return add(p, mulS(n_, inner * k * (ww[i] * (1 - t) + ww[i + 1] * t))); };
    if (side === 'near' && X.detail.sleeveFold) out.push({ id: `sleeve.${side}.fold`, bone: `forearm.${side}`, z: zb + 0.2, fill: C.cardiganShade, world: true,
      geom: taper([fpt(0, 0.3, 0.55), fpt(1, 0.5, 0.62), fpt(4, 0.5, 0.6), fpt(5, 0.2, 0.5)], [0.003, 0.02, 0.016, 0.003]) });
    // bunched cuff + rib line
    // the cuff's rounded end sits ON the wrist landmark (measured: the reference cuff edge is the wrist), so the whole back
    // of the hand / palm shows below it (hand_fit: the old cuff hid the top 0.08 H of the hand and the palm crease)
    const cE = X.cuffEnd?.[side] ?? 0.92, c0 = lerp(el, wr, cE - 0.14), c1 = lerp(el, wr, cE), cw = w[3] * 1.04;
    out.push({ id: `cuff.${side}`, bone: `forearm.${side}`, z: zFore + 0.4, fill, geom: ensureCW(limb(c0, c1, [{ t: 0, r: cw, l: cw }, { t: 1, r: cw * 0.92, l: cw * 0.92 }], { capK: 0.4 })) });
    const cn = perpL(norm(sub(c1, c0))), cm = lerp(c0, c1, 0.3);
    if (X.detail.cuffRib) out.push({ id: `cuff.${side}.rib`, bone: `forearm.${side}`, z: zb + 0.5, fill: C.cardiganShade, geom: taper([add(cm, mulS(cn, cw * 0.8)), lerp(cm, add(cm, [0, 0.012]), 1), add(cm, mulS(cn, -cw * 0.8))], [0.003, 0.016, 0.003]) });
    // wrist skin between cuff and palm, skinned across the wrist so a bent wrist stays filled (wrist corrective base)
    out.push({ id: `wrist.${side}`, bone: `hand.${side}`, z: zf + 0.3, fill: C.skin,
      geom: ensureCW(limb(lerp(el, wr, 0.86), wr, [{ t: 0, r: char.params.handSpecs[side].wristW * 0.4, l: char.params.handSpecs[side].wristW * 0.4 }, { t: 1, r: char.params.handSpecs[side].wristW * 0.4, l: char.params.handSpecs[side].wristW * 0.4 }], { capK: 1.0 })),   // a bridge for a bent wrist only: narrower than the palm and ending at the wrist, so it never shapes the silhouette below the cuff (the palm's own wrist end, tucked under the cuff, does)
      skin: { parent: `forearm.${side}`, child: `hand.${side}`, zone: 0.5 } });
    // hand
    const hand = (ctx.pose?.handView?.[side] === 'back' && char.hands[side + 'Back']) || char.hands[side];   // view swap
    out.push(...hand.parts(ctx, { fill: C.skin, line: C.skinLine, zBase: zf + 0.35 }));   // under the cuff: the cuff covers the wrist end
  }
  return out;
}
