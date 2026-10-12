// shot.js — the public entry point other repos use to put a character in their own scene (pregnancy-plus-reels does).
// Pure ES module: loads in a browser from any http server that serves this repo, and in Node from a file:// URL.
//
//   import { loadCharacter } from '<this repo>/engine/shot.js';
//   const mum = await loadCharacter('mum2');
//   const shot = await mum.shot('nausea-to-belly');          // characters/mum2/anims/nausea-to-belly.json
//   shot.duration, shot.fps, shot.loop
//   group.innerHTML = shot.svgAt(t);                          // an <svg> string, transparent, 1080×1920 framed on the character
//   group.innerHTML = shot.svgAt(t, { width: 540, height: 960 });   // any rig.toSVG option (frame, box, width, bg, ground…)
//   group.innerHTML = await mum.still('bump-rest');           // one pose (characters/mum2/poses/bump-rest.json)
//
// Every frame is a pure function of t (engine/anim.js), so the host can render frames in any order. The host owns
// placement (wrap the <svg> in a transform), timing (map its film time onto the shot's t) and everything around her.
// The SVG carries ids (the character's <g id="name">, clip paths): one instance of a character per page.
import { createRig } from './rig.js';
import { makeAnim } from './anim.js';
import { expandHands } from './handlib.js';

const ROOT = new URL('../', import.meta.url);

async function readJSON(url) {
  if (url.protocol === 'file:') {
    const fs = await import('node:fs');
    return JSON.parse(fs.readFileSync(url, 'utf8'));
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`shot.js: ${r.status} loading ${url}`);
  return r.json();
}

/** Every pose a shot spec names (keys, channel tracks, pins, reaches), as tools/char_anim.mjs collects them. */
export function posesOf(spec) {
  const keys = [...spec.keys, ...Object.values(spec.tracks || {}).flatMap((t) => (Array.isArray(t) ? t : t.keys))].map((k) => k.pose);
  const pins = [...Object.values(spec.pins?.plant || {}), ...Object.values(spec.pins?.channels || {}).map((c) => c.plant).filter(Boolean)];
  const reach = Object.values(spec.reach || {}).flat().map((e) => e.pose);
  return [...new Set([...keys, ...pins, ...reach])].filter(Boolean);
}

export async function loadCharacter(name, { root = ROOT } = {}) {
  const dir = new URL(`characters/${name}/`, root);
  const C = (await import(new URL('character.js', dir).href)).default;
  const rig = createRig(C);
  const handLib = Object.fromEntries(await Promise.all((C.handLibrary || []).map(async (h) => [h, await readJSON(new URL(`poses/hands/${h}.json`, dir))])));
  const poses = {};
  const pose = async (p) => (poses[p] ??= expandHands(await readJSON(new URL(`poses/${p}.json`, dir)), handLib, C.handSides));
  const svg = (p, opts = {}) => rig.toSVG(p, { bg: 'none', ...opts });

  return {
    name, C, rig, pose,
    /** One pose as an SVG string (transparent unless opts.bg is set). */
    async still(poseName, opts) { return svg(await pose(poseName), opts); },
    /** A shot (characters/<name>/anims/<anim>.json): duration, fps, loop, poseAt(t), svgAt(t, opts). */
    async shot(anim) {
      const spec = await readJSON(new URL(`anims/${anim}.json`, dir));
      const lib = Object.fromEntries(await Promise.all(posesOf(spec).map(async (p) => [p, await pose(p)])));
      const A = makeAnim(spec, lib, { rig, C, quiet: true });
      return { name: anim, spec, duration: spec.duration, fps: spec.fps, loop: !!spec.loop, poseAt: A.poseAt, svgAt: (t, opts) => svg(A.poseAt(t), opts) };
    },
  };
}
