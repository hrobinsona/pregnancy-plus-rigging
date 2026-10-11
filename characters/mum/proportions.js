// proportions.js — every dimension the parts use. Units: H (head unit = skull-top to chin, measured).
// Positions are read off a measurement grid laid over ref/reference.png (reference px), then converted to
// H units relative to the ground point. Parts receive shapes in their bone's LOCAL space (pivot at 0,0).
// Anchor tables are construction points for a redraw (6–19 anchors per part), not sampled contours.
import M from './ref/measurements.json' with { type: 'json' };

export const H = M.head_H_px;                 // 210 px in the reference
export const HEIGHT_HEADS = M.height_in_heads; // 5.61 (seated)
const G = M.landmarks.ground;
const at = (X, Y) => [(X - G[0]) / H, (Y - G[1]) / H];
const lm = (k) => at(...M.landmarks[k]);

// ---------------------------------------------------------------- joints (rest, H units)
export const joints = {
  root: [0, 0],
  pelvis: at(540, 740),        // centre of mass on the seat
  spineLower: at(565, 640),
  spineUpper: at(580, 530),
  chest: at(580, 430),
  neck: at(558, 330),
  head: at(555, 272),          // skull base, behind the jaw
  headTip: lm('skullTop'),
  clavicleNear: at(548, 345), shoulderNear: at(452, 402), elbowNear: at(420, 590), wristNear: at(558, 638),
  handNearTip: at(668, 640),
  clavicleFar: at(595, 345), shoulderFar: at(690, 395), elbowFar: at(735, 582), wristFar: at(716, 562),
  handFarTip: at(597, 550),
  hipNear: at(500, 742), kneeNear: at(655, 752), ankleNear: at(637, 1098), toeNear: lm('toeNear'),
  hipFar: at(600, 718), kneeFar: at(790, 745), ankleFar: at(774, 1096), toeFar: lm('toeFar'),
  bellyBase: at(610, 690), bellyApex: lm('bellyApex'),
};

// shape(jointKey, [[X,Y,flag?],...]) -> anchors in that joint's local space (H units)
const shape = (j, pts) => pts.map(([X, Y, f]) => { const p = at(X, Y); return [p[0] - joints[j][0], p[1] - joints[j][1], f]; });
// line(j, pts, widths_px) -> stroke centreline (local, H) + widths (H)
const line = (j, pts, w) => ({ pts: shape(j, pts).map(([x, y]) => [x, y]), w: w.map((v) => v / H) });
const disc = (j, X, Y, rx, ry = rx) => ({ c: shape(j, [[X, Y]])[0].slice(0, 2), rx: rx / H, ry: ry / H });

// ---------------------------------------------------------------- design constants
export const design = {
  shapeLanguage: 'soft-rounded',
  tension: 1.05,            // default Bézier tension for smooth anchors
  headScale: 1.0,           // scales all head parts about the head joint
  facing: 'right',          // reference faces screen-right; 'left' mirrors the whole rig
  rimOffset: [-1.5 / 210, 2 / 210, 2.6 / 210],  // contact-shadow rim: drop [x, y] + outward offset (H units) for skin-on-skin overlaps
};

// ---------------------------------------------------------------- HEAD (bone: head)
export const head = {
  hairBack: shape('head', [[489, 29], [509, 36, 0.5], [528, 40], [546, 53], [553, 73, 0.3], [584, 68], [622, 80], [646, 99], [666, 119], [679, 152],
    [674, 186], [668, 210], [610, 250], [530, 268], [482, 262], [466, 250], [452, 226], [440, 192], [449, 152], [446, 136, 'c'], [429, 128], [420, 115], [425, 101, 0.4],
    [423, 80], [434, 58], [449, 46], [465, 38]]),
  hairLoop: line('head', [[434, 111], [426, 118], [422, 129], [428, 140], [440, 145], [448, 141]], [0, 7, 8, 8, 7, 0]),
  hairShade: [
    line('head', [[458, 140], [455, 175], [457, 205], [467, 234], [486, 257]], [0, 18, 20, 18, 0]),   // back-of-head crescent, kept inside the outline
    line('head', [[468, 44], [482, 51], [494, 61], [501, 73], [503, 86]], [0, 8, 9, 8, 0]),  // bun curl (as drawn in the reference): splits the top lobe
    line('head', [[446, 121], [468, 102], [497, 88], [530, 81], [562, 78], [580, 77], [592, 79]], [0, 4.5, 5.5, 5.5, 4.5, 2.5, 0]),  // hair-tie band: arcs over the skull, inside the outline
  ],
  crownNotch: shape('head', [[591, 70, 'c'], [607, 74, 'c'], [603, 103, 'c']]),   // small dark notch where the band meets the parting
  fringeStrands: [
    line('head', [[590, 80], [585, 94], [576, 110]], [0, 5, 0]),                       // short sweep from the part
    line('head', [[612, 84], [626, 92], [640, 104]], [0, 4, 0]),                      // far side of the part
  ],
  face: shape('head', [[595, 103], [640, 106], [656, 128, 0.9], [659, 166], [660, 211], [652, 246], [633, 271], [606, 285],
    [575, 283], [545, 272], [515, 253], [503, 205], [522, 150], [555, 114]]),
  // wedge (measured): ~6 px at the ear growing to ~20 px at the throat, front end cut flush with the neck's front contour
  neckShadow: shape('head', [[518, 248], [560, 262], [593, 273], [590, 299], [575, 302], [561, 295], [545, 281], [528, 264]]),
  ear: shape('head', [[491, 192], [503, 195], [508, 214], [504, 234], [492, 240], [481, 227], [480, 204]]),
  earInner: line('head', [[499, 206], [489, 211], [490, 226]], [0, 4, 0]),
  // hairline is an S: upper half bows onto the forehead, lower half turns concave toward the ear
  fringe: shape('head', [[565, 76], [618, 82], [648, 100], [664, 130], [660, 154, 'c'], [648, 136], [631, 121], [612, 112], [590, 113],
    [574, 125], [564, 143], [557, 161], [550, 176], [537, 190], [521, 205, 0.6], [496, 194], [470, 150], [505, 100]]),
  strandFar: line('head', [[673, 194], [677, 222], [680, 237], [677, 251], [672, 263], [664, 275], [658, 290], [657, 307]], [0, 17, 17, 15, 14, 10, 6, 0]),
  strandNear: line('head', [[514, 200], [509, 210], [505, 222], [505, 234], [510, 246], [515, 258], [514, 270], [506, 282], [500, 293], [499, 306]], [0, 10, 10, 10, 11, 12, 11, 9, 6, 0]),
  brows: { near: line('head', [[553, 167], [567, 159], [583, 162]], [5, 8, 5.5]), far: line('head', [[625, 157], [638, 152], [651, 157]], [5, 7.5, 5]) },  // round caps
  eyes: { near: disc('head', 565, 195.5, 9.6, 10.4), far: disc('head', 636.5, 186.5, 9.3, 10.5) },
  // upper-lid arcs (line token) sit on the top of each eye and curl down past the outer corner
  lids: { near: line('head', [[557, 189], [564, 185], [573, 184], [580, 189]], [2.5, 3.6, 3.6, 3]), far: line('head', [[629, 180], [637, 175.5], [645, 176], [651, 182]], [2.5, 3.6, 3.6, 3]) },
  nose: line('head', [[612, 196], [617, 204], [621, 210], [622, 216], [617, 219]], [3, 4, 4, 4, 3]),   // thin round-capped hook (measured)
  cheeks: { near: disc('head', 554, 226, 14, 13), far: disc('head', 649, 215, 10.5, 12) },
};
// expressions keep identical anchor counts (mouth: 5-point stroke = 8 anchors; eyes: 4-anchor ellipses)
export const expressions = {
  'soft-smile': { mouth: line('head', [[586, 238], [596, 244], [606, 246], [617, 243.5], [626, 237]], [2.5, 4.5, 5, 4.5, 2.5]), eyeSquash: 1.0 },  // round caps
  neutral: { mouth: line('head', [[589, 242], [598, 244], [607, 245], [616, 244], [624, 241]], [3, 4.5, 5, 4.5, 3]), eyeSquash: 1.0 },
};

// ---------------------------------------------------------------- FACE RIG (blend-shape targets, shared anchor counts)
// A pose's face is a set of weights per channel, e.g. { lid: {squeeze: 1}, brow: {worried: 1}, mouth: {queasy: 1}, cheek: {sick: 1} }.
// Each target is a stroke with the same point count as its siblings, so blends are point-to-point.
export const faceShapes = {
  lid: {
    open: head.lids,
    // squeezed shut (discomfort): a tight arch across the eye's middle
    squeeze: { near: line('head', [[556, 197.5], [562, 193.5], [570, 193], [577, 196]], [2.5, 4.2, 4.2, 3]),
               far: line('head', [[628, 188.5], [634, 184.5], [642, 184.5], [648, 188.5]], [2.5, 4.2, 4.2, 3]) },
    // softly closed (content): a gentle smile-shaped lid line
    soft: { near: line('head', [[556, 193.5], [562, 197.5], [570, 198], [577, 194.5]], [2.5, 3.6, 3.6, 2.5]),
            far: line('head', [[628, 184.5], [634, 189], [642, 189], [648, 185]], [2.5, 3.6, 3.6, 2.5]) },
  },
  // gaze: iris offset targets (ref px -> H). 'down' looks at the bump (down and a little forward); lids follow the iris.
  gaze: { front: [0, 0], down: [2 / H, 3.5 / H], hand: [6 / H, 6.5 / H], back: [-1.2 / H, -0.3 / H] },
  // cheeks rise with the warm smile (H units at full 'warm' weight)
  cheekLift: [1 / H, -6 / H],
  squintLift: 3.5 / H,          // lower lid pushes the iris bottom up at full 'warm'
  gazeLidFollow: [0.5, 0.75],
  // eye squash target line (where the iris collapses to when the lid closes)
  eyeCloseY: { near: shape('head', [[565, 195.5]])[0][1], far: shape('head', [[636.5, 187]])[0][1] },  // local H units
  brow: {
    neutral: head.brows,
    worried: { near: line('head', [[553, 168.5], [567, 162.5], [582, 155]], [5, 8, 5.5]), far: line('head', [[626, 150], [638, 151], [651, 157.5]], [5, 7.5, 5]) },
    relaxed: { near: line('head', [[553, 165], [567, 156.5], [583, 159.5]], [5, 8, 5.5]), far: line('head', [[625, 154.5], [638, 149.5], [651, 154.5]], [5, 7.5, 5]) },
  },
  mouth: {
    smile: expressions['soft-smile'].mouth,
    // tender: corners lift ~4.5 px and the line widens ~12% (the cheeks rise with it, see cheekLift)
    warm: line('head', [[583.2, 233.5], [594.5, 243.5], [606, 247.5], [618.5, 243], [628.8, 232.5]], [2.5, 4.8, 5.4, 4.8, 2.5]),
    neutral: expressions.neutral.mouth,
    queasy: line('head', [[590, 244], [597, 241], [605, 244], [613, 241], [621, 244]], [2.5, 3.6, 3.6, 3.6, 2.5]),
    // relieved exhale: small pursed 'o'
    exhale: line('head', [[603, 243.5], [605, 240], [609, 239.5], [611.5, 242.5], [608.5, 246]], [5, 5.5, 5.5, 5.5, 5]),
  },
};

// ---------------------------------------------------------------- NECK & CHEST
export const neck = {
  neck: shape('neck', [[520, 250], [598, 262], [594, 300], [595, 316], [612, 329], [590, 345], [520, 345], [497, 334], [516, 316], [521, 290]]),
};
export const chest = {
  skin: shape('chest', [[505, 326, 'c'], [560, 322], [616, 329, 'c'], [636, 345], [652, 370], [662, 392], [640, 440], [540, 440], [512, 400], [490, 340]]),
  cleavage: line('chest', [[604, 398], [607, 407], [606, 415]], [0, 3, 0]),
};

// ---------------------------------------------------------------- TOP (bone: spineUpper)
export const top = {
  body: shape('spineUpper', [[520, 372, 'c'], [536, 392], [556, 405], [580, 413], [605, 417], [630, 409], [645, 393], [653, 370, 'c'],
    [666, 372, 'c'], [683, 392], [697, 414], [705, 448], [700, 482], [688, 508], [700, 560], [640, 688], [560, 684], [486, 672], [500, 560], [510, 450]]),
  underBustNear: line('spineUpper', [[531, 498], [552, 505], [574, 503], [594, 493]], [0, 9, 8, 0]),
  underBustFar: line('spineUpper', [[636, 494], [662, 501], [684, 503], [699, 490], [704, 472]], [0, 9, 11, 9, 0]),
  lapCrease: line('spineUpper', [[480, 702], [490, 679], [510, 667], [540, 663], [570, 666], [600, 672]], [0, 11, 9, 6, 3, 0]),
};

// ---------------------------------------------------------------- BELLY (bone: belly, 4x4 lattice)
// right-side anchors follow measurements.json belly_profile (unoccluded rows y>=590)
export const belly = {
  body: shape('bellyBase', [[560, 507], [625, 503], [676, 510], [702, 533], [712, 574], [717, 609], [712, 640], [692, 660], [665, 672],
    [630, 680], [575, 678], [528, 655], [518, 600], [528, 540]]),
  underside: line('bellyBase', [[714, 614], [709, 636], [694, 654], [668, 667], [632, 675], [600, 678]], [0, 10, 13, 12, 8, 0]),
  // contact shadows where the hands press on the belly (the reference draws both)
  shadeNearHand: line('bellyBase', [[505, 595], [540, 603], [575, 610], [606, 611]], [0, 7, 6, 0]),
  shadeFarHand: line('bellyBase', [[612, 579], [640, 583], [668, 586], [690, 589]], [0, 6, 6, 0]),
};

// ---------------------------------------------------------------- CARDIGAN + ARMS
export const cardigan = {
  // upper sleeve + elbow is ONE rounded mass ending at the elbow (~y 618); the forearm is foreshortened behind the hand
  farSleeve: shape('shoulderFar', [[612, 326, 'c'], [648, 329], [684, 345], [708, 378], [722, 420], [733, 455], [747, 489], [766, 520],
    [782, 548], [783, 578], [774, 603], [757, 619], [738, 616], [715, 585], [690, 520], [660, 440], [635, 390]]),
  farSleeveFolds: [
    line('shoulderFar', [[637, 334], [650, 350], [659, 369]], [0, 8, 0]),
    line('shoulderFar', [[677, 379], [686, 400], [690, 424]], [0, 8, 0]),
    line('shoulderFar', [[695, 452], [705, 500], [716, 548], [725, 590]], [0, 12, 12, 0]),   // far lapel band
    line('shoulderFar', [[720, 524], [745, 513], [768, 531]], [0, 7, 0]),
  ],
  // far sleeve cuff sits OVER the wrist: its left edge is the cuff mouth, bulging toward the hand
  // sleeve fold under the forearm's end (bone upperArm.far): where the reference puts its cuff shade
  farCuff: line('shoulderFar', [[726, 607], [742, 605], [754, 596], [760, 584]], [0, 6, 5, 0]),
  // far front panel: a narrow diagonal strip behind the sleeve, its flat bottom tucked behind the far thigh
  farHem: shape('spineLower', [[700, 520, 'c'], [742, 525], [748, 590], [747, 622], [753, 645], [762, 676, 'c'], [698, 676, 'c'], [688, 620], [690, 560]]),
  farHemFold: line('spineLower', [[708, 566], [717, 598], [728, 632], [739, 668]], [0, 12, 12, 0]),
  nearPanel: shape('spineUpper', [[485, 326, 'c'], [503, 329, 'c'], [514, 352], [522, 380], [528, 440], [530, 510], [526, 575], [510, 630],
    [496, 665], [487, 725], [476, 786], [462, 803], [436, 803], [410, 790], [399, 750], [402, 712], [418, 670], [425, 520], [440, 380]]),
  nearPanelFold: line('spineUpper', [[422, 708], [434, 680], [455, 660], [484, 651]], [0, 9, 7, 0]),
  nearUpper: shape('shoulderNear', [[488, 326, 'c'], [500, 345], [484, 420], [482, 520], [470, 585], [423, 622], [380, 611], [366, 568],
    [377, 505], [388, 456], [398, 413], [415, 371], [446, 337]]),
  nearUpperFolds: [
    line('shoulderNear', [[477, 332], [490, 357], [500, 384]], [0, 8, 0]),
    line('shoulderNear', [[469, 392], [476, 450], [479, 512], [476, 562]], [0, 9, 9, 0]),
  ],
  nearForearm: shape('elbowNear', [[405, 545], [452, 546], [492, 566], [500, 596, 0.9], [493, 621], [489, 646, 'c'], [452, 646], [411, 636], [379, 613], [372, 575]]),
  // sleeve-opening shadow just behind the forearm's rounded end
  nearCuffRim: line('elbowNear', [[509, 591], [493, 604], [484, 626], [487, 650]], [0, 6, 6, 0]),
  nearSleeveShadow: line('spineUpper', [[426, 646], [444, 652], [466, 657], [486, 657]], [0, 8, 7, 0]),
  // corrective (smart-bone): outer edge of the forearm sleeve, fades in as the arm lifts so the forearm reads against the upper sleeve
  nearForearmEdge: line('elbowNear', [[487, 642], [452, 641], [416, 629], [389, 607]], [0, 7, 7, 0]),
  nearForearmFolds: [
    line('elbowNear', [[406, 568], [440, 551], [481, 538]], [0, 8, 0]),
    line('elbowNear', [[428, 531], [452, 534], [472, 527]], [0, 6, 0]),
  ],
};

// hands: 18 anchors each, start at wrist-top, clockwise. Variants must keep 18 anchors.
// hands: 18 anchors each, start at wrist-top, clockwise. Variants must keep 18 anchors.
// Construction: pinched wrist (~0.2 H) flaring to the palm (~0.33 H); fingers ~35-40% of hand length with
// staggered tips and corner notches; creases run from each notch back to the knuckle line in skinLine.
export const hands = {
  near: {
    // hand only (bone hand.near, pivot = wrist). Knuckle arc rises over the back of the hand, thumb merged into it;
    // fingers stacked near-horizontal (as in the reference), shallow notches, tips on a convex arc (middle/ring longest).
    'cupping-belly': shape('wristNear', [[552, 618], [576, 616], [600, 609], [621, 613, 1.5], [617, 617, 1.2], [636, 616], [647, 623, 1.6],
      [644, 628, 0.5], [667, 635, 1.5], [663, 642, 0.5], [672, 649, 1.5], [665, 656, 0.5], [664, 663, 1.4], [645, 670], [598, 673],
      [570, 664], [553, 659], [545, 638]]),
    // forearm stub (bone forearm.near): rounded end in front of the sleeve, narrows ~15% into the wrist
    forearm: shape('elbowNear', [[511, 596, 1.2], [535, 604], [566, 620], [580, 640], [568, 662], [530, 652], [492, 646, 1.2], [488, 632], [496, 609]]),
    fingers: [
      line('wristNear', [[644, 628], [630, 628], [617, 627], [606, 626]], [3, 2.6, 1.6, 0.3]),
      line('wristNear', [[663, 642], [648, 642], [633, 641], [620, 640]], [3, 2.6, 1.6, 0.3]),
      line('wristNear', [[665, 656], [650, 656], [635, 655], [622, 654]], [3, 2.6, 1.6, 0.3]),
    ],
    thumb: line('wristNear', [[617, 617], [608, 618], [600, 617]], [0, 2.2, 0]),
  },
  far: {
    // hand only (bone hand.far, pivot = wrist). Back of hand dips into the wrist; palm ~0.27 H; fingers bend down-left.
    'cupping-belly': shape('wristFar', [[712, 546], [726, 560], [722, 579], [704, 580], [668, 577], [628, 577], [607, 573, 1.6],
      [611, 567, 0.5], [596, 563, 1.7], [603, 557, 0.5], [592, 551, 1.7], [602, 544, 0.5], [598, 537, 1.6], [609, 529], [640, 519],
      [672, 523], [694, 533], [706, 538]]),
    // forearm stub (bone forearm.far, pivot = where it leaves the sleeve): drops ~45 deg from the wrist, wrist end ~15% narrower
    forearm: shape('elbowFar', [[705, 539, 0.6], [726, 545], [739, 557], [744, 577, 0.7], [739, 597], [725, 601], [711, 590], [702, 578], [700, 557]]),
    fingers: [
      line('wristFar', [[602, 544], [614, 541], [626, 538], [637, 536]], [3, 2.6, 1.6, 0.3]),
      line('wristFar', [[603, 557], [616, 554], [629, 552], [640, 550]], [3, 2.6, 1.6, 0.3]),
      line('wristFar', [[611, 567], [622, 565], [634, 563], [644, 561]], [3, 2.6, 1.6, 0.3]),
    ],
    thumb: null,
  },
};

// ---------------------------------------------------------------- LEGS
const ribs = (j, xs) => xs.map((x) => line(j, [[x, 1060], [x, 1073], [x, 1087]], [4.5, 5, 3.5]));  // round-capped bars
export const legs = {
  far: {
    thigh: shape('hipFar', [[600, 662], [690, 655], [760, 662], [806, 680], [834, 704], [847, 737], [849, 770], [840, 797], [722, 800, 'c'],
      [650, 792], [590, 770], [575, 715]]),
    kneeWedge: shape('hipFar', [[752, 742, 'c'], [738, 772], [734, 797, 'c'], [722, 797, 'c'], [732, 770]]),
    shin: shape('kneeFar', [[790, 688], [835, 712], [849, 790], [845, 900], [836, 962], [818, 994], [779, 1001], [741, 995], [729, 968],
      [723, 900], [722, 800], [740, 712]]),
    cuff: shape('kneeFar', [[740, 993, 'c'], [814, 993, 'c'], [815, 1014], [808, 1033], [776, 1037], [745, 1033], [739, 1014]]),
    cuffShade: line('kneeFar', [[745, 999], [776, 1003], [807, 999]], [0, 6, 0]),
    ankle: shape('ankleFar', [[745, 1020, 'c'], [806, 1020, 'c'], [807, 1058, 'c'], [744, 1058, 'c']]),
    sock: shape('ankleFar', [[741, 1053, 'c'], [808, 1053, 'c'], [809, 1098], [822, 1128], [850, 1152], [872, 1165], [878, 1180], [866, 1195],
      [822, 1198], [788, 1182], [756, 1164], [735, 1148], [734, 1100]]),
    ribs: ribs('ankleFar', [748, 763, 782, 797]),
  },
  near: {
    thigh: shape('hipNear', [[470, 690], [520, 668], [580, 667], [640, 674], [680, 688], [704, 712], [716, 740], [720, 770], [715, 797], [690, 800, 'c'],
      [620, 797], [560, 799], [495, 795], [466, 787], [452, 742]]),
    thighEdge: line('hipNear', [[650, 676], [684, 690], [704, 712], [715, 740], [719, 768], [717, 796]], [0, 11, 12, 11, 9, 0]),
    kneeWedge: shape('hipNear', [[608, 742, 'c'], [597, 775], [594, 798, 'c'], [578, 798, 'c'], [590, 770]]),
    shin: shape('kneeNear', [[655, 690], [703, 712], [711, 800], [704, 880], [694, 950], [680, 994], [639, 1002], [598, 995], [585, 965],
      [579, 900], [580, 800], [605, 712]]),
    cuff: shape('kneeNear', [[600, 993, 'c'], [677, 993, 'c'], [677, 1014], [671, 1034], [637, 1038], [604, 1034], [599, 1014]]),
    cuffShade: line('kneeNear', [[606, 999], [637, 1003], [670, 999]], [0, 6, 0]),
    ankle: shape('ankleNear', [[604, 1020, 'c'], [669, 1020, 'c'], [670, 1058, 'c'], [603, 1058, 'c']]),
    sock: shape('ankleNear', [[601, 1055, 'c'], [670, 1055, 'c'], [671, 1104], [684, 1129], [712, 1157], [735, 1168], [747, 1185], [738, 1200],
      [695, 1207], [650, 1194], [608, 1173], [591, 1150], [603, 1100]]),
    ribs: ribs('ankleNear', [610, 625, 644, 660]),
  },
};

// framing for stills: reference figure bbox in H units (used so renders frame identically every time)
export const frame = { bbox: [at(M.bbox[0], M.bbox[1]), at(M.bbox[2], M.bbox[3])] };
export const REF_SIZE = M.size;
export const REF_GROUND = G;
