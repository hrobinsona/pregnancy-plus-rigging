// arms.js — cardigan sleeves (tube along shoulder→elbow→wrist, skinned across the elbow), bunched cuffs, wrist skin,
// hands (generator). Near arm is in front of everything on the body; far arm behind the body.
import { tube, limb, taper, ellipse } from '../../../engine/shapes.js';
import { ensureCW } from '../../../engine/hand.js';
import { add, sub, mulS, norm, perpL, lerp } from '../../../engine/geom.js';
import { armFrame, armPoints, proxies, front, rayHits } from '../../../engine/depth.js';
const lerp3 = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

export const ANCHORS = { 'cap.near': 4, 'cap.far': 4, 'cast.near': 7, 'sleeve.near': 16, 'sleeve.far': 16, 'sleeve.near.creaseA': 4, 'sleeve.near.creaseB': 4, 'cuff.near': 6, 'cuff.far': 6, 'cuff.near.rib': 4, 'cuff.far.rib': 4,
  'wrist.near': 6, 'wrist.far': 6, 'sleeve.near.fold': 6, 'sleeve.far.fold': 6 };

export function build(ctx) {
  const { P: C, C: char } = ctx, J = char.joints, X = char.params.P, out = [];
  for (const side of ['near', 'far']) {
    const S = side === 'near' ? 'Near' : 'Far', st = ctx.st;
    // AUTOMATIC draw order (engine/depth.js) for the far arm: each part comes in front exactly when the 3D arm puts it in
    // front of the body proxies (camera-ray test), so a swap lands when the limb is round a silhouette edge — never mid-body.
    // Verdicts per sample point: −1 = a proxy is in front of it, +1 = it is in front of all it overlaps, 0 = overlaps nothing.
    //  · forearm + hand: behind while any of it is occluded (an elbow still behind the bump: the part over the body must not
    //    show); in front once some lies over the body and none is occluded; clear of the body, the choice is invisible.
    //  · upper arm: in front of the TORSO (z between the top and the neck, so it still tucks under neck, hair and face) once
    //    its lower half lies over the chest with nothing in front of it — the raised arm reads as one limb down the bust.
    let auto = null;
    if (side === 'far' && char.params.depth && ctx.pose?.zAuto !== false && st[`upperArm.${side}`]?.a3) {
      const fr = armFrame(ctx.rig, st, side), A = armPoints(ctx.rig, st, side), prox = proxies(ctx.rig, st, fr);
      const V = (spec) => spec.map(([a, b, t]) => { const p = fr.armToBody(lerp3(a, b, t)); return { p, v: front(p, fr, prox) }; });
      const F = V([[A.el, A.wr, 0.15], [A.el, A.wr, 0.4], [A.el, A.wr, 0.65], [A.el, A.wr, 0.9], [A.wr, A.tip, 0.4], [A.wr, A.tip, 0.8]]), vs = F.map((x) => x.v);
      if ((ctx.pose?.fx?.[`front.${side}`] ?? 0) >= 0.25) { vs[4] = vs[5] = 1; for (let k = 1; k < 4; k++) if (vs[k] < 0) vs[k] = 0; }   // a stated front contact (hand over the mouth)
      const anyBack = vs.includes(-1), anyFront = vs.includes(1), ph = F[4].p;
      // a stated BEHIND (pose.fx['behind.<side>'] ≥ 0.5, from a path move going round the far side of the body): the
      // forearm and hand stay behind whatever the proxies judge — the hand at the bump's far side flickered in front (a
      // cuff ring) for one frame between being behind and wrapping (R25)
      const fore = (ctx.pose?.fx?.[`behind.${side}`] ?? 0) >= 0.5 ? false : anyBack && anyFront ? vs[4] > 0 : anyBack ? false : anyFront ? true : fr.depthOf(ph) < fr.depthOf([0, ph[1], fr.midL]);
      const U = V([[A.sh, A.el, 0.5], [A.sh, A.el, 0.7], [A.sh, A.el, 0.9]]).map((x) => x.v);
      // WRAP: a hand lying on the FAR surface of the bump (behind it, within a hand's thickness of its back) curls round its
      // rim — from the front only the fingers show over the edge (refs k1/k2/k8). Drawn in front of the bump, clipped to
      // outside the bump's outline shrunk by a rim band.
      // (tested against the bump grown by a hand's reach: a hand round the far side sits just beyond the drawn rim)
      const bump = prox.find((q) => q.name === 'bump'), hb = bump && rayHits(ph, fr, [{ ...bump, axes: bump.axes.map((a) => a * 1.35) }])[0];
      // a hand pointing TOWARD the camera (its tip nearer than the wrist: the forearm seen end-on, the hand bent back at us)
      // comes out of the cuff's opening in front of it — drawn under the cuff, the cuff sliced across the palm (critic R8)
      const towardCam = fr.depthOf(A.tip) < fr.depthOf(A.wr) - 0.06;
      // the wrap is a CONTINUOUS amount (0…1) — how far round the back of the bump the hand has gone — so the replacement
      // fingers GROW over the rim while the real hand slides behind the bump's edge (and shrink as it comes back out),
      // instead of the hand popping into fingertips on one frame (feel critic R7–R21)
      const ss_ = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const wrapW = !fore && hb ? ss_(-((hb.t0 + hb.t1) / 2) / 0.12) * ss_((hb.t1 + 0.45) / 0.08) : 0;
      auto = { fore, upper: fore && !U.includes(-1) && U.includes(1), wrap: wrapW >= 0.999, wrapW, towardCam };
    }
    const Z_FORE = 65, Z_UPPER = 38;
    const zb = auto?.upper ? Z_UPPER : (side === 'near' ? 80 : 10) + (ctx.pose?.zBias?.[`arm.${side}`] ?? 0);   // zBias: a per-pose draw-order swap (keyed), when automatic depth is off
    const sh = J['shoulder' + S], el = J['elbow' + S], wr = J['wrist' + S], w = X.sleeve[side];
    const cuffEnd = lerp(el, wr, (X.cuffEnd?.[side] ?? 0.9) - 0.06), axis = [sh, lerp(sh, el, 0.55), el, cuffEnd];
    // the far sleeve is the cardigan's own pink like the near one (refs k1–k8 draw both sleeves one colour): a far arm that
    // changes colour as it comes round the body pops (critic, round 5). Without automatic depth the old one-value-darker cue stays.
    const fill = side === 'near' || auto ? C.cardigan : C.cardiganShade;
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
    const BONE = ctx.rig.BONE, cr = (bone, v) => { const M = st[bone].M, j = J[BONE[bone].joint]; return [M[0] * (v[0] - j[0]) + M[2] * (v[1] - j[1]) + M[4], M[1] * (v[0] - j[0]) + M[3] * (v[1] - j[1]) + M[5]]; };
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
    let zFore = zb + (ctx.pose?.zBias?.[`arm.${side}.fore`] ?? 0), zf = zb + (ctx.pose?.zBias?.[`arm.${side}.hand`] ?? ctx.pose?.zBias?.[`arm.${side}.fore`] ?? 0);   // zf: cuff, wrist and hand ('…hand' = only those come in front: the forearm runs behind the bump)
    if (auto) { zFore = zf = auto.fore ? Z_FORE : zb; }
    // a far forearm brought IN FRONT of the body is lit like the front (refs k3–k7: the raised far sleeve is the cardigan's
    // own pink); the one-value-darker depth cue belongs to a limb that stays behind
    const foreFill = side === 'far' && zFore > 40 ? C.cardigan : fill;
    if (zFore !== zb) {
      // the FOREARM PIECE: the sleeve's own forearm half (same axis and widths from the middle of the elbow fillet to the
      // cuff, so its edges lie exactly on the sleeve's) with a round elbow cap — the classic cut-out joint. (It used to be
      // the whole sleeve clipped to a cone round the forearm; with the forearm folded back across the upper arm the cone
      // took in part of the upper arm too, which showed as a pointed wedge of sleeve over the chest.)
      const foreG = ensureCW(tube(bax.slice(3), widths.slice(3), { capK: 1.0 }));
      out.push({ id: `sleeve.${side}.fore`, bone: `forearm.${side}`, z: zFore, fill: foreFill, geom: foreG, world: true });
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
    out.push({ id: `cuff.${side}`, bone: `forearm.${side}`, z: zFore + 0.4, fill: foreFill, geom: ensureCW(limb(c0, c1, [{ t: 0, r: cw, l: cw }, { t: 1, r: cw * 0.92, l: cw * 0.92 }], { capK: 0.4 })) });
    const cn = perpL(norm(sub(c1, c0))), cm = lerp(c0, c1, 0.3);
    if (X.detail.cuffRib) out.push({ id: `cuff.${side}.rib`, bone: `forearm.${side}`, z: zb + 0.5, fill: C.cardiganShade, geom: taper([add(cm, mulS(cn, cw * 0.8)), lerp(cm, add(cm, [0, 0.012]), 1), add(cm, mulS(cn, -cw * 0.8))], [0.003, 0.016, 0.003]) });
    // wrist skin between cuff and palm, skinned across the wrist so a bent wrist stays filled (wrist corrective base)
    out.push({ id: `wrist.${side}`, bone: `hand.${side}`, z: zf + 0.3, fill: C.skin,
      geom: ensureCW(limb(lerp(el, wr, 0.86), wr, [{ t: 0, r: char.params.handSpecs[side].wristW * 0.4, l: char.params.handSpecs[side].wristW * 0.4 }, { t: 1, r: char.params.handSpecs[side].wristW * 0.4, l: char.params.handSpecs[side].wristW * 0.4 }], { capK: 1.0 })),   // a bridge for a bent wrist only: narrower than the palm and ending at the wrist, so it never shapes the silhouette below the cuff (the palm's own wrist end, tucked under the cuff, does)
      skin: { parent: `forearm.${side}`, child: `hand.${side}`, zone: 0.5 } });
    // hand
    const hand = (ctx.pose?.handView?.[side] === 'back' && char.hands[side + 'Back']) || char.hands[side];   // view swap
    const hp = hand.parts(ctx, { fill: C.skin, line: C.skinLine, zBase: (auto?.wrap ? 34.4 : zf) + (auto?.towardCam && !auto?.wrap ? 0.45 : 0.35) });   // under the cuff (it covers the wrist end) unless the hand comes out of it toward us
    if (auto?.wrap) for (const q of hp) q.wrapHand = true;   // drawn as fingertips over the rim instead (parts/wrap.js)
    else if (auto?.wrapW > 0.02) for (const q of hp) q.wrapGrow = auto.wrapW;   // half round: the real hand (behind the bump) AND the fingers, grown by the amount
    out.push(...hp);
    // a hand wrapped round the FAR side of the bump: its forearm runs behind the bump to the back of it; the cuff poked out
    // past the outline next to the fingers as a ragged pink tab ("clothing bleeding past the limbs", client). While
    // wrapping, it is cut away in a zone round the bump that grows with the wrap amount (continuous: no pop)
    const wW = auto?.wrap ? 1 : auto?.wrapW ?? 0;
    // (only the CUFF and wrist — wider than the sleeve, with a rounded end, they made the stepped edge; the sleeve tube itself
    // fills the side of the body between the bump and the far cardigan panel, as the forearm does in refs k1/k8, and cutting
    // it opened a background gap there)
    if (side === 'far' && wW > 0.02) for (const q of out) if (/^(cuff\.far(\.rib)?|wrist\.far)$/.test(q.id)) q.clipOut = { part: 'belly', inset: -0.2 * wW };
  }
  return out;
}
