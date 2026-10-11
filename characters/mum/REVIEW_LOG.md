# Critic log — rest pose (Prompt B, fresh subagent each round, inputs: compare sheet + metrics + spec only)

Scores: 1 proportion · 2 silhouette · 3 shape design · 4 joints · 5 palette/value · 6 face & hands

| round | scores | IoU | verdict | main issue raised |
|---|---|---|---|---|
| 1 | 4 4 3 3 4 2 | 0.958 | no | hands read as paddles; far forearm cap on top of sleeve |
| 2 | 4 4 3 2 4 3 | 0.958 | no | far wrist cut; hands mitts |
| 3 | 4 3 3 2 4 3 | 0.968 | no | far wrist V-notch; real 467 px hole at far hip (→ hole metric added) |
| 4 | 5 4 3 3 5 3 | 0.968 | no | far wrist reads as a stump |
| 5 | 4 4 3 3 4 3 | 0.968 | no | bun one dome; far wrist (now asks wrist IN FRONT of cuff) |
| 6 | 4 4 3 3 5 3 | 0.971 | no | far forearm baked into hand loop (rig fault → split onto forearm bone) |
| 7 | 4 4 3 3 5 3 | 0.971 | no | far forearm 25 px too long (measured: skin x 767 vs 742) |
| 8 | 5 3 3 3 4 3 | 0.974 | no | near wrist/cuff construction |
| 9 | 4 4 3 3 5 4 | 0.978 | no | near cuff overlap order (rejected: reference measured convex skin end) |
| 10 | 5 4 4 4 3 4 | 0.978 | **SHIP** | value structure thin (hairShade 7.8% vs 21.6% measured) |
| 11 | 4 4 3 4 4 4 | 0.976 | **SHIP** | stroke weights; skull back 8–16 px wide (measured, fixed) |
| 12 | 4 4 4 4 5 4 | 0.979 | **SHIP** | eyelids missing; thigh division 15–25 px off (both measured, fixed) |
| 13 | 5 4 4 4 5 4 | 0.979 | **SHIP** | escaping shade stroke at near elbow (→ escape metric added) |
| 14 | 5 5 4 4 5 4 | 0.979 | **SHIP** | polish only (near-hand thumb, hair shade arcs, shoulder tops 3–4 px) |

Stop rule met: no high-severity items for five consecutive rounds; IoU plateaued at 0.979.
Open polish (all med/low, from R14): drop the near-hand thumb lobe (reference shows none), round near fingertips,
heavier nape crescent (hairShade ~15% vs ~21% in reference), shoulder tops 3–4 px lower, rounder far-sock heel.
