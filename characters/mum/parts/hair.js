// hair.js — bone: head. Anchor counts (fixed):
//   hair.back 27 · hair.loop 10 · hair.shade.nape 8 · hair.shade.bunCurl 8 · hair.shade.bunBase 12 · hair.shade.crownNotch 3
//   hair.fringe 18 · hair.strand.sweep 4 · hair.strand.far 14 · hair.strand.near 18
import { part, lp, st, scaled } from './_util.js';

export const ANCHORS = { 'hair.back': 27, 'hair.loop': 10, 'hair.shade.nape': 8, 'hair.shade.bunCurl': 8, 'hair.shade.bunBase': 12, 'hair.shade.crownNotch': 3,
  'hair.fringe': 18, 'hair.strand.sweep': 4, 'hair.strand.far': 14, 'hair.strand.near': 18 };

export function build({ P, prop }) {
  const h = prop.head, s = prop.design.headScale;
  const sc = (g) => scaled(g, s);
  return [
    part('hair.back', 'head', 10, P.hair, sc(lp(h.hairBack))),
    part('hair.loop', 'head', 11, P.hair, sc(st(h.hairLoop))),
    part('hair.shade.nape', 'head', 12, P.hairShade, sc(st(h.hairShade[0]))),
    part('hair.shade.bunCurl', 'head', 12, P.hairShade, sc(st(h.hairShade[1]))),
    part('hair.shade.bunBase', 'head', 81, P.hairShade, sc(st(h.hairShade[2]))),
    part('hair.shade.crownNotch', 'head', 81, P.hairShade, sc(lp(h.crownNotch))),
    part('hair.fringe', 'head', 80, P.hair, sc(lp(h.fringe))),
    part('hair.strand.sweep', 'head', 81, P.hairShade, sc(st(h.fringeStrands[0]))),
    part('hair.strand.far', 'head', 84, P.hair, sc(st(h.strandFar))),
    part('hair.strand.near', 'head', 84, P.hair, sc(st(h.strandNear))),
  ];
}
