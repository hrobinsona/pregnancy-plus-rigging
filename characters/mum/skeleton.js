// skeleton.js — bones: {id, parent, joint, aim, min, max, cap}
// joint: pivot (key into proportions.joints). aim: point the bone points at (rest angle = direction joint->aim).
// min/max: rotation limits in degrees RELATIVE to rest (positive = clockwise on screen).
// cap: radius (H units) of the joint disc that must stay covered when the bone is rotated to min/max.
// Local frames are world-aligned at rest (cut-out convention), so a pose of all zeros reproduces the reference.
import { joints } from './proportions.js';

export const BONES = [
  { id: 'root', parent: null, joint: 'root', aim: 'pelvis', min: 0, max: 0 },
  { id: 'pelvis', parent: 'root', joint: 'pelvis', aim: 'spineLower', min: -8, max: 8 },
  { id: 'spineLower', parent: 'pelvis', joint: 'spineLower', aim: 'spineUpper', min: -8, max: 8 },
  { id: 'spineUpper', parent: 'spineLower', joint: 'spineUpper', aim: 'chest', min: -8, max: 8 },
  { id: 'chest', parent: 'spineUpper', joint: 'chest', aim: 'neck', min: -8, max: 8 },
  { id: 'neck', parent: 'chest', joint: 'neck', aim: 'head', min: -12, max: 12, cap: 0.14 },
  { id: 'head', parent: 'neck', joint: 'head', aim: 'headTip', min: -18, max: 18, cap: 0.14 },
  { id: 'belly', parent: 'pelvis', joint: 'bellyBase', aim: 'bellyApex', min: -5, max: 5 },

  { id: 'clavicle.near', parent: 'chest', joint: 'clavicleNear', aim: 'shoulderNear', min: -8, max: 8 },
  { id: 'upperArm.near', parent: 'clavicle.near', joint: 'shoulderNear', aim: 'elbowNear', min: -85, max: 25, cap: 0.17 },
  { id: 'forearm.near', parent: 'upperArm.near', joint: 'elbowNear', aim: 'wristNear', min: -75, max: 40, cap: 0.16 },
  { id: 'hand.near', parent: 'forearm.near', joint: 'wristNear', aim: 'handNearTip', min: -35, max: 80, cap: 0.1 },

  { id: 'clavicle.far', parent: 'chest', joint: 'clavicleFar', aim: 'shoulderFar', min: -8, max: 8 },
  { id: 'upperArm.far', parent: 'clavicle.far', joint: 'shoulderFar', aim: 'elbowFar', min: -25, max: 25 },
  { id: 'forearm.far', parent: 'upperArm.far', joint: 'elbowFar', aim: 'wristFar', min: -40, max: 40, cap: 0.1 },
  { id: 'hand.far', parent: 'forearm.far', joint: 'wristFar', aim: 'handFarTip', min: -25, max: 25, cap: 0.08 },

  { id: 'thigh.near', parent: 'pelvis', joint: 'hipNear', aim: 'kneeNear', min: -15, max: 15 },
  { id: 'shin.near', parent: 'thigh.near', joint: 'kneeNear', aim: 'ankleNear', min: -35, max: 35, cap: 0.25 },
  { id: 'foot.near', parent: 'shin.near', joint: 'ankleNear', aim: 'toeNear', min: -20, max: 20, cap: 0.12 },

  { id: 'thigh.far', parent: 'pelvis', joint: 'hipFar', aim: 'kneeFar', min: -15, max: 15 },
  { id: 'shin.far', parent: 'thigh.far', joint: 'kneeFar', aim: 'ankleFar', min: -35, max: 35, cap: 0.25 },
  { id: 'foot.far', parent: 'shin.far', joint: 'ankleFar', aim: 'toeFar', min: -20, max: 20, cap: 0.12 },
];

export const restAngle = (b) => {
  const a = joints[b.joint], c = joints[b.aim];
  return Math.round(Math.atan2(c[1] - a[1], c[0] - a[0]) * 180 / Math.PI * 10) / 10;
};

export const BONE = Object.fromEntries(BONES.map((b) => [b.id, b]));
