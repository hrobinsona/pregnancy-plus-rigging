// rig.js — character-agnostic cut-out rig. createRig(C) binds a character definition:
//   C.joints   {name: [x, y]}            rest joint positions, H units (head heights), origin on the ground, y down
//   C.bones    [{id, parent, joint, aim, min, max, cap?, plane?, restAnat?}]   in parent-before-child order
//   C.modules  {name: {ANCHORS, build(ctx)}}   part builders; ctx = {P, C, J, pose, st, rig}
//   C.palette, C.design {facing, forwardX}, C.frame {bbox}, C.ref {sizePx, groundPx, Hpx}
// Parts are authored in REST WORLD space (H units). Rigid parts ride one bone; skinned parts blend parent/child
// rotations as angles across a joint (no matrix-LBS collapse). Pure: output depends only on (pose, opts).
//
// 3/4-view limbs: a bone with plane:'sagittal' takes its pose angle as an ANATOMICAL rotation in the body's sagittal
// plane (θ from straight down, + toward the facing direction). The plane is yawed to the picture plane, so the rig
// projects: screen dir = (sinθ·forwardX, cosθ), length factor L(θ) = √((forwardX·sinθ)² + cos²θ). A leg swinging
// toward the camera therefore foreshortens instead of sweeping sideways.
import { mul, T, R, S, I, pathD, ap, sub, add, mapGeom } from './geom.js';

const DEG = Math.PI / 180;
const wrap = (a) => ((a + 540) % 360) - 180;
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

export function createRig(C) {
  const J = C.joints, BONES = C.bones, BONE = Object.fromEntries(BONES.map((b) => [b.id, b]));
  const fx = C.design.forwardX ?? 0.72;
  const Hpx = C.ref?.Hpx ?? 210;
  for (const b of BONES) {
    if (!J[b.joint] || !J[b.aim]) throw new Error(`bone ${b.id}: missing joint ${J[b.joint] ? b.aim : b.joint}`);
    if (b.parent && !BONE[b.parent]) throw new Error(`bone ${b.id}: unknown parent ${b.parent}`);
  }
  const restAngle = (b) => Math.atan2(J[b.aim][1] - J[b.joint][1], J[b.aim][0] - J[b.joint][0]) / DEG;
  // in-plane angle θ (0 = the plane's 'down', + = forward) → screen angle / projected length; f = plane's x factor
  const scrAng = (th, f = fx) => Math.atan2(Math.cos(th * DEG), f * Math.sin(th * DEG)) / DEG;
  const projLen = (th, f = fx) => Math.hypot(f * Math.sin(th * DEG), Math.cos(th * DEG));
  const planeFx = (b) => (b.plane === 'sagittal' ? fx : (C.design.planes?.[b.plane] ?? b.fx ?? fx));
  const boneStretch = (b, sc) => {
    if (!sc || (Math.abs(sc[0] - 1) < 1e-9 && Math.abs(sc[1] - 1) < 1e-9)) return I();
    const a0 = restAngle(b);
    return mul(R(a0), mul(S(sc[0], sc[1]), R(-a0)));
  };

  /** Per-bone world state: pos (pivot), rot (deg, screen, relative to rest), anat (sagittal bones), Sb, M. */
  // DRIVERS (C.drivers): a bone that follows another, e.g. SHOULDER RHYTHM — lifting the arm past ~30° rotates the
  // shoulder girdle (≈1° of clavicle per 4–5° of arm), so the shoulder rises WITH the arm instead of the arm swinging
  // on a fixed pin (the client: "shoulders move separately — not part of one body"). Soft onset (no kink at `start`).
  const DRV = C.drivers || [];
  const soft = (x, w) => (x <= 0 ? 0 : x < w ? (x * x) / (2 * w) : x - w / 2);
  const driven = (pose) => {
    if (!DRV.length) return pose.bones || {};
    const b = { ...(pose.bones || {}) };
    for (const d of DRV) { const a = b[d.from] ?? 0; b[d.bone] = (b[d.bone] ?? 0) + d.k * Math.min(d.max ?? 1e9, soft(a - (d.start ?? 0), d.soft ?? 15)); }
    return b;
  };
  // 3D ARM (plane:'arm3'). A sagittal hinge chain cannot draw a hand brought to the mouth with the elbow out to the side:
  // in a ¾ view the forearm then crosses back over the upper arm (projected elbow bend > 180°). Real arms are 3D: the
  // shoulder has 3 DOF (elevation, plane of elevation, humeral rotation), the elbow is a hinge whose axis the humeral
  // rotation turns, the forearm twists (pronation) under the wrist. The chain is posed in the side's LOCAL body frame
  // (F forward, D down, L lateral = away from the midline) and projected orthographically with the body's yaw:
  // screen x = fx·F ± √(1−fx²)·L, y = D, depth = −√(1−fx²)·F ± fx·L (+ = away from the camera; ± = far/near side).
  // With abd = rot = pron = 0 it is EXACTLY the old sagittal chain (back-compatible poses). Output per bone is still a
  // screen rotation + a projected length (foreshortening), so every part, pin, reach and spring works unchanged; st.a3
  // carries the 3D frame (v = bone dir, g = flexion dir, n = palm normal, cam = projected dir with depth) for parts that
  // decide draw order or hand view from depth.
  const SQ = Math.sqrt(Math.max(0, 1 - fx * fx));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const rotAbout = (v, k, a) => { const c = Math.cos(a), s = Math.sin(a), kv = dot3(k, v), kx = cross(k, v); return [0, 1, 2].map((i) => v[i] * c + kx[i] * s + k[i] * kv * (1 - c)); };
  const toCam = (u, side) => { const s = side === 'near' ? -1 : 1; return [fx * u[0] + s * SQ * u[2], u[1], -SQ * u[0] + s * fx * u[2]]; };
  const param = (id, bonesIn) => { const b = BONE[id]; return b ? Math.max(b.min ?? -180, Math.min(b.max ?? 180, bonesIn[id] ?? 0)) * DEG : 0; };
  function arm3(b, d, ps, bonesIn) {
    const P = BONE[b.parent].plane === 'arm3' ? ps.a3 : null, side = P ? P.side : b.side;
    let v, g, n = null;
    if (!P) {                                   // upper arm: elevation d in the plane of elevation turned out by abd, then humeral rotation
      const e = d * DEG, al = param(b.abd, bonesIn), tw = param(b.twist, bonesIn);
      v = [Math.sin(e) * Math.cos(al), Math.cos(e), Math.sin(e) * Math.sin(al)];
      // swing (minimal rotation D→v) carries the rest flexion direction F; the singular straight-up arm falls back to the sagittal axis
      const D3 = [0, 1, 0], k = cross(D3, v), kl = Math.hypot(...k);
      g = kl > 1e-9 ? rotAbout([1, 0, 0], k.map((x) => x / kl), Math.atan2(kl, dot3(D3, v))) : (v[1] > 0 ? [1, 0, 0] : [-1, 0, 0]);
      g = rotAbout(g, v, tw);                   // + = internal rotation: elbow flexion swings the forearm toward the midline
    } else {
      const c = d * DEG, v0 = P.v, g0 = P.g;
      v = v0.map((x, i) => Math.cos(c) * x + Math.sin(c) * g0[i]);
      g = g0.map((x, i) => Math.cos(c) * x - Math.sin(c) * v0[i]);
      if (b.pron) g = rotAbout(g, v, param(b.pron, bonesIn));   // forearm twist: turns the plane the wrist bends in (and the palm)
      n = cross(v, g);                          // palm normal (rest: medial)
    }
    const cam = toCam(v, side);
    return { v, g, n, side, cam, ncam: n && toCam(n, side), scr: Math.atan2(cam[1], cam[0]) / DEG, len: Math.hypot(cam[0], cam[1]) };
  }
  function solve(pose = {}) {
    const st = {}, bonesIn = driven(pose);
    for (const b of BONES) {
      const d = Math.max(b.min ?? -180, Math.min(b.max ?? 180, bonesIn[b.id] ?? 0));
      const user = pose.scale?.[b.id] || [1, 1];
      let pos, rot, anat = null, along = 1;
      const ps = b.parent ? st[b.parent] : null;
      if (b.param) { st[b.id] = { ...ps, param: d }; continue; }   // a parameter (3D arm DOF), not a drawn transform
      if (!ps) { const r0 = pose.root || [0, 0]; pos = [J[b.joint][0] + r0[0], J[b.joint][1] + r0[1]]; }
      else pos = ap(ps.M, sub(J[b.joint], J[BONE[b.parent].joint]));
      if (b.plane === 'arm3') {
        const a3 = arm3(b, d, ps, bonesIn), parentSame = BONE[b.parent].plane === 'arm3';
        const base = parentSame ? ps.baseRot : ps.rot;
        rot = base + wrap(a3.scr - 90);
        along = a3.len;
        st[b.id] = { baseRot: base, a3 };
      } else if (b.plane) {
        // the bone rotates in a plane yawed to the picture: 'sagittal' uses C.design.forwardX; any other plane name
        // uses C.design.planes[name] (e.g. finger flexion seen from the back of the hand ≈ out of plane: small fx)
        const r0 = b.restAnat ?? 0, f = planeFx(b);
        const parentSame = ps && BONE[b.parent].plane === b.plane;
        anat = parentSame ? ps.anat + (r0 - (BONE[b.parent].restAnat ?? 0)) + d : r0 + d;
        const base = parentSame ? ps.baseRot : (ps ? ps.rot : 0);
        rot = base + wrap(scrAng(anat, f) - scrAng(r0, f));
        along = projLen(anat, f) / projLen(r0, f);
        st[b.id] = { baseRot: base };
      } else {
        rot = (ps ? ps.rot : 0) + d;
        st[b.id] = { baseRot: rot };
      }
      const Sb = boneStretch(b, [user[0] * along, user[1]]);
      const lin = mul(R(rot), Sb);
      Object.assign(st[b.id], { pos, rot, anat, Sb, lin, M: mul(T(pos[0], pos[1]), lin) });
    }
    return st;
  }

  /** Skinned part (rest world): blend parent/child by position along the child bone; v' = Jw + R(θ)·S·(v − Jr). */
  function skinGeom(g, sk, st) {
    const cb = BONE[sk.child], Jr = J[cb.joint], aim = J[cb.aim];
    const L = Math.hypot(aim[0] - Jr[0], aim[1] - Jr[1]);
    const dir = [(aim[0] - Jr[0]) / L, (aim[1] - Jr[1]) / L];
    const z = (sk.zone ?? 0.2) * L, bias = (sk.bias ?? 0) * L;
    const Jw = st[sk.child].pos, pb = st[sk.parent], cbs = st[sk.child];
    const out = { P: [], hin: [], hout: [] };
    g.P.forEach((v, k) => {
      const s = (v[0] - Jr[0]) * dir[0] + (v[1] - Jr[1]) * dir[1] - bias;
      const wc = smooth(-z, z, s), wp = 1 - wc;
      const th = wp * pb.rot + wc * (pb.rot + wrap(cbs.rot - pb.rot));
      const Sbl = pb.Sb.map((x, i) => wp * x + wc * cbs.Sb[i]);
      const A = mul(R(th), Sbl);
      const f = (p) => add(Jw, ap(A, sub(p, Jr)));
      out.P.push(f(v)); out.hin.push(f(g.hin[k])); out.hout.push(f(g.hout[k]));
    });
    return out;
  }

  /** Chain-skinned part (rest world), e.g. a torso over pelvis→spineLower→spineUpper→chest: each anchor finds the
   *  furthest joint it has passed (or is within `zone` of) and blends that joint's parent/child as in skinGeom.
   *  Mid-segment anchors therefore follow their own bone rigidly; only the joint zones bend. */
  function chainSkinGeom(g, sk, st) {
    const ch = sk.chain, zr = sk.zone ?? 0.25;
    const seg = ch.map((id) => { const b = BONE[id], j = J[b.joint], a = J[b.aim], L = Math.hypot(a[0] - j[0], a[1] - j[1]); return { id, j, d: [(a[0] - j[0]) / L, (a[1] - j[1]) / L], L }; });
    const xf = (v) => {
      for (let k = ch.length - 1; k >= 1; k--) {
        const sg = seg[k], s = (v[0] - sg.j[0]) * sg.d[0] + (v[1] - sg.j[1]) * sg.d[1], z = zr * Math.min(sg.L, seg[k - 1].L);
        if (s > -z) {
          const wc = smooth(-z, z, s), wp = 1 - wc, pb = st[ch[k - 1]], cb = st[ch[k]];
          const th = pb.rot + wc * wrap(cb.rot - pb.rot);
          const A = mul(R(th), pb.Sb.map((x, i) => wp * x + wc * cb.Sb[i]));
          return (p) => add(cb.pos, ap(A, sub(p, sg.j)));
        }
      }
      const b0 = st[ch[0]], j0 = seg[0].j;
      return (p) => add(b0.pos, ap(b0.lin, sub(p, j0)));
    };
    const out = { P: [], hin: [], hout: [] };
    g.P.forEach((v, k) => { const f = xf(v); out.P.push(f(v)); out.hin.push(f(g.hin[k])); out.hout.push(f(g.hout[k])); });
    return out;
  }

  /** REGION skin: anchors near a rest-space centre also follow another bone (weight 1 inside r0, 0 beyond r1, smooth),
   *  e.g. the cardigan's shoulder line follows the clavicle so collar, shoulder and sleeve cap move as one piece. An
   *  anchor's handles take the anchor's weight (the curve keeps its shape locally). */
  function regionSkin(rest, posed, regions, st) {
    const out = { P: posed.P.slice(), hin: posed.hin.slice(), hout: posed.hout.slice() };
    for (const R0 of regions) {
      const b = BONE[R0.bone], j = J[b.joint], M = st[R0.bone].M, c = R0.c;
      const car = (v) => ap(M, sub(v, j));
      rest.P.forEach((v, k) => {
        const w = (R0.w ?? 1) * (1 - smooth(R0.r[0], R0.r[1], Math.hypot(v[0] - c[0], v[1] - c[1])));
        if (w <= 1e-6) return;
        const bl = (a, q) => [a[0] + w * (q[0] - a[0]), a[1] + w * (q[1] - a[1])];
        // the region bone's motion RELATIVE to its parent is what we add (the base skin already follows the parent)
        const pb = st[b.parent], pj = J[BONE[b.parent].joint], viaParent = (v) => ap(pb.M, sub(v, pj));
        const d = (v) => sub(car(v), viaParent(v));
        out.P[k] = bl(out.P[k], add(out.P[k], d(v))); out.hin[k] = bl(out.hin[k], add(out.hin[k], d(rest.hin[k]))); out.hout[k] = bl(out.hout[k], add(out.hout[k], d(rest.hout[k])));
      });
    }
    return out;
  }

  /** All parts, z-sorted, each with a final matrix M (rigid) or posed geometry (skinned). */
  function build(pose = {}) {
    const st = solve(pose);
    const F = (pose.facing || C.design.facing || 'right') === 'left' ? S(-1, 1) : I();
    const ctx = { P: C.palette, C, J, pose, st, rig: api };
    const parts = [];
    // 2.5D WARPS (C.warps = {bone: (pose) => (q) => q'}): every rigid part drawn on that bone is lifted through it before
    // the bone's matrix (engine/warp.js: a ¾ head that nods instead of rolling)
    const warps = Object.fromEntries(Object.entries(C.warps || {}).map(([b, w]) => [b, w(pose)]));
    for (const [name, mod] of Object.entries(C.modules)) {
      for (const p0 of mod.build(ctx)) {
        const p = warps[p0.bone] && !p0.world && !p0.skin ? { ...p0, geom: mapGeom(p0.geom, warps[p0.bone]) } : p0;
        const want = mod.ANCHORS?.[p.id];
        if (want !== undefined && want !== p.geom.P.length) throw new Error(`${p.id}: ${p.geom.P.length} anchors, documented ${want}`);
        if (!st[p.bone]) throw new Error(`${p.id}: unknown bone ${p.bone}`);
        if (p.skin) { let g = p.skin.chain ? chainSkinGeom(p.geom, p.skin, st) : skinGeom(p.geom, p.skin, st); if (p.skin.regions) g = regionSkin(p.geom, g, p.skin.regions, st); parts.push({ ...p, module: name, anchors: p.geom.P.length, geom: g, M: F }); }
        else {
          const j = J[BONE[p.bone].joint];
          // rigid: rotate + translate with the bone but never take its stretch (a knuckle disc on a foreshortening phalanx
          // must stay a circle — squashed, it becomes a lobe sticking out of the hand)
          if (p.world) { parts.push({ ...p, module: name, anchors: p.geom.P.length, M: F }); continue; }   // geometry already built in posed space
          if (p.rigidAt) {   // centre carried by the bone's full transform (incl. foreshortening), shape only rotated: a round end stays round
            const c = p.rigidAt, pc = ap(st[p.bone].M, sub(c, j));
            parts.push({ ...p, module: name, anchors: p.geom.P.length, M: mul(F, mul(mul(T(pc[0], pc[1]), R(st[p.bone].rot)), T(-c[0], -c[1]))) });
            continue;
          }
          const Mb = p.rigid ? mul(T(st[p.bone].pos[0], st[p.bone].pos[1]), R(st[p.bone].rot)) : st[p.bone].M;
          parts.push({ ...p, module: name, anchors: p.geom.P.length, M: mul(F, mul(Mb, T(-j[0], -j[1]))) });
        }
      }
    }
    // OUTLINE GROUPS (C.outlineGroups): a group of parts that may overlap the SAME material (a hand over the face, a hand over
    // the other hand) gets a line round its silhouette ONLY where it lies over that material: every part of the group is
    // cloned as a stroke just below the group and clipped to the same-material parts behind it. Over the background or another
    // colour nothing shows — the style's no-outline rule holds; same-colour shapes can still be told apart.
    // character post-pass (C.postBuild): replacement drawings that need other modules' posed parts (e.g. fingertips
    // wrapped round the bump's rim need the bump's posed outline)
    if (C.postBuild) C.postBuild(parts, ctx);
    for (const G of C.outlineGroups || []) {
      const inG = parts.filter((p) => G.match.test(p.id)); if (!inG.length) continue;
      const zmin = Math.min(...inG.map((p) => p.z));
      const behind = parts.filter((p) => !G.match.test(p.id) && p.fill === G.material && p.z < zmin && p.z >= (G.minZ ?? -Infinity) && !p.stroke && (!G.behind || G.behind.test(p.id))).map((p) => p.id);   // G.behind: only these count (a sleeve is not outlined against its own shoulder cap); G.minZ: only parts not themselves hidden behind the body (a clip region is the part's whole shape, visible or not)
      if (!behind.length) continue;
      // G.fade = {bone, r: [r0, r1]}: the line is masked out within r0 (H) of that bone's joint and full beyond r1 — a sleeve
      // over its own shoulder must not draw a seam that runs out tangentially through the silhouette
      const fade = G.fade && { c: ap(F, st[G.fade.bone].pos), r0: G.fade.r[0], r1: G.fade.r[1] };
      // OCCLUDERS: parts drawn above the same-material parts but below the group (the neck over the cardigan's collar) hide
      // part of them — the line must not show there (it ran over the neck as a pink hairline: "clothing bleeding onto
      // limbs", client). They are painted black into the line's mask, in z order, over the white material parts.
      const zb0 = Math.min(...parts.filter((q) => behind.includes(q.id)).map((q) => q.z));
      const occ = parts.filter((q) => !G.match.test(q.id) && !behind.includes(q.id) && q.z > zb0 && q.z < zmin && !q.stroke && q.fill !== G.material && q.fill !== 'none' && !(q.opacity !== undefined && q.opacity <= 0.002)).map((q) => q.id);
      for (const p of inG) if (p.fill === G.material) parts.push({ ...p, id: `${p.id}.ol`, z: zmin - 0.002, fill: 'none', stroke: G.line, strokeW: 2 * G.w, clip: behind, clipOcc: occ.length ? { white: behind, black: occ } : undefined, clipKeep: p.clip, skin: undefined, fade });   // clipKeep: the part's own clip (a keyhole) still bounds its outline — else the line traces the hidden rest of the shape
    }
    return parts.map((p, i) => [p, i]).sort((a, b) => a[0].z - b[0].z || a[1] - b[1]).map((x) => x[0]);
  }

  /** Output frame: pixel size + viewBox in model px (H·Hpx). 'still' = 1080x1920 framed on C.frame.bbox; 'ref' = the reference image frame. */
  function view(opts = {}) {
    if (opts.frame === 'box') {   // detail inspection: an H-unit box [[x0,y0],[x1,y1]] rendered at opts.width px wide
      const [[x0, y0], [x1, y1]] = opts.box, W = opts.width || 1200, Ht = Math.round(W * (y1 - y0) / (x1 - x0));
      return { W, Ht, vb: [x0 * Hpx, y0 * Hpx, (x1 - x0) * Hpx, (y1 - y0) * Hpx] };
    }
    if ((opts.frame || 'still') === 'ref') {
      const [rw, rh] = C.ref.sizePx, g = C.ref.groundPx;
      return { W: rw, Ht: rh, vb: [-g[0], -g[1], rw, rh] };
    }
    const W = opts.width || 1080, Ht = opts.height || 1920;
    const [[x0, y0], [x1, y1]] = C.frame.bbox;
    const s = (opts.fill || C.frame.fill || 0.8) * Ht / ((y1 - y0) * Hpx);
    const cx = (x0 + x1) / 2 * Hpx, cy = (y0 + y1) / 2 * Hpx + (C.frame.dy || 0) * Hpx;
    return { W, Ht, vb: [cx - W / s / 2, cy - Ht / s / 2, W / s, Ht / s] };
  }
  /** Posed bounds in H (all anchors + handles, flipped for facing): [[x0,y0],[x1,y1]]. Used to frame stills/tours so nothing is cropped. */
  function bounds(pose = {}) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of build(pose)) for (const q of [...p.geom.P, ...p.geom.hin, ...p.geom.hout]) {
      const v = ap(p.M, q); x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]);
    }
    return [[x0, y0], [x1, y1]];
  }
  const toScreen = (p, opts = {}) => { const { W, vb } = view(opts), k = W / vb[2]; return [(p[0] * Hpx - vb[0]) * k, (p[1] * Hpx - vb[1]) * k]; };
  const f2 = (v) => (Math.round(v * 1000) / 1000).toString();

  function toSVG(pose = {}, opts = {}) {
    const parts = build(pose);
    const { W, Ht, vb } = view(opts);
    const bg = opts.bg ?? '#ffffff', sil = opts.silhouette;
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Ht}" viewBox="${vb.map(f2).join(' ')}" shape-rendering="geometricPrecision">`;
    if (bg !== 'none') out += `<rect x="${f2(vb[0])}" y="${f2(vb[1])}" width="${f2(vb[2])}" height="${f2(vb[3])}" fill="${bg}"/>`;
    if (opts.ground && !sil && C.ground) out += C.ground(pose, opts.ground, Hpx);
    out += `<g id="${C.name}">`;
    const tfOf = (m) => `matrix(${[m[0], m[1], m[2], m[3], m[4] * Hpx, m[5] * Hpx].map(f2).join(' ')})`;
    const byId = Object.fromEntries(parts.map((p) => [p.id, p])), outDefs = new Set();
    // CLIP-OUT (p.clipOut = {part, inset}): the part shows only OUTSIDE another part shrunk by `inset` (H) — fingers seen
    // curling round the rim of the bump from behind: the hand is drawn in front, but everything well inside the bump's
    // outline is cut away, so only what lies over the rim band and beyond it shows. One even-odd path: frame minus hole.
    const clipOutDef = (co) => {
      const q = byId[co.part]; if (!q) return null;
      const id = `clipout-${co.part.replace(/[^\w-]/g, '_')}-${Math.round(co.inset * 1000)}${co.ring ? '-r' : ''}`;
      if (outDefs.has(id)) return id;
      const P = q.geom.P.map((v) => ap(q.M, v)), hin = q.geom.hin.map((v) => ap(q.M, v)), hout = q.geom.hout.map((v) => ap(q.M, v));
      const c = P.reduce((a, v) => [a[0] + v[0] / P.length, a[1] + v[1] / P.length], [0, 0]);
      const R = P.reduce((a, v) => a + Math.hypot(v[0] - c[0], v[1] - c[1]), 0) / P.length, k = Math.max(0.05, 1 - co.inset / R);
      const sc = (v) => [c[0] + k * (v[0] - c[0]), c[1] + k * (v[1] - c[1])];
      const hole = pathD({ P: P.map(sc), hin: hin.map(sc), hout: hout.map(sc) }, Hpx);
      // co.ring: show only the BAND between the part's outline and the shrunk copy (fingertips lying on the near side of the
      // bump just inside its rim; anything beyond the rim is behind the bump and stays hidden)
      const r = co.ring ? pathD({ P, hin, hout }, Hpx) : `M${f2(vb[0])} ${f2(vb[1])}h${f2(vb[2])}v${f2(vb[3])}h${f2(-vb[2])}Z`;
      out += `<clipPath id="${id}"><path clip-rule="evenodd" d="${r} ${hole}"/></clipPath>`; outDefs.add(id); return id;
    };
    // CONTACT SHADOW (C.contactShadow, from the reels rig): each hand casts one near-hard, faint copy of itself (all its
    // parts as ONE shape, so overlaps never darken), offset a few screen px, onto the body parts drawn behind it — "on her"
    // without looking stuck on. No blur filter (blur rasterised differently out of order). Emitted just before the hand.
    const CS = !sil && C.contactShadow, shadows = [];
    if (CS) {
      const k = W / vb[2], onRe = new RegExp(CS.on);
      for (const g of CS.groups) {
        const re = new RegExp(g.match), hp = parts.filter((p) => re.test(p.id) && !p.stroke && !p.id.endsWith('.ol') && !(p.opacity <= 0.002) && p.fill !== 'none');
        if (!hp.length) continue;
        const zh = Math.min(...hp.map((p) => p.z)), gRe = g.on ? new RegExp(g.on) : onRe, on = [...new Set(parts.filter((p) => gRe.test(p.id) && !p.stroke && p.z < zh && !(p.opacity <= 0.002))
          .flatMap((p) => (p.clip ? (Array.isArray(p.clip) ? p.clip : [p.clip]).map((id) => byId[id]).filter(Boolean) : [p])))];   // a clipped surface (a rim shade) counts only as its clip region
        if (on.length) shadows.push({ zh, hp, on, id: `shadow-${g.match.replace(/[^\w]/g, '')}` });
      }
      shadows.sort((a, b) => a.zh - b.zh);
      var emitShadow = (S) => {
        const [dx, dy] = (CS.offset || [4, 6]).map((v) => v / k);
        out += `<clipPath id="${S.id}">${S.on.map((c) => `<path d="${pathD(c.geom, Hpx)}" transform="${tfOf(c.M)}"/>`).join('')}</clipPath>`
          + `<g clip-path="url(#${S.id})"><g opacity="${f2(CS.opacity ?? 0.12)}"><g transform="translate(${f2(dx)} ${f2(dy)})">`
          + S.hp.map((c) => `<path d="${pathD(c.geom, Hpx)}" fill="${CS.color || '#000'}" transform="${tfOf(c.M)}"/>`).join('') + '</g></g></g>';
      };
    }
    for (const p of parts) {
      while (shadows.length && p.z >= shadows[0].zh) emitShadow(shadows.shift());
      if (p.opacity !== undefined && p.opacity <= 0.002) continue;
      let wrap = 0;
      if (p.clipKeep) { const ks = (Array.isArray(p.clipKeep) ? p.clipKeep : [p.clipKeep]).map((id) => byId[id]).filter(Boolean);
        if (ks.length) { const kid = `keep-${p.id.replace(/[^\w-]/g, '_')}`; out += `<clipPath id="${kid}">${ks.map((c) => `<path d="${pathD(c.geom, Hpx)}" transform="${tfOf(c.M)}"/>`).join('')}</clipPath><g clip-path="url(#${kid})">`; wrap++; } }
      if (p.clipOut && !sil) { const id = clipOutDef(p.clipOut); if (id) { out += `<g clip-path="url(#${id})">`; wrap++; } }
      emit(p);
      out += '</g>'.repeat(wrap);
    }
    function emit(p) {
      const op = !sil && p.opacity !== undefined && p.opacity < 0.998 ? ` opacity="${f2(p.opacity)}"` : '';
      if (p.stroke && sil) return;
      const paint = p.stroke ? `fill="none" stroke="${p.stroke}" stroke-width="${f2(p.strokeW * Hpx)}" stroke-linejoin="round"` : `fill="${sil ? '#000' : p.fill}"`;
      const path = `<path id="${p.id}" d="${pathD(p.geom, Hpx)}" ${paint} transform="${tfOf(p.M)}"${op}/>`;
      // clip: a part may be masked by one or more other parts (cut-out "masking": shading/cast shadows can never
      // leak past the form they sit on, whatever the pose). Clip sources are posed exactly like the part itself.
      const clips = (Array.isArray(p.clip) ? p.clip : p.clip ? [p.clip] : []).map((id) => byId[id]).filter(Boolean);
      if (!clips.length) { if (!p.stroke) out += path; return; }   // an outline with nothing behind it is never drawn
      const cid = `clip-${p.id.replace(/[^\w-]/g, '_')}`;
      out += `<clipPath id="${cid}">${clips.map((c) => `<path d="${pathD(c.geom, Hpx)}" transform="${tfOf(c.M)}"/>`).join('')}</clipPath>`;
      let mk = '';
      if (p.clipOcc && !p.fade) {   // visible-region mask: the material parts white, the parts covering them black, in z order
        const L = [...p.clipOcc.white.map((id) => [byId[id], '#fff']), ...p.clipOcc.black.map((id) => [byId[id], '#000'])].filter((x) => x[0]).sort((x, y) => x[0].z - y[0].z);
        out += `<mask id="${cid}-o" maskUnits="userSpaceOnUse" x="${f2(vb[0])}" y="${f2(vb[1])}" width="${f2(vb[2])}" height="${f2(vb[3])}">${L.map(([c, col]) => `<path d="${pathD(c.geom, Hpx)}" fill="${col}" transform="${tfOf(c.M)}"/>`).join('')}</mask>`;
        mk = ` mask="url(#${cid}-o)"`;
      }
      if (p.fade) {   // radial mask: hidden inside r0, shown beyond r1 (userSpaceOnUse, model px)
        const { c, r0, r1 } = p.fade, R1 = r1 * Hpx, o = Math.max(0, Math.min(1, r0 / r1));
        out += `<radialGradient id="${cid}-g" gradientUnits="userSpaceOnUse" cx="${f2(c[0] * Hpx)}" cy="${f2(c[1] * Hpx)}" r="${f2(R1)}"><stop offset="${f2(o)}" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>`
             + `<mask id="${cid}-m" maskUnits="userSpaceOnUse" x="${f2(vb[0])}" y="${f2(vb[1])}" width="${f2(vb[2])}" height="${f2(vb[3])}"><rect x="${f2(vb[0])}" y="${f2(vb[1])}" width="${f2(vb[2])}" height="${f2(vb[3])}" fill="url(#${cid}-g)"/></mask>`;
        mk = ` mask="url(#${cid}-m)"`;
      }
      out += `<g clip-path="url(#${cid})"${mk}>${path}</g>`;
    }
    return out + '</g></svg>';
  }

  function jointWorld(pose = {}) {
    const st = solve(pose);
    const flip = (pose.facing || C.design.facing) === 'left' ? -1 : 1;
    return Object.fromEntries(BONES.map((b) => [b.id, [st[b.id].pos[0] * flip, st[b.id].pos[1]]]));
  }
  /** World position (H) of any named joint carried by a bone in this pose. */
  const carry = (st, bone, jointName) => ap(st[bone].M, sub(J[jointName], J[BONE[bone].joint]));

  const api = { C, J, BONES, BONE, restAngle, solve, build, bounds, view, toScreen, toSVG, jointWorld, carry, scrAng, projLen, planeFx, fx, toCam };
  return api;
}
