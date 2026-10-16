#!/usr/bin/env python3
"""pose_est.py <image|video> [--out json] [--viz png] [--hands] [--every k]
2D body (33 MediaPipe landmarks) + hand (21 per hand) keypoints from a reference image or video, in pixels.
Used to MEASURE references (joint positions for pose fitting; joint paths and timing from motion video) — never drawn.
Models: models/{pose_landmarker_heavy,hand_landmarker}.task in the repo (scripts/setup.sh downloads them) or ~/models."""
import sys, json, argparse, os
import numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision as mpv
M = next((d for d in [os.environ.get('MUM_MODELS', ''), os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'models'), os.path.expanduser('~/models')] if d and os.path.exists(os.path.join(d, 'pose_landmarker_heavy.task'))), os.path.expanduser('~/models'))   # repo models/ (scripts/setup.sh), then ~/models
POSE = ['nose', 'eyeInnerL', 'eyeL', 'eyeOuterL', 'eyeInnerR', 'eyeR', 'eyeOuterR', 'earL', 'earR', 'mouthL', 'mouthR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR',
        'wristL', 'wristR', 'pinkyL', 'pinkyR', 'indexL', 'indexR', 'thumbL', 'thumbR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'heelL', 'heelR', 'footL', 'footR']
def mk(video):
    rm = mpv.RunningMode.VIDEO if video else mpv.RunningMode.IMAGE
    pose = mpv.PoseLandmarker.create_from_options(mpv.PoseLandmarkerOptions(base_options=mpp.BaseOptions(model_asset_path=f'{M}/pose_landmarker_heavy.task'), running_mode=rm, min_pose_detection_confidence=0.2, min_pose_presence_confidence=0.2, min_tracking_confidence=0.2))
    hands = mpv.HandLandmarker.create_from_options(mpv.HandLandmarkerOptions(base_options=mpp.BaseOptions(model_asset_path=f'{M}/hand_landmarker.task'), running_mode=rm, num_hands=2, min_hand_detection_confidence=0.2, min_hand_presence_confidence=0.2, min_tracking_confidence=0.2))
    return pose, hands
def analyse(rgb, pose, hands, ts=None, want_hands=True):
    H, W = rgb.shape[:2]; img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    pr = pose.detect_for_video(img, ts) if ts is not None else pose.detect(img)
    out = {'W': W, 'H': H, 'pose': None, 'hands': []}
    if pr.pose_landmarks:
        out['pose'] = {n: [l.x * W, l.y * H, l.visibility] for n, l in zip(POSE, pr.pose_landmarks[0])}
        # 3D 'world' landmarks (metres, hip-centred; +z = AWAY from the camera): a depth prior for the 3D arm fit (which
        # side of the face the hand is, whether the elbow is forward or out to the side) — 2D alone cannot tell
        if pr.pose_world_landmarks: out['world'] = {n: [l.x, l.y, l.z] for n, l in zip(POSE, pr.pose_world_landmarks[0])}
    if want_hands:
        hr = hands.detect_for_video(img, ts) if ts is not None else hands.detect(img)
        for lms, hd in zip(hr.hand_landmarks, hr.handedness):
            out['hands'].append({'label': hd[0].category_name, 'score': hd[0].score, 'pts': [[l.x * W, l.y * H] for l in lms]})
    return out
def draw(rgb, r):
    im = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR).copy()
    if r['pose']:
        P = r['pose']
        for a, b in [('shoulderL', 'shoulderR'), ('shoulderL', 'elbowL'), ('elbowL', 'wristL'), ('shoulderR', 'elbowR'), ('elbowR', 'wristR'), ('shoulderL', 'hipL'), ('shoulderR', 'hipR'), ('hipL', 'hipR'),
                     ('hipL', 'kneeL'), ('kneeL', 'ankleL'), ('hipR', 'kneeR'), ('kneeR', 'ankleR'), ('wristL', 'indexL'), ('wristR', 'indexR')]:
            pa, pb = P[a], P[b]; cv2.line(im, (int(pa[0]), int(pa[1])), (int(pb[0]), int(pb[1])), (0, 0, 255) if a.endswith('L') or b.endswith('L') else (255, 0, 0), 2)
        for n, p in P.items(): cv2.circle(im, (int(p[0]), int(p[1])), 3, (0, 160, 0), -1)
    for h in r['hands']:
        for p in h['pts']: cv2.circle(im, (int(p[0]), int(p[1])), 2, (0, 200, 255), -1)
    return im
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('--out'); ap.add_argument('--viz'); ap.add_argument('--hands', action='store_true'); ap.add_argument('--every', type=int, default=1)
    a = ap.parse_args()
    if a.src.lower().endswith(('.mp4', '.mov', '.webm')):
        pose, hands = mk(True); cap = cv2.VideoCapture(a.src); fps = cap.get(cv2.CAP_PROP_FPS) or 24; frames = []; i = 0
        while True:
            ok, bgr = cap.read()
            if not ok: break
            if i % a.every == 0:
                r = analyse(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), pose, hands, int(i * 1000 / fps), a.hands); r['i'] = i; r['t'] = i / fps; frames.append(r)
            i += 1
        res = {'fps': fps, 'n': i, 'frames': frames}
        print(f'{a.src}: {i} frames @ {fps:.2f} fps, pose found in {sum(1 for f in frames if f["pose"])}/{len(frames)}, hands in {sum(1 for f in frames if f["hands"])}')
    else:
        pose, hands = mk(False); rgb = cv2.cvtColor(cv2.imread(a.src), cv2.COLOR_BGR2RGB); res = analyse(rgb, pose, hands, None, True)
        # the FLOOR: the lowest row holding the figure (or a prop standing on the floor) against the plain background.
        # A side-on pose off her feet (kneeling, all fours, sitting) is placed by it (tools/fit_pose.mjs --floor)
        bg = np.median(np.concatenate([rgb[:5, :5], rgb[:5, -5:], rgb[-5:, :5], rgb[-5:, -5:]]).reshape(-1, 3), axis=0)
        rows = np.where((np.abs(rgb.astype(int) - bg).sum(2) > 60).sum(1) >= 3)[0]
        if len(rows): res['groundY'] = int(rows.max())
        print(a.src, 'pose' if res['pose'] else 'NO POSE', f"{len(res['hands'])} hands")
        if a.viz: cv2.imwrite(a.viz, draw(rgb, res))
    if a.out: json.dump(res, open(a.out, 'w'))
