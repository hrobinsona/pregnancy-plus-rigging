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
import { mul, T, R, S, I, pathD, ap, sub, add } from './geom.js';

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
  function solve(pose = {}) {
    const st = {};
    for (const b of BONES) {
      const d = Math.max(b.min ?? -180, Math.min(b.max ?? 180, pose.bones?.[b.id] ?? 0));
      const user = pose.scale?.[b.id] || [1, 1];
      let pos, rot, anat = null, along = 1;
      const ps = b.parent ? st[b.parent] : null;
      if (!ps) { const r0 = pose.root || [0, 0]; pos = [J[b.joint][0] + r0[0], J[b.joint][1] + r0[1]]; }
      else pos = ap(ps.M, sub(J[b.joint], J[BONE[b.parent].joint]));
      if (b.plane) {
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

  /** All parts, z-sorted, each with a final matrix M (rigid) or posed geometry (skinned). */
  function build(pose = {}) {
    const st = solve(pose);
    const F = (pose.facing || C.design.facing || 'right') === 'left' ? S(-1, 1) : I();
    const ctx = { P: C.palette, C, J, pose, st, rig: api };
    const parts = [];
    for (const [name, mod] of Object.entries(C.modules)) {
      for (const p of mod.build(ctx)) {
        const want = mod.ANCHORS?.[p.id];
        if (want !== undefined && want !== p.geom.P.length) throw new Error(`${p.id}: ${p.geom.P.length} anchors, documented ${want}`);
        if (!st[p.bone]) throw new Error(`${p.id}: unknown bone ${p.bone}`);
        if (p.skin) parts.push({ ...p, module: name, anchors: p.geom.P.length, geom: skinGeom(p.geom, p.skin, st), M: F });
        else {
          const j = J[BONE[p.bone].joint];
          parts.push({ ...p, module: name, anchors: p.geom.P.length, M: mul(F, mul(st[p.bone].M, T(-j[0], -j[1]))) });
        }
      }
    }
    return parts.map((p, i) => [p, i]).sort((a, b) => a[0].z - b[0].z || a[1] - b[1]).map((x) => x[0]);
  }

  /** Output frame: pixel size + viewBox in model px (H·Hpx). 'still' = 1080x1920 framed on C.frame.bbox; 'ref' = the reference image frame. */
  function view(opts = {}) {
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
    for (const p of parts) {
      if (p.opacity !== undefined && p.opacity <= 0.002) continue;
      const m = p.M;
      const tf = `matrix(${[m[0], m[1], m[2], m[3], m[4] * Hpx, m[5] * Hpx].map(f2).join(' ')})`;
      const op = !sil && p.opacity !== undefined && p.opacity < 0.998 ? ` opacity="${f2(p.opacity)}"` : '';
      out += `<path id="${p.id}" d="${pathD(p.geom, Hpx)}" fill="${sil ? '#000' : p.fill}" transform="${tf}"${op}/>`;
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

  const api = { C, J, BONES, BONE, restAngle, solve, build, view, toScreen, toSVG, jointWorld, carry, scrAng, projLen, planeFx, fx };
  return api;
}
