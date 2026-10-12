#!/usr/bin/env python3
"""track_analyse.py <track.json> <out.png> [--hand auto|L|R] — motion facts from a pose-tracked reference video:
trunk flexion, head pitch, the active hand's distance to the mouth and speed (body-height units/s), elbow angle, knee bend.
Measurement only: these curves set TIMING and SHAPE of the keyed animation (when the hand leaves, peak speed, how long
it stays, how deep the retch goes) — the frames themselves are never used."""
import json, sys, argparse, numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
ap = argparse.ArgumentParser(); ap.add_argument('track'); ap.add_argument('out'); ap.add_argument('--hand', default='auto'); a = ap.parse_args()
T = json.load(open(a.track)); F = T['frames']; fps = T['fps']; t = np.array([f['t'] for f in F])
def L(n):
    return np.array([[f['pose'][n][0], f['pose'][n][1]] if f['pose'] else [np.nan, np.nan] for f in F])
def sm(x, k=5):
    x = np.array(x, float); out = x.copy()
    for i in range(len(x)):
        w = x[max(0, i - k // 2): i + k // 2 + 1]; w = w[~np.isnan(w)] if w.ndim == 1 else w; out[i] = np.nanmean(w) if len(w) else np.nan
    return out
hipM = (L('hipL') + L('hipR')) / 2; shM = (L('shoulderL') + L('shoulderR')) / 2; ank = (L('ankleL') + L('ankleR')) / 2
Hb = np.nanmedian(np.linalg.norm(shM - ank, axis=1)) / 0.8          # ~body height in px (shoulder→ankle ≈ 0.8 H)
mouth = (L('mouthL') + L('mouthR')) / 2; nose = L('nose'); ear = (L('earL') + L('earR')) / 2
trunk = np.degrees(np.arctan2(shM[:, 0] - hipM[:, 0], -(shM[:, 1] - hipM[:, 1])))            # + = leaning toward +x
headv = nose - shM; head = np.degrees(np.arctan2(headv[:, 0], -headv[:, 1])) - trunk
res = {}
for S in ('L', 'R'):
    w = L('wrist' + S); d = np.linalg.norm(w - mouth, axis=1) / Hb; res[S] = (w, d)
S = a.hand if a.hand != 'auto' else min(('L', 'R'), key=lambda s: np.nanmin(sm(res[s][1])))
w, dm = res[S]; dm = sm(dm, 5)
v = np.r_[0, np.linalg.norm(np.diff(sm(w[:, 0], 5)[:, None] if False else np.c_[sm(w[:, 0], 5), sm(w[:, 1], 5)], axis=0), axis=1)] * fps / Hb
el = L('elbow' + S); sh = L('shoulder' + S)
u1 = sh - el; u2 = w - el; elbow = np.degrees(np.arccos(np.clip(np.sum(u1 * u2, 1) / (np.linalg.norm(u1, axis=1) * np.linalg.norm(u2, axis=1) + 1e-9), -1, 1)))
kn = L('knee' + S); an = L('ankle' + S); hp = L('hip' + S); k1 = hp - kn; k2 = an - kn
knee = 180 - np.degrees(np.arccos(np.clip(np.sum(k1 * k2, 1) / (np.linalg.norm(k1, axis=1) * np.linalg.norm(k2, axis=1) + 1e-9), -1, 1)))
near = dm < 0.12; ev = []
on = np.where(near)[0]
if len(on): ev.append(f'hand at mouth from {t[on[0]]:.2f}s to {t[on[-1]]:.2f}s')
# departure: last frame before arrival where the hand is still near its start position
d0 = np.nanmedian(dm[:5]); dep = np.where(dm < d0 - 0.03)[0]
if len(dep): ev.append(f'hand leaves start at {t[dep[0]]:.2f}s')
pk = np.nanargmax(v[: on[0] + 1]) if len(on) else np.nanargmax(v)
ev.append(f'peak hand speed {np.nanmax(v[: on[0] + 1]) if len(on) else np.nanmax(v):.2f} H/s at {t[pk]:.2f}s')
ev.append(f'trunk lean range {np.nanmin(sm(trunk)):.0f}..{np.nanmax(sm(trunk)):.0f} deg (max at {t[np.nanargmax(np.abs(sm(trunk) - np.nanmedian(sm(trunk)[:5])))]:.2f}s); knee bend max {np.nanmax(sm(knee)):.0f} deg')
fig, ax = plt.subplots(5, 1, figsize=(11, 11), sharex=True)
ax[0].plot(t, dm); ax[0].set_ylabel(f'hand {S}→mouth (H)'); ax[0].axhline(0.12, ls=':', c='gray')
ax[1].plot(t, v); ax[1].set_ylabel('hand speed (H/s)')
ax[2].plot(t, sm(trunk), label='trunk lean'); ax[2].plot(t, sm(head), label='head rel. trunk'); ax[2].legend(); ax[2].set_ylabel('deg')
ax[3].plot(t, sm(elbow)); ax[3].set_ylabel('elbow angle')
ax[4].plot(t, sm(knee)); ax[4].set_ylabel('knee bend'); ax[4].set_xlabel('s')
for x_ in ax: x_.grid(alpha=0.3)
fig.suptitle(a.track.split('/')[-1] + ' — ' + '; '.join(ev), fontsize=9); fig.tight_layout(); fig.savefig(a.out, dpi=80)
print('\n'.join(ev))
json.dump({'t': t.tolist(), 'hand': S, 'handToMouth': np.nan_to_num(dm).tolist(), 'speed': np.nan_to_num(v).tolist(), 'trunk': np.nan_to_num(sm(trunk)).tolist(),
           'head': np.nan_to_num(sm(head)).tolist(), 'elbow': np.nan_to_num(sm(elbow)).tolist(), 'knee': np.nan_to_num(sm(knee)).tolist(), 'events': ev}, open(a.out.replace('.png', '.json'), 'w'))
